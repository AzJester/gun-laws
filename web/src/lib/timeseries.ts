// Typed loader + pure helpers for the historical time-series data that powers
// the year slider (1991–2025).
//
// The data lives at the repo root in data/time-series.json and is copied to
// public/data/time-series.json by scripts/gen-static-data.ts at prebuild, so it
// ships in both the server build and the static Pages export. The client fetches
// it from `${BASE}/data/time-series.json`.
//
// Shape (mirrors data/time-series.json):
//   { _meta: { firstYear, lastYear, years, ... },
//     states: { [CODE]: { [year:string]: TimeSeriesEntry } } }
//
// This module is framework-agnostic and dependency-free (pure functions only) so
// it runs in the node test env and can be unit-tested directly.

import type { Grade } from "./types";

/** One state-year cell: stored "fewer-laws = A" grade, law count, and the six
 *  headline policy flags (1 = in effect, 0 = not). `n` is null for DC. */
export interface TimeSeriesEntry {
  /** Stored grade (A = fewest laws/restrictions). */
  g: Grade;
  /** Number of tracked laws in effect, or null where unknown (DC). */
  n: number | null;
  /** Permitless carry. */
  pc: 0 | 1;
  /** Universal background checks. */
  ubc: 0 | 1;
  /** Red-flag (ERPO) law. */
  rf: 0 | 1;
  /** Assault-weapon ban. */
  awb: 0 | 1;
  /** Magazine limit. */
  mag: 0 | 1;
  /** Waiting period. */
  wp: 0 | 1;
}

export interface TimeSeriesMeta {
  description?: string;
  source?: string;
  firstYear: number;
  lastYear: number;
  years: number[];
  fields?: unknown;
  note?: string;
}

export interface TimeSeries {
  _meta: TimeSeriesMeta;
  states: Record<string, Record<string, TimeSeriesEntry>>;
}

/** Narrow guard for a parsed JSON blob fetched from public/data. */
export function isTimeSeries(v: unknown): v is TimeSeries {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const meta = o._meta as Record<string, unknown> | undefined;
  return (
    !!meta &&
    typeof meta.firstYear === "number" &&
    typeof meta.lastYear === "number" &&
    Array.isArray(meta.years) &&
    !!o.states &&
    typeof o.states === "object"
  );
}

/**
 * The inclusive list of years covered, e.g. [1991, 1992, ..., 2025]. Prefers the
 * explicit `_meta.years` array; falls back to deriving it from firstYear/lastYear
 * so callers always get a contiguous range.
 */
export function yearsRange(ts: TimeSeries): number[] {
  const { firstYear, lastYear, years } = ts._meta;
  if (Array.isArray(years) && years.length > 0) return years;
  const out: number[] = [];
  for (let y = firstYear; y <= lastYear; y += 1) out.push(y);
  return out;
}

/** The latest year in the series (the "current" snapshot). */
export function latestYear(ts: TimeSeries): number {
  return ts._meta.lastYear;
}

/** The earliest year in the series. */
export function firstYear(ts: TimeSeries): number {
  return ts._meta.firstYear;
}

/**
 * The time-series entry for a state code + year, or null when the series, state,
 * or year is missing. Code is case-insensitive; year may be a number or string.
 */
export function entryFor(
  ts: TimeSeries | null | undefined,
  code: string,
  year: number | string,
): TimeSeriesEntry | null {
  if (!ts) return null;
  const byYear = ts.states[code.toUpperCase()];
  if (!byYear) return null;
  return byYear[String(year)] ?? null;
}

/** Clamp a year into the series' [firstYear, lastYear] range. */
export function clampYear(ts: TimeSeries, year: number): number {
  return Math.min(Math.max(year, ts._meta.firstYear), ts._meta.lastYear);
}

/** Map a single policy color mode to the matching time-series flag key. */
export const POLICY_FLAG_KEY: Record<string, keyof TimeSeriesEntry> = {
  permitless_carry: "pc",
  universal_bg_check: "ubc",
  red_flag: "rf",
};

/** Read a policy flag (boolean) off a time-series entry for a color mode. */
export function entryPolicyOn(entry: TimeSeriesEntry, mode: string): boolean {
  const key = POLICY_FLAG_KEY[mode];
  if (!key) return false;
  return entry[key] === 1;
}
