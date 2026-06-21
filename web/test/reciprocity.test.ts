import { describe, it, expect } from "vitest";

import {
  reciprocityCodes,
  isPermitless,
  honors,
  honoredIn,
  honorsPermitFrom,
  getReciprocity,
} from "@/lib/reciprocity";

describe("reciprocity: bundled matrix invariants", () => {
  const codes = reciprocityCodes();

  it("covers all 50 states + DC (51), sorted", () => {
    expect(codes).toHaveLength(51);
    expect([...codes].sort()).toEqual(codes); // already sorted
  });

  it("has at least one permitless ('constitutional carry') state", () => {
    const permitless = codes.filter((c) => isPermitless(c));
    expect(permitless.length).toBeGreaterThan(0);
    // AZ is a well-known permitless state in the illustrative data.
    expect(isPermitless("AZ")).toBe(true);
  });

  it("a may-issue state like CA honors no permits and is not permitless", () => {
    expect(isPermitless("CA")).toBe(false);
    expect(honors("CA")).toEqual([]);
  });

  it("honors() returns sorted codes that never include the state itself", () => {
    for (const code of codes) {
      const h = honors(code);
      expect([...h].sort()).toEqual(h); // sorted
      expect(h).not.toContain(code); // no self-missing / self-reference
      // referenced codes are all valid jurisdictions in the matrix
      for (const dest of h) expect(codes).toContain(dest);
    }
  });

  it("honors() is empty for an unknown code", () => {
    expect(honors("ZZ")).toEqual([]);
    expect(getReciprocity("ZZ")).toBeNull();
  });

  it("isPermitless is case-insensitive on the code", () => {
    expect(isPermitless("az")).toBe(isPermitless("AZ"));
  });
});

describe("reciprocity: honoredIn / honorsPermitFrom consistency", () => {
  it("honoredIn never lists the origin state in either bucket", () => {
    const { byPermit, permitless } = honoredIn("AZ");
    expect(byPermit).not.toContain("AZ");
    expect(permitless).not.toContain("AZ");
  });

  it("honoredIn buckets are sorted and disjoint", () => {
    const { byPermit, permitless } = honoredIn("FL");
    expect([...byPermit].sort()).toEqual(byPermit);
    expect([...permitless].sort()).toEqual(permitless);
    const overlap = byPermit.filter((c) => permitless.includes(c));
    expect(overlap).toEqual([]);
  });

  it("a permitless destination honors any origin's permit", () => {
    // AZ is permitless, so it honors a permit from anywhere (no permit needed).
    expect(isPermitless("AZ")).toBe(true);
    expect(honorsPermitFrom("AZ", "CA")).toBe(true);
    expect(honorsPermitFrom("AZ", "NY")).toBe(true);
  });

  it("honorsPermitFrom agrees with the destination's honors list", () => {
    const dest = "CO"; // a non-permitless state with an explicit honors list
    expect(isPermitless(dest)).toBe(false);
    for (const origin of honors(dest)) {
      expect(honorsPermitFrom(dest, origin)).toBe(true);
    }
    // A state CO does not list is not honored.
    expect(honorsPermitFrom(dest, "CA")).toBe(false);
  });

  it("honorsPermitFrom is false for an unknown destination", () => {
    expect(honorsPermitFrom("ZZ", "AZ")).toBe(false);
  });

  it("honoredIn(origin).byPermit matches honorsPermitFrom(dest, origin)", () => {
    const origin = "TX";
    const { byPermit } = honoredIn(origin);
    for (const dest of byPermit) {
      expect(honorsPermitFrom(dest, origin)).toBe(true);
    }
  });
});
