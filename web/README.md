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

Both `GET` responses carry a `disclaimer` field.

---

## Ingestion — recent firearm legislation → ChangeEvents

`src/lib/ingest/` fetches recent firearm-related bills from **LegiScan** and
**Open States v3**, normalizes them to a common shape, dedupes by external id,
and upserts `ChangeEvent` rows with `reviewStatus = auto_detected` (an editor
then promotes them to `published`). The recent-changes feed prefers DB
`ChangeEvent`s when a database is present, falling back to the sample data in
`src/lib/changes.ts` otherwise.

```
src/lib/ingest/
├─ http.ts         # fetch helper: timeout + retry/backoff + typed errors
├─ types.ts        # NormalizedChange / ProviderResult / state codes
├─ legiscan.ts     # LegiScan client (getSearchRaw / getMasterListRaw)
├─ openstates.ts   # Open States v3 client (/bills, X-API-KEY header)
└─ index.ts        # runIngestion({states?, source?, dryRun?}) orchestrator
scripts/ingest.ts  # CLI wrapper (tsx)
src/app/api/ingest/route.ts  # POST endpoint (guarded by INGEST_TOKEN)
```

### Required env vars

| Var | Purpose |
|---|---|
| `LEGISCAN_API_KEY` | LegiScan API key. Register at https://legiscan.com/legiscan |
| `OPENSTATES_API_KEY` | Open States v3 key. https://open.pluralpolicy.com/accounts/profile/ |
| `INGEST_TOKEN` | Bearer token guarding write runs of `POST /api/ingest` |
| `DATABASE_URL` | Postgres connection — required to persist (write) events |

Only the providers whose key is set are called. **With neither key set,
ingestion skips gracefully** (returns `{ skipped: true, reason }`, exits 0 — it
never crashes).

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

Live ingestion needs outbound HTTPS to:

- `api.legiscan.com`
- `v3.openstates.org`

In a restricted/sandboxed environment (e.g. Claude Code on the web — see the
network-policy docs at **code.claude.com/docs**) these hosts must be on the
egress allowlist. Otherwise calls return **HTTP 403 `host_not_allowed`**. The
ingestion layer detects that specific failure and reports it actionably
("Egress blocked for <host> … add it to the allowlist"), marking the provider
skipped instead of crashing — so a dry run in a blocked environment still
exits 0.

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

## Project layout

```
web/
├─ prisma/
│  ├─ schema.prisma        # versioned, provenance-first model
│  └─ seed.ts              # idempotent seed from ../data/sample-states.json
├─ scripts/
│  └─ ingest.ts            # CLI: npm run ingest -- --dry-run ...
├─ src/
│  ├─ app/
│  │  ├─ api/states/route.ts            # GET /api/states
│  │  ├─ api/states/[code]/route.ts     # GET /api/states/[code]
│  │  ├─ api/ingest/route.ts            # POST /api/ingest (guarded)
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx                        # home (server) → MapExplorer
│  ├─ components/
│  │  ├─ MapExplorer.tsx   # client: color-mode toggle, legend, selection, search
│  │  ├─ GeoMap.tsx        # inline SVG geographic map
│  │  ├─ StateDetail.tsx   # detail panel (+ 2021–2025 updates callout)
│  │  └─ ChangesFeed.tsx   # recent-changes feed
│  └─ lib/
│     ├─ data.ts           # read layer (DB or JSON fallback)
│     ├─ prisma.ts         # lazy Prisma client
│     ├─ geo.ts            # loads us-geo.json
│     ├─ grading.ts        # grade/color logic (friendly green→red ramp)
│     ├─ changes.ts        # recent-changes seed data
│     ├─ types.ts          # shared types + DISCLAIMER
│     └─ ingest/           # LegiScan + Open States ingestion (see above)
├─ docker-compose.yml      # Postgres 16
├─ .env.example
└─ ...config (tsconfig, tailwind, postcss, next)
```
