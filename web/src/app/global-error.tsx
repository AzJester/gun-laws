"use client";

// Root error boundary (App Router). Unlike error.tsx, this catches errors thrown
// by the ROOT layout itself, so it must render its own <html>/<body> (it
// REPLACES the root layout when active). Same on-brand dark fallback + the same
// dependency-free error reporting.

import { useEffect } from "react";

import { reportError } from "@/lib/observability";

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
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px",
          color: "#e6edf3",
          background: "#0d1117",
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
            border: "1px solid #2a3340",
            borderRadius: 14,
            background: "#161b22",
            padding: 28,
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 20px", color: "#9aa7b4" }}>
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
              background: "#58a6ff",
              color: "#06121f",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
