import type { Metadata } from "next";

import EmbedMap from "@/components/EmbedMap";
import { getStates } from "@/lib/data";
import { getGeo } from "@/lib/geo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A self-contained, framable widget: the national choropleth, a compact legend,
// and an attribution link — no header/nav/footer chrome. With DATABASE_URL unset
// getStates()/getGeo() read the JSON at build time, so this renders statically
// and works in the Pages export. Configuration (mode/year/orient) is read from
// the query client-side inside EmbedMap.
export const metadata: Metadata = {
  title: "Embed — GunLawMap",
  description:
    "Embeddable interactive US firearm-law map. Informational only, not legal advice.",
  alternates: { canonical: "/embed" },
  // Keep the widget out of the index; it's meant to be iframed, not crawled as a page.
  robots: { index: false, follow: false },
};

export default async function EmbedPage() {
  const [geo, states] = await Promise.all([getGeo(), getStates()]);

  return (
    <main id="main">
      <EmbedMap geo={geo} states={states} siteHref={`${SITE_URL}${BASE}/`} />
    </main>
  );
}
