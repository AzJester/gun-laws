// Open States v3 API client.
//
// Docs: https://docs.openstates.org/api-v3/
// Base: https://v3.openstates.org/bills
// Auth: header `X-API-KEY: <key>`
//
// We query firearm bills per jurisdiction, newest action first:
//   GET /bills?jurisdiction=<name>&q=firearm&sort=latest_action_desc
//       &per_page=20&page=N
//
// Open States enforces a low default rate limit (~10 req/min on the free tier),
// so we pace requests and back off. Key from process.env.OPENSTATES_API_KEY.
//
// Read lazily — never at import time.

import { getEnv } from "../env";
import { fetchJson, FetchError, sleep } from "./http";
import type { ChangeKind } from "../types";
import type { NormalizedChange, ProviderResult, StateCode } from "./types";

const BASE = "https://v3.openstates.org/bills";
const DEFAULT_QUERY = "firearm";

// Open States accepts a jurisdiction name; map codes -> names. (It also accepts
// ocd-jurisdiction ids; names are the documented, simplest form.)
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

export function hasOpenstatesKey(): boolean {
  return Boolean(getEnv(process.env).OPENSTATES_API_KEY);
}

function keyOrThrow(): string {
  const key = getEnv(process.env).OPENSTATES_API_KEY;
  if (!key) throw new Error("OPENSTATES_API_KEY is not set");
  return key;
}

// ---- raw response shapes (only the fields we read) -------------------------

interface OsAction {
  description: string;
  date: string; // ISO
  classification?: string[];
}

interface OsBill {
  id: string;
  identifier: string; // "HB 1163"
  title: string;
  openstates_url?: string;
  jurisdiction?: { name?: string; classification?: string };
  latest_action_date?: string;
  latest_action_description?: string;
  actions?: OsAction[];
}

interface OsPagination {
  per_page: number;
  page: number;
  max_page: number;
  total_items: number;
}

interface OsBillsResponse {
  results: OsBill[];
  pagination: OsPagination;
}

// ---- public client ---------------------------------------------------------

function buildUrl(jurisdiction: string, query: string, page: number): string {
  const u = new URL(BASE);
  u.searchParams.set("jurisdiction", jurisdiction);
  u.searchParams.set("q", query);
  u.searchParams.set("sort", "latest_action_desc");
  u.searchParams.set("per_page", "20");
  u.searchParams.set("page", String(page));
  return u.toString();
}

/**
 * Fetch firearm bills for a single jurisdiction (by state code). Pages up to
 * `maxPages`, pacing to respect the documented rate limits.
 */
export async function getBills(
  code: string,
  query: string = DEFAULT_QUERY,
  maxPages = 1,
): Promise<OsBill[]> {
  const jurisdiction = STATE_NAMES[code.toUpperCase()] ?? code;
  const headers = { "X-API-KEY": keyOrThrow() };
  const out: OsBill[] = [];
  let page = 1;
  let maxPage = 1;

  do {
    const url = buildUrl(jurisdiction, query, page);
    const data = await fetchJson<OsBillsResponse>(url, {
      headers,
      // Open States free tier is strict; allow more, slower retries.
      retries: 4,
      backoffMs: 1000,
    });
    out.push(...(data.results ?? []));
    maxPage = data.pagination?.max_page ?? 1;
    page += 1;
    if (page <= Math.min(maxPages, maxPage)) {
      // ~10 req/min on the free tier → keep > 6s between calls.
      await sleep(6500);
    }
  } while (page <= Math.min(maxPages, maxPage));

  return out;
}

/** Map an Open States action (classification + text) to our ChangeEvent.kind. */
export function kindFromAction(bill: OsBill): ChangeKind {
  const cls = new Set(bill.actions?.flatMap((a) => a.classification ?? []) ?? []);
  if (cls.has("became-law") || cls.has("executive-signature")) return "enacted";
  if (cls.has("became-law")) return "effective";

  const text = (bill.latest_action_description ?? "").toLowerCase();
  if (/(signed|enacted|chaptered|approved by governor)/.test(text)) return "enacted";
  if (/effective/.test(text)) return "effective";
  if (/repeal/.test(text)) return "repealed";
  if (/(amend|substitut)/.test(text)) return "amended";
  if (/(court|ruling|injunction|enjoin)/.test(text)) return "court_ruling";
  return "introduced";
}

function normalizeBill(bill: OsBill): NormalizedChange {
  const code = jurisdictionToCode(bill.jurisdiction?.name);
  const headline = `${bill.identifier}: ${bill.title}`.slice(0, 280);
  return {
    state: code,
    externalRef: `openstates:${bill.id}`,
    kind: kindFromAction(bill),
    headline,
    eventDate: (bill.latest_action_date ?? "").slice(0, 10),
    url: bill.openstates_url ?? null,
    sourceKind: "openstates",
  };
}

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

function jurisdictionToCode(name?: string): string {
  if (!name) return "";
  return NAME_TO_CODE[name.toLowerCase()] ?? name.slice(0, 2).toUpperCase();
}

/**
 * Fetch + normalize firearm bills for the given states. Returns a ProviderResult
 * (per-state failures become warnings; missing key / host_not_allowed → skipped).
 */
export async function fetchOpenstates(
  states: readonly StateCode[] | readonly string[],
  query: string = DEFAULT_QUERY,
): Promise<ProviderResult> {
  if (!hasOpenstatesKey()) {
    return {
      source: "openstates",
      skipped: true,
      reason: "OPENSTATES_API_KEY not set",
      changes: [],
      warnings: [],
    };
  }

  const changes: NormalizedChange[] = [];
  const warnings: string[] = [];

  for (const state of states) {
    try {
      const bills = await getBills(state, query);
      for (const b of bills) {
        const n = normalizeBill(b);
        if (n.state) changes.push(n);
      }
    } catch (err) {
      if (err instanceof FetchError && err.kind === "host_not_allowed") {
        return {
          source: "openstates",
          skipped: true,
          reason: err.message,
          changes,
          warnings,
        };
      }
      warnings.push(
        `openstates ${state}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    // Pace between states to respect the free-tier rate limit.
    await sleep(6500);
  }

  return { source: "openstates", skipped: false, changes, warnings };
}
