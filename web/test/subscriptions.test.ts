import { describe, it, expect } from "vitest";

import {
  isValidEmail,
  normalizeScope,
  scopeMatches,
  createPendingSubscription,
} from "@/lib/subscriptions";

describe("subscriptions: isValidEmail", () => {
  it("accepts a plausible address", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user.name+tag@example.com")).toBe(true);
  });

  it("rejects garbage / non-strings", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });

  it("rejects an over-long address", () => {
    expect(isValidEmail("a".repeat(250) + "@example.com")).toBe(false);
  });
});

describe("subscriptions: normalizeScope", () => {
  it("uppercases + dedupes valid 2-letter state codes", () => {
    expect(normalizeScope(["ca", "CA", "tx", "zzz", "1"], []).states).toEqual([
      "CA",
      "TX",
    ]);
  });

  it("keeps only snake_case policy keys, deduped", () => {
    expect(
      normalizeScope([], ["red_flag", "red_flag", "Bad Key", "waiting_period"])
        .policies,
    ).toEqual(["red_flag", "waiting_period"]);
  });

  it("returns empty arrays for undefined input", () => {
    expect(normalizeScope()).toEqual({ states: [], policies: [] });
  });
});

describe("subscriptions: scopeMatches", () => {
  it("an all-states / all-policies scope matches anything", () => {
    expect(scopeMatches({ states: [], policies: [] }, "CA", "red_flag")).toBe(true);
    expect(scopeMatches({ states: [], policies: [] }, "TX", null)).toBe(true);
  });

  it("filters by state code (case-insensitive)", () => {
    const scope = { states: ["CA"], policies: [] };
    expect(scopeMatches(scope, "ca", null)).toBe(true);
    expect(scopeMatches(scope, "TX", null)).toBe(false);
  });

  it("a policy-narrowed scope excludes changes with no policyKey", () => {
    const scope = { states: [], policies: ["red_flag"] };
    expect(scopeMatches(scope, "CA", "red_flag")).toBe(true);
    expect(scopeMatches(scope, "CA", "waiting_period")).toBe(false);
    expect(scopeMatches(scope, "CA", null)).toBe(false);
  });
});

describe("subscriptions: createPendingSubscription without a database", () => {
  it("returns ok:false reason:no_database (graceful, no throw)", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const res = await createPendingSubscription({ email: "user@example.com" });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("no_database");
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});
