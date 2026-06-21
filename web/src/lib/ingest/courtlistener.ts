// CourtListener API client — the "Court feeds" lane of the ingestion pipeline
// (docs/PLAN.md §6). Pulls recent firearm-related opinions/dockets so the
// pipeline can detect injunctions and rulings that change a provision's status
// (in_effect → enjoined / struck).
//
// Free REST API, v4: https://www.courtlistener.com/api/rest/v4/
// Auth is OPTIONAL but recommended (higher rate limits): a token via
// process.env.COURTLISTENER_API_TOKEN, sent as `Authorization: Token <token>`.
//
// We hit the opinion search endpoint:
//   GET /api/rest/v4/search/?type=o&q=<firearm query>&order_by=dateFiled desc
// and normalize each hit to a NormalizedChange with kind "court_ruling". The
// per-state mapping uses the court jurisdiction abbreviation when present.
//
// Read lazily — never at import time. Degrades gracefully on the egress block
// (host_not_allowed → skipped, not a crash).

import { getEnv } from "../env";
import { fetchJson, FetchError, sleep } from "./http";
import type { NormalizedChange, ProviderResult, StateCode } from "./types";

const BASE = "https://www.courtlistener.com/api/rest/v4/search/";
// Firearm-focused default query; the orchestrator may pass its own.
const DEFAULT_QUERY = "firearm OR firearms OR \"second amendment\" OR gun";

/**
 * CourtListener runs key-OPTIONAL: it is reachable (subject to a lower rate
 * limit) without a token, so we treat it as an available provider whenever it
 * is requested. The egress/host check still gates whether it actually returns
 * data in a restricted environment.
 */
export function hasCourtListenerSource(): boolean {
  return true;
}

export function hasCourtListenerToken(): boolean {
  return Boolean(getEnv(process.env).COURTLISTENER_API_TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = getEnv(process.env).COURTLISTENER_API_TOKEN;
  return token ? { Authorization: `Token ${token}` } : {};
}

// ---- raw response shapes (only the fields we read) -------------------------

interface ClSearchResult {
  // Opinion search rows carry these (field names per CourtListener v4 search).
  id?: number;
  cluster_id?: number;
  caseName?: string;
  court?: string; // human court name
  court_id?: string; // e.g. "ca9", "cacd"
  citation?: string[] | string;
  dateFiled?: string; // "yyyy-mm-dd"
  absolute_url?: string;
  status?: string;
  snippet?: string;
}

interface ClSearchResponse {
  count?: number;
  next?: string | null;
  results?: ClSearchResult[];
}

// ---- court_id → state mapping ----------------------------------------------
//
// CourtListener court ids embed the state for state courts and many district
// courts (e.g. "cacd" = C.D. Cal., "nyappdiv" = NY App Div). We map by the
// leading two letters when they match a known state code; circuit courts
// ("ca9", "scotus") map to null (federal, multi-state) and are kept without a
// single-state attribution unless the case name clearly names one.

const STATE_CODES = new Set<string>([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
]);

const STATE_NAMES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  Oregon: "OR", Pennsylvania: "PA", Tennessee: "TN", Texas: "TX",
  Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  Wisconsin: "WI", Wyoming: "WY", Ohio: "OH", Oklahoma: "OK",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  "West Virginia": "WV",
};

function stateFromCourtId(courtId?: string): string | null {
  if (!courtId) return null;
  // Federal circuits / SCOTUS are not single-state.
  if (/^scotus$/i.test(courtId) || /^ca\d+$/i.test(courtId)) return null;
  const lead = courtId.slice(0, 2).toUpperCase();
  return STATE_CODES.has(lead) ? lead : null;
}

function stateFromCaseName(name?: string): string | null {
  if (!name) return null;
  for (const [full, code] of Object.entries(STATE_NAMES)) {
    if (new RegExp(`\\b${full}\\b`, "i").test(name)) return code;
  }
  return null;
}

function firstCitation(cite?: string[] | string): string | null {
  if (!cite) return null;
  if (Array.isArray(cite)) return cite[0] ?? null;
  return cite || null;
}

export function normalizeResult(r: ClSearchResult): NormalizedChange | null {
  const state =
    stateFromCourtId(r.court_id) ?? stateFromCaseName(r.caseName) ?? "";
  const id = r.id ?? r.cluster_id;
  if (id == null) return null;

  const name = r.caseName?.trim() || "Firearm-related ruling";
  const court = r.court ? ` (${r.court})` : "";
  const headline = `${name}${court}`.slice(0, 280);
  const url = r.absolute_url
    ? `https://www.courtlistener.com${r.absolute_url}`
    : null;

  return {
    state,
    externalRef: `courtlistener:${id}`,
    kind: "court_ruling",
    headline,
    eventDate: (r.dateFiled ?? "").slice(0, 10),
    url,
    sourceKind: "courtlistener",
  };
}

// ---- public client ---------------------------------------------------------

function buildUrl(query: string, page: number): string {
  const u = new URL(BASE);
  u.searchParams.set("type", "o"); // opinions
  u.searchParams.set("q", query);
  u.searchParams.set("order_by", "dateFiled desc");
  u.searchParams.set("page", String(page));
  return u.toString();
}

/**
 * Search recent firearm-related opinions. Pages up to `maxPages`. Returns the
 * raw result rows (the orchestrator normalizes + dedupes them).
 */
export async function searchOpinions(
  query: string = DEFAULT_QUERY,
  maxPages = 1,
): Promise<ClSearchResult[]> {
  const headers = authHeaders();
  const out: ClSearchResult[] = [];
  let page = 1;

  do {
    const url = buildUrl(query, page);
    const data = await fetchJson<ClSearchResponse>(url, {
      headers,
      retries: 3,
      backoffMs: 800,
    });
    out.push(...(data.results ?? []));
    if (!data.next) break;
    page += 1;
    if (page <= maxPages) await sleep(1500); // be polite to the free API
  } while (page <= maxPages);

  return out;
}

/**
 * Fetch + normalize recent firearm-related rulings, optionally filtered to the
 * requested states. Returns a ProviderResult; a host_not_allowed / network
 * failure surfaces via `skipped`/`reason` rather than throwing.
 */
export async function fetchCourtListener(
  states: readonly StateCode[] | readonly string[],
  query: string = DEFAULT_QUERY,
): Promise<ProviderResult> {
  const want = new Set(states.map((s) => s.toUpperCase()));
  const allStates = states.length >= 51; // 50 + DC ⇒ no state filter

  try {
    const rows = await searchOpinions(query);
    const changes: NormalizedChange[] = [];
    for (const r of rows) {
      const n = normalizeResult(r);
      if (!n) continue;
      // Keep federal/unattributed rulings (state === "") and any in-scope state.
      if (n.state && !allStates && !want.has(n.state)) continue;
      changes.push(n);
    }
    return { source: "courtlistener", skipped: false, changes, warnings: [] };
  } catch (err) {
    if (err instanceof FetchError && err.kind === "host_not_allowed") {
      return {
        source: "courtlistener",
        skipped: true,
        reason: err.message,
        changes: [],
        warnings: [],
      };
    }
    return {
      source: "courtlistener",
      skipped: true,
      reason: `courtlistener: ${err instanceof Error ? err.message : String(err)}`,
      changes: [],
      warnings: [],
    };
  }
}
