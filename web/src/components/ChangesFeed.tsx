"use client";

import type { ChangeEventDTO } from "@/lib/types";

interface ChangesFeedProps {
  changes: ChangeEventDTO[];
  onSelect: (code: string) => void;
}

const TAG_STYLE: Record<string, { background: string; color: string }> = {
  enacted: { background: "#16341f", color: "#56d364" },
  effective: { background: "#102a43", color: "#58a6ff" },
  court_ruling: { background: "#3a2d12", color: "#e3b341" },
  introduced: { background: "#2a1f3a", color: "#bc8cff" },
  amended: { background: "#2a1f3a", color: "#bc8cff" },
  repealed: { background: "#3a2d12", color: "#e3b341" },
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
            className="flex cursor-pointer gap-3 border-t border-[var(--border)] py-3 text-left first:border-t-0 hover:rounded-lg hover:bg-[rgba(88,166,255,0.05)]"
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
