# GunLawMap — Project Plan

**An interactive US map that shows the firearm laws in every state and keeps itself
current as states enact, amend, or repeal gun legislation.**

> Status: Planning / concept. This document is the build plan; a working visual
> mockup lives in [`mockup/index.html`](../mockup/index.html). All law data shown
> in the mockup is **illustrative sample data**, not legal advice.

---

## 1. Vision & goals

Make the patchwork of US state firearm law **understandable at a glance and
trustworthy in detail**, and make sure it never silently goes stale.

A visitor should be able to:

1. See a color-coded US map summarizing how regulated each state is.
2. Click any state and read a clear, categorized, **citation-backed** breakdown of
   that state's gun laws.
3. Compare states, filter by a specific policy (e.g. "which states have red-flag
   laws?"), and search.
4. Trust that what they read is current — every fact carries a **source and a
   last-verified date**, and recent changes surface in a feed.
5. Subscribe to be notified when a state they care about changes its laws.

### Guiding principles
- **Accuracy over coverage.** Better to show fewer, verified facts than many
  uncertain ones. Every published statement maps to a primary source.
- **Human-in-the-loop.** Automation *detects and drafts*; a qualified human
  *confirms* before anything is published. Law is too consequential for an
  unreviewed scraper.
- **Neutrality.** Describe the law; don't advocate. Use precise, non-loaded
  language and let users see the citations.
- **Provenance everywhere.** Source URL + statute citation + verified date on
  every field, surfaced in the UI.

---

## 2. Users & use cases

| User | Needs |
|---|---|
| General public / gun owners | "What are the rules where I live / where I'm traveling?" |
| New buyers | Waiting periods, permit/background-check requirements, age limits |
| Travelers / movers | Carry reciprocity, transport, magazine/AWB differences across a border |
| Journalists & researchers | Compare states, cite sources, see historical change |
| Educators & advocates (any side) | A neutral, sourced reference |

**Primary use case:** select a state → understand its current laws by category.
**Secondary:** compare two states; filter the map by one policy; track changes.

---

## 3. Scope

### MVP (v1)
- Interactive US map (50 states + DC), color-coded by an overall regulation
  measure.
- State detail view with laws grouped into **standard categories** (see §13).
- Every law item carries a citation + source link + last-verified date.
- Map color modes: overall grade and a few single-policy toggles
  (permit-to-carry, universal background checks, red-flag).
- Search and basic two-state compare.
- "Recent changes" feed.
- Prominent legal disclaimer ("not legal advice").

### v2+
- Email/RSS change subscriptions per state/policy.
- Historical timeline / "as of date" time-travel view.
- Carry reciprocity matrix (does my state's permit work in state X?).
- County/municipal layer for states with significant local preemption carve-outs.
- Public REST/GraphQL API + data downloads (CSV/JSON).
- Multilingual; full accessibility audit; "near me" geolocation.

### Explicit non-goals
- Not legal advice; no "can I do X" personalized guidance.
- Not a marketplace or a way to facilitate transactions.
- Not federal-law-only (federal context noted, but the product is state-level).
- No firearm-acquisition instructions.

---

## 4. The hard part: keeping it current & correct

This is the core engineering and editorial challenge, so address it head-on.

**Why it's hard:** there is no single authoritative real-time API of "current
state gun law." Statutes change via new bills, amendments, ballot measures, and
agency rules; courts then enjoin or strike provisions (post-*Bruen* litigation is
very active). Effective dates differ from enactment dates. Plain scraping produces
plausible-but-wrong results that, for this subject, are unacceptable.

**The solution: a detect → draft → review → publish pipeline** (see §6), seeded
from authoritative datasets and continuously watched by legislative/court
trackers, with a human editor confirming every change before it goes live.

---

## 5. Data sources

### Baseline / seed data (machine-readable)
- **State Firearm Laws Database (Siegel et al., Boston University)** — *used in the
  current mockup & app.* 134 firearm-law provisions across 14 categories for all 50
  states, 1991–2020, coded 0/1, with a codebook. Excellent breadth baseline.
  <https://www.statefirearmlaws.org> (data via the `dynamicalsystemslaboratory/Firearm-database`
  mirror; our build: `tools/build-from-sfl.js` + `tools/sfl-codebook.js`). **Vintage 2020** —
  the update pipeline (§6) is what carries it past 2020.
- **RAND State Firearm Law Database** — longitudinal, machine-readable database of
  state firearm law provisions across ~134 detailed categories (downloadable
  CSV/Excel). Excellent starting skeleton for "which categories of law exist in
  which state, since when." <https://www.rand.org/research/gun-policy/tools-and-data.html>
- **Giffords Law Center Scorecard** — annual letter-grade per state + policy
  breakdowns; a useful cross-check for the overall measure.
  <https://giffords.org/lawcenter/resources/scorecard/>
  *Note on grade orientation:* this product grades **fewer restrictions = higher
  grade** (A = fewest, F = most), derived from `lawtotal` (count of the 134 tracked
  provisions in effect) — the **opposite** orientation from Giffords' gun-safety
  scale. Keep the framing explicit in the UI so the two are never confused.
- **Everytown / state-firearm-laws.org**, Cornell LII, and **Justia** for statute
  text and citations.

### Change-detection feeds (ongoing)
- **LegiScan API** — structured JSON for bills in all 50 states + Congress;
  status, sponsors, full text, roll calls. Free tier ~30k queries/month; push
  service replicates the DB every 15 min–4 hrs. Use keyword/subject monitors for
  firearm bills. <https://legiscan.com/legiscan> · <https://legiscan.com/gaits/documentation/legiscan>
- **Open States API v3** (Plural) — normalized legislative data for all 50 states
  + DC + PR; API key via `X-API-KEY`; bulk downloads available.
  <https://docs.openstates.org/api-v3/>
- **Court trackers** — CourtListener/RECAP + curated dockets for major Second
  Amendment litigation that enjoins or revives statutes.
- **State legislature & AG/agency sites** — primary source of truth for final
  enrolled text and effective dates.

### Source-of-truth policy
Trackers and third-party datasets **trigger** review; the **primary statute /
enrolled bill** is what gets cited. We store both the citation and the source URL.

---

## 6. Update pipeline (the heart of the system)

```
            ┌──────────────────────────────────────────────────────────────┐
            │                    INGESTION (scheduled jobs)                  │
            │                                                                │
  LegiScan ─┤  pull firearm-subject bills (status changes, new texts)        │
 OpenStates─┤  pull/refresh normalized bill records                          │
 Court feeds┤  pull docket events (injunctions, rulings)                     │
 RAND/Giff. ┤  periodic re-sync of baseline datasets                         │
            └───────────────┬──────────────────────────────────────────────┘
                            ▼
                ┌───────────────────────┐
                │  NORMALIZE & DEDUPE    │  map to internal schema, dedupe by
                │                        │  bill id / docket / statute
                └───────────┬───────────┘
                            ▼
                ┌───────────────────────┐
                │  CLASSIFY & DIFF       │  LLM + rules: does this event change a
                │                        │  tracked provision? which category?
                │                        │  draft a plain-language summary +
                │                        │  proposed field changes + effective date
                └───────────┬───────────┘
                            ▼
                ┌───────────────────────┐     reject / edit
                │  EDITORIAL REVIEW QUEUE│ ◄───────────────┐
                │  (human confirms)      │                 │
                └───────────┬───────────┘                 │
                            │ approve                       │
                            ▼                               │
                ┌───────────────────────┐                  │
                │  PUBLISH (versioned)   │ ── writes a new immutable version,
                │  + changelog entry     │    updates "current" pointer,
                │  + notifications        │    appends to per-state changelog
                └───────────┬───────────┘
                            ▼
                   Public site · API · feeds · email/RSS
```

Key design choices:
- **Nothing publishes without human approval.** The classifier proposes; the
  editor disposes. This is the single most important rule for credibility.
- **Versioned, append-only data.** Every change creates a new version with
  `effective_date`, `enacted_date`, and `verified_at`. Enables the v2 "as-of-date"
  view and a transparent audit trail.
- **Confidence + provenance** stored on every automated suggestion so reviewers
  can triage fast.
- **Effective vs enacted vs enjoined** are distinct states — a struck-down law is
  marked, not deleted.

---

## 7. System architecture

```
┌────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Frontend  │ ──► │  API (GraphQL/    │ ──► │  PostgreSQL          │
│  (SPA)     │ ◄── │   REST), cached    │ ◄── │  (versioned law data,│
│  US map +  │     │   read layer       │     │   sources, changelog)│
│  detail    │     └─────────┬─────────┘     └─────────┬───────────┘
└────────────┘               │                          ▲
                             │                          │
                    ┌────────▼─────────┐      ┌──────────┴──────────┐
                    │  Admin / CMS      │      │  Ingestion workers   │
                    │  (editorial review│ ◄──► │  (cron/queue jobs:   │
                    │   queue, publish) │      │   LegiScan, OpenSt., │
                    └───────────────────┘      │   courts, RAND)      │
                                               └──────────┬──────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │ Classifier (LLM +   │
                                               │ rules) → summaries, │
                                               │ proposed diffs       │
                                               └─────────────────────┘
```

- **Read path is heavily cached/static.** Law data changes rarely (days/weeks), so
  serve the public site from a CDN with pre-rendered/ISR pages + a cached read
  API. Cheap, fast, resilient.
- **Write path is the pipeline** (§6) feeding a CMS-style review queue.
- **Separation:** public read service never depends on the ingestion workers being
  up.

---

## 8. Tech stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript**, Tailwind | SSR/ISR for SEO + speed; static where possible |
| Map | **react-simple-maps + us-atlas TopoJSON** (geographic) and/or a **tile-grid cartogram** (categorical clarity) | TopoJSON = real geography; tile grid = every state equally clickable. Mockup uses the geographic us-atlas map. |
| Data viz | D3 scales for color/legends | Standard, flexible |
| API | **GraphQL** (or REST) over a cached read layer | Flexible queries for compare/filter |
| Database | **PostgreSQL** (+ JSONB for provisions, full versioning tables) | Relational integrity + history |
| Search | Postgres FTS (MVP) → Typesense/Elastic (v2) | Start simple |
| Ingestion | Scheduled workers (cron/queue, e.g. Temporal or a job runner) | Reliable scheduled pulls + retries |
| Classifier | LLM (Claude) + deterministic rules | Draft summaries & diffs; never auto-publish |
| Admin/CMS | Custom review queue (or a headless CMS) | Human approval workflow |
| Hosting | Vercel/Netlify (front) + managed Postgres + a worker host | Low ops, scales with CDN |
| Notifications | Email (transactional) + RSS/Atom | Change subscriptions |

> The mockup is deliberately **dependency-free** (one self-contained HTML file) so
> it renders anywhere; production would adopt the stack above.

---

## 9. Frontend / UX

- **Map choices:**
  - *Geographic map* (used in the mockup): real US geography via an Albers-USA
    projection with Alaska & Hawaii inset — recognizable and familiar. Geometry from
    [us-atlas](https://github.com/topojson/us-atlas) (US Census TIGER, public domain),
    inlined as SVG paths so the mockup is self-contained. Small Northeast states get
    external leader-line labels.
  - *Tile-grid cartogram*: a possible future alternate view (one equal square per
    state) for pure policy comparison — **not in the current build** (the product is
    the geographic map only).
- **Color encoding:** sequential single-hue (teal) scale, **light = fewer
  restrictions → dark = more**, to avoid politically loaded red/blue. Diverging
  palettes avoided. The grade letter (A = fewest restrictions) is shown on each
  state and in the legend.
- **State detail panel:** grade badge + at-a-glance policy flags + categorized
  provisions, each with citation, source link, and verified date.
- **Color modes:** overall grade, or highlight a single policy across the map
  (permitless carry, universal background checks, red-flag, AWB, etc.).
- **Compare:** pick two states → side-by-side category diff.
- **Recent-changes feed** with status tags (Enacted / Effective / Court ruling /
  In committee) and a dot on changed states.
- **Accessibility:** keyboard-navigable tiles, ARIA labels, color-blind-safe
  palette + text labels (never color alone), screen-reader summaries.
- **Mobile:** map collapses above a scrollable detail panel.

A static ASCII wireframe of the layout is in [`docs/WIREFRAME.md`](WIREFRAME.md).

---

## 10. Legal, ethical & editorial

- **Disclaimer, everywhere:** "Informational only, not legal advice; verify with
  official sources and counsel." Shown on the site and in the API.
- **Neutral framing:** describe statutes; avoid advocacy language; present
  citations so users can verify.
- **Provenance UI:** every fact shows source + last-verified date; stale facts are
  flagged.
- **Corrections workflow:** public "report an issue" on each state; tracked to
  resolution.
- **Editorial standards doc:** who can publish, review SLAs, how injunctions are
  represented, conflict-of-source resolution.
- **Privacy:** subscriptions store minimal PII; no tracking beyond aggregate
  analytics.
- **Sensitivity:** this is informational reference about *law*. No content that
  instructs on illegally acquiring/modifying firearms or evading lawful process.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Publishing wrong law (liability, trust) | Human-in-the-loop review; citations; verified dates; prominent disclaimer |
| Data goes stale | Automated trackers + visible "verified_at"; alerts for provisions not re-verified in N days |
| Court injunctions flip a law overnight | Court-feed monitoring; "enjoined/struck" status distinct from repealed |
| Source/API changes or rate limits | Multiple sources; cache baselines; graceful degradation; bulk-download fallback |
| Perceived bias | Neutral language; transparent sources; same rubric for all states; editorial policy public |
| LLM hallucination in summaries | Classifier output is a *draft* only; reviewer verifies against primary source |
| Local-preemption nuance | Note local carve-outs; phase in county/municipal layer (v2) |

---

## 12. Roadmap

| Phase | Deliverables |
|---|---|
| **0 — Foundations** | This plan, data model, wireframe; **interactive geographic mockup** with **all 134 tracked laws for every state** (State Firearm Laws Database, 2020) ✅ |
| **1 — Data spine** | Postgres schema + versioning (Prisma); seed all 50+DC from the canonical dataset; import RAND baseline 🚧 *scaffold in [`web/`](../web/)* |
| **2 — Public MVP** | Next.js site, map (geo + tile toggle), detail view with citations, search, disclaimer 🚧 *scaffold in [`web/`](../web/)* |
| **3 — Live updates** | LegiScan + Open States ingestion → classifier → editorial review queue → publish + changelog |
| **4 — Engagement** | Email/RSS subscriptions, compare view, recent-changes feed in prod |
| **5 — Depth** | Court-feed integration, historical "as-of" view, public API + downloads |
| **6 — Breadth** | Carry-reciprocity matrix, county/municipal layer, i18n, accessibility audit |

---

## 13. Appendix A — Law categories (state detail taxonomy)

Grouped for the detail view (aligned with RAND/Giffords category structure):

1. **Carry** — open/concealed; permit vs permitless ("constitutional"); sensitive
   places; reciprocity.
2. **Purchase & background checks** — universal checks vs dealer/NICS-only;
   permit-to-purchase; waiting periods; minimum age.
3. **Prohibited weapons & accessories** — assault-weapon restrictions; magazine
   capacity limits; other regulated items.
4. **Storage & safety** — safe-storage/child-access prevention; lost/stolen
   reporting; safety-training/certificate requirements.
5. **Extreme risk** — red-flag / ERPO laws and who may petition.
6. **Possession & prohibited persons** — domestic-violence prohibitors,
   relinquishment, registration.
7. **Dealers & manufacturing** — state dealer licensing; gun-show rules.
8. **Local authority** — preemption vs local regulation carve-outs.

## 14. Appendix B — Source references

- RAND State Firearm Law Database & tools — <https://www.rand.org/research/gun-policy/tools-and-data.html>
- RAND State Firearm Law Navigator — <https://www.rand.org/research/gun-policy/law-navigator.html>
- Giffords Law Center Scorecard — <https://giffords.org/lawcenter/resources/scorecard/>
- LegiScan API — <https://legiscan.com/legiscan> · manual <https://legiscan.com/gaits/documentation/legiscan>
- Open States API v3 — <https://docs.openstates.org/api-v3/>
- Open States bulk data (Plural) — <https://open.pluralpolicy.com/data/>
