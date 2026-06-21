// LegiScan API client.
//
// Docs: https://legiscan.com/gaits/documentation/legiscan
// Base: https://api.legiscan.com/?key=KEY&op=...
//
// We use `op=getSearchRaw` (the relevance search) to find firearm/gun bills per
// state, which returns lightweight result rows (bill_id, number, title, last
// action + date, change_hash, url). That's enough to build ChangeEvents without
// a `getBill` round-trip per result. (getMasterListRaw is also supported below
// for callers who want the full per-session list.)
//
// Key from process.env.LEGISCAN_API_KEY. Read lazily — never at import time.

import { getEnv } from "../env";
import { fetchJson, FetchError, sleep } from "./http";
import type { ChangeKind } from "../types";
import type { NormalizedChange, ProviderResult, StateCode } from "./types";

const BASE = "https://api.legiscan.com/";
const DEFAULT_QUERY = "firearm";

export function hasLegiscanKey(): boolean {
  return Boolean(getEnv(process.env).LEGISCAN_API_KEY);
}

function keyOrThrow(): string {
  const key = getEnv(process.env).LEGISCAN_API_KEY;
  if (!key) throw new Error("LEGISCAN_API_KEY is not set");
  return key;
}

function buildUrl(op: string, params: Record<string, string | number>): string {
  const u = new URL(BASE);
  u.searchParams.set("key", keyOrThrow());
  u.searchParams.set("op", op);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// ---- raw response shapes (only the fields we read) -------------------------

interface LegiscanEnvelope {
  status: "OK" | "ERROR";
  alert?: { message: string };
}

interface SearchResultRow {
  relevance: number;
  state: string;
  bill_number: string;
  bill_id: number;
  change_hash: string;
  url: string;
  text_url?: string;
  research_url?: string;
  last_action_date: string; // "yyyy-mm-dd"
  last_action: string;
  title: string;
}

interface GetSearchRawResponse extends LegiscanEnvelope {
  searchresult?: {
    summary: {
      page: string; // "Page X of Y"
      range: string;
      relevancy: string;
      count: number;
      page_current: number;
      page_total: number;
    };
    results: SearchResultRow[];
  };
}

interface MasterListItem {
  bill_id: number;
  number: string;
  change_hash: string;
  url: string;
  status_date?: string;
  status?: number;
  last_action_date?: string;
  last_action?: string;
  title?: string;
}

interface GetMasterListRawResponse extends LegiscanEnvelope {
  masterlist?: Record<string, MasterListItem | { session_id: number }>;
}

// ---- public client ---------------------------------------------------------

/**
 * `op=getSearchRaw` — relevance search for `query` (default "firearm") within a
 * state. Pages through up to `maxPages` of results (50 per page).
 */
export async function getSearch(
  state: string,
  query: string = DEFAULT_QUERY,
  maxPages = 2,
): Promise<SearchResultRow[]> {
  const out: SearchResultRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = buildUrl("getSearchRaw", { state, query, year: 2, page });
    const data = await fetchJson<GetSearchRawResponse>(url);
    if (data.status !== "OK") {
      throw new Error(
        `LegiScan getSearchRaw error for ${state}: ${
          data.alert?.message ?? "unknown error"
        }`,
      );
    }
    const sr = data.searchresult;
    if (!sr) break;
    out.push(...sr.results);
    totalPages = sr.summary?.page_total ?? 1;
    page += 1;
    if (page <= Math.min(maxPages, totalPages)) {
      // Gentle pacing between pages (LegiScan has a daily query budget).
      await sleep(250);
    }
  } while (page <= Math.min(maxPages, totalPages));

  return out;
}

/**
 * `op=getMasterListRaw` — the lightweight master list for a state's current
 * session (bill_id + change_hash for each bill). Exposed for callers who want
 * to drive change detection off change_hash; the search path is preferred for
 * topic filtering. Returns the raw items (session metadata stripped).
 */
export async function getMasterListRaw(
  state: string,
): Promise<MasterListItem[]> {
  const url = buildUrl("getMasterListRaw", { state });
  const data = await fetchJson<GetMasterListRawResponse>(url);
  if (data.status !== "OK") {
    throw new Error(
      `LegiScan getMasterListRaw error for ${state}: ${
        data.alert?.message ?? "unknown error"
      }`,
    );
  }
  const items: MasterListItem[] = [];
  for (const [k, v] of Object.entries(data.masterlist ?? {})) {
    if (k === "session") continue;
    if (v && typeof v === "object" && "bill_id" in v) {
      items.push(v as MasterListItem);
    }
  }
  return items;
}

/** Map a LegiScan "last_action" string to our ChangeEvent.kind. */
export function kindFromLastAction(action: string): ChangeKind {
  const a = action.toLowerCase();
  if (/(signed|chaptered|approved by governor|enacted|act no)/.test(a)) {
    return "enacted";
  }
  if (/effective/.test(a)) return "effective";
  if (/(repeal)/.test(a)) return "repealed";
  if (/(amend|substitut)/.test(a)) return "amended";
  if (/(court|ruling|injunction|enjoin)/.test(a)) return "court_ruling";
  return "introduced";
}

function normalizeRow(row: SearchResultRow): NormalizedChange {
  const headline = `${row.bill_number}: ${row.title}`.slice(0, 280);
  return {
    state: row.state.toUpperCase(),
    externalRef: `legiscan:${row.bill_id}`,
    kind: kindFromLastAction(row.last_action ?? ""),
    headline,
    eventDate: (row.last_action_date || "").slice(0, 10),
    url: row.url || null,
    sourceKind: "legiscan",
  };
}

/**
 * Fetch + normalize firearm bills for the given states. Returns a ProviderResult
 * (never throws for per-state failures — those become warnings). A
 * host_not_allowed / missing-key condition is reported via `skipped`/`reason`.
 */
export async function fetchLegiscan(
  states: readonly StateCode[] | readonly string[],
  query: string = DEFAULT_QUERY,
): Promise<ProviderResult> {
  if (!hasLegiscanKey()) {
    return {
      source: "legiscan",
      skipped: true,
      reason: "LEGISCAN_API_KEY not set",
      changes: [],
      warnings: [],
    };
  }

  const changes: NormalizedChange[] = [];
  const warnings: string[] = [];

  for (const state of states) {
    try {
      const rows = await getSearch(state, query);
      for (const row of rows) changes.push(normalizeRow(row));
    } catch (err) {
      if (err instanceof FetchError && err.kind === "host_not_allowed") {
        // The host is blocked for the whole run — stop and report once.
        return {
          source: "legiscan",
          skipped: true,
          reason: err.message,
          changes,
          warnings,
        };
      }
      warnings.push(
        `legiscan ${state}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    // Pace state-to-state to be polite to the daily query budget.
    await sleep(250);
  }

  return { source: "legiscan", skipped: false, changes, warnings };
}
