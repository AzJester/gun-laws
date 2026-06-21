import { describe, it, expect } from "vitest";

import { upsertKeyFor } from "@/lib/ingest";

// Unit test of the pure upsert-key derivation that backs the native
// prisma.changeEvent.upsert() (keyed on the compound (stateCode, externalRef)
// unique index). No DB involved.

describe("ingest upsertKeyFor()", () => {
  it("derives the compound (stateCode, externalRef) key", () => {
    const key = upsertKeyFor({ state: "CA", externalRef: "legiscan:123" });
    expect(key).toEqual({ stateCode: "CA", externalRef: "legiscan:123" });
  });

  it("returns null when externalRef is empty (cannot key an upsert)", () => {
    expect(upsertKeyFor({ state: "CA", externalRef: "" })).toBeNull();
  });

  it("returns null when state is empty", () => {
    expect(upsertKeyFor({ state: "", externalRef: "openstates:x" })).toBeNull();
  });

  it("distinguishes the same externalRef across different states", () => {
    const ca = upsertKeyFor({ state: "CA", externalRef: "ref" });
    const tx = upsertKeyFor({ state: "TX", externalRef: "ref" });
    expect(ca).not.toEqual(tx);
    expect(ca?.stateCode).toBe("CA");
    expect(tx?.stateCode).toBe("TX");
  });
});
