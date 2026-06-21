"use client";

import { useMemo, useState } from "react";

import {
  honoredIn,
  honors,
  isPermitless,
  getReciprocity,
} from "@/lib/reciprocity";

interface ReciprocityExplorerProps {
  /** code -> display name (passed from the server so names match the dataset). */
  names: Record<string, string>;
  codes: string[];
}

export default function ReciprocityExplorer({
  names,
  codes,
}: ReciprocityExplorerProps) {
  const sorted = useMemo(
    () => [...codes].sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b)),
    [codes, names],
  );
  const [origin, setOrigin] = useState<string>("TX");

  const nameOf = (c: string) => names[c] ?? c;

  const result = useMemo(() => honoredIn(origin), [origin]);
  const accepts = useMemo(() => honors(origin), [origin]);
  const originPermitless = isPermitless(origin);
  const originInfo = getReciprocity(origin);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="recip-origin"
          className="mb-1 block text-[13px] font-semibold"
        >
          Where is your concealed-carry permit from?
        </label>
        <select
          id="recip-origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="w-full max-w-[320px] rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        >
          {sorted.map((c) => (
            <option key={c} value={c}>
              {nameOf(c)} ({c})
            </option>
          ))}
        </select>
      </div>

      {originInfo ? (
        <>
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <p className="m-0 text-[13px]">
              {originPermitless ? (
                <>
                  <b>{nameOf(origin)}</b> allows{" "}
                  <span className="font-semibold text-[var(--chip-yes-fg)]">
                    permitless (constitutional) carry
                  </span>{" "}
                  — but reciprocity below still reflects whether other states
                  honor a {nameOf(origin)} <i>permit</i> (some require one for
                  non-residents).
                </>
              ) : (
                <>
                  A <b>{nameOf(origin)}</b> resident concealed-carry permit is
                  illustratively honored in{" "}
                  <span className="font-semibold text-[var(--chip-yes-fg)]">
                    {result.byPermit.length}
                  </span>{" "}
                  state(s) by reciprocity, plus{" "}
                  <span className="font-semibold text-[var(--chip-yes-fg)]">
                    {result.permitless.length}
                  </span>{" "}
                  permitless states where no permit is required at all.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-[var(--chip-yes-fg)]">
                ✓ Honors your permit ({result.byPermit.length})
              </h3>
              {result.byPermit.length ? (
                <ul className="m-0 flex flex-wrap gap-1.5 p-0">
                  {result.byPermit.map((c) => (
                    <li
                      key={c}
                      title={nameOf(c)}
                      className="rounded-md border border-[var(--chip-yes-border)] bg-[var(--chip-yes-bg)] px-2 py-1 text-[11.5px] font-semibold text-[var(--chip-yes-fg)]"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[12px] text-[var(--muted)]">None.</p>
              )}
            </div>

            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-[var(--snapshot-fg)]">
                ⊘ No permit needed — permitless ({result.permitless.length})
              </h3>
              <ul className="m-0 flex flex-wrap gap-1.5 p-0">
                {result.permitless.map((c) => (
                  <li
                    key={c}
                    title={nameOf(c)}
                    className="rounded-md border border-[var(--snapshot-border)] bg-[var(--snapshot-bg)] px-2 py-1 text-[11.5px] font-semibold text-[var(--snapshot-fg)]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="m-0 mb-2 text-[13px] font-semibold text-[var(--muted)]">
              For reference: permits <b>{nameOf(origin)}</b> honors ({accepts.length})
            </h3>
            {accepts.length ? (
              <ul className="m-0 flex flex-wrap gap-1.5 p-0">
                {accepts.map((c) => (
                  <li
                    key={c}
                    title={nameOf(c)}
                    className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-[11.5px] text-[var(--muted)]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[12px] text-[var(--muted)]">
                {nameOf(origin)} does not honor out-of-state permits in this
                sample (it may be a may-issue/no-reciprocity state).
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[var(--muted)]">
          No reciprocity data for that state.
        </p>
      )}
    </div>
  );
}
