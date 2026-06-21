// Pure, framework-agnostic helpers for the embeddable widget (/embed).
//
// Kept dependency-free (no React, no DOM, no fs) so it runs in the node test env
// and can be unit-tested directly. Used by the embed routes (to validate the
// ?mode= / ?year= query) and by the "Embed this" UI (to build the iframe URL +
// copy-paste snippet).

import { isOrientation, type Orientation } from "./grading";

/** Color modes the national embed map supports (mirrors MapExplorer's). */
export const EMBED_MODES = [
  "grade",
  "permitless_carry",
  "universal_bg_check",
  "red_flag",
] as const;

export type EmbedMode = (typeof EMBED_MODES)[number];

export const DEFAULT_EMBED_MODE: EmbedMode = "grade";

/** The historical range the slider/year query is clamped to (mirrors data). */
export const EMBED_MIN_YEAR = 1991;
export const EMBED_MAX_YEAR = 2025;

export function isEmbedMode(v: unknown): v is EmbedMode {
  return typeof v === "string" && (EMBED_MODES as readonly string[]).includes(v);
}

/** Coerce an arbitrary ?mode= value to a supported mode (default: grade). */
export function parseEmbedMode(v: unknown): EmbedMode {
  return isEmbedMode(v) ? v : DEFAULT_EMBED_MODE;
}

/**
 * Coerce + clamp an arbitrary ?year= value into [min, max]. Returns null for an
 * absent / non-numeric value so the caller can default to "current" (latest).
 */
export function parseEmbedYear(
  v: unknown,
  min: number = EMBED_MIN_YEAR,
  max: number = EMBED_MAX_YEAR,
): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return Math.min(Math.max(i, min), max);
}

/** Optional grade orientation for the national embed (?orient=). */
export function parseEmbedOrient(v: unknown): Orientation {
  return isOrientation(v) ? v : "rights";
}

/**
 * The query string (with leading "?", or "") for a national-embed configuration.
 * Omits defaults (mode=grade, no year) so the canonical URL stays clean.
 */
export function embedQuery(opts: {
  mode?: EmbedMode;
  year?: number | null;
  orient?: Orientation;
} = {}): string {
  const params = new URLSearchParams();
  if (opts.mode && opts.mode !== DEFAULT_EMBED_MODE) params.set("mode", opts.mode);
  if (opts.year != null) params.set("year", String(opts.year));
  if (opts.orient && opts.orient !== "rights") params.set("orient", opts.orient);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/**
 * Absolute URL to an embed page. `code` (a 2-letter state) selects the
 * single-state report card; omit it for the national map. `base` should be the
 * site origin plus any base path (e.g. "https://azjester.github.io/gun-laws").
 */
export function embedUrl(
  base: string,
  code?: string | null,
  opts: { mode?: EmbedMode; year?: number | null; orient?: Orientation } = {},
): string {
  const trimmed = base.replace(/\/+$/, "");
  const path = code ? `/embed/${code.toLowerCase()}` : "/embed";
  return `${trimmed}${path}${embedQuery(opts)}`;
}

/**
 * A ready-to-paste <iframe> snippet for newsrooms/blogs. Height defaults to a
 * value tuned to each widget (taller for the national map). The src is built via
 * embedUrl() so the base path / query handling stays in one place.
 */
export function embedSnippet(
  base: string,
  code?: string | null,
  opts: {
    mode?: EmbedMode;
    year?: number | null;
    orient?: Orientation;
    width?: string;
    height?: number;
    title?: string;
  } = {},
): string {
  const width = opts.width ?? "100%";
  const height = opts.height ?? (code ? 360 : 520);
  const title = opts.title ?? (code ? `GunLawMap — ${code.toUpperCase()}` : "GunLawMap");
  const src = embedUrl(base, code, opts);
  return `<iframe src="${src}" width="${width}" height="${height}" style="border:0" title="${title}" loading="lazy"></iframe>`;
}
