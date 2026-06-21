"use client";

// Route-segment error boundary (App Router). Next renders this when a Server or
// Client Component below the root layout throws during render. It receives the
// error + a reset() to retry rendering the segment.
//
// We render an on-brand, dark-theme fallback and report the error via the
// dependency-free observability layer (logs always; sends to Sentry only if a
// DSN is configured). reportError never throws, so the boundary is safe.

import { useEffect } from "react";

import { reportError } from "@/lib/observability";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "route-segment", digest: error.digest });
  }, [error]);

  return (
    <main
      id="main"
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        color: "#e6edf3",
        background: "#0d1117",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
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
        <h1 style={{ margin: "0 0 10px", fontSize: 22 }}>Something went wrong</h1>
        <p style={{ margin: "0 0 20px", color: "#9aa7b4", lineHeight: 1.5 }}>
          An unexpected error occurred while loading this page. You can try again,
          or head back to the map.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
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
          <a
            href="/"
            style={{
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid #2a3340",
              color: "#e6edf3",
              textDecoration: "none",
            }}
          >
            Back to the map
          </a>
        </div>
      </div>
    </main>
  );
}
