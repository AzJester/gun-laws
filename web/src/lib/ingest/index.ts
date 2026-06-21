// Ingestion orchestrator.
//
// runIngestion() calls the available providers (only those whose API key is
// set), normalizes + dedupes the results by externalRef, and — unless dryRun —
// upserts them into the ChangeEvent table with reviewStatus 'auto_detected'.
//
// Designed to degrade gracefully:
//  - No keys set  -> { skipped: true, reason } (no throw).
//  - Host blocked -> that provider is marked skipped with an actionable reason.
//  - No DATABASE_URL on a non-dryRun run -> reports it; does not crash.
//
// Nothing here connects to a DB or the network at import time.

import { getPrisma, hasDatabase } from "../prisma";
import { fetchLegiscan, hasLegiscanKey } from "./legiscan";
import { fetchOpenstates, hasOpenstatesKey } from "./openstates";
import { ALL_STATE_CODES } from "./types";
import type { NormalizedChange, ProviderResult, SourceKind } from "./types";

export interface RunIngestionOptions {
  /** State codes to ingest. Default: all 50 + DC. */
  states?: string[];
  /** Restrict to a single provider. Default: all with a key set. */
  source?: SourceKind;
  /** If true, fetch + normalize but do not write to the DB. */
  dryRun?: boolean;
  /** Search query. Default "firearm". */
  query?: string;
}

export interface IngestionSummary {
  skipped: boolean;
  reason?: string;
  dryRun: boolean;
  /** Providers that actually ran (had a key). */
  providersRun: SourceKind[];
  /** Providers skipped (no key or host blocked) with reasons. */
  providersSkipped: { source: SourceKind; reason: string }[];
  fetched: number; // total normalized records before dedupe
  unique: number; // after dedupe by externalRef
  upserted: number; // rows written (0 on dryRun / no DB)
  byState: Record<string, number>; // unique counts per state
  warnings: string[];
}

function normalizeStates(states?: string[]): string[] {
  if (!states || states.length === 0) return [...ALL_STATE_CODES];
  const valid = new Set<string>(ALL_STATE_CODES);
  return states
    .map((s) => s.trim().toUpperCase())
    .filter((s) => valid.has(s));
}

/** Dedupe by externalRef; keep the record with the most recent eventDate. */
function dedupe(records: NormalizedChange[]): NormalizedChange[] {
  const byRef = new Map<string, NormalizedChange>();
  for (const r of records) {
    if (!r.externalRef || !r.state) continue;
    const existing = byRef.get(r.externalRef);
    if (!existing || (r.eventDate || "") > (existing.eventDate || "")) {
      byRef.set(r.externalRef, r);
    }
  }
  return [...byRef.values()];
}

export async function runIngestion(
  opts: RunIngestionOptions = {},
): Promise<IngestionSummary> {
  const dryRun = Boolean(opts.dryRun);
  const states = normalizeStates(opts.states);
  const query = opts.query ?? "firearm";

  const summary: IngestionSummary = {
    skipped: false,
    dryRun,
    providersRun: [],
    providersSkipped: [],
    fetched: 0,
    unique: 0,
    upserted: 0,
    byState: {},
    warnings: [],
  };

  // Decide which providers to attempt.
  const wantLegiscan = !opts.source || opts.source === "legiscan";
  const wantOpenstates = !opts.source || opts.source === "openstates";

  const anyKey =
    (wantLegiscan && hasLegiscanKey()) ||
    (wantOpenstates && hasOpenstatesKey());

  if (!anyKey) {
    return {
      ...summary,
      skipped: true,
      reason:
        "No API keys set (LEGISCAN_API_KEY / OPENSTATES_API_KEY). Set at least " +
        "one to run. If keys ARE set but live calls 403 with host_not_allowed, " +
        "this environment's egress allowlist must include api.legiscan.com and " +
        "v3.openstates.org (see web/README.md).",
    };
  }

  // Run providers sequentially (both pace their own requests).
  const results: ProviderResult[] = [];
  if (wantLegiscan) results.push(await fetchLegiscan(states, query));
  if (wantOpenstates) results.push(await fetchOpenstates(states, query));

  const all: NormalizedChange[] = [];
  for (const r of results) {
    summary.warnings.push(...r.warnings);
    if (r.skipped) {
      summary.providersSkipped.push({
        source: r.source,
        reason: r.reason ?? "skipped",
      });
      // A blocked/skipped provider may still have partial changes (e.g. host
      // blocked mid-run) — keep whatever it gathered.
      all.push(...r.changes);
    } else {
      summary.providersRun.push(r.source);
      all.push(...r.changes);
    }
  }

  summary.fetched = all.length;
  const unique = dedupe(all);
  summary.unique = unique.length;
  for (const u of unique) {
    summary.byState[u.state] = (summary.byState[u.state] ?? 0) + 1;
  }

  // If every requested provider was skipped and nothing came back, report it.
  if (summary.providersRun.length === 0 && unique.length === 0) {
    summary.skipped = true;
    summary.reason =
      summary.providersSkipped.map((p) => `${p.source}: ${p.reason}`).join("; ") ||
      "No providers produced results.";
    return summary;
  }

  if (dryRun) return summary;

  if (!hasDatabase()) {
    summary.warnings.push(
      "DATABASE_URL not set — skipped DB upsert (run with a database to persist).",
    );
    return summary;
  }

  summary.upserted = await upsertChangeEvents(unique);
  return summary;
}

/**
 * Upsert normalized records into ChangeEvent (reviewStatus 'auto_detected').
 * Dedupe key is externalRef. Only writes for states that exist in the DB
 * (FK on ChangeEvent.stateCode) — others are skipped with a warning upstream.
 */
async function upsertChangeEvents(
  records: NormalizedChange[],
): Promise<number> {
  const prisma = getPrisma();

  // Limit to states present in the DB to avoid FK violations.
  const known = new Set(
    (await prisma.state.findMany({ select: { code: true } })).map((s) => s.code),
  );

  let count = 0;
  for (const r of records) {
    if (!known.has(r.state)) continue;
    const eventDate = parseDate(r.eventDate);
    if (!eventDate) continue;

    // Upsert keyed on externalRef. The schema doesn't mark externalRef unique,
    // so we emulate upsert with findFirst + update/create (idempotent re-runs).
    const existing = await prisma.changeEvent.findFirst({
      where: { externalRef: r.externalRef },
      select: { id: true },
    });

    if (existing) {
      await prisma.changeEvent.update({
        where: { id: existing.id },
        data: {
          stateCode: r.state,
          kind: r.kind,
          headline: r.headline,
          eventDate,
          // Re-detected rows stay auto_detected only if not yet curated.
        },
      });
    } else {
      await prisma.changeEvent.create({
        data: {
          stateCode: r.state,
          kind: r.kind,
          headline: r.headline,
          eventDate,
          externalRef: r.externalRef,
          reviewStatus: "auto_detected",
        },
      });
    }
    count += 1;
  }
  return count;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type { NormalizedChange, ProviderResult, SourceKind } from "./types";
