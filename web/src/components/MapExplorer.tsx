"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ChangesFeed from "./ChangesFeed";
import GeoMap from "./GeoMap";
import StateDetail from "./StateDetail";

import type { GeoData } from "@/lib/geo";
import { GRADES, gradeColor, gradeTextColor } from "@/lib/grading";
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

  const [detail, setDetail] = useState<StateDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        return { bg: gradeColor(s.grade), fg: gradeTextColor(s.grade) };
      }
      const on = s.policies[mode];
      return on
        ? { bg: "#2a7a74", fg: "#fff" }
        : { bg: "#e3eceb", fg: "#3a4a48" };
    },
    [byCode, mode],
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
                Real US map · <b>grade A = fewest restrictions</b>
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
              <>
                <span>Fewer laws</span>
                <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                  {GRADES.map((g, i) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setFilterGrade((prev) => (prev === g ? null : g))
                      }
                      className={[
                        "grid h-6 w-[42px] cursor-pointer place-items-center text-[10.5px] font-bold",
                        filterGrade && filterGrade !== g ? "opacity-30" : "",
                      ].join(" ")}
                      style={{
                        background: gradeColor(g),
                        color: gradeTextColor(g),
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <span>More laws</span>
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
                  Grade reflects how few of the 134 tracked laws a state has in
                  effect (A = fewest, F = most). Click a grade to highlight those
                  states.
                </div>
              </>
            ) : (
              <>
                <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
                  <div
                    className="grid h-6 w-[46px] place-items-center text-[10.5px] font-bold"
                    style={{ background: "#2a7a74", color: "#fff" }}
                  >
                    Yes
                  </div>
                  <div
                    className="grid h-6 w-[46px] place-items-center text-[10.5px] font-bold"
                    style={{ background: "#e3eceb", color: "#3a4a48" }}
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
            <StateDetail detail={detail} loading={detailLoading} />
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
