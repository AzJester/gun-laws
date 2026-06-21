// Pure, framework-agnostic accessibility helpers. Kept dependency-free so they
// run in the node test env (no jsdom / DOM access) and can be unit-tested.
//
// These build the screen-reader text alternative for the choropleth map: a
// summary sentence plus per-state accessible labels. The SVG is decorative for
// AT; the real, navigable content is the associated table built from these.

import { displayGrade, type Orientation } from "./grading";
import type { StateSummary } from "./types";

/** Format a state's law count for screen readers (handles the pending case). */
export function lawCountLabel(lawCount: number | null): string {
  return lawCount === null
    ? "law count pending"
    : `${lawCount} of 134 tracked laws`;
}

/**
 * Accessible label for a single state shape / row, e.g.
 *   "Arizona, grade A, 8 of 134 tracked laws"
 *   "Arizona, grade A, 8 of 134 tracked laws, selected" (when selected)
 *
 * In the "count" orientation the letter grade is intentionally omitted (the
 * neutral view assigns no grade), matching the visible UI.
 */
export function stateAriaLabel(
  state: Pick<StateSummary, "name" | "grade" | "lawCount">,
  opts: { selected?: boolean; orient?: Orientation } = {},
): string {
  const { selected = false, orient = "rights" } = opts;
  const parts: string[] = [state.name];
  if (orient !== "count") {
    parts.push(`grade ${displayGrade(state.grade, orient)}`);
  }
  parts.push(lawCountLabel(state.lawCount));
  if (selected) parts.push("selected");
  return parts.join(", ");
}

/** Short announcement for the live region when a state is selected. */
export function selectionAnnouncement(
  state: Pick<StateSummary, "name" | "grade" | "lawCount">,
  orient: Orientation = "rights",
): string {
  if (orient === "count") {
    return `Showing ${state.name}, ${lawCountLabel(state.lawCount)}`;
  }
  return `Showing ${state.name}, grade ${displayGrade(state.grade, orient)}`;
}

export interface MapSummaryRow {
  code: string;
  name: string;
  /** The letter to display under the active orientation, or null in count view. */
  grade: string | null;
  lawCount: number | null;
  lawCountLabel: string;
}

export interface MapSummary {
  /** One-sentence overview for the SVG's accessible description. */
  caption: string;
  /** Per-state rows, sorted by state name, for the sr-only table. */
  rows: MapSummaryRow[];
}

/**
 * Build the screen-reader text alternative for the whole map: a caption plus a
 * row per state (name + displayed grade + law count). Sorted by name so the
 * table reads predictably regardless of dataset order.
 */
export function mapSummary(
  states: StateSummary[],
  orient: Orientation = "rights",
): MapSummary {
  const rows: MapSummaryRow[] = states
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      code: s.code,
      name: s.name,
      grade: orient === "count" ? null : displayGrade(s.grade, orient),
      lawCount: s.lawCount,
      lawCountLabel: lawCountLabel(s.lawCount),
    }));

  const caption =
    orient === "count"
      ? `Map of ${rows.length} US states and the District of Columbia, shaded by how many of 134 tracked firearm laws each has in effect. The table below lists each one with its law count.`
      : `Map of ${rows.length} US states and the District of Columbia, each shown with a letter grade (A = ${
          orient === "safety" ? "strongest protections" : "fewest restrictions"
        }, F = the opposite) and its count of tracked firearm laws. The table below lists each one with its grade and law count.`;

  return { caption, rows };
}
