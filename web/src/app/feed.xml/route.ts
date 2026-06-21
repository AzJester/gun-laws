import { getPublishedChangesDetailed } from "@/lib/data";

// Dynamic + nodejs: reads at request time (DB published events or JSON fallback).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlawmap.example").replace(
  /\/$/,
  "",
);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoToRfc3339(iso: string): string {
  // Treat a bare date as midnight UTC so the timestamp is valid Atom.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/**
 * GET /feed.xml — Atom feed of recently published firearm-law changes.
 * Optional `?state=XX` filters to one state. Works on the JSON fallback.
 */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state");
  const stateCode = state ? state.toUpperCase() : undefined;

  const changes = await getPublishedChangesDetailed({
    state: stateCode,
    limit: 50,
  });

  const self = stateCode
    ? `${SITE_URL}/feed.xml?state=${encodeURIComponent(stateCode)}`
    : `${SITE_URL}/feed.xml`;
  const title = stateCode
    ? `GunLawMap — ${stateCode} firearm-law changes`
    : "GunLawMap — firearm-law changes";
  const updated = changes.length
    ? isoToRfc3339(changes[0].iso)
    : new Date().toISOString();

  const entries = changes
    .map((c) => {
      const link = c.url ?? `${SITE_URL}/state/${c.stateCode.toLowerCase()}`;
      // Stable, unique id per change (URN — no resolvable URL required).
      const id = `urn:gunlawmap:${c.stateCode}:${c.iso}:${Buffer.from(c.headline)
        .toString("base64url")
        .slice(0, 24)}`;
      return `  <entry>
    <title>${esc(`${c.stateName}: ${c.headline}`)}</title>
    <id>${esc(id)}</id>
    <link href="${esc(link)}" />
    <updated>${isoToRfc3339(c.iso)}</updated>
    <category term="${esc(c.kind)}" label="${esc(c.tagLabel)}" />
    <summary type="text">${esc(`[${c.tagLabel}] ${c.stateName} — ${c.headline}`)}</summary>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(title)}</title>
  <subtitle>Published changes to tracked US state firearm laws. Informational only, not legal advice.</subtitle>
  <id>${esc(self)}</id>
  <link href="${esc(self)}" rel="self" type="application/atom+xml" />
  <link href="${esc(SITE_URL)}/" />
  <updated>${updated}</updated>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
