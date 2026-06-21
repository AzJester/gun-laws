import Link from "next/link";

import { getPublishedChanges } from "@/lib/data";

// Public changelog. Reads at request time (DB published events or JSON
// fallback); keep dynamic so `next build` never renders it without a DB.
export const dynamic = "force-dynamic";

const TAG_STYLE: Record<string, { background: string; color: string }> = {
  enacted: { background: "#16341f", color: "#56d364" },
  effective: { background: "#102a43", color: "#58a6ff" },
  court_ruling: { background: "#3a2d12", color: "#e3b341" },
  introduced: { background: "#2a1f3a", color: "#bc8cff" },
  amended: { background: "#2a1f3a", color: "#bc8cff" },
  repealed: { background: "#3a2d12", color: "#e3b341" },
};

export default async function ChangelogPage() {
  const changes = await getPublishedChanges({ limit: 100 });

  return (
    <main className="mx-auto max-w-[860px] px-6 py-8 text-[var(--text)]">
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
