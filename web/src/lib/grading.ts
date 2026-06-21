// Grading + color logic. Grades are precomputed in the dataset (from the State
// Firearm Laws Database). A = FEWEST laws/restrictions, F = the most — the
// opposite orientation from gun-safety scorecards.

import type { Grade } from "./types";

// Ordered light -> dark: grade A (fewest laws) -> grade F (most).
export const GRADES: Grade[] = ["A", "A-", "B", "C", "D", "D-", "F"];

// Sequential single-hue teal ramp, indexed by GRADES.
export const RAMP = [
  "#e9f4f1",
  "#c6e6df",
  "#97d2c8",
  "#5cb6aa",
  "#359086",
  "#256f69",
  "#143f3b",
];

export const DESC = [
  "fewest tracked laws",
  "very few tracked laws",
  "few tracked laws",
  "a moderate number of tracked laws",
  "many tracked laws",
  "most tracked laws",
  "the most tracked laws",
];

/** Fill color for a grade (light = A = fewest laws, dark = F = most). */
export function gradeColor(grade: Grade): string {
  const i = GRADES.indexOf(grade);
  return RAMP[i] ?? RAMP[0];
}

/** Readable text color over a grade's fill. White on the darker half. */
export function gradeTextColor(grade: Grade): string {
  return GRADES.indexOf(grade) >= 3 ? "#ffffff" : "#0c2b27";
}
