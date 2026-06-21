import { describe, it, expect } from "vitest";

import {
  DEFAULT_EMBED_MODE,
  EMBED_MAX_YEAR,
  EMBED_MIN_YEAR,
  EMBED_MODES,
  embedQuery,
  embedSnippet,
  embedUrl,
  isEmbedMode,
  parseEmbedMode,
  parseEmbedOrient,
  parseEmbedYear,
} from "@/lib/embed";

describe("embed: mode parsing", () => {
  it("accepts every supported mode", () => {
    for (const m of EMBED_MODES) {
      expect(isEmbedMode(m)).toBe(true);
      expect(parseEmbedMode(m)).toBe(m);
    }
  });

  it("defaults unknown / missing modes to grade", () => {
    expect(parseEmbedMode("nope")).toBe(DEFAULT_EMBED_MODE);
    expect(parseEmbedMode(null)).toBe("grade");
    expect(parseEmbedMode(undefined)).toBe("grade");
    expect(isEmbedMode("nope")).toBe(false);
    expect(isEmbedMode(42)).toBe(false);
  });
});

describe("embed: year parsing/clamping", () => {
  it("returns null for absent / non-numeric values", () => {
    expect(parseEmbedYear(null)).toBeNull();
    expect(parseEmbedYear(undefined)).toBeNull();
    expect(parseEmbedYear("")).toBeNull();
    expect(parseEmbedYear("abc")).toBeNull();
  });

  it("parses numeric strings and rounds", () => {
    expect(parseEmbedYear("2018")).toBe(2018);
    expect(parseEmbedYear(2009)).toBe(2009);
    expect(parseEmbedYear("2010.6")).toBe(2011);
  });

  it("clamps into [min, max]", () => {
    expect(parseEmbedYear("1800")).toBe(EMBED_MIN_YEAR);
    expect(parseEmbedYear("3000")).toBe(EMBED_MAX_YEAR);
    expect(parseEmbedYear(EMBED_MIN_YEAR)).toBe(EMBED_MIN_YEAR);
    expect(parseEmbedYear(EMBED_MAX_YEAR)).toBe(EMBED_MAX_YEAR);
  });

  it("honors custom bounds", () => {
    expect(parseEmbedYear("2000", 1995, 2005)).toBe(2000);
    expect(parseEmbedYear("1990", 1995, 2005)).toBe(1995);
    expect(parseEmbedYear("2010", 1995, 2005)).toBe(2005);
  });
});

describe("embed: orientation parsing", () => {
  it("accepts known orientations and defaults to rights", () => {
    expect(parseEmbedOrient("rights")).toBe("rights");
    expect(parseEmbedOrient("safety")).toBe("safety");
    expect(parseEmbedOrient("count")).toBe("count");
    expect(parseEmbedOrient("bogus")).toBe("rights");
    expect(parseEmbedOrient(null)).toBe("rights");
  });
});

describe("embed: query building", () => {
  it("is empty for all defaults", () => {
    expect(embedQuery()).toBe("");
    expect(embedQuery({ mode: "grade", year: null, orient: "rights" })).toBe("");
  });

  it("includes only non-default params", () => {
    expect(embedQuery({ mode: "red_flag" })).toBe("?mode=red_flag");
    expect(embedQuery({ year: 2018 })).toBe("?year=2018");
    expect(embedQuery({ orient: "safety" })).toBe("?orient=safety");
  });

  it("combines params", () => {
    const q = embedQuery({ mode: "permitless_carry", year: 2020, orient: "count" });
    expect(q.startsWith("?")).toBe(true);
    expect(q).toContain("mode=permitless_carry");
    expect(q).toContain("year=2020");
    expect(q).toContain("orient=count");
  });
});

describe("embed: URL building", () => {
  const BASE = "https://azjester.github.io/gun-laws";

  it("builds the national map URL", () => {
    expect(embedUrl(BASE)).toBe(`${BASE}/embed`);
  });

  it("lowercases the state code for the single-state URL", () => {
    expect(embedUrl(BASE, "AZ")).toBe(`${BASE}/embed/az`);
    expect(embedUrl(BASE, "az")).toBe(`${BASE}/embed/az`);
  });

  it("strips trailing slashes from the base", () => {
    expect(embedUrl(`${BASE}/`)).toBe(`${BASE}/embed`);
    expect(embedUrl(`${BASE}///`, "ca")).toBe(`${BASE}/embed/ca`);
  });

  it("appends a non-default query", () => {
    expect(embedUrl(BASE, null, { mode: "red_flag", year: 2018 })).toBe(
      `${BASE}/embed?mode=red_flag&year=2018`,
    );
  });
});

describe("embed: iframe snippet", () => {
  const BASE = "https://azjester.github.io/gun-laws";

  it("matches the documented national-map snippet shape", () => {
    const snippet = embedSnippet(BASE);
    expect(snippet).toContain(`src="${BASE}/embed"`);
    expect(snippet).toContain('width="100%"');
    expect(snippet).toContain('height="520"');
    expect(snippet).toContain('style="border:0"');
    expect(snippet).toContain('title="GunLawMap"');
    expect(snippet.startsWith("<iframe")).toBe(true);
    expect(snippet.trim().endsWith("</iframe>")).toBe(true);
  });

  it("uses a shorter default height and per-state title for a state card", () => {
    const snippet = embedSnippet(BASE, "az");
    expect(snippet).toContain(`src="${BASE}/embed/az"`);
    expect(snippet).toContain('height="360"');
    expect(snippet).toContain('title="GunLawMap — AZ"');
  });

  it("honors explicit width/height/title overrides", () => {
    const snippet = embedSnippet(BASE, null, {
      width: "640",
      height: 400,
      title: "Custom",
    });
    expect(snippet).toContain('width="640"');
    expect(snippet).toContain('height="400"');
    expect(snippet).toContain('title="Custom"');
  });
});
