import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  classifyChange,
  classifyWithRules,
  hasAnthropicKey,
} from "@/lib/ingest/classifier";
import type { NormalizedChange } from "@/lib/ingest/types";

function change(overrides: Partial<NormalizedChange> = {}): NormalizedChange {
  return {
    state: "CA",
    externalRef: "ref-1",
    kind: "introduced",
    headline: "AB 123: A firearm-related measure",
    eventDate: "2026-01-15",
    url: null,
    sourceKind: "legiscan",
    ...overrides,
  };
}

describe("ingest classifier: rules fallback (no ANTHROPIC_API_KEY)", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  });

  it("hasAnthropicKey() is false without a key", () => {
    expect(hasAnthropicKey()).toBe(false);
  });

  it("classifyChange returns method 'rules' without a key and never throws", async () => {
    const out = await classifyChange(change());
    expect(out.method).toBe("rules");
    expect(typeof out.summary).toBe("string");
    expect(out.summary.length).toBeGreaterThan(0);
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("maps 'red flag' / 'ERPO' to the red_flag policy", async () => {
    const a = await classifyChange(
      change({ headline: "SB 9: Establishes a red flag protection order process" }),
    );
    expect(a.policyKey).toBe("red_flag");

    const b = await classifyChange(
      change({ headline: "HB 22: ERPO petitions by family members" }),
    );
    expect(b.policyKey).toBe("red_flag");
  });

  it("maps carry / background-check / magazine keywords", async () => {
    expect(
      classifyWithRules(change({ headline: "Constitutional carry without a permit" }))
        .policyKey,
    ).toBe("permitless_carry");
    expect(
      classifyWithRules(change({ headline: "Universal background check for private sales" }))
        .policyKey,
    ).toBe("universal_bg_check");
    expect(
      classifyWithRules(change({ headline: "Large-capacity magazine 10-round limit" }))
        .policyKey,
    ).toBe("magazine_limit");
  });

  it("maps 'enjoined' / 'struck' headlines to a status (status path)", async () => {
    const enjoined = classifyWithRules(
      change({ kind: "court_ruling", headline: "Court enjoined enforcement of the carry ban" }),
    );
    expect(enjoined.proposedStatus).toBe("enjoined");

    const struck = classifyWithRules(
      change({ kind: "court_ruling", headline: "Magazine cap struck down as unconstitutional" }),
    );
    expect(struck.proposedStatus).toBe("struck");
  });

  it("leaves policyKey null for an unmatched headline (no throw)", () => {
    const out = classifyWithRules(
      change({ headline: "HB 0: A measure about an unrelated topic" }),
    );
    expect(out.policyKey).toBeNull();
    expect(out.method).toBe("rules");
  });
});
