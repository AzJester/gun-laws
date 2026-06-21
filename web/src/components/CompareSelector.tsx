"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface StateOption {
  code: string;
  name: string;
}

interface CompareSelectorProps {
  states: StateOption[];
  selected: string[];
}

const MAX = 4;
const MIN = 2;

/**
 * Edits the ?states= query for the compare page. Keeps 2–4 codes and pushes a
 * new URL so the server component re-renders with the chosen states.
 */
export default function CompareSelector({ states, selected }: CompareSelectorProps) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selected);

  function toggle(code: string) {
    setPicked((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX) return prev; // cap at 4
      return [...prev, code];
    });
  }

  function apply() {
    if (picked.length < MIN) return;
    router.push(`/compare?states=${picked.join(",")}`);
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
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-[#06121f] disabled:opacity-50"
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
                    ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-[#06121f]"
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
