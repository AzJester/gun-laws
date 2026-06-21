import MapExplorer from "@/components/MapExplorer";
import { getRecentChanges, getStates } from "@/lib/data";
import { getGeo } from "@/lib/geo";

// Reads fs / DB at request time — keep it dynamic so `next build` never tries to
// statically render (and so the JSON fallback is exercised at runtime).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [geo, states, changes] = await Promise.all([
    getGeo(),
    getStates(),
    getRecentChanges(),
  ]);

  return (
    <main>
      <MapExplorer geo={geo} states={states} changes={changes} />

      <footer className="mx-auto max-w-[1560px] px-[22px] pb-12">
        <p className="rounded-[12px] border border-[var(--border)] bg-[var(--panel)] p-4 text-[12.5px] leading-relaxed text-[var(--muted)]">
          <strong className="text-[#e3b341]">⚠ Not legal advice.</strong> Law
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
