// Pure presentation of one state's full detail. No "use client" directive, so it
// renders fine both inside the client MapExplorer and inside the server-rendered
// /state/[code] page. It never fetches and never holds state — the caller passes
// a fully-resolved StateDetail plus the active grade orientation.

import FederalCallout from "./FederalCallout";

import {
  displayGrade,
  displayGradeColor,
  displayGradeTextColor,
  type Orientation,
} from "@/lib/grading";
import { CATEGORY_EXPLAINERS } from "@/lib/glossary";
import type { Policies, StateDetail as StateDetailType } from "@/lib/types";

const FLAG_ROWS: { label: string; on: (p: Policies) => boolean }[] = [
  { label: "Carry permit required", on: (p) => !p.permitless_carry },
  { label: "Universal background checks", on: (p) => p.universal_bg_check },
  { label: "Red-flag (ERPO) law", on: (p) => p.red_flag },
  { label: "Assault-weapon restriction", on: (p) => p.assault_weapon_ban },
  { label: "Magazine limit", on: (p) => p.magazine_limit },
  { label: "Waiting period", on: (p) => p.waiting_period },
];

const STATUS_LABEL: Record<string, string> = {
  enjoined: "enjoined",
  struck: "struck down",
  repealed: "repealed",
  enacted_not_yet_effective: "not yet in effect",
};

interface StateDetailViewProps {
  detail: StateDetailType;
  orient?: Orientation;
  /**
   * Heading level for the state name. Use "h1" on the dedicated /state/[code]
   * page (where this is the page's primary heading) and the default "h2" inside
   * the home-page detail panel (where <h1> is the site title).
   */
  titleAs?: "h1" | "h2";
}

export default function StateDetailView({
  detail,
  orient = "rights",
  titleAs = "h2",
}: StateDetailViewProps) {
  const TitleTag = titleAs;
  const shown = displayGrade(detail.grade, orient);
  const bg = displayGradeColor(detail.grade, orient);
  const fg = displayGradeTextColor(detail.grade, orient);
  const lawLabel =
    detail.lawCount === null
      ? "data pending"
      : `${detail.lawCount} of 134 tracked laws`;
  const showGrade = orient !== "count";

  return (
    <div>
      <div className="mb-3 flex items-center gap-3.5">
        {showGrade ? (
          <div
            className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-extrabold"
            style={{ background: bg, color: fg }}
          >
            {shown}
          </div>
        ) : (
          <div
            className="grid h-14 w-14 place-items-center rounded-xl text-lg font-extrabold"
            style={{ background: "var(--panel-2)", color: "var(--text)" }}
            title="Number of tracked laws in effect"
          >
            {detail.lawCount === null ? "—" : detail.lawCount}
          </div>
        )}
        <div>
          <TitleTag className="m-0 text-xl font-semibold">{detail.name}</TitleTag>
          <div className="text-xs text-[var(--muted)]">
            {showGrade ? `Grade ${shown} · ` : ""}
            {lawLabel}
            {detail.verifiedThrough
              ? ` · verified through ${detail.verifiedThrough}`
              : ""}
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
                        background: "#16361f",
                        color: "#7ee29a",
                        borderColor: "#2c5e3a",
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

      <FederalCallout />

      {detail.updates?.length ? (
        <div className="mb-4 rounded-[10px] border border-[#3a5e2c] bg-[#16270f] p-3.5">
          <h3 className="m-0 mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#bde8a4]">
            <span className="text-[14px]" aria-hidden="true">
              🔔
            </span>
            Changes since the 2020 baseline
          </h3>
          <ul className="m-0 list-none p-0">
            {detail.updates
              .slice()
              .sort((a, b) => a.year - b.year)
              .map((u, i) => (
                <li
                  key={i}
                  className="mb-1.5 flex gap-2 text-[12.5px] leading-snug text-[#d7ecca] last:mb-0"
                >
                  <span className="shrink-0 rounded-full border border-[#3a5e2c] bg-[#21380f] px-2 py-0.5 text-[11px] font-bold text-[#bde8a4]">
                    {u.year}
                  </span>
                  <span>{u.label}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {detail.litigation?.length ? (
        <div className="mb-4 rounded-[10px] border border-[#5b4a1d] bg-[#241d0d] p-3.5">
          <h3 className="m-0 mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#e3b341]">
            <span className="text-[14px]" aria-hidden="true">
              ⚖️
            </span>
            Under litigation
          </h3>
          <ul className="m-0 list-none p-0">
            {detail.litigation.map((l, i) => (
              <li
                key={i}
                className="mb-1.5 text-[12.5px] leading-snug text-[#ecdcb0] last:mb-0"
              >
                <span className="mr-1 rounded-full border border-[#5b4a1d] bg-[#2a2210] px-1.5 text-[9.5px] font-bold uppercase text-[#e3b341]">
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                {l.label}
                {l.citation ? (
                  l.url ? (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener"
                      className="ml-1 text-[11px] text-[#8fb8e6] hover:underline"
                    >
                      ({l.citation})
                    </a>
                  ) : (
                    <span className="ml-1 text-[11px] text-[#8fb8e6]">
                      ({l.citation})
                    </span>
                  )
                ) : null}
                {l.note ? (
                  <span className="block text-[11px] text-[var(--muted)]">
                    {l.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.provisions.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto pr-1">
          {detail.provisions.map((cat) => {
            const explainer = CATEGORY_EXPLAINERS[cat.category];
            return (
            <div
              key={cat.category}
              className="border-t border-[var(--border)] pb-1 pt-3 first:border-t-0"
            >
              <h3
                className="m-0 mb-1 flex items-center gap-2 text-[13.5px] font-semibold"
                title={explainer}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "#2a7a74" }}
                  aria-hidden="true"
                />
                {cat.category}
                <span className="font-normal text-[11px] text-[var(--muted)]">
                  ({cat.items.length})
                </span>
              </h3>
              {explainer ? (
                <p className="m-0 mb-2 text-[11.5px] leading-snug text-[var(--muted)]">
                  {explainer}
                </p>
              ) : null}
              <ul className="m-0 list-disc pl-[18px]">
                {cat.items.map((item, i) => (
                  <li key={i} className="mb-1.5 text-[13px] text-[#cdd7e1]">
                    {item.text}{" "}
                    {item.citation && item.citation !== "—" ? (
                      item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener"
                          className="text-[11px] text-[#8fb8e6] hover:underline"
                        >
                          ({item.citation})
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#8fb8e6]">
                          ({item.citation})
                        </span>
                      )
                    ) : null}
                    {item.since ? (
                      <span
                        title="Added since the 2020 baseline"
                        className="ml-1 inline-block rounded-full border border-[#275f41] bg-[#16321f] px-1.5 align-middle text-[9.5px] font-bold text-[#67d99a]"
                      >
                        new ’{String(item.since).slice(2)}
                      </span>
                    ) : null}
                    {item.status && item.status !== "in_effect" ? (
                      <span className="ml-1 inline-block rounded-full border border-[#5b4a1d] bg-[#2a2210] px-1.5 align-middle text-[9.5px] font-bold text-[#e3b341]">
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--panel-2)] p-3.5 text-[13px] text-[var(--muted)]">
          Detailed, citation-backed provisions for <b>{detail.name}</b> are being
          compiled. The summary flags above are illustrative. In production each
          flag links to the governing statute and a last-verified date.
        </div>
      )}

      {detail.sources?.length ? (
        <div className="mt-3 border-t border-[var(--border)] pt-2.5 text-[11px] text-[var(--muted)]">
          Verified through {detail.verifiedThrough ?? "—"} · Sources:{" "}
          {detail.sources.map((s, i) => (
            <span key={i}>
              {i > 0 ? " · " : ""}
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                className="text-[var(--accent)] hover:underline"
              >
                {s.label}
              </a>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
