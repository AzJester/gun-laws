"use client";

// Core Web Vitals reporter (client-only). Uses Next's useReportWebVitals to
// observe CLS/LCP/INP/FCP/TTFB/FID and logs each as a structured line. If a
// Sentry DSN is configured the metrics are additionally forwarded as a
// breadcrumb-style report (best-effort, via the same dependency-free layer).
//
// Renders nothing — it's mounted once in the root layout for its side effect.
//
// EXPORT/SSR SAFETY: this is a "use client" component that renders null, so it
// emits no markup and runs only in the browser after hydration. It never touches
// the server, the DB, or the network at build time, so it is inert under SSR and
// the static `output: "export"` build.

import { useReportWebVitals } from "next/web-vitals";

import { log } from "@/lib/observability";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric: { id, name, label, value, ... } from web-vitals.
    log.info("web-vital", {
      metric: metric.name,
      value: Math.round(metric.value * 1000) / 1000,
      id: metric.id,
      label: metric.label,
    });

    // Optional forwarding endpoint: a single env knob to ship vitals to a
    // collector (e.g. a serverless beacon). No-op when unset — never blocks.
    const endpoint = process.env.NEXT_PUBLIC_VITALS_ENDPOINT;
    if (endpoint && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          label: metric.label,
          path: typeof location !== "undefined" ? location.pathname : undefined,
        });
        navigator.sendBeacon(endpoint, body);
      } catch {
        /* best-effort: never let telemetry break the page */
      }
    }
  });

  return null;
}
