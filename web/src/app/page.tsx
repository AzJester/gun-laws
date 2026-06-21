import Link from "next/link";

import MapExplorer from "@/components/MapExplorer";
import { getRecentChanges, getStates } from "@/lib/data";
import { getGeo } from "@/lib/geo";

// Reads JSON (or DB) at build time and renders statically — faster, and required
// for the static Pages export. The selected state's full detail is fetched
// client-side from a static JSON asset (see MapExplorer).
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

export default async function HomePage() {
  const [geo, states, changes] = await Promise.all([
    getGeo(),
    getStates(),
    getRecentChanges(),
  ]);

  return (
    <main id="main">
      <MapExplorer geo={geo} states={states} changes={changes} />

      <footer className="mx-auto max-w-[1560px] px-[22px] pb-12">
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
          <Link href="/compare" className="text-[var(--accent)] hover:underline">
            Compare states →
          </Link>
          <Link href="/reciprocity" className="text-[var(--accent)] hover:underline">
            Carry reciprocity →
          </Link>
          <Link href="/alerts" className="text-[var(--accent)] hover:underline">
            Get change alerts →
          </Link>
          {IS_STATIC ? (
            <span className="text-[var(--muted)]">
              RSS feed (server-only on the live demo)
            </span>
          ) : (
            <a href="/feed.xml" className="text-[var(--accent)] hover:underline">
              RSS feed →
            </a>
          )}
          <Link href="/changelog" className="text-[var(--accent)] hover:underline">
            View the published changelog →
          </Link>
        </p>
        <p className="rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12.5px] leading-relaxed text-[var(--muted)]">
          <strong className="text-[var(--warn-strong)]">⚠ Not legal advice.</strong> Law
          data is from the{" "}
          <a
            className="text-[var(--accent)] hover:underline"
            href="https://www.statefirearmlaws.org/"
          >
            State Firearm Laws Database
          </a>{" "}
          (Siegel et al., Boston University), with{" "}
          <b>values as of 2020</b> — so changes since then may not be reflected
          (a production pipeline keeps it current and cites primary statutes with
          a last-verified date per field). A state&apos;s{" "}
          <b>grade reflects how few laws/restrictions it imposes</b> (A = fewest,
          F = most), the opposite orientation from gun-safety scorecards. Always
          consult official state resources and an attorney. Map geometry:{" "}
          <a
            className="text-[var(--accent)] hover:underline"
            href="https://github.com/topojson/us-atlas"
          >
            us-atlas
          </a>{" "}
          (US Census, public domain).
        </p>
      </footer>
    </main>
  );
}
