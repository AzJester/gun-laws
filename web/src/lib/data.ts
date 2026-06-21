// Read layer with a no-DB fallback.
//
//  - If DATABASE_URL is set, read via Prisma.
//  - Otherwise, read data/sample-states.json directly so the app runs for a
//    demo (and builds) without a database.
//
// Everything here is server-only (uses node:fs / node:path).

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrisma, hasDatabase } from "./prisma";
import { CHANGES } from "./changes";
import { gradeFor, restrictionCount } from "./grading";
import {
  POLICY_KEYS,
  type ChangeEventDTO,
  type Grade,
  type Policies,
  type PolicyKey,
  type ProvisionCategory,
  type StateDetail,
  type StateSummary,
} from "./types";

// ---------------------------------------------------------------------------
// JSON fallback
// ---------------------------------------------------------------------------

interface RawState {
  name: string;
  grade: Grade;
  restrictions: number;
  grid?: [number, number];
  policies: Policies;
  provisions: ProvisionCategory[];
  detailed: boolean;
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
    restrictions: s.restrictions,
    grid: s.grid ?? null,
    policies: s.policies,
    detailed: s.detailed,
  };
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
  const states = await prisma.state.findMany({
    include: { policies: true },
    orderBy: { name: "asc" },
  });
  return states.map((st) => {
    const policies = policiesFromRows(st.policies);
    return {
      code: st.code,
      name: st.name,
      grade: (st.overallGrade as Grade) ?? gradeFor(policies),
      restrictions: st.restrictions || restrictionCount(policies),
      grid:
        st.gridRow != null && st.gridCol != null
          ? ([st.gridRow, st.gridCol] as [number, number])
          : null,
      policies,
      detailed: false, // refined by enrichDetailedFlags()
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
    });
  }
  const provisions = [...byCategory.values()];

  // A state is "detailed" if it has at least one real statute citation.
  const detailed = provisions.some((c) => c.items.some((it) => it.citation));

  return {
    code: st.code,
    name: st.name,
    grade: (st.overallGrade as Grade) ?? gradeFor(policies),
    restrictions: st.restrictions || restrictionCount(policies),
    grid:
      st.gridRow != null && st.gridCol != null
        ? ([st.gridRow, st.gridCol] as [number, number])
        : null,
    policies,
    detailed,
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
