"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import ChangesFeed from "./ChangesFeed";
import GeoMap from "./GeoMap";
import StateDetail from "./StateDetail";

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

// Law-count color ramp for the neutral "count" view: few laws (green) → many (red),
// so the shading reads the same direction as the gun-rights grade ramp.
const COUNT_BINS = [
  { max: 10, bg: "#1a9850", fg: "#ffffff" },
  { max: 25, bg: "#66bd63", fg: "#10331c" },
  { max: 45, bg: "#a6d96a", fg: "#163a12" },
  { max: 70, bg: "#fee08b", fg: "#4a3a00" },
  { max: 95, bg: "#fdae61", fg: "#4a2c08" },
  { max: 120, bg: "#f46d43", fg: "#ffffff" },
  { max: Infinity, bg: "#d73027", fg: "#ffffff" },
];

function countColor(n: number | null): { bg: string; fg: string } {
  if (n === null) return { bg: "#2a3340", fg: "#fff" };
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

  // Fetch full detail for the selected state.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/states/${selected}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setDetail(data ? data.state : null);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
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
      if (!s) return { bg: "#2a3340", fg: "#fff" };
      if (mode === "grade") {
        if (orient === "count") return countColor(s.lawCount);
        return {
          bg: displayGradeColor(s.grade, orient),
          fg: displayGradeTextColor(s.grade, orient),
        };
      }
      const on = s.policies[mode];
      const yes = policyYes(mode);
      return on
        ? { bg: yes.bg, fg: yes.fg }
        : { bg: POLICY_NO.bg, fg: POLICY_NO.fg };
    },
    [byCode, mode, orient],
  );

  const dimmed = useCallback(
    (code: string): boolean => {
      if (mode !== "grade" || !filterGrade) return false;
      return byCode[code]?.grade !== filterGrade;
    },
    [byCode, mode, filterGrade],
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
      }
    },
    [search, states],
  );

  const [endLeft, endRight] = legendEnds(orient);

  return (
    <>
      <header className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] bg-gradient-to-b from-[#11161d] to-[var(--bg)] px-[22px] py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="grid h-[38px] w-[38px] place-items-center rounded-[9px] text-xl"
            style={{
              background: "linear-gradient(135deg, #2a7a74, #14524e)",
            }}
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
        <nav className="hidden items-center gap-4 text-[12.5px] text-[var(--muted)] sm:flex">
          <Link href="/methodology" className="hover:text-[var(--accent)] hover:underline">
            Methodology
          </Link>
          <Link href="/about" className="hover:text-[var(--accent)] hover:underline">
            About
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
        <div className="relative">
          <input
            type="text"
            placeholder="Search a state…"
            aria-label="Search a state"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearch}
            className="w-[230px] rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-2 rounded-[20px] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[#3fb950]" /> State Firearm
          Laws Database · 2020
        </div>
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
                    : orient === "safety"
                      ? "grade A = strongest protections"
                      : "grade A = fewest restrictions"}
                </b>
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              {/* color mode toggle */}
              <div
                className="flex overflow-hidden rounded-lg border border-[var(--border)]"
                role="tablist"
                aria-label="Color mode"
              >
                {MODE_BUTTONS.map((b) => (
                  <button
                    key={b.mode}
                    type="button"
                    onClick={() => {
                      setMode(b.mode);
                      setFilterGrade(null);
                    }}
                    className={[
                      "border-0 px-3 py-[7px] text-[12.5px]",
                      "border-l border-[var(--border)] first:border-l-0",
                      mode === b.mode
                        ? "bg-[var(--accent)] font-semibold text-[#06121f]"
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
                          ? "bg-[var(--accent)] font-semibold text-[#06121f]"
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
                  Why two orientations? →
                </Link>
              </p>
            </div>
          ) : null}

          <GeoMap
            geo={geo}
            states={byCode}
            selected={selected}
            changed={changedSet}
            colorFor={colorFor}
            dimmed={dimmed}
            onSelect={onSelect}
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
                      // The ramp end labelled "A" depends on the orientation; we
                      // flip the displayed letter + color but keep grade-filtering
                      // keyed on the underlying stored grade.
                      const stored = orient === "safety" ? GRADES[6 - i] : g;
                      const shown = displayGrade(stored, orient);
                      return (
                        <button
                          key={i}
                          type="button"
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
                      clear ✕
                    </button>
                  ) : null}
                  <div className="mt-1.5 w-full text-[11.5px] text-[var(--muted)]">
                    {orient === "safety"
                      ? "Grade reflects how many of the 134 tracked laws a state has in effect (A = most protections, F = fewest)."
                      : "Grade reflects how few of the 134 tracked laws a state has in effect (A = fewest, F = most)."}{" "}
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
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
            <StateDetail detail={detail} loading={detailLoading} orient={orient} />
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
