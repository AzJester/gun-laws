"use client";

// Minimal national choropleth widget for embedding (iframe). Reuses GeoMap and
// the same coloring logic as the full explorer, but with no detail panel, no
// search, no orientation toggle, and no year slider — just the map, a compact
// legend, and a small attribution link. Configuration comes from the URL query
// (?mode=, ?year=, ?orient=), parsed client-side so the page stays a static asset
// that works on GitHub Pages.

import { useEffect, useMemo, useState } from "react";

import GeoMap from "./GeoMap";

import type { GeoData } from "@/lib/geo";
import {
  GRADES,
  POLICY_NO,
  policyYes,
  displayGrade,
  displayGradeColor,
  displayGradeTextColor,
  gradeColor,
  gradeTextColor,
  legendEnds,
  type Orientation,
} from "@/lib/grading";
import {
  EMBED_MAX_YEAR,
  parseEmbedMode,
  parseEmbedOrient,
  parseEmbedYear,
  type EmbedMode,
} from "@/lib/embed";
import {
  entryFor,
  entryPolicyOn,
  isTimeSeries,
  type TimeSeries,
} from "@/lib/timeseries";
import type { StateSummary } from "@/lib/types";

// Mirrors MapExplorer: NEXT_PUBLIC_BASE_PATH is "/gun-laws" only in the Pages
// export, so the time-series asset URL respects the project-pages base path.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SINGLE_POLICY_LABEL: Record<string, string> = {
  permitless_carry: "permitless carry",
  universal_bg_check: "universal background checks",
  red_flag: "a red-flag (ERPO) law",
};

// Law-count ramp for the neutral "count" view (same bins as MapExplorer).
const COUNT_BINS = [
  { max: 10, bg: "#1a9850", fg: "#06210f" },
  { max: 25, bg: "#66bd63", fg: "#10331c" },
  { max: 45, bg: "#a6d96a", fg: "#163a12" },
  { max: 70, bg: "#fee08b", fg: "#4a3a00" },
  { max: 95, bg: "#fdae61", fg: "#4a2c08" },
  { max: 120, bg: "#f46d43", fg: "#3a1606" },
  { max: Infinity, bg: "#d73027", fg: "#ffffff" },
];

// Neutral "no data" fill — theme-aware via CSS vars (mirrors MapExplorer).
const NO_DATA_COLOR = { bg: "var(--no-data-bg)", fg: "var(--no-data-fg)" };

function countColor(n: number | null): { bg: string; fg: string } {
  if (n === null) return NO_DATA_COLOR;
  const bin = COUNT_BINS.find((b) => n <= b.max) ?? COUNT_BINS[COUNT_BINS.length - 1];
  return { bg: bin.bg, fg: bin.fg };
}

interface EmbedMapProps {
  geo: GeoData;
  states: StateSummary[];
  /** Absolute URL back to the full site (attribution link). */
  siteHref: string;
}

export default function EmbedMap({ geo, states, siteHref }: EmbedMapProps) {
  const byCode = useMemo(() => {
    const m: Record<string, StateSummary> = {};
    for (const s of states) m[s.code] = s;
    return m;
  }, [states]);

  // Parse the configuration from the URL once on mount (client-only so the page
  // remains a static asset). Defaults: grade mode, current year, rights lens.
  const [mode, setMode] = useState<EmbedMode>("grade");
  const [orient, setOrient] = useState<Orientation>("rights");
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setMode(parseEmbedMode(q.get("mode")));
    setOrient(parseEmbedOrient(q.get("orient")));
    setYear(parseEmbedYear(q.get("year")));
  }, []);

  // Historical time series, fetched once (only needed when a ?year= is set).
  const [timeSeries, setTimeSeries] = useState<TimeSeries | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/data/time-series.json`)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((data) => {
        if (!cancelled && isTimeSeries(data)) setTimeSeries(data);
      })
      .catch(() => {
        if (!cancelled) setTimeSeries(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxYear = timeSeries?._meta.lastYear ?? EMBED_MAX_YEAR;
  const isHistorical = year != null && year !== maxYear;

  const colorFor = useMemo(() => {
    return (code: string): { bg: string; fg: string } => {
      const s = byCode[code];
      if (!s) return NO_DATA_COLOR;
      const entry =
        isHistorical && year != null ? entryFor(timeSeries, code, year) : null;
      if (mode === "grade") {
        if (orient === "count") return countColor(entry ? entry.n : s.lawCount);
        const grade = entry ? entry.g : s.grade;
        return {
          bg: displayGradeColor(grade, orient),
          fg: displayGradeTextColor(grade, orient),
        };
      }
      const on = entry ? entryPolicyOn(entry, mode) : s.policies[mode];
      const yes = policyYes(mode);
      return on
        ? { bg: yes.bg, fg: yes.fg }
        : { bg: POLICY_NO.bg, fg: POLICY_NO.fg };
    };
  }, [byCode, mode, orient, isHistorical, timeSeries, year]);

  const [endLeft, endRight] = useMemo(() => legendEnds(orient), [orient]);

  const modeLabel =
    mode === "grade"
      ? orient === "count"
        ? "Number of tracked firearm laws"
        : "Overall firearm-law grade"
      : `State has ${SINGLE_POLICY_LABEL[mode] ?? mode}`;

  return (
    <div className="mx-auto max-w-[1000px] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h1 className="m-0 text-[14px] font-semibold text-[var(--text)]">
          {modeLabel}
          {isHistorical ? (
            <span className="ml-2 align-middle text-[11px] font-normal text-[var(--muted)]">
              ({year} snapshot)
            </span>
          ) : null}
        </h1>
      </div>

      <GeoMap
        geo={geo}
        states={byCode}
        selected={null}
        changed={EMPTY_SET}
        colorFor={colorFor}
        dimmed={NEVER_DIM}
        onSelect={NOOP}
        orient={orient}
        describedById="embed-map-sr-table"
      />

      {/* compact legend */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
        {mode === "grade" ? (
          orient === "count" ? (
            <>
              <span>{endLeft}</span>
              <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                {COUNT_BINS.map((b, i) => (
                  <div
                    key={i}
                    className="grid h-5 w-[34px] place-items-center text-[9px] font-bold"
                    style={{ background: b.bg, color: b.fg }}
                  >
                    {b.max === Infinity ? "120+" : `≤${b.max}`}
                  </div>
                ))}
              </div>
              <span>{endRight}</span>
            </>
          ) : (
            <>
              <span>{endLeft}</span>
              <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                {GRADES.map((g) => {
                  const stored = g;
                  const shown = displayGrade(stored, orient);
                  return (
                    <div
                      key={g}
                      className="grid h-5 w-[34px] place-items-center text-[9.5px] font-bold"
                      style={{
                        background: gradeColor(shown),
                        color: gradeTextColor(shown),
                      }}
                    >
                      {shown}
                    </div>
                  );
                })}
              </div>
              <span>{endRight}</span>
            </>
          )
        ) : (
          <>
            <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
              <div
                className="grid h-5 w-[36px] place-items-center text-[9.5px] font-bold"
                style={{ background: policyYes(mode).bg, color: policyYes(mode).fg }}
              >
                Yes
              </div>
              <div
                className="grid h-5 w-[36px] place-items-center text-[9.5px] font-bold"
                style={{ background: POLICY_NO.bg, color: POLICY_NO.fg }}
              >
                No
              </div>
            </div>
            <span>{modeLabel}</span>
          </>
        )}
      </div>

      {/* attribution back to the site */}
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        <a
          href={siteHref}
          target="_blank"
          rel="noopener"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          GunLawMap
        </a>{" "}
        · interactive US firearm-law atlas · informational only, not legal advice.
      </p>
    </div>
  );
}

// Stable empty/no-op references so GeoMap's memoized props don't churn.
const EMPTY_SET: Set<string> = new Set();
const NEVER_DIM = (): boolean => false;
const NOOP = (): void => {};
