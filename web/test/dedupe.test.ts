import { describe, it, expect } from "vitest";

import { dedupe } from "@/lib/ingest";
import type { NormalizedChange } from "@/lib/ingest/types";

function rec(overrides: Partial<NormalizedChange> = {}): NormalizedChange {
  return {
    state: "CA",
    externalRef: "ref-1",
    kind: "introduced",
    headline: "Bill",
    eventDate: "2026-01-01",
    url: null,
    sourceKind: "legiscan",
    ...overrides,
  };
}

describe("ingest dedupe()", () => {
  it("collapses duplicate externalRefs to one record", () => {
    const out = dedupe([rec(), rec(), rec()]);
    expect(out).toHaveLength(1);
    expect(out[0].externalRef).toBe("ref-1");
  });

  it("keeps the record with the most recent eventDate on a collision", () => {
    const out = dedupe([
      rec({ eventDate: "2026-01-01", headline: "old" }),
      rec({ eventDate: "2026-06-01", headline: "new" }),
      rec({ eventDate: "2026-03-01", headline: "mid" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].headline).toBe("new");
    expect(out[0].eventDate).toBe("2026-06-01");
  });

  it("preserves distinct externalRefs", () => {
    const out = dedupe([
      rec({ externalRef: "a" }),
      rec({ externalRef: "b" }),
      rec({ externalRef: "c" }),
    ]);
    expect(out.map((r) => r.externalRef).sort()).toEqual(["a", "b", "c"]);
  });

  it("drops records missing externalRef or state", () => {
    const out = dedupe([
      rec({ externalRef: "" }),
      rec({ externalRef: "ok", state: "" }),
      rec({ externalRef: "good" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].externalRef).toBe("good");
  });

  it("returns an empty array for empty input", () => {
    expect(dedupe([])).toEqual([]);
  });
});
