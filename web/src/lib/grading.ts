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
export const TEXT = [
  "#ffffff",
  "#10331c",
  "#163a12",
  "#4a3a00",
  "#4a2c08",
  "#ffffff",
  "#ffffff",
];

// Single-policy ("yes/no") color modes. "Yes" is themed per policy — red-flag
// laws read in red — while "No" is a shared neutral.
export const POLICY_NO = { bg: "#e6edf3", fg: "#3a4a58" };
export const POLICY_YES = { bg: "#3a86c8", fg: "#ffffff" }; // default "yes"
export const POLICY_YES_BY_MODE: Record<string, { bg: string; fg: string }> = {
  permitless_carry: { bg: "#3a86c8", fg: "#ffffff" },
  universal_bg_check: { bg: "#3a86c8", fg: "#ffffff" },
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
// Neutrality / orientation (presentation only)
// ---------------------------------------------------------------------------
//
// Grades are *stored* in the "fewer-restrictions = A" orientation. Picking which
// end is "A" is itself a value choice, so the UI lets a viewer flip the lens:
//
//   - "rights"  → "Fewer restrictions = A" (gun-rights view, the stored default)
//   - "safety"  → "More protections = A"   (gun-safety view, inverted display)
//   - "count"   → no letter grade; show the raw law count instead
//
// The underlying data never changes; only the displayed letter + color flip.

export type Orientation = "rights" | "safety" | "count";

export const ORIENTATIONS: Orientation[] = ["rights", "safety", "count"];

export const DEFAULT_ORIENTATION: Orientation = "rights";

export function isOrientation(v: unknown): v is Orientation {
  return v === "rights" || v === "safety" || v === "count";
}

export function parseOrientation(v: unknown): Orientation {
  return isOrientation(v) ? v : DEFAULT_ORIENTATION;
}

/**
 * The letter to *display* for a stored grade under the active orientation. In
 * the gun-safety view we mirror the scale (A↔F) so display = GRADES[6 - index].
 */
export function displayGrade(grade: Grade, orient: Orientation = "rights"): Grade {
  const i = GRADES.indexOf(grade);
  if (i < 0) return grade;
  if (orient === "safety") return GRADES[GRADES.length - 1 - i];
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

/** Short human label for an orientation, e.g. for toggles and copy. */
export const ORIENTATION_LABEL: Record<Orientation, string> = {
  rights: "Fewer restrictions = A",
  safety: "More protections = A",
  count: "Show law count (no grade)",
};

/** One-line explainer shown next to the orientation toggle / legend ends. */
export const ORIENTATION_BLURB: Record<Orientation, string> = {
  rights:
    "Gun-rights view: A = fewest restrictions, F = most. This is the stored orientation.",
  safety:
    "Gun-safety view: A = strongest protections, F = weakest. The same data, displayed with the scale flipped.",
  count:
    "Neutral view: no letter grade — states are shaded by how many of the 134 tracked laws are in effect.",
};

/** Legend end labels ([left, right]) for the grade ramp under an orientation. */
export function legendEnds(orient: Orientation): [string, string] {
  if (orient === "safety") return ["Weaker protections", "Stronger protections"];
  return ["Fewer laws", "More laws"];
}
