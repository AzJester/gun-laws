// Read layer with a no-DB fallback.
//
//  - If DATABASE_URL is set, read via Prisma.
//  - Otherwise, read data/sample-states.json directly so the app runs for a
//    demo (and builds) without a database.
//
// Everything here is server-only (uses node:fs / node:path).

// Server-only: uses node:fs / node:path and (optionally) Prisma. Imported only
// from server components, route handlers, and the seed.
import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrisma, hasDatabase } from "./prisma";
import { CHANGES } from "./changes";
import {
  POLICY_KEYS,
  type ChangeEventDTO,
  type Grade,
  type Policies,
  type PolicyKey,
  type ProvisionCategory,
  type SourceLink,
  type StateDetail,
  type StateSummary,
  type StateUpdate,
} from "./types";

// ---------------------------------------------------------------------------
// JSON fallback
// ---------------------------------------------------------------------------

interface RawState {
  name: string;
  grade: Grade;
  lawCount: number | null;
  restrictions: number | null;
  policies: Policies;
  provisions: ProvisionCategory[];
  detailed: boolean;
  year?: number | null;
  source?: string | null;
  updates?: StateUpdate[];
  verifiedThrough?: number | null;
  sources?: SourceLink[];
}

interface RawDataset {
  _meta: unknown;
  states: Record<string, RawState>;
}

let cachedDataset: RawDataset | null = null;

function datasetPath(): string {
  // web/ is one level below the repo root; data/ is a sibling of web/.
  return path.join(process.cwd(), "..", "data", "sample-states.json");
}

async function loadDataset(): Promise<RawDataset> {
  if (cachedDataset) return cachedDataset;
  const raw = await fs.readFile(datasetPath(), "utf8");
  cachedDataset = JSON.parse(raw) as RawDataset;
  return cachedDataset;
}

function toSummaryFromRaw(code: string, s: RawState): StateSummary {
  return {
    code,
    name: s.name,
    grade: s.grade,
    lawCount: s.lawCount ?? null,
    restrictions: s.restrictions ?? s.lawCount ?? null,
    policies: s.policies,
    detailed: s.detailed,
    year: s.year ?? null,
    source: s.source ?? null,
    updates: s.updates ?? [],
    verifiedThrough: s.verifiedThrough ?? null,
    sources: s.sources ?? [],
  };
}

// The DB schema has no `updates` column, so we source the curated 2021–2025
// updates from the JSON keyed by state code on the DB path too (simplest
// correct option — see web/README.md). Cached behind loadDataset().
async function updatesByCode(): Promise<Record<string, StateUpdate[]>> {
  const ds = await loadDataset();
  const out: Record<string, StateUpdate[]> = {};
  for (const [code, s] of Object.entries(ds.states)) {
    out[code] = s.updates ?? [];
  }
  return out;
}

// verifiedThrough + sources also live in the JSON; the DB path borrows them by code.
async function metaByCode(): Promise<
  Record<string, { verifiedThrough: number | null; sources: SourceLink[] }>
> {
  const ds = await loadDataset();
  const out: Record<string, { verifiedThrough: number | null; sources: SourceLink[] }> = {};
  for (const [code, s] of Object.entries(ds.states)) {
    out[code] = { verifiedThrough: s.verifiedThrough ?? null, sources: s.sources ?? [] };
  }
  return out;
}

async function getStatesJson(): Promise<StateSummary[]> {
  const ds = await loadDataset();
  return Object.entries(ds.states)
    .map(([code, s]) => toSummaryFromRaw(code, s))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getStateJson(code: string): Promise<StateDetail | null> {
  const ds = await loadDataset();
  const s = ds.states[code.toUpperCase()];
  if (!s) return null;
  return { ...toSummaryFromRaw(code.toUpperCase(), s), provisions: s.provisions };
}

// ---------------------------------------------------------------------------
// Prisma path
// ---------------------------------------------------------------------------

function policiesFromRows(rows: { policyKey: string; value: string }[]): Policies {
  const map = new Map(rows.map((r) => [r.policyKey, r.value === "true" || r.value === "yes"]));
  const out = {} as Policies;
  for (const key of POLICY_KEYS) out[key] = map.get(key) ?? false;
  return out;
}

async function getStatesDb(): Promise<StateSummary[]> {
  const prisma = getPrisma();
  const [states, updates, meta] = await Promise.all([
    prisma.state.findMany({
      include: { policies: true },
      orderBy: { name: "asc" },
    }),
    updatesByCode(),
    metaByCode(),
  ]);
  return states.map((st) => {
    const policies = policiesFromRows(st.policies);
    return {
      code: st.code,
      name: st.name,
      grade: st.overallGrade as Grade,
      lawCount: st.lawCount ?? null,
      restrictions: st.lawCount ?? null,
      policies,
      detailed: false, // refined by enrichDetailedFlags()
      year: st.year ?? null,
      source: st.source ?? null,
      updates: updates[st.code] ?? [],
      verifiedThrough: meta[st.code]?.verifiedThrough ?? null,
      sources: meta[st.code]?.sources ?? [],
    };
  });
}

async function getStateDb(code: string): Promise<StateDetail | null> {
  const prisma = getPrisma();
  const st = await prisma.state.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      policies: true,
      provisions: {
        include: { currentVersion: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!st) return null;

  const policies = policiesFromRows(st.policies);
  const updates = (await updatesByCode())[st.code] ?? [];
  const meta = (await metaByCode())[st.code] ?? { verifiedThrough: null, sources: [] };

  // Group provisions back into categories for the detail view.
  const byCategory = new Map<string, ProvisionCategory>();
  for (const prov of st.provisions) {
    const v = prov.currentVersion;
    if (!byCategory.has(prov.category)) {
      byCategory.set(prov.category, { category: prov.category, items: [] });
    }
    byCategory.get(prov.category)!.items.push({
      text: v?.summary ?? prov.title,
      citation: v?.citation ?? null,
      status: (v?.status as ProvisionCategory["items"][number]["status"]) ?? "in_effect",
    });
  }
  const provisions = [...byCategory.values()];

  // A state is "detailed" if it has at least one real statute citation.
  const detailed = provisions.some((c) => c.items.some((it) => it.citation));

  return {
    code: st.code,
    name: st.name,
    grade: st.overallGrade as Grade,
    lawCount: st.lawCount ?? null,
    restrictions: st.lawCount ?? null,
    policies,
    detailed,
    year: st.year ?? null,
    source: st.source ?? null,
    updates,
    verifiedThrough: meta.verifiedThrough,
    sources: meta.sources,
    provisions,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getStates(): Promise<StateSummary[]> {
  if (hasDatabase()) {
    const fromDb = await getStatesDb();
    // Backfill `detailed` from provision citations (cheap: one extra query set).
    return enrichDetailedFlags(fromDb);
  }
  return getStatesJson();
}

async function enrichDetailedFlags(summaries: StateSummary[]): Promise<StateSummary[]> {
  const prisma = getPrisma();
  const detailedCodes = new Set(
    (
      await prisma.provisionVersion.findMany({
        where: { citation: { not: null } },
        select: { provision: { select: { stateCode: true } } },
        distinct: ["provisionId"],
      })
    ).map((r) => r.provision.stateCode),
  );
  return summaries.map((s) => ({ ...s, detailed: detailedCodes.has(s.code) }));
}

export async function getState(code: string): Promise<StateDetail | null> {
  if (hasDatabase()) return getStateDb(code);
  return getStateJson(code);
}

export async function getRecentChanges(): Promise<ChangeEventDTO[]> {
  if (hasDatabase()) {
    const prisma = getPrisma();
    const events = await prisma.changeEvent.findMany({
      orderBy: { eventDate: "desc" },
      include: { state: true },
    });
    return events.map((e) => ({
      stateCode: e.stateCode,
      stateName: e.state.name,
      kind: e.kind,
      tagLabel: tagLabelFor(e.kind),
      headline: e.headline,
      date: formatDate(e.eventDate),
    }));
  }

  // JSON fallback: changes live in src/lib/changes.ts; names from the dataset.
  const ds = await loadDataset();
  return CHANGES.map((c) => ({
    stateCode: c.stateCode,
    stateName: ds.states[c.stateCode]?.name ?? c.stateCode,
    kind: c.kind,
    tagLabel: c.tagLabel,
    headline: c.headline,
    date: c.display,
  }));
}

function tagLabelFor(kind: string): string {
  switch (kind) {
    case "effective":
      return "Effective";
    case "court_ruling":
      return "Court ruling";
    case "enacted":
      return "Enacted";
    case "introduced":
      return "In committee";
    case "amended":
      return "Amended";
    case "repealed":
      return "Repealed";
    default:
      return kind;
  }
}

function formatDate(d: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = months[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${m} ${day} '${yy}`;
}

// Re-export so the policy ordering is available to UI without a second import.
export { POLICY_KEYS };
export type { PolicyKey };
