# GunLawMap — Web App (Phase 1)

Interactive US map of state firearm laws. **Next.js 14 (App Router) + TypeScript
+ Tailwind**, backed by a versioned, provenance-first **Postgres** schema
(Prisma) — with a **no-database JSON fallback** so it runs for a demo out of the
box.

> Informational only, **not legal advice**. Law data is from the **State
> Firearm Laws Database** (Siegel et al., Boston University), with **values as
> of 2020** — changes since then may not be reflected (a production pipeline
> keeps it current). A state's **grade reflects how FEW laws/restrictions it
> imposes** (A = fewest, F = most) — the *opposite* orientation from gun-safety
> scorecards.

---

## Quick start (no database)

The app reads `../data/sample-states.json` and `../data/us-geo.json` directly
when `DATABASE_URL` is **unset**. This is the fastest way to see it run.

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Because `DATABASE_URL` is not set, all reads go through the JSON fallback in
`src/lib/data.ts`. `npm run build` also works with no database.

---

## Deploy / view on the web (GitHub Pages — static public site)

A fully static, read-only copy of the public app is published to **GitHub Pages**:

> **https://azjester.github.io/gun-laws**  (project-pages base path `/gun-laws`)

This is the **public read-only experience**: the interactive map, **every state
page**, **compare**, **reciprocity**, **glossary**, **federal**, **methodology**,
**about**, and the **changelog snapshot**. State detail is served from static
JSON generated at build time, so the map needs no API at runtime.

**Enabling is automatic** via the GitHub Action
(`.github/workflows/pages.yml`): it builds and deploys on push to `main` (and can
be run manually via *Actions → Deploy static site to GitHub Pages → Run
workflow*). If Pages isn't on yet, the Action enables it; otherwise set
**Settings → Pages → Source: GitHub Actions**.

Server-only features are **not** part of the static site and need a server host
(Vercel / Node) to run: the **alerts** (subscribe/confirm/unsubscribe) flow,
**ingestion**, the editorial **review** queue, the live **API** (`/api/*`), and
the **RSS/Atom feed** (`/feed.xml`). On the static demo these surfaces show a
short "server-only on the live demo" note instead.

How the build works (handled by the Action — you don't run these by hand):

```bash
cd web
# move server-only routes aside so `output: export` won't choke on them, then:
PAGES_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/gun-laws NEXT_PUBLIC_STATIC=1 npm run build
# → static site in web/out/ (basePath /gun-laws), plus a touch out/.nojekyll
```

`PAGES_EXPORT=1` switches `next.config.mjs` to `output: "export"` (no security
`headers()` — unsupported in export); the normal `npm run build` is unchanged and
still produces the server app with the API routes and headers intact.

---

## Full run (with Postgres)

```bash
cd web
npm install

# 1) start Postgres 16 (docker-compose.yml; data persisted in a named volume)
docker compose up -d

# 2) point the app at it
cp .env.example .env          # DATABASE_URL=postgresql://gunlaw:gunlaw@localhost:5432/gunlaw

# 3) create the schema
npx prisma migrate dev --name init     # or, for a quick spin: npx prisma db push

# 4) seed states, policies, provisions (+ versions/sources) and change events
npx prisma db seed

# 5) run
npm run dev          # http://localhost:3000
```

With `DATABASE_URL` set, `getStates()` / `getState()` / `getRecentChanges()`
read via Prisma instead of the JSON files. Switching back is as simple as
unsetting `DATABASE_URL` (or removing `.env`).

Useful extras:

```bash
npx prisma studio    # browse the DB
npm run typecheck    # tsc --noEmit
npm run build        # production build (works with or without a DB)
```

---

## How the data layer works

`src/lib/data.ts` exposes typed read functions and chooses its source at runtime:

| Function | DB set | DB unset (fallback) |
|---|---|---|
| `getStates()` | Prisma query | `../data/sample-states.json` |
| `getState(code)` | Prisma query (+ provisions) | `../data/sample-states.json` |
| `getRecentChanges()` | `change_event` table (incl. ingested events) | `src/lib/changes.ts` |

The Prisma client is created **lazily** and only when `DATABASE_URL` is present
(`src/lib/prisma.ts`), so nothing forces a DB connection at build/import time.

The detail/summary payloads also carry an `updates` array — the curated
2021–2025 changes layered on the 2020 baseline (`[{ year, label }]`, may be
empty). On the DB path the schema has no `updates` column, so the updates are
sourced from `../data/sample-states.json` keyed by state code (simplest correct
option; switch to a JSON column or derive from `ChangeEvent`s later if desired).
`StateDetail` renders them as a "Changes since the 2020 baseline" callout.

### API

- `GET /api/states` — summary list for the map (`{ disclaimer, states }`).
- `GET /api/states/[code]` — full detail incl. provisions + `updates`
  (`{ disclaimer, state }`); `404` for unknown codes.
- `POST /api/ingest` — runs legislation ingestion (see below). Dynamic; never
  runs at build time.
- `POST /api/subscribe`, `GET /api/subscribe/confirm`, `GET /api/unsubscribe` —
  alert subscriptions (double opt-in; see [Alerts & subscriptions](#alerts--subscriptions-roadmap-6)).
- `GET /feed.xml` — Atom feed of published changes (`?state=XX`).

The `/api/states*` `GET` responses carry a `disclaimer` field.

New page routes: **`/alerts`** (subscribe form), **`/compare`** (side-by-side),
**`/reciprocity`** (carry reciprocity). All are linked from the header nav and
the home footer.

---

## Update pipeline — detect → draft → review → publish → changelog

This implements the pipeline in [`../docs/PLAN.md` §6](../docs/PLAN.md). Nothing
publishes without human approval; data is versioned and append-only.

```
ingest (LegiScan / Open States / CourtListener)
  → normalize + dedupe
  → CLASSIFY  (LLM draft, rules fallback)         src/lib/ingest/classifier.ts
  → persist as ChangeEvent (reviewStatus=auto_detected, with draft + confidence)
  → EDITORIAL REVIEW QUEUE  (GET/POST /api/review) src/app/admin/review/page.tsx
  → APPROVE ⇒ versioned PUBLISH (new ProvisionVersion, move currentVersionId)
  → public CHANGELOG + recent-changes feed         /changelog, /api/changelog
```

### Ingestion — recent firearm legislation/rulings → ChangeEvents

`src/lib/ingest/` fetches recent firearm-related bills from **LegiScan** and
**Open States v3**, plus firearm-related court opinions/dockets from
**CourtListener**, normalizes them to a common shape, dedupes by external id,
**classifies** each into a reviewable draft, and upserts `ChangeEvent` rows with
`reviewStatus = auto_detected` (an editor then promotes them to `published`).
The recent-changes feed and changelog show **published** DB `ChangeEvent`s when a
database is present, falling back to the sample data in `src/lib/changes.ts`.

```
src/lib/ingest/
├─ http.ts          # fetch helper: timeout + retry/backoff + typed errors
├─ types.ts         # NormalizedChange / ProviderResult / state codes
├─ legiscan.ts      # LegiScan client (getSearchRaw / getMasterListRaw)
├─ openstates.ts    # Open States v3 client (/bills, X-API-KEY header)
├─ courtlistener.ts # CourtListener v4 client (court rulings → court_ruling)
├─ classifier.ts    # classifyChange(): LLM draft (Anthropic) → rules fallback
└─ index.ts         # runIngestion({states?, source?, dryRun?}) orchestrator
scripts/ingest.ts   # CLI wrapper (tsx)
src/app/api/ingest/route.ts  # POST endpoint (guarded by INGEST_TOKEN)
```

### The classifier (LLM draft step)

`classifyChange(change)` turns each normalized change into a draft for the
editor: a plain-language `summary`, best-guess `policyKey` + `category`, a
proposed provision `status` (e.g. a court injunction → `enjoined`), a proposed
`citation`, plus a `confidence` (0–1) and `method` (`"llm"` | `"rules"`).

- **LLM path** — the official Anthropic SDK (`@anthropic-ai/sdk`). Used when
  `ANTHROPIC_API_KEY` is set; model from `ANTHROPIC_MODEL` (default
  `claude-sonnet-4-6`). Requests structured JSON and parses it defensively.
- **Rules fallback** — a deterministic keyword classifier. Used when no key is
  set **or the LLM call fails for any reason** (incl. egress 403, network error,
  unparseable JSON). It **never throws**, so ingestion always produces drafts.

### Editorial review queue + versioned publish

| Endpoint | Purpose |
|---|---|
| `GET /api/review` | Pending drafts (`reviewStatus` ∈ auto_detected/in_review). Read-only; no token required. Empty (with a note) when no DB. |
| `POST /api/review/[id]` | `{action: "approve" \| "reject" \| "edit"}`. **Write — requires `ADMIN_TOKEN`** (Bearer or `x-admin-token`). |

- **approve** → appends a new immutable `ProvisionVersion`
  (summary/citation/status/effectiveDate/verifiedAt + a `Source` when a URL is
  known), points `Provision.currentVersionId` at it (creating the `Provision`
  if the change introduces a new one), supersedes the prior version, and sets the
  `ChangeEvent` `reviewStatus = published` (so it appears in the changelog/feed).
- **edit** → saves editor overrides and sets `reviewStatus = in_review` (does
  not publish).
- **reject** → sets `reviewStatus = rejected` (no version written).

A minimal admin UI lives at **`/admin/review`** — enter `ADMIN_TOKEN` in the
field and Approve/Reject the listed drafts.

### Changelog

- `GET /api/changelog?state=CA&limit=50` — recent **published** changes (DB path),
  or the curated sample changes when no DB.
- **`/changelog`** — a public page rendering the same feed.

### Required env vars

| Var | Purpose |
|---|---|
| `LEGISCAN_API_KEY` | LegiScan API key. Register at https://legiscan.com/legiscan |
| `OPENSTATES_API_KEY` | Open States v3 key. https://open.pluralpolicy.com/accounts/profile/ |
| `COURTLISTENER_API_TOKEN` | *Optional* CourtListener token (raises rate limit). https://www.courtlistener.com/profile/ |
| `ANTHROPIC_API_KEY` | *Optional* Anthropic key for the LLM classifier draft step. Unset ⇒ rules fallback. |
| `ANTHROPIC_MODEL` | *Optional* model id for the classifier (default `claude-sonnet-4-6`). |
| `ADMIN_TOKEN` | Bearer token guarding review approve/reject/edit. Unset ⇒ review writes disabled. |
| `INGEST_TOKEN` | Bearer token guarding write runs of `POST /api/ingest` |
| `DATABASE_URL` | Postgres connection — required to persist (write) events |

Only the providers that are available are called (LegiScan/Open States need a
key; CourtListener is key-optional). **With no provider available, ingestion
skips gracefully** (returns `{ skipped: true, reason }`, exits 0 — it never
crashes). The classifier likewise never crashes the run.

### How to run

```bash
# Dry run (fetch + normalize, no DB writes). Safe with or without a DB.
npm run ingest -- --dry-run

# Restrict provider and states
npm run ingest -- --dry-run --source=legiscan --states=CA,TX

# Live run (writes ChangeEvents). Requires API key(s) + DATABASE_URL.
npm run ingest -- --states=WA

# Via HTTP (write requires the token; without it, only dry runs are allowed):
curl -X POST https://<host>/api/ingest \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H "content-type: application/json" \
  -d '{"states":["CA","TX"],"source":"openstates"}'
```

Flags: `--dry-run`, `--source=legiscan|openstates`, `--states=CA,TX`,
`--query=firearm`.

### Recommended schedule

Run every few hours via cron or a GitHub Action (legislatures move slowly;
hourly is overkill and burns LegiScan's daily query budget). Example GitHub
Action step:

```yaml
# .github/workflows/ingest.yml
on:
  schedule:
    - cron: "0 */6 * * *"   # every 6 hours
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd web && npm ci
      - run: cd web && npm run ingest
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          LEGISCAN_API_KEY: ${{ secrets.LEGISCAN_API_KEY }}
          OPENSTATES_API_KEY: ${{ secrets.OPENSTATES_API_KEY }}
```

### Network / egress allowlist (important)

Live runs need outbound HTTPS to:

- `api.legiscan.com` (LegiScan)
- `v3.openstates.org` (Open States)
- `www.courtlistener.com` (CourtListener court feeds)
- `api.anthropic.com` (the LLM classifier draft step)
- `api.resend.com` (the email provider for alerts — see below)

In a restricted/sandboxed environment (e.g. Claude Code on the web — see the
network-policy docs at **code.claude.com/docs**) these hosts must be on the
egress allowlist. Otherwise calls return **HTTP 403 `host_not_allowed`**. The
ingestion layer detects that specific failure and reports it actionably
("Egress blocked for <host> … add it to the allowlist"), marking the provider
skipped instead of crashing; the classifier catches it and falls back to the
rules path — so a dry run in a blocked environment still exits 0.

---

## Alerts & subscriptions (roadmap #6)

Visitors can subscribe to email digests when tracked firearm laws change in the
states/policies they pick, or follow an RSS/Atom feed. Everything degrades
gracefully: no database ⇒ a clear 503; no email provider ⇒ the send is logged
and skipped (never throws), so the build, the app, and `npm run alerts` always
exit 0.

### Subscribe / confirm / unsubscribe flow (double opt-in)

```
POST /api/subscribe { email, states?, policies?, channel? }
  → validate email + create a PENDING Subscription with a random confirmToken
  → send a double-opt-in confirmation email (via src/lib/email.ts)
GET  /api/subscribe/confirm?token=…   → status = confirmed (eligible for digests)
GET  /api/unsubscribe?token=…         → status = unsubscribed (in every email)
```

- **Minimal PII:** only the email + a JSON `scope` (`{ states[], policies[] }`)
  are stored. The confirm/unsubscribe URLs carry opaque random tokens, never the
  email. Re-subscribing with the same email refreshes the token (re-send a lost
  confirmation) instead of creating a duplicate.
- **No database** ⇒ `POST /api/subscribe` returns **503** `{ ok:false,
  configured:false, error }` (it never crashes); confirm/unsubscribe likewise
  report "not configured".
- **No email provider** ⇒ the subscription is still created, but the response
  flags `delivered:false` / `emailConfigured:false` and the form shows a clear
  "ask the operator to set `RESEND_API_KEY`" message.

### Email abstraction — `src/lib/email.ts`

`sendEmail({ to, subject, html, text })` picks a provider from the environment
and **never throws**:

- **Default provider: Resend** (`RESEND_API_KEY`), called over its plain HTTP
  API with `fetch` (no SDK). The interface is provider-agnostic — add an SMTP /
  SendGrid transport by extending `resolveProvider()` + adding a `sendVia…()`.
- **No provider key** ⇒ logs to console and returns `{ delivered:false,
  skipped:true, reason }`.
- **Test/dry-run mode** (`NODE_ENV=test` or `EMAIL_DRY_RUN=1`) ⇒ always skips
  (no real mail in tests).
- **Provider error** (egress 403, bad key, 4xx/5xx, network) ⇒ returns
  `{ delivered:false, error }` so an alert run records it and moves on.

### Alert dispatch — `npm run alerts`

`src/lib/alerts.ts` + `scripts/send-alerts.ts` (npm script `alerts`):

```bash
npm run alerts -- --dry-run     # preview matches; no send, no DB writes
npm run alerts                   # send digests (needs DATABASE_URL + RESEND_API_KEY)
npm run alerts -- --base-url=https://gunlawmap.example   # override link base
```

For each **confirmed** email subscription it finds published `ChangeEvent`s
newer than that subscription's `lastNotifiedAt`, matches them against its
scope (states/policies), sends **one digest email**, and advances
`lastNotifiedAt` **only on a successful send** (idempotent + at-least-once: a
transient failure re-tries the same changes next run). Graceful skips:

- no `DATABASE_URL` ⇒ `SKIPPED` (subscriptions live in the DB), exit 0.
- no email provider on a non-dry run ⇒ `SKIPPED` (use `--dry-run` to preview),
  exit 0.

Schedule it like ingestion (e.g. a GitHub Action every few hours, after the
ingest step).

### RSS / Atom feed — `/feed.xml`

`GET /feed.xml` returns a valid **Atom** feed of recently published changes.
`?state=XX` filters to one state. It works on the **JSON fallback**
(`getPublishedChangesDetailed`), so the feed is never empty in the demo.

### UI — `/alerts`

A subscribe form (`/alerts`) with an email input, a state multiselect, policy
checkboxes, a privacy note, and a link to the RSS feed. On submit it calls
`/api/subscribe` and shows "check your email to confirm" — or the graceful
"not configured" state when there's no DB / no provider. Reachable from the
header nav and the home footer (which also links the RSS feed).

---

## Compare + reciprocity (roadmap #7)

### Compare — `/compare`

`/compare?states=CA,TX,FL` (2–4 states, editable via the selector) renders a
side-by-side table: overall **grade**, **law count** (/134), the **six headline
policy flags**, and a **category-by-category** count of tracked provisions per
state. Rows where the states differ are highlighted. The displayed grade
respects the orientation system — append `&orient=safety` (flip the lens) or
`&orient=count` (drop letter grades); grades are *stored* in the gun-rights
orientation (A = fewest restrictions). Linked from the explorer ("Compare {code}"
button + nav) and from each `/state/[code]` page.

### Reciprocity — `/reciprocity`

Concealed-carry permit reciprocity: pick the state that issued your permit and
see where it's honored (plus the permitless states where no permit is required),
a full per-state matrix, and the inverse "permits this state honors" list. A
short reciprocity summary also appears on each `/state/[code]` page.

- `src/data/reciprocity.json` — **illustrative SAMPLE DATA** (clearly labelled in
  `_meta.warning` and throughout the UI). Reciprocity is fluid (statutes, AG
  opinions, executive agreements) and depends on permit type/residency, so the
  **feature/mechanism is the deliverable**, not the legal accuracy of the matrix.
- `src/lib/reciprocity.ts` — typed loader + helpers: `honoredIn(state)`,
  `honors(state)`, `isPermitless(state)`, `honorsPermitFrom(dest, origin)`. The
  JSON is bundled (no DB/fs), so it works on the SSG `/state/[code]` pages too.
- Every reciprocity surface carries a **strong disclaimer** (verify with both
  states before traveling armed).

### Email / alert env vars

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key. Unset ⇒ emails are logged + skipped (no delivery). https://resend.com |
| `EMAIL_FROM` | From address for outgoing mail (default placeholder). |
| `EMAIL_DRY_RUN` | `1` forces all sends to skip (also implied by `NODE_ENV=test`). |
| `NEXT_PUBLIC_SITE_URL` | Base URL for confirm/unsubscribe links + RSS self link (falls back to the request origin). |
| `DATABASE_URL` | Required to store subscriptions + dispatch alerts. |

> **Schema change (minimal):** the existing `Subscription` model gained
> `status` (`pending`/`confirmed`/`unsubscribed`), `confirmToken` + `unsubToken`
> (unique), `confirmedAt`, and `lastNotifiedAt` (plus a `SubscriptionStatus`
> enum). Apply with `npx prisma migrate dev` (or `db push`). No other model
> changed; the no-DB path is unaffected.

---

## Data model (provenance-first, versioned)

See [`../docs/DATA-MODEL.md`](../docs/DATA-MODEL.md). Implemented in
`prisma/schema.prisma`:

- `State`, `PolicyType`, `StatePolicy` — current at-a-glance values.
- `Provision` → `ProvisionVersion` (**append-only history**; a provision points
  to its current/live version via `currentVersionId`).
- `Source` — every published version ties to a source (URL + kind + retrieved).
- `ChangeEvent` — powers the recent-changes feed.
- `Subscription` (v2, optional).

Enjoined/struck laws keep their row with a `status` change (soft transition) —
never hard-deleted.

### Court tracking + enjoined/struck status

The court lane has two halves:

- **Live detection** — `src/lib/ingest/courtlistener.ts` pulls recent
  firearm-related rulings; the classifier proposes an `enjoined`/`struck` status;
  on approve, the versioned publish records that status on the new
  `ProvisionVersion` (the DB read path surfaces it as `status` + a `litigation`
  summary; see `getStateDb` in `src/lib/data.ts`).
- **Static overlay (no-DB demo)** — `../tools/court-status.js` is a small,
  clearly-labeled *illustrative* overlay marking a few well-known provisions as
  `enjoined`/`struck` with a court citation + url + note. `../tools/build-from-sfl.js`
  applies it when building `data/sample-states.json`, setting the matching
  provision items' `status` and adding a per-state `litigation` array. Rebuild
  with `node tools/build-from-sfl.js && node tools/build-mockup.js` from the repo
  root. The detail view renders an "Under litigation" callout and an
  enjoined/struck badge on the affected provisions.

---

## UI

- **Geographic map only:** inline SVG of `us-geo.json` (viewBox `-60 0 1180 610`,
  centroid labels + external leader-line labels for the small Northeast cluster).
- **Color modes:** overall grade (friendly report-card ramp, green = grade A =
  fewest laws → red = grade F = most) plus single-policy highlights (permitless
  carry / universal background checks / red flag, neutral blue = yes / light =
  no). The letter grade is always drawn on each state, so the map stays usable
  for color-blind viewers regardless of fill color.
- Selecting a state (on the map, a feed item, or search) updates the detail
  panel: grade badge, the `lawCount` of 134 tracked laws, the six policy flag
  chips, and **all** provision categories with their items and any citations
  (scrollable when long).
- Map shapes are keyboard-accessible (focusable, Enter/Space to select).
- Persistent **not-legal-advice** disclaimer, the data source/vintage (State
  Firearm Laws Database, values as of 2020), and the **grade A = fewest
  restrictions** note. Map geometry attributed to us-atlas (US Census, public
  domain).

---

## Testing & CI

Tests use **Vitest** (`node` environment) and are written to pass with **no
database, no network egress, and no API keys** — they target the JSON fallback,
pure functions, and graceful-degradation paths. No running server is needed:
route handlers are imported and invoked with a plain `Request`.

```bash
cd web
npm test          # vitest run (unit + route-handler integration)
npm run test:watch
```

Coverage at a glance (`web/test/*.test.ts`):

- **grading** — `gradeColor`/`gradeTextColor` index alignment; `displayGrade`
  identity (rights) and A↔F mirror (safety); `policyYes("red_flag")` is red.
- **reciprocity** — `honors` / `honoredIn` / `isPermitless` / `honorsPermitFrom`
  invariants over the bundled matrix.
- **ingest classifier** — with no `ANTHROPIC_API_KEY`, `classifyChange` returns
  `method:"rules"` and maps obvious keywords (red flag/ERPO → `red_flag`;
  enjoined/struck → status) without throwing.
- **ingest dedupe** — duplicate `externalRef`s collapse to one record.
- **ingest upsert key** — `upsertKeyFor()` derives the compound
  `(stateCode, externalRef)` upsert key and skips records missing either.
- **env validation** — `getEnv()` parses an empty object (all optional), a full
  valid config, ignores unknown keys, and rejects present-but-malformed values
  (non-URL `DATABASE_URL`, whitespace-only token); `safeGetEnv()` never throws.
- **rate limiter** — allows under the limit, blocks over it (429 + `Retry-After`),
  resets after the window (injected clock + fake timers), and namespaces buckets
  per route.
- **email** — `sendEmail` with no provider key returns `{ skipped:true }` and
  never throws (and never sends under `NODE_ENV=test`).
- **subscriptions** — `isValidEmail` / `normalizeScope` / `scopeMatches`, plus
  the no-DB `createPendingSubscription` graceful path.
- **data loaders** — `getStates()` returns 51 sorted; `getState("AZ")` = A,
  `getState("CA")` = F with cited provisions, `getState("DC")` lawCount null,
  unknown → null.
- **route handlers** — `GET /api/states` (51 + disclaimer), `/api/states/[code]`
  (CA 200 / unknown 404), `GET /api/changelog` (200 array), `POST /api/subscribe`
  (no-DB 503, bad email 400), `GET /feed.xml` (200 Atom XML with entries).

The `@/*` alias is resolved in `vitest.config.ts` (mirrors `tsconfig.json`).

### Optional end-to-end (Playwright)

A minimal smoke spec lives in `web/e2e/` but is **excluded from `npm test` and
from CI** (browser binaries may be blocked). To run it locally:

```bash
cd web
npm i -D @playwright/test
npx playwright install chromium
npm run test:e2e
```

### Continuous integration

Two GitHub Actions workflows live at the repo root in `.github/workflows/`:

- **`ci.yml`** (push + pull_request, Node 20) — runs with `DATABASE_URL` unset:
  `npm ci` → `npx prisma generate` → `tsc --noEmit` → `npm test` →
  `npm run build` → **data reproducibility check** (rebuild `data/sample-states.json`
  and `mockup/index.html` from their deterministic sources and `git diff
  --exit-code`) → `npm run ingest -- --dry-run` (must exit 0). It is green on the
  committed tree with no secrets.
- **`ingest.yml`** (cron every 6h + `workflow_dispatch`) — the **live** ingestion
  run, separate from CI. Uses repo secrets (`LEGISCAN_API_KEY`,
  `OPENSTATES_API_KEY`, `COURTLISTENER_API_TOKEN`, `ANTHROPIC_API_KEY`,
  `DATABASE_URL`) and no-ops gracefully (exit 0) when they're absent. The runner
  needs outbound egress to `api.legiscan.com`, `v3.openstates.org`,
  `www.courtlistener.com`, and `api.anthropic.com` (see
  [Network / egress allowlist](#network--egress-allowlist-important)).

---

## Production hardening

A few cross-cutting hardening measures layer on top of the feature code. All of
them preserve the no-database / no-key / no-egress graceful paths — the build,
the tests, and `npm run ingest -- --dry-run` still pass with nothing configured.

### Native upsert for ChangeEvents (schema + migration)

Ingestion now writes `ChangeEvent` rows with a **native `prisma.changeEvent.upsert`**
keyed on a compound unique index instead of the old `findFirst` + `update`/`create`
emulation. The schema adds:

```prisma
// in model ChangeEvent
@@unique([stateCode, externalRef])
```

**Why compound, not `@unique` on `externalRef` alone:** `externalRef` is nullable
(`String?`) — rows created by the review/approve flow have no provider id. In
Postgres, NULLs are *distinct* in a unique index, so any number of
null-`externalRef` rows coexist without collisions, while a provider's
`(stateCode, externalRef)` pair stays unique — exactly what idempotent re-ingestion
needs. The upsert keys on Prisma's generated compound selector
`stateCode_externalRef`. Records lacking a state or `externalRef` are skipped
(matching `dedupe()`), and the upsert's `update` payload still respects an
editor's decision: a row that is no longer pending only has its provenance
refreshed, never its draft.

**Apply the migration** (no database is available in this repo to run it, so this
is the command to run against a real DB):

```bash
cd web
npx prisma migrate dev --name change_event_unique_external_ref
# or, for a quick spin without a migration history:
npx prisma db push
```

`npx prisma validate` and `npx prisma generate` pass against the new schema with
no DB connection.

### Environment validation — `src/lib/env.ts`

A single zod-validated accessor, `getEnv()`, replaces scattered `process.env.X`
reads in `prisma.ts`, `email.ts`, `admin.ts`, the ingest providers, and the
classifier. It is **lazy**: nothing is parsed at import/build time, so the
no-DB/no-key paths still build. Every var is **optional** (the app branches on
presence), but a *present-but-malformed* value (e.g. a non-URL `DATABASE_URL`) is
rejected. Covers `DATABASE_URL`, `LEGISCAN_API_KEY`, `OPENSTATES_API_KEY`,
`COURTLISTENER_API_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
`RESEND_API_KEY`, `ADMIN_TOKEN`, `INGEST_TOKEN`, `NEXT_PUBLIC_SITE_URL`,
`EMAIL_FROM`. `getEnv(source)` accepts an explicit object for testing
(bypasses the memo cache); `safeGetEnv()` is the non-throwing variant.

### Security headers — `next.config.mjs`

`headers()` applies to **all routes** (`/:path*`):

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | see below |

The CSP is deliberately **pragmatic** so Next.js + Tailwind still render:
`default-src 'self'`; `script-src 'self' 'unsafe-inline'` (Next injects small
inline bootstrap scripts — `'unsafe-eval'` is added **in dev only** for HMR);
`style-src 'self' 'unsafe-inline'` (required for Next/Tailwind inline styles);
`img-src 'self' data: blob:`; `font-src 'self' data:`; `connect-src 'self'`
(plus `ws:` in dev); `frame-ancestors 'none'`; `base-uri 'self'`;
`form-action 'self'`; `object-src 'none'`. **Documented relaxation:** scripts use
`'unsafe-inline'` rather than per-request nonces — tightening to a nonce-based
policy is a follow-up (wire a nonce through every `<Script>`). If a public embed
route is ever added, relax `frame-ancestors`/`X-Frame-Options` for that path only.

### Rate limiting — `src/lib/rate-limit.ts`

A lightweight **in-memory fixed-window** limiter (no Redis) on the abuse-prone
routes. Returns **`429` with `Retry-After`** (plus `X-RateLimit-*`) when exceeded.
Limits are generous and **env-tunable** with safe defaults:

| Route | Default | Env vars |
|---|---|---|
| `POST /api/subscribe` | 10 / 10 min | `RATE_LIMIT_SUBSCRIBE`, `RATE_LIMIT_SUBSCRIBE_WINDOW_MS` |
| `POST /api/ingest` | 20 / hour | `RATE_LIMIT_INGEST`, `RATE_LIMIT_INGEST_WINDOW_MS` |
| `POST /api/review/[id]` | 60 / min | `RATE_LIMIT_REVIEW`, `RATE_LIMIT_REVIEW_WINDOW_MS` |
| `GET /api/states` | 120 / min | `RATE_LIMIT_STATES`, `RATE_LIMIT_STATES_WINDOW_MS` |

> **Caveat:** the store is a process-local `Map`, so the limiter is
> **per-instance**. In multi-instance prod (multiple containers / serverless
> lambdas) each instance keeps its own counters — swap in a shared store
> (Redis / Upstash) for a global limit, keeping the `checkRateLimit()` signature.

### Dependency audit

`npm audit` reports advisories only in **transitive dev/build dependencies**
(`esbuild`/`vite`/`vitest`/`tsx`) and in `next`/`postcss`. Every available fix is
a **major breaking bump** (`vitest@4`, `next@16`) gated behind `npm audit fix
--force`, so none were applied here (no non-breaking fix exists). Revisit when
upgrading Next.js / Vitest deliberately.

## Project layout

```
web/
├─ prisma/
│  ├─ schema.prisma        # versioned, provenance-first model
│  └─ seed.ts              # idempotent seed from ../data/sample-states.json
├─ scripts/
│  ├─ ingest.ts            # CLI: npm run ingest -- --dry-run ...
│  └─ send-alerts.ts       # CLI: npm run alerts -- --dry-run ...
├─ test/                   # Vitest unit + route-handler integration tests
├─ e2e/                    # OPTIONAL Playwright smoke test (not in CI / npm test)
├─ src/
│  ├─ app/
│  │  ├─ api/states/route.ts            # GET /api/states
│  │  ├─ api/states/[code]/route.ts     # GET /api/states/[code]
│  │  ├─ api/ingest/route.ts            # POST /api/ingest (guarded)
│  │  ├─ api/review/route.ts            # GET pending review queue
│  │  ├─ api/review/[id]/route.ts       # POST approve|reject|edit (ADMIN_TOKEN)
│  │  ├─ api/changelog/route.ts         # GET published changelog (?state=)
│  │  ├─ api/subscribe/route.ts         # POST subscribe (double opt-in)
│  │  ├─ api/subscribe/confirm/route.ts # GET confirm?token=
│  │  ├─ api/unsubscribe/route.ts       # GET unsubscribe?token=
│  │  ├─ feed.xml/route.ts              # GET Atom feed (?state=)
│  │  ├─ admin/review/page.tsx          # minimal editorial review UI (client)
│  │  ├─ changelog/page.tsx             # public changelog page
│  │  ├─ alerts/page.tsx                # subscribe form (roadmap #6)
│  │  ├─ compare/page.tsx               # side-by-side compare (roadmap #7)
│  │  ├─ reciprocity/page.tsx           # carry reciprocity (roadmap #7)
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx                        # home (server) → MapExplorer
│  ├─ components/
│  │  ├─ MapExplorer.tsx   # client: color-mode toggle, legend, selection, search
│  │  ├─ GeoMap.tsx        # inline SVG geographic map
│  │  ├─ StateDetail.tsx   # detail panel (+ updates + litigation callouts, status badges)
│  │  ├─ ChangesFeed.tsx   # recent-changes feed
│  │  ├─ SubscribeForm.tsx # client: alert subscribe form
│  │  ├─ CompareSelector.tsx     # client: edit ?states= for /compare
│  │  └─ ReciprocityExplorer.tsx # client: "does my permit work in X?"
│  ├─ data/
│  │  └─ reciprocity.json  # ILLUSTRATIVE carry-reciprocity matrix (sample data)
│  └─ lib/
│     ├─ data.ts           # read layer (DB or JSON fallback) + getPublishedChanges(Detailed)
│     ├─ prisma.ts         # lazy Prisma client
│     ├─ admin.ts          # ADMIN_TOKEN guard for review writes
│     ├─ email.ts          # provider-agnostic sendEmail() (Resend default, graceful skip)
│     ├─ subscriptions.ts  # Subscription helpers (create/confirm/unsubscribe, scope)
│     ├─ alerts.ts         # alert dispatch (digest matching + send)
│     ├─ reciprocity.ts    # typed reciprocity loader + helpers
│     ├─ geo.ts            # loads us-geo.json
│     ├─ grading.ts        # grade/color logic (friendly green→red ramp)
│     ├─ changes.ts        # recent-changes seed data
│     ├─ types.ts          # shared types + DISCLAIMER + POLICY_LABELS
│     └─ ingest/           # LegiScan + Open States + CourtListener + classifier
├─ docker-compose.yml      # Postgres 16
├─ .env.example
├─ vitest.config.ts        # Vitest config (node env, @/* alias)
└─ ...config (tsconfig, tailwind, postcss, next)
```
