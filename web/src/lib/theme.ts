// Pure theme helpers, shared by the no-FOUC inline boot script (conceptually —
// that script is hand-inlined in layout.tsx and mirrors resolveInitialTheme),
// the ThemeToggle component, and the unit tests. Keeping the logic here (and
// pure) means it can be exercised without a DOM.

export type Theme = "light" | "dark";

/** localStorage key the manual override is persisted under. */
export const THEME_STORAGE_KEY = "gunlawmap:theme";

/** Server-side default applied to <html data-theme> for a stable first render. */
export const DEFAULT_THEME: Theme = "dark";

/** Narrow an arbitrary value to a Theme, or null if it isn't one. */
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

/**
 * Resolve the theme to apply on first paint.
 *   - A persisted manual override (localStorage) always wins.
 *   - Otherwise default to dark (DEFAULT_THEME) — the OS preference is
 *     deliberately NOT followed, so every first-time visitor gets dark mode.
 *
 * @param stored the raw localStorage value (string | null | undefined).
 */
export function resolveInitialTheme(stored: string | null | undefined): Theme {
  return parseTheme(stored) ?? DEFAULT_THEME;
}

/** The theme you get by flipping the current one. */
export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
