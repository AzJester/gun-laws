"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GeoMap from "./GeoMap";
import StateDetail from "./StateDetail";
import ThemeToggle from "./ThemeToggle";

// ChangesFeed lives below the fold (right column, after the detail panel) and is
// not needed for first paint, so it's code-split out of the initial bundle. It's
// client-only (interactive list, no SEO value) → ssr: false with a light
// placeholder that holds the layout while the chunk loads.
const ChangesFeed = dynamic(() => import("./ChangesFeed"), {
  ssr: false,
  loading: () => (
    <p className="py-3 text-[13px] text-[var(--muted)]">Loading changes…</p>
  ),
});

import { lawCountLabel, selectionAnnouncement } from "@/lib/a11y";
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
  parseOrientation,
  ORIENTATION_BLURB,
  ORIENTATION_LABEL,
  ORIENTATIONS,
  type Orientation,
} from "@/lib/grading";
import {
  entryFor,
  entryPolicyOn,
  isTimeSeries,
  yearsRange,
  type TimeSeries,
  type TimeSeriesEntry,
} from "@/lib/timeseries";
import type {
  ChangeEventDTO,
  Grade,
  StateDetail as StateDetailType,
  StateSummary,
} from "@/lib/types";

type ColorMode = "grade" | "permitless_carry" | "universal_bg_check" | "red_flag";

interface MapExplorerProps {
  geo: GeoData;
  states: StateSummary[];
  changes: ChangeEventDTO[];
}

const MODE_BUTTONS: { mode: ColorMode; label: string }[] = [
  { mode: "grade", label: "Grade" },
  { mode: "permitless_carry", label: "Carry" },
  { mode: "universal_bg_check", label: "Bkgd checks" },
  { mode: "red_flag", label: "Red flag" },
];

const SINGLE_POLICY_LABEL: Record<string, string> = {
  permitless_carry: "permitless carry",
  universal_bg_check: "universal background checks",
  red_flag: "a red-flag (ERPO) law",
};

const ORIENT_STORAGE_KEY = "gunlawmap:orient";

// State detail is served as a static asset generated at build time
// (scripts/gen-static-data.ts → public/data/states/<code>.json), so the map
// needs no API at runtime and works in both the server build and the static
// Pages export. NEXT_PUBLIC_BASE_PATH is set (to "/gun-laws") only in the Pages
// export so the asset URL respects the project-pages base path.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Historical year slider bounds. These mirror data/time-series.json's
// _meta.{firstYear,lastYear}; once the series loads we use its actual range, but
// these provide a sensible default before the fetch resolves.
const FIRST_YEAR = 1991;
const LATEST_YEAR = 2025;
const PLAY_INTERVAL_MS = 700;

// Law-count color ramp for the neutral "count" view: few laws (green) → many (red),
// so the shading reads the same direction as the gun-rights grade ramp.
// Text colors are tuned for WCAG AA contrast against each fill (same fixes as
// grading.TEXT): the green and orange bins use dark glyphs instead of white.
const COUNT_BINS = [
  { max: 10, bg: "#1a9850", fg: "#06210f" },
  { max: 25, bg: "#66bd63", fg: "#10331c" },
  { max: 45, bg: "#a6d96a", fg: "#163a12" },
  { max: 70, bg: "#fee08b", fg: "#4a3a00" },
  { max: 95, bg: "#fdae61", fg: "#4a2c08" },
  { max: 120, bg: "#f46d43", fg: "#3a1606" },
  { max: Infinity, bg: "#d73027", fg: "#ffffff" },
];

// Neutral "no data" map fill — theme-aware via CSS vars (SVG fill + inline color
// both resolve var()). Dark slate in dark mode, light gray in light mode.
const NO_DATA_COLOR = { bg: "var(--no-data-bg)", fg: "var(--no-data-fg)" };

function countColor(n: number | null): { bg: string; fg: string } {
  if (n === null) return NO_DATA_COLOR;
  const bin = COUNT_BINS.find((b) => n <= b.max) ?? COUNT_BINS[COUNT_BINS.length - 1];
  return { bg: bin.bg, fg: bin.fg };
}

export default function MapExplorer({ geo, states, changes }: MapExplorerProps) {
  const byCode = useMemo(() => {
    const m: Record<string, StateSummary> = {};
    for (const s of states) m[s.code] = s;
    return m;
  }, [states]);

  const [mode, setMode] = useState<ColorMode>("grade");
  const [selected, setSelected] = useState<string>("AZ");
  const [filterGrade, setFilterGrade] = useState<Grade | null>(null);
  const [search, setSearch] = useState("");
  const [orient, setOrient] = useState<Orientation>("rights");

  const [detail, setDetail] = useState<StateDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  // Inline "no match" message for the header search (cleared as the user types).
  const [searchError, setSearchError] = useState<string | null>(null);

  // Historical time series (1991–2025), fetched once on mount as a static asset.
  // `year` is the snapshot the map + detail reflect; it defaults to the latest
  // year ("current"), at which point behavior equals today's dataset.
  const [timeSeries, setTimeSeries] = useState<TimeSeries | null>(null);
  const [year, setYear] = useState<number>(LATEST_YEAR);
  const [playing, setPlaying] = useState(false);
  const [tsError, setTsError] = useState(false);

  const years = useMemo(
    () => (timeSeries ? yearsRange(timeSeries) : null),
    [timeSeries],
  );
  const minYear = timeSeries?._meta.firstYear ?? FIRST_YEAR;
  const maxYear = timeSeries?._meta.lastYear ?? LATEST_YEAR;
  const isHistorical = year !== maxYear;

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/data/time-series.json`)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((data) => {
        if (cancelled) return;
        if (isTimeSeries(data)) {
          setTimeSeries(data);
          setYear(data._meta.lastYear); // pin to "current" once we know the real bound
          setTsError(false);
        } else {
          setTsError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimeSeries(null);
          setTsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-advance the slider while "playing". Honors prefers-reduced-motion by
  // never auto-starting (the Play button is hidden in that case). Stops at the
  // latest year. An interval ref keeps cleanup simple across re-renders.
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!playing) return;
    playTimer.current = setInterval(() => {
      setYear((y) => {
        if (y >= maxYear) {
          setPlaying(false);
          return maxYear;
        }
        return y + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [playing, maxYear]);

  // Whether the browser asks us to reduce motion. Drives whether the optional
  // Play/Pause control is offered at all (we never auto-play regardless).
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const resetToCurrent = useCallback(() => {
    setPlaying(false);
    setYear(maxYear);
  }, [maxYear]);

  // Hydrate the orientation from the URL (?orient=) first, then localStorage.
  // URL wins so a shared link reproduces the same lens.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).get("orient");
    if (fromUrl) {
      setOrient(parseOrientation(fromUrl));
      return;
    }
    const stored = window.localStorage.getItem(ORIENT_STORAGE_KEY);
    if (stored) setOrient(parseOrientation(stored));
  }, []);

  const changeOrient = useCallback((next: Orientation) => {
    setOrient(next);
    setFilterGrade(null);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ORIENT_STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set("orient", next);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const changedSet = useMemo(
    () => new Set(changes.map((c) => c.stateCode)),
    [changes],
  );

  // Fetch full detail for the selected state from the static JSON asset (the
  // file is the StateDetail object itself, no `.state` wrapper).
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    fetch(`${BASE}/data/states/${selected.toLowerCase()}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<StateDetailType>) : null))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDetailError(data === null);
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const colorFor = useCallback(
    (code: string): { bg: string; fg: string } => {
      const s = byCode[code];
      if (!s) return NO_DATA_COLOR;
      // When a historical year is selected and the series has an entry for it,
      // color by THAT year's data; otherwise fall back to the current summary.
      // At the latest year (isHistorical === false) we keep the live path, which
      // matches today's dataset.
      const entry = isHistorical ? entryFor(timeSeries, code, year) : null;
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
    },
    [byCode, mode, orient, isHistorical, timeSeries, year],
  );

  const dimmed = useCallback(
    (code: string): boolean => {
      if (mode !== "grade" || !filterGrade) return false;
      const entry = isHistorical ? entryFor(timeSeries, code, year) : null;
      const grade = entry ? entry.g : byCode[code]?.grade;
      return grade !== filterGrade;
    },
    [byCode, mode, filterGrade, isHistorical, timeSeries, year],
  );

  const onSelect = useCallback((code: string) => setSelected(code), []);

  const onSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const q = search.trim().toLowerCase();
      const found = states.find(
        (s) =>
          s.code.toLowerCase() === q ||
          s.name.toLowerCase() === q ||
          s.name.toLowerCase().startsWith(q),
      );
      if (found) {
        setSelected(found.code);
        setSearch("");
        setSearchError(null);
      } else if (q) {
        setSearchError(`No state matches “${search.trim()}”.`);
      }
    },
    [search, states],
  );

  const [endLeft, endRight] = useMemo(() => legendEnds(orient), [orient]);

  // Polite live-region message announced whenever the selected state changes (or
  // the year moves), so screen-reader users know the detail panel has updated.
  const selectedSummary = byCode[selected];
  const selectedEntry: TimeSeriesEntry | null = useMemo(
    () => (isHistorical ? entryFor(timeSeries, selected, year) : null),
    [isHistorical, timeSeries, selected, year],
  );
  const announcement = useMemo(() => {
    if (!selectedSummary) return "";
    if (selectedEntry) {
      const grade = displayGrade(selectedEntry.g, orient);
      return orient === "count"
        ? `Showing ${selectedSummary.name}, ${year} snapshot, ${lawCountLabel(
            selectedEntry.n,
          )}`
        : `Showing ${selectedSummary.name}, ${year} snapshot, grade ${grade}`;
    }
    return selectionAnnouncement(selectedSummary, orient);
  }, [selectedSummary, selectedEntry, orient, year]);

  return (
    <>
      <header className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] bg-gradient-to-b from-[var(--header-top)] to-[var(--bg)] px-[22px] py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="grid h-[38px] w-[38px] place-items-center rounded-[9px] text-xl"
            style={{
              background: "linear-gradient(135deg, var(--brand-1), var(--brand-2))",
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <div>
            <h1 className="m-0 text-[18px] tracking-[0.2px]">GunLawMap</h1>
            <p className="m-0 text-xs text-[var(--muted)]">
              Interactive US firearm-law atlas · click a state
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <nav
          aria-label="Primary"
          className="hidden items-center gap-4 text-[12.5px] text-[var(--muted)] sm:flex"
        >
          <Link href="/compare" className="hover:text-[var(--accent)] hover:underline">
            Compare
          </Link>
          <Link href="/reciprocity" className="hover:text-[var(--accent)] hover:underline">
            Reciprocity
          </Link>
          <Link href="/alerts" className="hover:text-[var(--accent)] hover:underline">
            Alerts
          </Link>
          <Link href="/federal" className="hover:text-[var(--accent)] hover:underline">
            Federal law
          </Link>
          <Link href="/glossary" className="hover:text-[var(--accent)] hover:underline">
            Glossary
          </Link>
          <Link href="/methodology" className="hover:text-[var(--accent)] hover:underline">
            Methodology
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
        <div className="relative w-full sm:w-auto">
          <label htmlFor="state-search" className="sr-only">
            Search for a state by name or postal code
          </label>
          <input
            id="state-search"
            type="text"
            placeholder="Search a state…"
            autoComplete="off"
            aria-describedby="state-search-hint"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (searchError) setSearchError(null);
            }}
            onKeyDown={onSearch}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] sm:w-[230px]"
          />
          <span id="state-search-hint" className="sr-only">
            Type a state name or two-letter code and press Enter to select it.
          </span>
          {searchError ? (
            <p
              role="status"
              className="mt-1 text-[11px] text-[var(--danger-fg)] sm:absolute sm:left-0 sm:top-full sm:mt-0.5"
            >
              {searchError}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-[20px] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]">
          <span
            className="status-dot h-2 w-2 rounded-full bg-[#3fb950]"
            aria-hidden="true"
          />{" "}
          State Firearm Laws Database · 2020
        </div>
        <ThemeToggle className="theme-toggle theme-toggle--inline" />
      </header>

      <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-[18px] px-[22px] pb-10 pt-[18px] lg:grid-cols-[minmax(560px,1.45fr)_minmax(360px,1fr)]">
        {/* LEFT: MAP */}
        <section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
          <div className="mb-2.5 flex flex-wrap items-start gap-2.5">
            <div>
              <h2 className="m-0 text-[15px] font-semibold">
                Tracked laws &amp; overall grade
              </h2>
              <p className="m-0 text-xs text-[var(--muted)]">
                Real US map ·{" "}
                <b>
                  {orient === "count"
                    ? "shaded by number of tracked laws"
                    : "grade A = fewest restrictions"}
                </b>
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Link
                href={`/compare?states=${selected}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-[7px] text-[12.5px] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Compare {selected} →
              </Link>
              {/* color mode toggle */}
              <div
                className="flex overflow-hidden rounded-lg border border-[var(--border)]"
                role="group"
                aria-label="Map color mode"
              >
                {MODE_BUTTONS.map((b) => (
                  <button
                    key={b.mode}
                    type="button"
                    aria-pressed={mode === b.mode}
                    aria-label={`Color map by ${b.label}`}
                    onClick={() => {
                      setMode(b.mode);
                      setFilterGrade(null);
                    }}
                    className={[
                      "border-0 px-3 py-[7px] text-[12.5px]",
                      "border-l border-[var(--border)] first:border-l-0",
                      mode === b.mode
                        ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                        : "bg-[var(--panel-2)] text-[var(--muted)]",
                    ].join(" ")}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* neutrality / orientation toggle */}
          {mode === "grade" ? (
            <div className="mb-3 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] font-semibold text-[var(--muted)]">
                  Grading lens:
                </span>
                <div
                  className="flex flex-wrap overflow-hidden rounded-lg border border-[var(--border)]"
                  role="radiogroup"
                  aria-label="Grading orientation"
                >
                  {ORIENTATIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={orient === o}
                      onClick={() => changeOrient(o)}
                      className={[
                        "border-0 border-l border-[var(--border)] px-3 py-[6px] text-[11.5px] first:border-l-0",
                        orient === o
                          ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                          : "bg-[var(--panel)] text-[var(--muted)]",
                      ].join(" ")}
                    >
                      {ORIENTATION_LABEL[o]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="m-0 mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                {ORIENTATION_BLURB[orient]}{" "}
                <Link
                  href="/methodology"
                  className="text-[var(--accent)] hover:underline"
                >
                  How grading works →
                </Link>
              </p>
            </div>
          ) : null}

          {/* historical year slider */}
          <div className="mb-3 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <label
                htmlFor="year-slider"
                className="text-[11.5px] font-semibold text-[var(--muted)]"
              >
                Year: <span className="text-[var(--text)]">{year}</span>
              </label>
              <span
                className="grid min-w-[58px] place-items-center rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-0.5 text-[15px] font-bold tabular-nums text-[var(--text)]"
                aria-hidden="true"
              >
                {year}
              </span>
              <input
                id="year-slider"
                type="range"
                min={minYear}
                max={maxYear}
                step={1}
                value={year}
                onChange={(e) => {
                  setPlaying(false);
                  setYear(Number(e.target.value));
                }}
                aria-label="Historical year"
                aria-valuetext={String(year)}
                className="h-1.5 min-w-[180px] flex-1 cursor-pointer accent-[var(--accent)]"
              />
              {reducedMotion ? null : (
                <button
                  type="button"
                  onClick={() => {
                    if (!playing && year >= maxYear) setYear(minYear);
                    setPlaying((p) => !p);
                  }}
                  aria-pressed={playing}
                  aria-label={playing ? "Pause year animation" : "Play year animation"}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-[5px] text-[12px] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {playing ? "❚❚ Pause" : "▶ Play"}
                </button>
              )}
              <button
                type="button"
                onClick={resetToCurrent}
                disabled={!isHistorical}
                className={[
                  "rounded-lg border px-3 py-[5px] text-[12px]",
                  isHistorical
                    ? "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    : "cursor-default border-[var(--border)] bg-[var(--panel)] text-[var(--border)]",
                ].join(" ")}
              >
                ▸ Current
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--muted)]">
              <span aria-hidden="true">{minYear}</span>
              {isHistorical ? (
                <span className="rounded-full border border-[var(--snapshot-border)] bg-[var(--snapshot-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--snapshot-fg)]">
                  Viewing historical snapshot: {year}
                </span>
              ) : (
                <span className="text-[var(--muted)]">
                  Drag to view past years (1991–{maxYear})
                  {years ? ` · ${years.length} years tracked` : ""}
                </span>
              )}
              <span aria-hidden="true">{maxYear}</span>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--muted)]">
              {tsError
                ? "Historical snapshots couldn’t be loaded — showing the current year only."
                : `Years 1991–2020 are from the State Firearm Laws Database; 2021–${maxYear} are curated estimates of the major changes, not every amendment.`}
            </p>
          </div>

          <GeoMap
            geo={geo}
            states={byCode}
            selected={selected}
            changed={changedSet}
            colorFor={colorFor}
            dimmed={dimmed}
            onSelect={onSelect}
            orient={orient}
            describedById="map-sr-table"
          />

          {/* legend */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {mode === "grade" ? (
              orient === "count" ? (
                <>
                  <span>{endLeft}</span>
                  <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                    {COUNT_BINS.map((b, i) => (
                      <div
                        key={i}
                        className="grid h-6 w-[42px] place-items-center text-[10px] font-bold"
                        style={{ background: b.bg, color: b.fg }}
                      >
                        {b.max === Infinity ? "120+" : `≤${b.max}`}
                      </div>
                    ))}
                  </div>
                  <span>{endRight}</span>
                  <div className="mt-1.5 w-full text-[11.5px] text-[var(--muted)]">
                    Neutral view: states are shaded only by how many of the 134
                    tracked laws are in effect — no letter grade is assigned.
                  </div>
                </>
              ) : (
                <>
                  <span>{endLeft}</span>
                  <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                    {GRADES.map((g, i) => {
                      // Grade is always shown in its stored orientation
                      // (fewest laws = A); filtering keys on that stored grade.
                      const stored = g;
                      const shown = displayGrade(stored, orient);
                      const active = filterGrade === stored;
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${
                            active ? "Clear highlight of" : "Highlight"
                          } grade ${shown} states`}
                          onClick={() =>
                            setFilterGrade((prev) =>
                              prev === stored ? null : stored,
                            )
                          }
                          className={[
                            "grid h-6 w-[42px] cursor-pointer place-items-center text-[10.5px] font-bold",
                            filterGrade && filterGrade !== stored
                              ? "opacity-30"
                              : "",
                          ].join(" ")}
                          style={{
                            background: gradeColor(shown),
                            color: gradeTextColor(shown),
                          }}
                        >
                          {shown}
                        </button>
                      );
                    })}
                  </div>
                  <span>{endRight}</span>
                  {filterGrade ? (
                    <button
                      type="button"
                      className="text-[var(--accent)] hover:underline"
                      onClick={() => setFilterGrade(null)}
                    >
                      clear <span aria-hidden="true">✕</span>
                    </button>
                  ) : null}
                  <div className="mt-1.5 w-full text-[11.5px] text-[var(--muted)]">
                    Grade reflects how few of the 134 tracked laws a state has in
                    effect (A = fewest, F = most).{" "}
                    Click a grade to highlight those states. The letter grade is
                    always shown on each state, so the map stays usable for
                    color-blind viewers regardless of fill color.
                  </div>
                </>
              )
            ) : (
              <>
                <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                  <div
                    className="grid h-6 w-[46px] place-items-center text-[10.5px] font-bold"
                    style={{ background: policyYes(mode).bg, color: policyYes(mode).fg }}
                  >
                    Yes
                  </div>
                  <div
                    className="grid h-6 w-[46px] place-items-center text-[10.5px] font-bold"
                    style={{ background: POLICY_NO.bg, color: POLICY_NO.fg }}
                  >
                    No
                  </div>
                </div>
                <span>State has {SINGLE_POLICY_LABEL[mode]}</span>
              </>
            )}
          </div>
        </section>

        {/* RIGHT: DETAIL + FEED */}
        <div className="flex flex-col gap-[18px]">
          {/* Polite live region: announces the selected state to screen readers
              when the detail panel updates. */}
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          <section
            aria-label="Selected state detail"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]"
          >
            <StateDetail
              detail={detail}
              loading={detailLoading}
              orient={orient}
              year={year}
              isHistorical={isHistorical}
              entry={selectedEntry}
              error={detailError}
            />
          </section>
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
            <h2 className="m-0 mb-1 text-[15px] font-semibold">
              Recent &amp; pending changes
            </h2>
            <p className="m-0 mb-3.5 text-xs text-[var(--muted)]">
              Auto-flagged from legislative + court trackers, confirmed by
              editors
            </p>
            <ChangesFeed changes={changes} onSelect={onSelect} />
          </section>
        </div>
      </div>
    </>
  );
}
