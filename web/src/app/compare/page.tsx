import type { Metadata } from "next";
import Link from "next/link";

import CompareSelector from "@/components/CompareSelector";
import { getState, getStates } from "@/lib/data";
import {
  displayGrade,
  displayGradeColor,
  displayGradeTextColor,
  parseOrientation,
  ORIENTATION_LABEL,
  type Orientation,
} from "@/lib/grading";
import {
  POLICY_KEYS,
  POLICY_LABELS,
  type PolicyKey,
  type StateDetail,
} from "@/lib/types";

// Reads each state's full detail at request time (DB or JSON fallback). Dynamic
// so `next build` never renders it without a DB and the ?states= query is honored.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare states",
  description:
    "Compare 2–4 US states side by side: overall grade, law count, the six headline policy flags, and a category-by-category view of tracked firearm laws.",
};

const MIN = 2;
const MAX = 4;
const DEFAULT_STATES = ["CA", "TX"];

function parseStates(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_STATES;
  const codes = raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  const unique = Array.from(new Set(codes));
  if (unique.length < MIN) return unique.length ? unique : DEFAULT_STATES;
  return unique.slice(0, MAX);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { states?: string; orient?: string };
}) {
  const codes = parseStates(searchParams.states);
  const orient: Orientation = parseOrientation(searchParams.orient);

  const [allStates, details] = await Promise.all([
    getStates(),
    Promise.all(codes.map((c) => getState(c))),
  ]);
  const stateOptions = allStates.map((s) => ({ code: s.code, name: s.name }));

  const found = details.filter((d): d is StateDetail => Boolean(d));
  const showGrade = orient !== "count";

  // Union of all provision categories across the compared states, preserving the
  // order they first appear so the table reads like the detail view.
  const categoryOrder: string[] = [];
  for (const d of found) {
    for (const cat of d.provisions) {
      if (!categoryOrder.includes(cat.category)) categoryOrder.push(cat.category);
    }
  }
  // Item count per (state, category) to highlight where states differ.
  function catCount(d: StateDetail, category: string): number {
    return d.provisions.find((c) => c.category === category)?.items.length ?? 0;
  }
  // Headline flag value per (state, policy).
  function flagOn(d: StateDetail, key: PolicyKey): boolean {
    return Boolean(d.policies[key]);
  }
  // A row differs if not every found state shares the same value.
  function rowDiffers<T>(values: T[]): boolean {
    return values.some((v) => v !== values[0]);
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to the map
        </Link>
        <nav className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]">
          <Link href="/reciprocity" className="hover:text-[var(--accent)] hover:underline">
            Reciprocity
          </Link>
          <Link href="/alerts" className="hover:text-[var(--accent)] hover:underline">
            Alerts
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
      </div>

      <h1 className="m-0 text-2xl font-bold">Compare states</h1>
      <p className="mt-1 max-w-[680px] text-sm text-[var(--muted)]">
        Side-by-side overall grade, law count (of 134 tracked laws), the six
        headline policy flags, and how many tracked laws each state has in each
        category. Rows where the states differ are highlighted. Grades shown in
        the <b>{ORIENTATION_LABEL[orient]}</b> lens.
      </p>

      <div className="mt-4">
        <CompareSelector states={stateOptions} selected={codes} />
      </div>

      {found.length < MIN ? (
        <p className="mt-6 rounded-lg border border-[#5b4a1d] bg-[#241d0d] p-4 text-sm text-[#e3b341]">
          Pick at least {MIN} valid states above to see a comparison.
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
                      differ ? "bg-[#161d12]" : "",
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
                      differ ? "bg-[#161d12]" : "",
                    ].join(" ")}
                  >
                    <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5">
                      {POLICY_LABELS[key]}
                      {differ ? (
                        <span className="ml-1 text-[10px] font-bold text-[#67d99a]">
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
                      differ ? "bg-[#161d12]" : "",
                    ].join(" ")}
                  >
                    <td className="sticky left-0 bg-[var(--panel-2)] px-3 py-2.5">
                      {category}
                      {differ ? (
                        <span className="ml-1 text-[10px] font-bold text-[#67d99a]">
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
                              isMax && differ ? "font-bold text-[#7ee29a]" : "",
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

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[#e3b341]">⚠ Not legal advice.</strong> Grades
        are <b>stored</b> in the gun-rights orientation (A = fewest
        restrictions). Append{" "}
        <code className="rounded bg-[var(--panel-2)] px-1">&amp;orient=safety</code>{" "}
        to flip the displayed lens, or{" "}
        <code className="rounded bg-[var(--panel-2)] px-1">&amp;orient=count</code>{" "}
        to drop letter grades. Always verify with official state resources.
      </p>
    </main>
  );
}
