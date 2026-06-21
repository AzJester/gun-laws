import { describe, it, expect, beforeAll, afterAll } from "vitest";

import {
  lawCountLabel,
  mapSummary,
  selectionAnnouncement,
  stateAriaLabel,
} from "@/lib/a11y";
import { getStates } from "@/lib/data";
import type { StateSummary } from "@/lib/types";

// Minimal StateSummary factory for deterministic helper tests. Only the fields
// the a11y helpers read are meaningful.
function summary(p: Partial<StateSummary> & Pick<StateSummary, "code" | "name" | "grade">): StateSummary {
  return {
    lawCount: 0,
    restrictions: 0,
    policies: {
      permitless_carry: false,
      universal_bg_check: false,
      red_flag: false,
      assault_weapon_ban: false,
      magazine_limit: false,
      waiting_period: false,
    },
    detailed: false,
    year: 2020,
    source: null,
    updates: [],
    ...p,
  };
}

const AZ = summary({ code: "AZ", name: "Arizona", grade: "A", lawCount: 8 });
const CA = summary({ code: "CA", name: "California", grade: "F", lawCount: 109 });
const DC = summary({ code: "DC", name: "District of Columbia", grade: "F", lawCount: null });

describe("a11y: lawCountLabel", () => {
  it("formats a numeric count out of 134", () => {
    expect(lawCountLabel(8)).toBe("8 of 134 tracked laws");
  });
  it("reports pending when the count is null", () => {
    expect(lawCountLabel(null)).toBe("law count pending");
  });
});

describe("a11y: stateAriaLabel", () => {
  it("includes the state name, grade, and law count", () => {
    const label = stateAriaLabel(AZ);
    expect(label).toContain("Arizona");
    expect(label).toContain("grade A");
    expect(label).toContain("8 of 134 tracked laws");
  });

  it("has a distinct selected variant", () => {
    const plain = stateAriaLabel(AZ);
    const selected = stateAriaLabel(AZ, { selected: true });
    expect(plain).not.toContain("selected");
    expect(selected).toContain("selected");
    expect(selected.endsWith("selected")).toBe(true);
  });

  it("always shows the stored grade (no flipped lens)", () => {
    // Arizona is always grade A — fewer restrictions = A, in every grade view.
    expect(stateAriaLabel(AZ, { orient: "rights" })).toContain("grade A");
  });

  it("omits the letter grade in the count orientation", () => {
    const label = stateAriaLabel(AZ, { orient: "count" });
    expect(label).not.toContain("grade");
    expect(label).toContain("Arizona");
    expect(label).toContain("8 of 134 tracked laws");
  });

  it("handles a pending (null) law count", () => {
    expect(stateAriaLabel(DC)).toContain("law count pending");
  });
});

describe("a11y: selectionAnnouncement", () => {
  it("announces the state and grade", () => {
    expect(selectionAnnouncement(AZ)).toBe("Showing Arizona, grade A");
  });

  it("announces the law count (no grade) in the count lens", () => {
    expect(selectionAnnouncement(AZ, "count")).toBe(
      "Showing Arizona, 8 of 134 tracked laws",
    );
  });
});

describe("a11y: mapSummary", () => {
  it("emits one row per state with grade + law-count fields", () => {
    const { rows } = mapSummary([CA, AZ]);
    expect(rows).toHaveLength(2);
    const az = rows.find((r) => r.code === "AZ")!;
    expect(az.grade).toBe("A");
    expect(az.lawCount).toBe(8);
    expect(az.lawCountLabel).toBe("8 of 134 tracked laws");
  });

  it("sorts rows by state name", () => {
    const { rows } = mapSummary([CA, AZ, DC]);
    expect(rows.map((r) => r.name)).toEqual([
      "Arizona",
      "California",
      "District of Columbia",
    ]);
  });

  it("drops the letter grade in the count orientation", () => {
    const { rows } = mapSummary([AZ], "count");
    expect(rows[0].grade).toBeNull();
    expect(rows[0].lawCountLabel).toBe("8 of 134 tracked laws");
  });

  it("builds a caption naming the grade's A end", () => {
    expect(mapSummary([AZ], "rights").caption).toContain("fewest restrictions");
    expect(mapSummary([AZ], "count").caption).toContain("how many");
  });
});

// Integration check against the real dataset: the summary must cover every
// jurisdiction the map shows (50 states + DC), each with a grade and count.
describe("a11y: mapSummary over the full dataset", () => {
  const savedDbUrl = process.env.DATABASE_URL;
  beforeAll(() => {
    delete process.env.DATABASE_URL;
  });
  afterAll(() => {
    if (savedDbUrl !== undefined) process.env.DATABASE_URL = savedDbUrl;
  });

  it("lists all 51 states/jurisdictions with grade + law count", async () => {
    const states = await getStates();
    const { rows } = mapSummary(states);
    expect(rows).toHaveLength(51);
    for (const row of rows) {
      expect(row.code).toMatch(/^[A-Z]{2}$/);
      expect(typeof row.grade).toBe("string");
      // lawCount is a number or null (pending); the label is always present.
      expect(typeof row.lawCountLabel).toBe("string");
      expect(row.lawCountLabel.length).toBeGreaterThan(0);
    }
  });
});
