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
| `getRecentChanges()` | `change_event` table | `src/lib/changes.ts` |

The Prisma client is created **lazily** and only when `DATABASE_URL` is present
(`src/lib/prisma.ts`), so nothing forces a DB connection at build/import time.

### API

- `GET /api/states` — summary list for the map (`{ disclaimer, states }`).
- `GET /api/states/[code]` — full detail incl. provisions
  (`{ disclaimer, state }`); `404` for unknown codes.

Both responses carry a `disclaimer` field.

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
- **Color modes:** overall grade (teal ramp, light = grade A = fewest laws) plus
  single-policy highlights (permitless carry / universal background checks /
  red flag).
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
├─ src/
│  ├─ app/
│  │  ├─ api/states/route.ts            # GET /api/states
│  │  ├─ api/states/[code]/route.ts     # GET /api/states/[code]
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx                        # home (server) → MapExplorer
│  ├─ components/
│  │  ├─ MapExplorer.tsx   # client: color-mode toggle, legend, selection, search
│  │  ├─ GeoMap.tsx        # inline SVG geographic map
│  │  ├─ StateDetail.tsx   # detail panel
│  │  └─ ChangesFeed.tsx   # recent-changes feed
│  └─ lib/
│     ├─ data.ts           # read layer (DB or JSON fallback)
│     ├─ prisma.ts         # lazy Prisma client
│     ├─ geo.ts            # loads us-geo.json
│     ├─ grading.ts        # grade/ramp logic (mirrors the mockup)
│     ├─ changes.ts        # recent-changes seed data
│     └─ types.ts          # shared types + DISCLAIMER
├─ docker-compose.yml      # Postgres 16
├─ .env.example
└─ ...config (tsconfig, tailwind, postcss, next)
```
