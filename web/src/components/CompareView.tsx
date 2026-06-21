"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CompareSelector from "./CompareSelector";

import {
  displayGrade,
  displayGradeColor,
  displayGradeTextColor,
  type Orientation,
} from "@/lib/grading";
import {
  POLICY_KEYS,
  POLICY_LABELS,
  type PolicyKey,
  type StateDetail,
} from "@/lib/types";

interface Option {
  code: string;
  name: string;
}

interface CompareViewProps {
  options: Option[];
  /** Codes the server rendered (default in the static export, ?states= on the
   *  server build). The client re-reads the URL on mount so a shared link works. */
  initialCodes: string[];
  /** Full detail for `initialCodes`, used to seed the cache (no first-paint flash). */
  initialDetails: StateDetail[];
  orient: Orientation;
}

const MIN = 2;
const MAX = 4;

// Per-state detail is served as a static asset (public/data/states/<code>.json),
// the same asset the map fetches. NEXT_PUBLIC_BASE_PATH is "/gun-laws" only in the
// Pages export so the URL respects the project-pages base path; "" otherwise.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function parseCodes(raw: string): string[] {
  const codes = raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  return Array.from(new Set(codes)).slice(0, MAX);
}

/**
 * Client-side comparison. The previous server-only version was frozen on the
 * default states in the static export (it could not read ?states=), so picking
 * states never changed the table. This component owns the selection, fetches each
 * state's detail JSON on demand, and works identically in both build modes.
 */
export default function CompareView({
  options,
  initialCodes,
  initialDetails,
  orient,
}: CompareViewProps) {
  const [codes, setCodes] = useState<string[]>(initialCodes);

  // code -> detail cache (null = fetched but missing). Seeded with the SSR
  // details so the initial render has no loading flash.
  const [cache, setCache] = useState<Record<string, StateDetail | null>>(() => {
    const seed: Record<string, StateDetail | null> = {};
    for (const d of initialDetails) seed[d.code] = d;
    return seed;
  });

  // On mount, adopt ?states= from the URL. The static export renders the default
  // selection server-side, so this is what makes a shared/deep link resolve to
  // the right states.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("states");
    if (!raw) return;
    const parsed = parseCodes(raw);
    if (parsed.length >= MIN) setCodes(parsed);
  }, []);

  // Fetch detail for any selected code we haven't cached yet.
  useEffect(() => {
    const missing = codes.filter((c) => !(c in cache));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((c) =>
        fetch(`${BASE}/data/states/${c.toLowerCase()}.json`)
          .then((r) => (r.ok ? (r.json() as Promise<StateDetail>) : null))
          .catch(() => null)
          .then((d) => [c, d] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setCache((prev) => {
        const next = { ...prev };
        for (const [c, d] of entries) next[c] = d;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [codes, cache]);

  const apply = useCallback((picked: string[]) => {
    const next = picked.slice(0, MAX);
    if (next.length < MIN) return;
    setCodes(next);
    // Keep the URL shareable without a full navigation (avoids re-fetching the
    // whole page; the table is already client-driven).
    const params = new URLSearchParams(window.location.search);
    params.set("states", next.join(","));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  // Resolve detail in selection order; only render states that have loaded.
  const found = useMemo(
    () => codes.map((c) => cache[c]).filter((d): d is StateDetail => Boolean(d)),
    [codes, cache],
  );
  const loading = codes.some((c) => !(c in cache));
  const showGrade = orient !== "count";

  // Union of all provision categories across compared states, in first-seen order.
  const categoryOrder: string[] = [];
  for (const d of found) {
    for (const cat of d.provisions) {
      if (!categoryOrder.includes(cat.category)) categoryOrder.push(cat.category);
    }
  }
  const catCount = (d: StateDetail, category: string): number =>
    d.provisions.find((c) => c.category === category)?.items.length ?? 0;
  const flagOn = (d: StateDetail, key: PolicyKey): boolean => Boolean(d.policies[key]);
  const rowDiffers = <T,>(values: T[]): boolean => values.some((v) => v !== values[0]);

  return (
    <div>
      <div className="mt-4">
        <CompareSelector states={options} selected={codes} onApply={apply} />
      </div>

      {found.length < MIN ? (
        <p className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
          {loading
            ? "Loading comparison…"
            : `Pick at least ${MIN} valid states above to see a comparison.`}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[14px] border border-[var(--border)]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--panel)] px-3 py-3 text-left font-semibold">
                  Metric
                </th>
                {found.map((d) => (
                  <th
                    key={d.code}
                    className="bg-[var(--panel)] px-3 py-3 text-left font-semibold"
                  >
                    <Link
                      href={`/state/${d.code.toLowerCase()}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {d.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Grade row */}
              <tr className="border-t border-[var(--border)]">
                <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5 font-semibold">
                  Overall grade
                </td>
                {found.map((d) => {
                  const shown = displayGrade(d.grade, orient);
                  return (
                    <td key={d.code} className="px-3 py-2.5">
                      {showGrade ? (
                        <span
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-[15px] font-extrabold"
                          style={{
                            background: displayGradeColor(d.grade, orient),
                            color: displayGradeTextColor(d.grade, orient),
                          }}
                        >
                          {shown}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">— (count lens)</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Law count row */}
              {(() => {
                const counts = found.map((d) => d.lawCount);
                const differ = rowDiffers(counts);
                return (
                  <tr
                    className={[
                      "border-t border-[var(--border)]",
                      differ ? "bg-[var(--highlight-bg)]" : "",
                    ].join(" ")}
                  >
                    <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5 font-semibold">
                      Tracked laws (/134)
                    </td>
                    {found.map((d) => (
                      <td key={d.code} className="px-3 py-2.5">
                        {d.lawCount === null ? (
                          <span className="text-[var(--muted)]">pending</span>
                        ) : (
                          <b>{d.lawCount}</b>
                        )}
                        <span className="text-[var(--muted)]"> / 134</span>
                      </td>
                    ))}
                  </tr>
                );
              })()}

              {/* Headline flags */}
              <tr className="border-t border-[var(--border)]">
                <td
                  colSpan={found.length + 1}
                  className="bg-[var(--panel)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                >
                  Headline policies
                </td>
              </tr>
              {POLICY_KEYS.map((key) => {
                const values = found.map((d) => flagOn(d, key));
                const differ = rowDiffers(values);
                return (
                  <tr
                    key={key}
                    className={[
                      "border-t border-[var(--border)]",
                      differ ? "bg-[var(--highlight-bg)]" : "",
                    ].join(" ")}
                  >
                    <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5">
                      {POLICY_LABELS[key]}
                      {differ ? (
                        <span className="ml-1 text-[10px] font-bold text-[var(--chip-yes-fg)]">
                          ◆ differs
                        </span>
                      ) : null}
                    </td>
                    {found.map((d, i) => (
                      <td key={d.code} className="px-3 py-2.5">
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-bold"
                          style={
                            values[i]
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
                          {values[i] ? "Yes" : "No"}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Category-by-category tracked-law counts */}
              <tr className="border-t border-[var(--border)]">
                <td
                  colSpan={found.length + 1}
                  className="bg-[var(--panel)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                >
                  Tracked laws by category (count of provisions)
                </td>
              </tr>
              {categoryOrder.map((category) => {
                const counts = found.map((d) => catCount(d, category));
                const differ = rowDiffers(counts);
                const maxCount = Math.max(...counts, 0);
                return (
                  <tr
                    key={category}
                    className={[
                      "border-t border-[var(--border)]",
                      differ ? "bg-[var(--highlight-bg)]" : "",
                    ].join(" ")}
                  >
                    <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5">
                      {category}
                      {differ ? (
                        <span className="ml-1 text-[10px] font-bold text-[var(--chip-yes-fg)]">
                          ◆ differs
                        </span>
                      ) : null}
                    </td>
                    {found.map((d, i) => {
                      const c = counts[i];
                      const isMax = c === maxCount && maxCount > 0;
                      return (
                        <td key={d.code} className="px-3 py-2.5">
                          <span
                            className={[
                              c === 0 ? "text-[var(--muted)]" : "",
                              isMax && differ ? "font-bold text-[var(--chip-yes-fg)]" : "",
                            ].join(" ")}
                          >
                            {c}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
