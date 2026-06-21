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
import { classifyChange, hasAnthropicKey } from "./classifier";
import type { ClassifiedChange } from "./classifier";
import { fetchCourtListener, hasCourtListenerSource } from "./courtlistener";
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
  classified: number; // records run through the classifier (detect → draft)
  /** How the classifier ran: which path was used and how many of each. */
  classifyMethod: { llm: number; rules: number };
  upserted: number; // rows written (0 on dryRun / no DB)
  byState: Record<string, number>; // unique counts per state
  warnings: string[];
  /** A few sample drafts (dryRun visibility into the classify step). */
  sampleDrafts?: {
    state: string;
    summary: string;
    policyKey: string | null;
    proposedStatus: string | null;
    confidence: number;
    method: string;
  }[];
}

function normalizeStates(states?: string[]): string[] {
  if (!states || states.length === 0) return [...ALL_STATE_CODES];
  const valid = new Set<string>(ALL_STATE_CODES);
  return states
    .map((s) => s.trim().toUpperCase())
    .filter((s) => valid.has(s));
}

/** Dedupe by externalRef; keep the record with the most recent eventDate. */
export function dedupe(records: NormalizedChange[]): NormalizedChange[] {
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
    classified: 0,
    classifyMethod: { llm: 0, rules: 0 },
    upserted: 0,
    byState: {},
    warnings: [],
  };

  // Decide which providers to attempt.
  const wantLegiscan = !opts.source || opts.source === "legiscan";
  const wantOpenstates = !opts.source || opts.source === "openstates";
  const wantCourtListener = !opts.source || opts.source === "courtlistener";

  const anyProvider =
    (wantLegiscan && hasLegiscanKey()) ||
    (wantOpenstates && hasOpenstatesKey()) ||
    (wantCourtListener && hasCourtListenerSource());

  if (!anyProvider) {
    return {
      ...summary,
      skipped: true,
      reason:
        "No providers available. Set at least one of LEGISCAN_API_KEY / " +
        "OPENSTATES_API_KEY (CourtListener runs key-optional but needs egress). " +
        "If keys ARE set but live calls 403 with host_not_allowed, this " +
        "environment's egress allowlist must include api.legiscan.com, " +
        "v3.openstates.org and www.courtlistener.com (see web/README.md).",
    };
  }

  // Run providers sequentially (each paces its own requests).
  const results: ProviderResult[] = [];
  if (wantLegiscan) results.push(await fetchLegiscan(states, query));
  if (wantOpenstates) results.push(await fetchOpenstates(states, query));
  if (wantCourtListener) results.push(await fetchCourtListener(states, query));

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

  // CLASSIFY & DIFF — turn each normalized change into a reviewable draft.
  // The classifier never throws (LLM → rules fallback), so this is always safe.
  if (!hasAnthropicKey()) {
    summary.warnings.push(
      "ANTHROPIC_API_KEY not set — classifier used the deterministic rules path.",
    );
  }
  const classified: ClassifiedChange[] = [];
  for (const u of unique) {
    const draft = await classifyChange(u);
    classified.push(draft);
    summary.classifyMethod[draft.method] += 1;
  }
  summary.classified = classified.length;
  summary.sampleDrafts = classified.slice(0, 5).map((d) => ({
    state: d.state,
    summary: d.summary,
    policyKey: d.policyKey,
    proposedStatus: d.proposedStatus,
    confidence: d.confidence,
    method: d.method,
  }));

  if (dryRun) return summary;

  if (!hasDatabase()) {
    summary.warnings.push(
      "DATABASE_URL not set — skipped DB upsert (run with a database to persist).",
    );
    return summary;
  }

  summary.upserted = await upsertChangeEvents(classified);
  return summary;
}

/**
 * Upsert classified drafts into ChangeEvent (reviewStatus 'auto_detected').
 * Dedupe key is externalRef. Only writes for states that exist in the DB
 * (FK on ChangeEvent.stateCode) — others are skipped with a warning upstream.
 *
 * Stores the draft (summary / proposed status / citation / confidence / method)
 * so the editorial review queue has everything it needs to triage and publish.
 */
async function upsertChangeEvents(
  records: ClassifiedChange[],
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

    const draft = {
      summary: r.summary,
      status: r.proposedStatus ?? null,
      citation: r.proposedCitation ?? null,
      confidence: r.confidence,
      method: r.method,
      policyKey: r.policyKey ?? null,
      url: r.url ?? null,
    };

    // Upsert keyed on externalRef. The schema doesn't mark externalRef unique,
    // so we emulate upsert with findFirst + update/create (idempotent re-runs).
    const existing = await prisma.changeEvent.findFirst({
      where: { externalRef: r.externalRef },
      select: { id: true, reviewStatus: true },
    });

    if (existing) {
      // Never clobber an editor's decision: only refresh drafts still pending.
      const stillPending =
        existing.reviewStatus === "auto_detected" ||
        existing.reviewStatus === "in_review";
      await prisma.changeEvent.update({
        where: { id: existing.id },
        data: stillPending
          ? { stateCode: r.state, kind: r.kind, headline: r.headline, eventDate, ...draft }
          : { stateCode: r.state, kind: r.kind, headline: r.headline, eventDate },
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
          ...draft,
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
export type { ClassifiedChange } from "./classifier";
export { classifyChange } from "./classifier";
