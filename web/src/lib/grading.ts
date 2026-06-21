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

// Neutral pair for the single-policy ("yes/no") color modes.
export const POLICY_YES = { bg: "#3a86c8", fg: "#ffffff" };
export const POLICY_NO = { bg: "#e6edf3", fg: "#3a4a58" };

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
