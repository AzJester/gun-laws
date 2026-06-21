import { describe, it, expect } from "vitest";

import {
  GRADES,
  RAMP,
  TEXT,
  gradeColor,
  gradeTextColor,
  displayGrade,
  policyYes,
  POLICY_YES,
} from "@/lib/grading";
import type { Grade } from "@/lib/types";

describe("grading: color index alignment", () => {
  it("RAMP and TEXT are index-aligned to GRADES", () => {
    expect(RAMP).toHaveLength(GRADES.length);
    expect(TEXT).toHaveLength(GRADES.length);
  });

  it("gradeColor returns the RAMP entry at each grade's index", () => {
    GRADES.forEach((g, i) => {
      expect(gradeColor(g)).toBe(RAMP[i]);
    });
  });

  it("gradeTextColor returns the TEXT entry at each grade's index", () => {
    GRADES.forEach((g, i) => {
      expect(gradeTextColor(g)).toBe(TEXT[i]);
    });
  });

  it("A is greenest (first ramp) and F is reddest (last ramp)", () => {
    expect(gradeColor("A")).toBe(RAMP[0]);
    expect(gradeColor("F")).toBe(RAMP[RAMP.length - 1]);
  });

  it("falls back to RAMP[0]/TEXT[0] for an unknown grade", () => {
    expect(gradeColor("Z" as Grade)).toBe(RAMP[0]);
    expect(gradeTextColor("Z" as Grade)).toBe(TEXT[0]);
  });
});

describe("grading: displayGrade orientation", () => {
  it("is the identity in the rights view (stored orientation)", () => {
    for (const g of GRADES) {
      expect(displayGrade(g, "rights")).toBe(g);
      expect(displayGrade(g)).toBe(g); // default = rights
    }
  });

  it("mirrors the scale A<->F in the safety view", () => {
    const mirror: Record<Grade, Grade> = {
      A: "F",
      "A-": "D-",
      B: "D",
      C: "C",
      D: "B",
      "D-": "A-",
      F: "A",
    };
    for (const g of GRADES) {
      expect(displayGrade(g, "safety")).toBe(mirror[g]);
    }
  });

  it("safety mirror is an involution (mirror of mirror = identity)", () => {
    for (const g of GRADES) {
      expect(displayGrade(displayGrade(g, "safety"), "safety")).toBe(g);
    }
  });

  it("count orientation does not flip the letter (handled separately by UI)", () => {
    for (const g of GRADES) {
      expect(displayGrade(g, "count")).toBe(g);
    }
  });

  it("returns the input unchanged for an unknown grade", () => {
    expect(displayGrade("Z" as Grade, "safety")).toBe("Z");
  });
});

describe("grading: policyYes", () => {
  it("red_flag reads red", () => {
    expect(policyYes("red_flag").bg).toBe("#d73027");
  });

  it("other policies use the default blue 'yes'", () => {
    expect(policyYes("permitless_carry")).toEqual(POLICY_YES);
    expect(policyYes("universal_bg_check")).toEqual(POLICY_YES);
  });

  it("an unknown mode falls back to the default blue 'yes'", () => {
    expect(policyYes("does_not_exist")).toEqual(POLICY_YES);
  });
});
