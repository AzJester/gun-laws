import { createRequire } from "node:module";

import { describe, it, expect } from "vitest";

import { FEDERAL_LAWS } from "@/lib/federal";
import { CATEGORY_EXPLAINERS, CATEGORY_TITLES, GLOSSARY } from "@/lib/glossary";

// Read the canonical category list straight from the repo codebook so this test
// fails if a category title is added/renamed there without a matching explainer.
// Vitest runs from web/, so ../../tools resolves to the repo's tools/ dir.
const require = createRequire(import.meta.url);
const { categories } = require("../../tools/sfl-codebook.js") as {
  categories: [string, string][];
};
const codebookTitles = categories.map(([, title]) => title);

describe("content: category explainers", () => {
  it("CATEGORY_TITLES exactly mirrors the codebook category titles", () => {
    expect([...CATEGORY_TITLES]).toEqual(codebookTitles);
  });

  it("every codebook category title has a non-empty explainer", () => {
    for (const title of codebookTitles) {
      const explainer = CATEGORY_EXPLAINERS[title];
      expect(explainer, `missing explainer for "${title}"`).toBeTruthy();
      expect(explainer.trim().length).toBeGreaterThan(0);
    }
  });

  it("handles the data-only 'Note' category gracefully", () => {
    expect(CATEGORY_EXPLAINERS["Note"]).toBeTruthy();
  });
});

describe("content: federal laws", () => {
  it("has multiple items, each with an id, title, summary, and citation", () => {
    expect(FEDERAL_LAWS.length).toBeGreaterThan(1);
    for (const law of FEDERAL_LAWS) {
      expect(law.id.trim().length).toBeGreaterThan(0);
      expect(law.title.trim().length).toBeGreaterThan(0);
      expect(law.summary.trim().length).toBeGreaterThan(0);
      expect(law.citation.trim().length, `missing citation for "${law.title}"`).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    const ids = FEDERAL_LAWS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("content: glossary", () => {
  it("has no empty terms or definitions", () => {
    expect(GLOSSARY.length).toBeGreaterThan(0);
    for (const t of GLOSSARY) {
      expect(t.id.trim().length).toBeGreaterThan(0);
      expect(t.term.trim().length).toBeGreaterThan(0);
      expect(t.definition.trim().length).toBeGreaterThan(0);
    }
  });

  it("has unique terms and unique anchor ids", () => {
    const terms = GLOSSARY.map((t) => t.term);
    expect(new Set(terms).size).toBe(terms.length);
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
