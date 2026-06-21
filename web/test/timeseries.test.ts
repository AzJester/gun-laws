import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, it, expect, beforeAll } from "vitest";

import {
  clampYear,
  entryFor,
  entryPolicyOn,
  firstYear,
  isTimeSeries,
  latestYear,
  yearsRange,
  type TimeSeries,
} from "@/lib/timeseries";

// Load the real committed time-series data (repo root). Vitest runs from web/,
// so web/../data resolves to the repo's data/ dir — the same path the prebuild
// step copies from.
let ts: TimeSeries;
beforeAll(async () => {
  const p = path.join(process.cwd(), "..", "data", "time-series.json");
  const raw = await fs.readFile(p, "utf8");
  ts = JSON.parse(raw) as TimeSeries;
});

describe("timeseries: isTimeSeries", () => {
  it("accepts the real dataset", () => {
    expect(isTimeSeries(ts)).toBe(true);
  });
  it("rejects junk", () => {
    expect(isTimeSeries(null)).toBe(false);
    expect(isTimeSeries({})).toBe(false);
    expect(isTimeSeries({ _meta: {}, states: {} })).toBe(false);
  });
});

describe("timeseries: yearsRange", () => {
  it("covers 1991–2025 inclusive (35 years)", () => {
    const years = yearsRange(ts);
    expect(years).toHaveLength(35);
    expect(years[0]).toBe(1991);
    expect(years[years.length - 1]).toBe(2025);
  });

  it("matches firstYear/latestYear helpers", () => {
    expect(firstYear(ts)).toBe(1991);
    expect(latestYear(ts)).toBe(2025);
  });

  it("derives a contiguous range from meta when years[] is absent", () => {
    const synthetic = {
      _meta: { firstYear: 2000, lastYear: 2003, years: [] },
      states: {},
    } as unknown as TimeSeries;
    expect(yearsRange(synthetic)).toEqual([2000, 2001, 2002, 2003]);
  });
});

describe("timeseries: entryFor", () => {
  it("returns a valid grade for a known state/year", () => {
    const e = entryFor(ts, "CA", 1991);
    expect(e).not.toBeNull();
    expect(typeof e!.g).toBe("string");
    expect(e!.g.length).toBeGreaterThan(0);
  });

  it("is case-insensitive on the code and accepts string years", () => {
    const lower = entryFor(ts, "ca", "2025");
    const upper = entryFor(ts, "CA", 2025);
    expect(lower).toEqual(upper);
  });

  it("returns null for unknown state / year / null series", () => {
    expect(entryFor(ts, "ZZ", 2025)).toBeNull();
    expect(entryFor(ts, "CA", 1800)).toBeNull();
    expect(entryFor(null, "CA", 2025)).toBeNull();
  });

  it("DC has a null law count (n)", () => {
    const dc = entryFor(ts, "DC", 2025);
    expect(dc).not.toBeNull();
    expect(dc!.n).toBeNull();
  });

  it("latest-year grade is F for CA and A for AZ", () => {
    const last = latestYear(ts);
    expect(entryFor(ts, "CA", last)!.g).toBe("F");
    expect(entryFor(ts, "AZ", last)!.g).toBe("A");
  });
});

describe("timeseries: entryPolicyOn", () => {
  it("reads the matching flag per color mode", () => {
    const ca = entryFor(ts, "CA", 2025)!;
    // CA in 2025 has universal background checks + a red-flag law, no permitless carry.
    expect(entryPolicyOn(ca, "universal_bg_check")).toBe(true);
    expect(entryPolicyOn(ca, "red_flag")).toBe(true);
    expect(entryPolicyOn(ca, "permitless_carry")).toBe(false);
  });

  it("AZ in 2025 has permitless carry on", () => {
    const az = entryFor(ts, "AZ", 2025)!;
    expect(entryPolicyOn(az, "permitless_carry")).toBe(true);
  });

  it("returns false for an unknown mode", () => {
    const ca = entryFor(ts, "CA", 2025)!;
    expect(entryPolicyOn(ca, "does_not_exist")).toBe(false);
  });
});

describe("timeseries: clampYear", () => {
  it("clamps below/above into the series range", () => {
    expect(clampYear(ts, 1800)).toBe(1991);
    expect(clampYear(ts, 3000)).toBe(2025);
    expect(clampYear(ts, 2005)).toBe(2005);
  });
});

// Consistency: the latest-year entry must equal today's dataset for every
// jurisdiction (grade + law count), so the slider at 2025 reproduces "current".
describe("timeseries: latest year matches the current dataset", () => {
  it("grade + count agree for every state at 2025", async () => {
    const dsRaw = await fs.readFile(
      path.join(process.cwd(), "..", "data", "sample-states.json"),
      "utf8",
    );
    const ds = JSON.parse(dsRaw) as {
      states: Record<string, { grade: string; lawCount: number | null }>;
    };
    const last = latestYear(ts);
    for (const [code, cur] of Object.entries(ds.states)) {
      const e = entryFor(ts, code, last);
      expect(e, `missing ts entry for ${code} ${last}`).not.toBeNull();
      expect(e!.g, `grade mismatch for ${code}`).toBe(cur.grade);
      expect(e!.n, `count mismatch for ${code}`).toBe(cur.lawCount ?? null);
    }
  });
});
