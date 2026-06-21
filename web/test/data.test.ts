import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { getStates, getState, getPublishedChanges } from "@/lib/data";

// The data layer reads ../data/sample-states.json relative to process.cwd().
// Vitest runs from web/, so web/../data resolves to the repo's data/ dir.
// Force the JSON fallback by ensuring DATABASE_URL is unset.
const savedDbUrl = process.env.DATABASE_URL;
beforeAll(() => {
  delete process.env.DATABASE_URL;
});
afterAll(() => {
  if (savedDbUrl !== undefined) process.env.DATABASE_URL = savedDbUrl;
});

describe("data: getStates (JSON fallback)", () => {
  it("returns all 51 states/jurisdictions", async () => {
    const states = await getStates();
    expect(states).toHaveLength(51);
  });

  it("is sorted by name (A->Z)", async () => {
    const states = await getStates();
    const names = states.map((s) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("each summary carries a grade and policies", async () => {
    const states = await getStates();
    for (const s of states) {
      expect(s.code).toMatch(/^[A-Z]{2}$/);
      expect(typeof s.grade).toBe("string");
      expect(s.policies).toBeTruthy();
    }
  });
});

describe("data: getState (JSON fallback)", () => {
  it("AZ grades 'A' (fewest restrictions)", async () => {
    const az = await getState("AZ");
    expect(az).not.toBeNull();
    expect(az!.grade).toBe("A");
  });

  it("CA grades 'F' with provisions including >=1 citation", async () => {
    const ca = await getState("CA");
    expect(ca).not.toBeNull();
    expect(ca!.grade).toBe("F");
    expect(Array.isArray(ca!.provisions)).toBe(true);
    expect(ca!.provisions.length).toBeGreaterThan(0);
    const citations = ca!.provisions.flatMap((c) =>
      c.items.filter((it) => it.citation),
    );
    expect(citations.length).toBeGreaterThanOrEqual(1);
  });

  it("DC has a null lawCount", async () => {
    const dc = await getState("DC");
    expect(dc).not.toBeNull();
    expect(dc!.lawCount).toBeNull();
  });

  it("is case-insensitive on the code", async () => {
    const lower = await getState("az");
    expect(lower?.grade).toBe("A");
  });

  it("returns null for an unknown code", async () => {
    expect(await getState("ZZ")).toBeNull();
  });
});

describe("data: getPublishedChanges (JSON fallback)", () => {
  it("returns the curated sample changes (non-empty array)", async () => {
    const changes = await getPublishedChanges();
    expect(Array.isArray(changes)).toBe(true);
    expect(changes.length).toBeGreaterThan(0);
    for (const c of changes) {
      expect(c.stateCode).toMatch(/^[A-Z]{2}$/);
      expect(typeof c.headline).toBe("string");
    }
  });

  it("honors a per-state filter", async () => {
    const all = await getPublishedChanges();
    const someState = all[0].stateCode;
    const filtered = await getPublishedChanges({ state: someState });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((c) => c.stateCode === someState)).toBe(true);
  });
});
