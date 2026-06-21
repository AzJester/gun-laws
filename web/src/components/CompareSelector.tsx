"use client";

import { useEffect, useState } from "react";

interface StateOption {
  code: string;
  name: string;
}

interface CompareSelectorProps {
  states: StateOption[];
  selected: string[];
  /** Called with the staged 2–4 codes when the user hits "Compare". */
  onApply: (codes: string[]) => void;
}

const MAX = 4;
const MIN = 2;

/**
 * Stages a 2–4 state selection and hands it to the parent on "Compare". The
 * parent (CompareView) owns the comparison and re-renders client-side, so this
 * no longer navigates — which is what makes the picker work in the static export.
 */
export default function CompareSelector({
  states,
  selected,
  onApply,
}: CompareSelectorProps) {
  const [picked, setPicked] = useState<string[]>(selected);

  // Re-sync the staged selection when the applied selection changes (e.g. when
  // the parent adopts ?states= from the URL on mount).
  useEffect(() => {
    setPicked(selected);
  }, [selected]);

  function toggle(code: string) {
    setPicked((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX) return prev; // cap at 4
      return [...prev, code];
    });
  }

  function apply() {
    if (picked.length < MIN) return;
    onApply(picked);
  }

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold">
          Pick {MIN}–{MAX} states to compare
        </span>
        <span className="text-[12px] text-[var(--muted)]">
          ({picked.length} selected)
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={apply}
          disabled={picked.length < MIN}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          Compare
        </button>
      </div>
      <div className="flex max-h-[160px] flex-wrap gap-1.5 overflow-y-auto">
        {[...states]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((s) => {
            const on = picked.includes(s.code);
            const atCap = !on && picked.length >= MAX;
            return (
              <button
                key={s.code}
                type="button"
                aria-pressed={on}
                disabled={atCap}
                onClick={() => toggle(s.code)}
                title={s.name}
                className={[
                  "rounded-md border px-2 py-1 text-[11.5px]",
                  on
                    ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                    : atCap
                      ? "cursor-not-allowed border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] opacity-40"
                      : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)]",
                ].join(" ")}
              >
                {s.code}
              </button>
            );
          })}
      </div>
    </div>
  );
}
