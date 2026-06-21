// Grading + color logic, mirrored exactly from the mockup so the app and the
// mockup stay visually identical. A = FEWEST restrictions (opposite of
// gun-safety scorecards).

import type { Grade, Policies } from "./types";

// index = restriction count 0..6
export const GRADES: Grade[] = ["A", "A-", "B", "C", "D", "D-", "F"];

// Sequential single-hue teal ramp, light (fewer restrictions) -> dark (more).
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
  "no statewide restrictions",
  "minimal restrictions",
  "few restrictions",
  "moderate restrictions",
  "significant restrictions",
  "strong restrictions",
  "the most restrictions",
];

/**
 * Restriction count (0..6). Permitless carry is a *freedom* (its absence — a
 * carry-permit requirement — is the restriction). The other five flags are
 * restrictions when true.
 */
export function restrictionCount(p: Policies): number {
  return (
    (p.permitless_carry ? 0 : 1) +
    (p.universal_bg_check ? 1 : 0) +
    (p.red_flag ? 1 : 0) +
    (p.assault_weapon_ban ? 1 : 0) +
    (p.magazine_limit ? 1 : 0) +
    (p.waiting_period ? 1 : 0)
  );
}

export function gradeFor(p: Policies): Grade {
  return GRADES[restrictionCount(p)];
}

/** Readable text color over a given ramp index. */
export function rampText(r: number): string {
  return r >= 3 ? "#ffffff" : "#0c2b27";
}
