"use client";

import { gradeColor, gradeTextColor } from "@/lib/grading";
import type { Policies, StateDetail as StateDetailType } from "@/lib/types";

interface StateDetailProps {
  detail: StateDetailType | null;
  loading: boolean;
}

const FLAG_ROWS: { label: string; on: (p: Policies) => boolean }[] = [
  { label: "Carry permit required", on: (p) => !p.permitless_carry },
  { label: "Universal background checks", on: (p) => p.universal_bg_check },
  { label: "Red-flag (ERPO) law", on: (p) => p.red_flag },
  { label: "Assault-weapon restriction", on: (p) => p.assault_weapon_ban },
  { label: "Magazine limit", on: (p) => p.magazine_limit },
  { label: "Waiting period", on: (p) => p.waiting_period },
];

export default function StateDetail({ detail, loading }: StateDetailProps) {
  if (loading && !detail) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }
  if (!detail) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Select a state on the map to see its laws.
      </p>
    );
  }

  const bg = gradeColor(detail.grade);
  const fg = gradeTextColor(detail.grade);
  const lawLabel =
    detail.lawCount === null
      ? "data pending"
      : `${detail.lawCount} of 134 tracked laws`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3.5">
        <div
          className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-extrabold"
          style={{ background: bg, color: fg }}
        >
          {detail.grade}
        </div>
        <div>
          <h2 className="m-0 text-xl font-semibold">{detail.name}</h2>
          <div className="text-xs text-[var(--muted)]">
            Grade {detail.grade} · {lawLabel}
            {detail.year ? ` · as of ${detail.year}` : ""}
          </div>
        </div>
      </div>

      <div className="my-1 mb-4 grid grid-cols-2 gap-2">
        {FLAG_ROWS.map((row) => {
          const present = row.on(detail.policies);
          return (
            <div
              key={row.label}
              className={[
                "flex items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-xs",
                "border-[var(--border)] bg-[var(--panel-2)]",
              ].join(" ")}
            >
              <span className="text-[var(--text)]">{row.label}</span>
              <span
                className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold"
                style={
                  present
                    ? {
                        background: "#103a36",
                        color: "#5fd0c4",
                        borderColor: "#1d5b54",
                      }
                    : {
                        background: "#222a30",
                        color: "#8b97a2",
                        borderColor: "#313b44",
                      }
                }
              >
                {present ? "Yes" : "No"}
              </span>
            </div>
          );
        })}
      </div>

      {detail.provisions.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto pr-1">
          {detail.provisions.map((cat) => (
            <div
              key={cat.category}
              className="border-t border-[var(--border)] pb-1 pt-3 first:border-t-0"
            >
              <h3 className="m-0 mb-2 flex items-center gap-2 text-[13.5px] font-semibold">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "#2a7a74" }}
                />
                {cat.category}
                <span className="font-normal text-[11px] text-[var(--muted)]">
                  ({cat.items.length})
                </span>
              </h3>
              <ul className="m-0 list-disc pl-[18px]">
                {cat.items.map((item, i) => (
                  <li key={i} className="mb-1.5 text-[13px] text-[#cdd7e1]">
                    {item.text}{" "}
                    {item.citation && item.citation !== "—" ? (
                      <span className="text-[11px] text-[var(--muted)]">
                        ({item.citation})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--panel-2)] p-3.5 text-[13px] text-[var(--muted)]">
          Detailed, citation-backed provisions for <b>{detail.name}</b> are being
          compiled. The summary flags above are illustrative. In production each
          flag links to the governing statute and a last-verified date.
        </div>
      )}
    </div>
  );
}
