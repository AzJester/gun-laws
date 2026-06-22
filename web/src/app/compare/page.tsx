import type { Metadata } from "next";
import Link from "next/link";

import CompareView from "@/components/CompareView";
import ThemeToggle from "@/components/ThemeToggle";
import { getState, getStates } from "@/lib/data";
import {
  parseOrientation,
  ORIENTATION_LABEL,
  type Orientation,
} from "@/lib/grading";
import { type StateDetail } from "@/lib/types";

// The comparison itself is rendered client-side by CompareView: it owns the
// selection, reads ?states= from the URL, and fetches each state's detail JSON
// (public/data/states/<code>.json) on demand. This server component only
// computes the initial selection + details (for a no-flash first paint) and the
// list of selectable states. Doing it this way fixes the static-export bug where
// the page was frozen on the default states because `output: export` can't read
// `searchParams` at request time.

export const metadata: Metadata = {
  title: "Compare states",
  description:
    "Compare 2–4 US states side by side: overall grade, law count, the six headline policy flags, and a category-by-category view of tracked firearm laws.",
};

// In the static Pages export there is no server to read the request, so reading
// `searchParams` would force dynamic rendering (unsupported with output:export).
// In that mode we render the default selection server-side; CompareView adopts
// the real ?states= from the URL on mount.
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

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
  // Avoid touching `searchParams` at all in static-export mode (reading it would
  // opt the route into dynamic rendering and break `output: export`).
  const initialCodes = IS_STATIC ? DEFAULT_STATES : parseStates(searchParams.states);
  const orient: Orientation = IS_STATIC
    ? parseOrientation(undefined)
    : parseOrientation(searchParams.orient);

  const [allStates, details] = await Promise.all([
    getStates(),
    Promise.all(initialCodes.map((c) => getState(c))),
  ]);
  const options = allStates.map((s) => ({ code: s.code, name: s.name }));
  const initialDetails = details.filter((d): d is StateDetail => Boolean(d));

  return (
    <main id="main" className="mx-auto max-w-[1100px] px-6 py-8 text-[var(--text)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to the map
        </Link>
        <nav
          aria-label="Section"
          className="flex items-center gap-4 text-[12.5px] text-[var(--muted)]"
        >
          <ThemeToggle className="theme-toggle theme-toggle--inline" />
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
        category. Rows where the states differ are highlighted. Grades use the{" "}
        <b>{ORIENTATION_LABEL.rights}</b> scale.
      </p>

      <CompareView
        options={options}
        initialCodes={initialCodes}
        initialDetails={initialDetails}
        orient={orient}
      />

      <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong>{" "}
        Grades read <b>fewer restrictions = A</b> (A = fewest of the 134 tracked
        laws, F = the most). Append{" "}
        <code className="rounded bg-[var(--panel-2)] px-1">&amp;orient=count</code>{" "}
        to drop letter grades and shade by raw law count instead. Always verify
        with official state resources.
      </p>
    </main>
  );
}
