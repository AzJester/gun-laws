// Grading + color logic. Grades are precomputed in the dataset (from the State
// Firearm Laws Database). A = FEWEST laws/restrictions, F = the most — the
// opposite orientation from gun-safety scorecards.

import type { Grade } from "./types";

// Ordered best -> worst: grade A (fewest laws) -> grade F (most).
export const GRADES: Grade[] = ["A", "A-", "B", "C", "D", "D-", "F"];

// Friendly report-card palette: green (A, fewest laws) -> red (F, most),
// indexed by GRADES.
export const RAMP = [
  "#1a9850",
  "#66bd63",
  "#a6d96a",
  "#fee08b",
  "#fdae61",
  "#f46d43",
  "#d73027",
];

// Readable text color per grade fill (index-aligned to GRADES / RAMP).
// Text colors are tuned for WCAG AA contrast against each RAMP fill while
// leaving the grade *hues* unchanged:
//   - A  (#1a9850 green):  dark green #06210f → 4.59:1 (was white, 3.72:1 ✗)
//   - D- (#f46d43 orange): dark brown #3a1606 → 5.48:1 (was white, 2.95:1 ✗)
// All other entries already cleared 4.5:1.
export const TEXT = [
  "#06210f",
  "#10331c",
  "#163a12",
  "#4a3a00",
  "#4a2c08",
  "#3a1606",
  "#ffffff",
];

// Single-policy ("yes/no") color modes. "Yes" reads green (the policy is in
// effect) — except red-flag laws, which read red so those states stand out, as
// requested — while "No" is a shared neutral. The green (#15803d) clears WCAG AA
// (~5:1) against the white glyph text on filled states + legend chips.
export const POLICY_NO = { bg: "#e6edf3", fg: "#3a4a58" };
export const POLICY_YES = { bg: "#15803d", fg: "#ffffff" }; // default "yes" (green)
export const POLICY_YES_BY_MODE: Record<string, { bg: string; fg: string }> = {
  permitless_carry: { bg: "#15803d", fg: "#ffffff" },
  universal_bg_check: { bg: "#15803d", fg: "#ffffff" },
  red_flag: { bg: "#d73027", fg: "#ffffff" },
};
export function policyYes(mode: string): { bg: string; fg: string } {
  return POLICY_YES_BY_MODE[mode] ?? POLICY_YES;
}

export const DESC = [
  "fewest tracked laws",
  "very few tracked laws",
  "few tracked laws",
  "a moderate number of tracked laws",
  "many tracked laws",
  "most tracked laws",
  "the most tracked laws",
];

/** Fill color for a grade (green = A = fewest laws, red = F = most). */
export function gradeColor(grade: Grade): string {
  const i = GRADES.indexOf(grade);
  return RAMP[i] ?? RAMP[0];
}

/** Readable text color over a grade's fill (per-grade, index-aligned). */
export function gradeTextColor(grade: Grade): string {
  const i = GRADES.indexOf(grade);
  return TEXT[i] ?? TEXT[0];
}

// ---------------------------------------------------------------------------
// Grade view (presentation only)
// ---------------------------------------------------------------------------
//
// Grades are always in the "fewer-restrictions = A" orientation (A = fewest
// laws/restrictions, F = the most). The only alternate view is a neutral one
// that drops the letter grade entirely and shades states by their raw law count:
//
//   - "rights"  → "Fewer restrictions = A" (the grade; Arizona = A, California = F)
//   - "count"   → no letter grade; show the raw law count instead
//
// The underlying data never changes; "count" only swaps the legend + coloring.

export type Orientation = "rights" | "count";

export const ORIENTATIONS: Orientation[] = ["rights", "count"];

export const DEFAULT_ORIENTATION: Orientation = "rights";

export function isOrientation(v: unknown): v is Orientation {
  return v === "rights" || v === "count";
}

export function parseOrientation(v: unknown): Orientation {
  return isOrientation(v) ? v : DEFAULT_ORIENTATION;
}

/**
 * The letter to *display* for a stored grade. The grade is always shown in its
 * stored orientation (fewer restrictions = A); kept as a function so callers
 * have a single, stable place to read the displayed letter from.
 */
export function displayGrade(grade: Grade, _orient: Orientation = "rights"): Grade {
  return grade;
}

/** Fill color for a stored grade under the active orientation. */
export function displayGradeColor(grade: Grade, orient: Orientation = "rights"): string {
  return gradeColor(displayGrade(grade, orient));
}

/** Readable text color for a stored grade under the active orientation. */
export function displayGradeTextColor(
  grade: Grade,
  orient: Orientation = "rights",
): string {
  return gradeTextColor(displayGrade(grade, orient));
}

/** Short human label for a grade view, e.g. for toggles and copy. */
export const ORIENTATION_LABEL: Record<Orientation, string> = {
  rights: "Fewer restrictions = A",
  count: "Show law count (no grade)",
};

/** One-line explainer shown next to the grade-view toggle / legend ends. */
export const ORIENTATION_BLURB: Record<Orientation, string> = {
  rights:
    "Grade view: A = fewest restrictions, F = most. Fewer laws earns a higher grade.",
  count:
    "Neutral view: no letter grade — states are shaded by how many of the 134 tracked laws are in effect.",
};

/** Legend end labels ([left, right]) for the grade ramp. */
export function legendEnds(_orient: Orientation): [string, string] {
  return ["Fewer laws", "More laws"];
}
