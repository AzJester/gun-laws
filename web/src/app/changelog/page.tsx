import Link from "next/link";

import { getPublishedChanges } from "@/lib/data";

// Public changelog. Renders statically: on the server build it reads the DB
// published events (or the JSON snapshot fallback) at build time; in the static
// Pages export it renders the no-DB snapshot. Either way `next build` produces a
// static page.

// Tag pill colors keyed on change kind. Theme-aware semantic vars (mirrors
// ChangesFeed) so the pills stay AA-legible in both dark and light modes.
const TAG_STYLE: Record<string, { background: string; color: string }> = {
  enacted: { background: "var(--chip-yes-bg)", color: "var(--chip-yes-fg)" },
  effective: { background: "var(--snapshot-bg)", color: "var(--snapshot-fg)" },
  court_ruling: { background: "var(--warn-bg)", color: "var(--warn-strong)" },
  introduced: { background: "var(--chip-purple-bg)", color: "var(--chip-purple-fg)" },
  amended: { background: "var(--chip-purple-bg)", color: "var(--chip-purple-fg)" },
  repealed: { background: "var(--warn-bg)", color: "var(--warn-strong)" },
};

export default async function ChangelogPage() {
  const changes = await getPublishedChanges({ limit: 100 });

  return (
    <main id="main" className="mx-auto max-w-[860px] px-6 py-8 text-[var(--text)]">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold">Changelog</h1>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Map
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Published firearm-law changes, newest first. Each entry was reviewed and
        approved before publishing (see the detect → draft → review → publish
        pipeline). Informational only, not legal advice.
      </p>

      {changes.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          No published changes yet.
        </p>
      ) : (
        <div className="mt-6 flex flex-col">
          {changes.map((c, i) => {
            const tag = TAG_STYLE[c.kind] ?? TAG_STYLE.effective;
            return (
              <div
                key={i}
                className="flex gap-3 border-t border-[var(--border)] py-3 first:border-t-0"
              >
                <div className="w-16 flex-none whitespace-nowrap pt-0.5 text-[11px] text-[var(--muted)]">
                  {c.date}
                </div>
                <div className="text-[13px]">
                  <span className="font-semibold">{c.stateName}</span> —{" "}
                  {c.headline}
                  <br />
                  <span
                    className="mt-1 inline-block rounded px-2 py-0.5 text-[10.5px] font-bold"
                    style={tag}
                  >
                    {c.tagLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
