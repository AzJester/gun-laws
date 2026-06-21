// Concealed-carry permit reciprocity (roadmap #7).
//
// Typed loader + helpers over src/data/reciprocity.json. The data is ILLUSTRATIVE
// SAMPLE DATA — reciprocity is fluid (statutes, AG opinions, executive
// agreements) and depends on permit type/residency. The feature/mechanism is
// the deliverable, not the legal accuracy of the matrix. See DISCLAIMER below.
//
// Pure data + functions — safe to import from server or client components (the
// JSON is bundled; no fs, no DB).

import raw from "@/data/reciprocity.json";

export interface ReciprocityState {
  /** True if the state allows permitless ("constitutional") concealed carry. */
  permitless: boolean;
  /** State codes whose resident permits this state honors (illustrative). */
  honors: string[];
}

interface ReciprocityFile {
  _meta: {
    title: string;
    warning: string;
    asOf: string;
    [k: string]: unknown;
  };
  states: Record<string, ReciprocityState>;
}

const DATA = raw as unknown as ReciprocityFile;

export const RECIPROCITY_DISCLAIMER =
  "Reciprocity is illustrative sample data and changes frequently. It is NOT " +
  "legal advice and may be out of date. Recognition depends on permit type, " +
  "residency, and reciprocal conditions. Always verify with the issuing and " +
  "destination states before traveling armed.";

export const RECIPROCITY_AS_OF = DATA._meta.asOf;

/** All state codes present in the matrix (50 + DC), sorted. */
export function reciprocityCodes(): string[] {
  return Object.keys(DATA.states).sort();
}

export function getReciprocity(code: string): ReciprocityState | null {
  return DATA.states[code.toUpperCase()] ?? null;
}

export function isPermitless(code: string): boolean {
  return Boolean(DATA.states[code.toUpperCase()]?.permitless);
}

/**
 * Where a given state's resident permit is honored.
 * Returns the destination state codes that honor `code` (plus permitless states,
 * where a non-resident may carry without any permit), sorted.
 */
export function honoredIn(code: string): {
  /** States that explicitly recognize this state's resident permit. */
  byPermit: string[];
  /** Permitless states (a permit isn't required to carry there at all). */
  permitless: string[];
} {
  const target = code.toUpperCase();
  const byPermit: string[] = [];
  const permitless: string[] = [];
  for (const [dest, info] of Object.entries(DATA.states)) {
    if (dest === target) continue;
    if (info.permitless) {
      permitless.push(dest);
      continue;
    }
    if (info.honors.includes(target)) byPermit.push(dest);
  }
  return { byPermit: byPermit.sort(), permitless: permitless.sort() };
}

/**
 * Which states' permits a given state honors (the inverse direction).
 * Returns the source state codes whose permit `code` accepts, sorted.
 */
export function honors(code: string): string[] {
  const info = DATA.states[code.toUpperCase()];
  if (!info) return [];
  return [...info.honors].sort();
}

/** Does `destination` honor a resident permit from `origin`? */
export function honorsPermitFrom(destination: string, origin: string): boolean {
  const dest = DATA.states[destination.toUpperCase()];
  if (!dest) return false;
  if (dest.permitless) return true; // no permit needed at all
  return dest.honors.includes(origin.toUpperCase());
}
