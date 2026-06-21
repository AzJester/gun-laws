"use client";

// Global dark/light theme toggle. Rendered once in the root layout so it appears
// on every page (a small fixed control, top-right). It reads/writes the
// `data-theme` attribute on <html> (the same attribute the no-FOUC inline script
// in layout.tsx sets pre-paint) and persists the user's manual choice to
// localStorage so it survives reloads.
//
// EXPORT/SSR SAFETY: the actual theme is set on <html> before hydration by the
// inline boot script, so this button only needs to *sync* its label to whatever
// is already there. We initialize from DEFAULT_THEME (matching the server-
// rendered attribute) to keep the first client render identical to SSR, then
// read the real value in an effect — avoiding a hydration mismatch.

import { useEffect, useState } from "react";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  nextTheme,
  parseTheme,
  type Theme,
} from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // After hydration, adopt whatever the boot script actually applied to <html>.
  useEffect(() => {
    const current = parseTheme(document.documentElement.dataset.theme);
    if (current) setTheme(current);
  }, []);

  function toggle() {
    const next = nextTheme(theme);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode / storage disabled — the in-memory toggle still works */
    }
    setTheme(next);
  }

  const isDark = theme === "dark";
  // Show the action you'd take: in dark mode, offer to switch to light (sun);
  // in light mode, offer dark (moon).
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={label}
      aria-pressed={!isDark}
      title={label}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
