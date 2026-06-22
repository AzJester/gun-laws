"use client";

// Root error boundary (App Router). Unlike error.tsx, this catches errors thrown
// by the ROOT layout itself, so it must render its own <html>/<body> (it
// REPLACES the root layout when active). Because it replaces the layout, neither
// globals.css nor the layout's theme-boot script apply here — so this file is
// self-contained: it inlines a tiny <style> defining the theme vars for both
// light/dark (via prefers-color-scheme + a data-theme override) and a no-FOUC
// boot script, then styles the fallback with those vars. Same dependency-free
// error reporting as error.tsx.

import { useEffect } from "react";

import { reportError } from "@/lib/observability";

// Minimal theme vars for the standalone error document. Dark is always the
// default (the OS preference is intentionally NOT consulted); only an explicit
// manual data-theme="light" override (set by the boot script from the same
// localStorage key) switches it to light.
const ERROR_THEME_CSS = `
:root,:root[data-theme="dark"]{color-scheme:dark;--bg:#0d1117;--panel:#161b22;--border:#2a3340;--text:#e6edf3;--muted:#9aa7b4;--accent:#58a6ff;--on-accent:#06121f;}
:root[data-theme="light"]{color-scheme:light;--bg:#f7f9fc;--panel:#ffffff;--border:#d6dee8;--text:#10202e;--muted:#52647a;--accent:#1f6fb2;--on-accent:#ffffff;}
`;

const ERROR_THEME_BOOT = `(function(){try{var s=localStorage.getItem("gunlawmap:theme");if(s==="light"||s==="dark"){document.documentElement.setAttribute("data-theme",s);}}catch(e){}})();`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: ERROR_THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: ERROR_THEME_BOOT }} />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px",
          color: "var(--text)",
          background: "var(--bg)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          lineHeight: 1.5,
        }}
      >
        <main
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--panel)",
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 20px", color: "var(--muted)" }}>
            The application hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 14,
              background: "var(--accent)",
              color: "var(--on-accent)",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
