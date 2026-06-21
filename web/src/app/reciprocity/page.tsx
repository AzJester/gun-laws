import type { Metadata } from "next";
import Link from "next/link";

import ReciprocityExplorer from "@/components/ReciprocityExplorer";
import { getStates } from "@/lib/data";
import {
  reciprocityCodes,
  getReciprocity,
  RECIPROCITY_DISCLAIMER,
} from "@/lib/reciprocity";

// Reads the state list (names) at build time; the matrix itself is bundled JSON.
// Renders statically (no DB needed) so it works in the static Pages export.

export const metadata: Metadata = {
  title: "Concealed-carry reciprocity",
  description:
    "Illustrative concealed-carry permit reciprocity: see where a state's resident permit is honored, and which permits each state recognizes. Sample data — not legal advice.",
};

export default async function ReciprocityPage() {
  const states = await getStates();
  const names: Record<string, string> = {};
  for (const s of states) names[s.code] = s.name;
  const codes = reciprocityCodes();
  // Codes that exist in the matrix should always have a display name; fall back
  // to the code itself if the dataset is missing one (e.g. DC edge cases).
  for (const c of codes) if (!names[c]) names[c] = c;

  return (
    <main id="main" className="mx-auto max-w-[1000px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to the map
        </Link>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <Link href="/compare" className="hover:text-[var(--accent)] hover:underline">
            Compare
          </Link>
          <Link href="/alerts" className="hover:text-[var(--accent)] hover:underline">
            Alerts
          </Link>
          <Link href="/changelog" className="hover:text-[var(--accent)] hover:underline">
            Changelog
          </Link>
        </nav>
      </div>

      <h1 className="m-0 text-2xl font-bold">Concealed-carry reciprocity</h1>
      <p className="mt-1 max-w-[680px] text-sm text-[var(--muted)]">
        Does your concealed-carry permit work in another state? Pick the state
        that issued your permit to see where it&apos;s illustratively honored,
        plus the permitless states where no permit is required at all.
      </p>

      <div className="mt-3 rounded-[12px] border border-[#5b4a1d] bg-[#241d0d] p-3.5 text-[12.5px] leading-relaxed text-[#ecdcb0]">
        <strong className="text-[#e3b341]">⚠ Sample data — verify before traveling.</strong>{" "}
        {RECIPROCITY_DISCLAIMER}
      </div>

      <section className="mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
        <ReciprocityExplorer names={names} codes={codes} />
      </section>

      {/* Full matrix: rows = destination state, columns summarize recognition. */}
      <section className="mt-6">
        <h2 className="m-0 mb-2 text-lg font-semibold">Full matrix (illustrative)</h2>
        <p className="m-0 mb-3 text-[12.5px] text-[var(--muted)]">
          Each row is a destination state: whether it&apos;s permitless, and how
          many out-of-state permits it honors (with the list).
        </p>
        <div className="overflow-x-auto rounded-[14px] border border-[var(--border)]">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="bg-[var(--panel)] px-3 py-2.5 text-left font-semibold">
                  State
                </th>
                <th className="bg-[var(--panel)] px-3 py-2.5 text-left font-semibold">
                  Permitless?
                </th>
                <th className="bg-[var(--panel)] px-3 py-2.5 text-left font-semibold">
                  Honors (count)
                </th>
                <th className="bg-[var(--panel)] px-3 py-2.5 text-left font-semibold">
                  Permits honored
                </th>
              </tr>
            </thead>
            <tbody>
              {codes
                .slice()
                .sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b))
                .map((c) => {
                  const info = getReciprocity(c)!;
                  return (
                    <tr key={c} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 font-semibold">
                        {names[c]}{" "}
                        <span className="text-[var(--muted)]">({c})</span>
                      </td>
                      <td className="px-3 py-2">
                        {info.permitless ? (
                          <span className="rounded-full border border-[#2c5e3a] bg-[#16361f] px-2 py-0.5 text-[10.5px] font-bold text-[#7ee29a]">
                            Yes
                          </span>
                        ) : (
                          <span className="rounded-full border border-[#313b44] bg-[#222a30] px-2 py-0.5 text-[10.5px] font-bold text-[#8b97a2]">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {info.honors.length}
                      </td>
                      <td className="px-3 py-2 text-[11.5px] text-[var(--muted)]">
                        {info.honors.length ? info.honors.join(", ") : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[#e3b341]">⚠ Not legal advice.</strong>{" "}
        {RECIPROCITY_DISCLAIMER}
      </p>
    </main>
  );
}
