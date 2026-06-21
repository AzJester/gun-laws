import { describe, it, expect } from "vitest";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  nextTheme,
  parseTheme,
  resolveInitialTheme,
} from "@/lib/theme";

describe("theme: parseTheme", () => {
  it("accepts the two valid themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("rejects anything else as null", () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme("LIGHT")).toBeNull();
    expect(parseTheme("system")).toBeNull();
    expect(parseTheme(1)).toBeNull();
  });
});

describe("theme: resolveInitialTheme", () => {
  it("honors a persisted manual override over the OS preference", () => {
    // Override wins even when the OS asks for the opposite.
    expect(resolveInitialTheme("light", false)).toBe("light");
    expect(resolveInitialTheme("dark", true)).toBe("dark");
  });

  it("falls back to the OS preference when there is no valid override", () => {
    expect(resolveInitialTheme(null, true)).toBe("light");
    expect(resolveInitialTheme(null, false)).toBe("dark");
    expect(resolveInitialTheme(undefined, true)).toBe("light");
    expect(resolveInitialTheme(undefined, false)).toBe("dark");
  });

  it("treats a junk stored value as no override (follows the OS)", () => {
    expect(resolveInitialTheme("banana", true)).toBe("light");
    expect(resolveInitialTheme("banana", false)).toBe("dark");
  });

  it("defaults to dark when nothing is known (no override, OS not light)", () => {
    expect(resolveInitialTheme(null, false)).toBe(DEFAULT_THEME);
  });
});

describe("theme: nextTheme", () => {
  it("flips dark <-> light", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });

  it("is an involution (toggling twice returns the original)", () => {
    expect(nextTheme(nextTheme("dark"))).toBe("dark");
    expect(nextTheme(nextTheme("light"))).toBe("light");
  });
});

describe("theme: constants", () => {
  it("DEFAULT_THEME is dark (matches the SSR <html data-theme>)", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("exposes the stable localStorage key", () => {
    expect(THEME_STORAGE_KEY).toBe("gunlawmap:theme");
  });
});
