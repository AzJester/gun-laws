import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getState, getStates } from "@/lib/data";
import { displayGrade, displayGradeColor, displayGradeTextColor } from "@/lib/grading";
import { lawCountLabel } from "@/lib/a11y";
import type { Policies } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";

// SSG: with DATABASE_URL unset, getStates() reads data/sample-states.json at
// build time, so every /embed/[code] card is statically generated (works on
// Pages). Mirrors /state/[code].
export async function generateStaticParams(): Promise<{ code: string }[]> {
  const states = await getStates();
  return states.map((s) => ({ code: s.code.toLowerCase() }));
}

export const dynamicParams = false;

// The six headline policy flags, in the same order as the detail view.
const FLAG_ROWS: { label: string; on: (p: Policies) => boolean }[] = [
  { label: "Carry permit required", on: (p) => !p.permitless_carry },
  { label: "Universal background checks", on: (p) => p.universal_bg_check },
  { label: "Red-flag (ERPO) law", on: (p) => p.red_flag },
  { label: "Assault-weapon restriction", on: (p) => p.assault_weapon_ban },
  { label: "Magazine limit", on: (p) => p.magazine_limit },
  { label: "Waiting period", on: (p) => p.waiting_period },
];

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const state = await getState(params.code);
  if (!state) return { title: "State not found" };
  const title = `${state.name} report card (Grade ${state.grade})`;
  return {
    title: `Embed — ${title}`,
    description:
      `Embeddable ${state.name} firearm-law report card: Grade ${state.grade}, ` +
      `${lawCountLabel(state.lawCount)}. Informational only, not legal advice.`,
    alternates: { canonical: `/embed/${state.code.toLowerCase()}` },
    robots: { index: false, follow: false },
  };
}

export default async function EmbedStatePage({
  params,
}: {
  params: { code: string };
}) {
  const state = await getState(params.code);
  if (!state) notFound();

  const grade = displayGrade(state.grade, "rights");
  const bg = displayGradeColor(state.grade, "rights");
  const fg = displayGradeTextColor(state.grade, "rights");
  const detailHref = `${SITE_URL}/state/${state.code.toLowerCase()}`;

  return (
    <main id="main">
      <article className="mx-auto max-w-[460px] p-3.5 text-[var(--text)]">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-[18px]">
          <div className="mb-3 flex items-center gap-3.5">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl font-extrabold"
              style={{ background: bg, color: fg }}
              aria-hidden="true"
            >
              {grade}
            </div>
            <div>
              <h1 className="m-0 text-xl font-semibold">{state.name}</h1>
              <div className="text-xs text-[var(--muted)]">
                Grade {grade} · {lawCountLabel(state.lawCount)}
                {state.verifiedThrough ? ` · verified through ${state.verifiedThrough}` : ""}
              </div>
            </div>
          </div>

          <ul className="my-1 mb-4 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {FLAG_ROWS.map((row) => {
              const present = row.on(state.policies);
              return (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs"
                >
                  <span className="text-[var(--text)]">{row.label}</span>
                  <span
                    className="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold"
                    style={
                      present
                        ? { background: "#16361f", color: "#7ee29a", borderColor: "#2c5e3a" }
                        : { background: "#222a30", color: "#8b97a2", borderColor: "#313b44" }
                    }
                  >
                    {present ? "Yes" : "No"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-[11.5px]">
            <Link
              href={detailHref}
              target="_blank"
              rel="noopener"
              className="font-semibold text-[var(--accent)] hover:underline"
            >
              View full details →
            </Link>
            <span className="text-[var(--muted)]">
              via{" "}
              <a
                href={`${SITE_URL}/`}
                target="_blank"
                rel="noopener"
                className="text-[var(--accent)] hover:underline"
              >
                GunLawMap
              </a>
            </span>
          </div>

          <p className="m-0 mt-2 text-[10.5px] leading-snug text-[var(--muted)]">
            Grade orientation: A = fewest restrictions. Informational only, not legal advice.
          </p>
        </div>
      </article>
    </main>
  );
}
