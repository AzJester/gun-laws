"use client";

import Link from "next/link";

import StateDetailView from "./StateDetailView";

import {
  displayGrade,
  displayGradeColor,
  displayGradeTextColor,
  type Orientation,
} from "@/lib/grading";
import type { TimeSeriesEntry } from "@/lib/timeseries";
import type { StateDetail as StateDetailType } from "@/lib/types";

interface StateDetailProps {
  detail: StateDetailType | null;
  loading: boolean;
  orient?: Orientation;
  /** When viewing a non-current snapshot, the selected year + that year's entry. */
  year?: number | null;
  isHistorical?: boolean;
  entry?: TimeSeriesEntry | null;
  /** True when the detail fetch failed (so we can show an error, not the empty state). */
  error?: boolean;
}

// The six headline policy flags, in the same order/labels as StateDetailView,
// read off a time-series entry (1 = in effect). Carry is phrased as the
// permit *requirement* (the inverse of permitless carry), matching the live view.
const SNAPSHOT_FLAGS: { label: string; on: (e: TimeSeriesEntry) => boolean }[] = [
  { label: "Carry permit required", on: (e) => e.pc === 0 },
  { label: "Universal background checks", on: (e) => e.ubc === 1 },
  { label: "Red-flag (ERPO) law", on: (e) => e.rf === 1 },
  { label: "Assault-weapon restriction", on: (e) => e.awb === 1 },
  { label: "Magazine limit", on: (e) => e.mag === 1 },
  { label: "Waiting period", on: (e) => e.wp === 1 },
];

export default function StateDetail({
  detail,
  loading,
  orient = "rights",
  year = null,
  isHistorical = false,
  entry = null,
  error = false,
}: StateDetailProps) {
  if (loading && !detail) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }
  if (error && !detail) {
    return (
      <p className="rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">
        Couldn’t load this state’s details. Check your connection and select the
        state again.
      </p>
    );
  }
  if (!detail) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Select a state on the map to see its laws.
      </p>
    );
  }

  const showSnapshot = isHistorical && year != null && entry != null;
  const showGrade = orient !== "count";
  const snapBg = entry ? displayGradeColor(entry.g, orient) : "";
  const snapFg = entry ? displayGradeTextColor(entry.g, orient) : "";
  const snapGrade = entry ? displayGrade(entry.g, orient) : "";
  const snapCount =
    entry?.n == null ? "data pending" : `${entry.n} of 134 tracked laws in ${year}`;

  return (
    <div>
      {showSnapshot ? (
        <div className="mb-4 rounded-[10px] border border-[var(--snapshot-border)] bg-[var(--snapshot-bg)] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--snapshot-fg)]">
            <span aria-hidden="true">🕑</span>
            {detail.name} — {year} snapshot
          </div>
          <div className="mb-2.5 flex items-center gap-3.5">
            {showGrade ? (
              <div
                className="grid h-12 w-12 place-items-center rounded-xl text-xl font-extrabold"
                style={{ background: snapBg, color: snapFg }}
              >
                {snapGrade}
              </div>
            ) : (
              <div
                className="grid h-12 w-12 place-items-center rounded-xl text-base font-extrabold"
                style={{ background: "var(--panel-2)", color: "var(--text)" }}
                title="Number of tracked laws in effect"
              >
                {entry?.n == null ? "—" : entry.n}
              </div>
            )}
            <div className="text-xs text-[var(--muted)]">
              {showGrade ? `Grade ${snapGrade} · ` : ""}
              {snapCount}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SNAPSHOT_FLAGS.map((row) => {
              const present = entry ? row.on(entry) : false;
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs"
                >
                  <span className="text-[var(--text)]">{row.label}</span>
                  <span
                    className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold"
                    style={
                      present
                        ? {
                            background: "var(--chip-yes-bg)",
                            color: "var(--chip-yes-fg)",
                            borderColor: "var(--chip-yes-border)",
                          }
                        : {
                            background: "var(--chip-no-bg)",
                            color: "var(--chip-no-fg)",
                            borderColor: "var(--chip-no-border)",
                          }
                    }
                  >
                    {present ? "Yes" : "No"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="m-0 mt-2.5 text-[11.5px] leading-snug text-[var(--muted)]">
            Showing the {year} snapshot. Detailed provisions below reflect current
            law.
          </p>
        </div>
      ) : null}

      <StateDetailView detail={detail} orient={orient} />
      <div className="mt-3 border-t border-[var(--border)] pt-2.5">
        <Link
          href={`/state/${detail.code.toLowerCase()}`}
          className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
        >
          Open full page →
        </Link>
      </div>
    </div>
  );
}
