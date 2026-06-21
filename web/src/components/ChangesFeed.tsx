"use client";

import type { ChangeEventDTO } from "@/lib/types";

interface ChangesFeedProps {
  changes: ChangeEventDTO[];
  onSelect: (code: string) => void;
}

// Tag pill colors keyed on change kind. Mapped to theme-aware semantic vars so
// the pills stay legible (AA) in both dark and light modes:
//   enacted        → success (green)
//   effective      → info (blue)
//   court_ruling   → warn (amber)
//   introduced     → purple
//   amended        → purple
//   repealed       → warn (amber)
const TAG_STYLE: Record<string, { background: string; color: string }> = {
  enacted: { background: "var(--chip-yes-bg)", color: "var(--chip-yes-fg)" },
  effective: { background: "var(--snapshot-bg)", color: "var(--snapshot-fg)" },
  court_ruling: { background: "var(--warn-bg)", color: "var(--warn-strong)" },
  introduced: { background: "var(--chip-purple-bg)", color: "var(--chip-purple-fg)" },
  amended: { background: "var(--chip-purple-bg)", color: "var(--chip-purple-fg)" },
  repealed: { background: "var(--warn-bg)", color: "var(--warn-strong)" },
};

export default function ChangesFeed({ changes, onSelect }: ChangesFeedProps) {
  return (
    <div className="flex flex-col">
      {changes.map((c, i) => {
        const tag = TAG_STYLE[c.kind] ?? TAG_STYLE.effective;
        return (
          <button
            key={i}
            type="button"
            className="flex cursor-pointer gap-3 border-t border-[var(--border)] py-3 text-left first:border-t-0 hover:rounded-lg hover:bg-[var(--row-hover)]"
            onClick={() => onSelect(c.stateCode)}
          >
            <div className="w-16 flex-none whitespace-nowrap pt-0.5 text-[11px] text-[var(--muted)]">
              {c.date}
            </div>
            <div className="text-[13px]">
              <span className="font-semibold">{c.stateName}</span> — {c.headline}
              <br />
              <span
                className="mt-1 inline-block rounded px-2 py-0.5 text-[10.5px] font-bold"
                style={tag}
              >
                {c.tagLabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
