import type { Metadata } from "next";

import ThemeToggle from "@/components/ThemeToggle";
import { WebVitals } from "@/components/WebVitals";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

// No-FOUC theme boot. Runs synchronously in <head> BEFORE first paint, so the
// correct theme is applied with no flash of the wrong colors. Mirrors
// resolveInitialTheme() from lib/theme (kept in sync; inlined here because it
// must run before any module loads). A persisted manual override wins; otherwise
// we follow the OS via prefers-color-scheme. Wrapped in try/catch so a blocked
// localStorage never breaks rendering. The server-rendered default is
// DEFAULT_THEME (on <html>) so SSR is stable; this corrects it pre-hydration.
const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GunLawMap — Interactive US Firearm Law Map",
    template: "%s — GunLawMap",
  },
  description:
    "An interactive US map of state firearm laws. Informational only, not legal advice.",
  openGraph: {
    type: "website",
    siteName: "GunLawMap",
    title: "GunLawMap — Interactive US Firearm Law Map",
    description:
      "An interactive US map of state firearm laws. Informational only, not legal advice.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "GunLawMap — Interactive US Firearm Law Map",
    description:
      "An interactive US map of state firearm laws. Informational only, not legal advice.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
      <head>
        {/* Pre-paint theme init (no flash of wrong theme). Must run before the
            body renders, so it lives in <head> as a synchronous inline script. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        {/* First focusable element on every page: jump straight to <main id="main">. */}
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {/* Global dark/light toggle — appears on every page (fixed, top-right). */}
        <ThemeToggle />
        {/* Core Web Vitals reporter (client-only, renders nothing). */}
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
