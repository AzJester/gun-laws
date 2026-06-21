# GunLawMap

An **interactive US map of state firearm laws** that stays current as states enact,
amend, or repeal gun legislation. This repository currently holds the **project
plan and a working visual mockup** (concept stage).

> ⚠️ **Not legal advice.** All law data in the mockup is *illustrative sample data*
> for design purposes — not guaranteed current or accurate. A production build would
> cite primary statutes and stamp every fact with a source and a last-verified date.
> Always consult official state resources and an attorney.

## What's here

| Path | What it is |
|---|---|
| [`mockup/index.html`](mockup/index.html) | **Interactive visual mockup** — self-contained, no dependencies. Open it in any browser. |
| [`docs/PLAN.md`](docs/PLAN.md) | Detailed build plan: vision, scope, data sources, the auto-update pipeline, architecture, stack, roadmap, risks. |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Versioned, provenance-first database schema. |
| [`docs/WIREFRAME.md`](docs/WIREFRAME.md) | ASCII wireframe of the UI for quick reference. |
| [`data/sample-states.json`](data/sample-states.json) | Sample dataset (50 states + DC) mirroring the data model. |

## View the mockup

It's a single static file — no build step.

```bash
# macOS
open mockup/index.html
# Linux
xdg-open mockup/index.html
# …or just drag mockup/index.html into a browser tab
```

### What the mockup demonstrates
- A **tile-grid US map** (one clickable square per state + DC), color-coded by
  overall regulation strength.
- **Color modes** to recolor the whole map by a single policy (permitless carry,
  universal background checks, red-flag laws).
- A **state detail panel** with at-a-glance policy flags and categorized,
  citation-style provisions (full detail for CA, TX, NY, FL, CO; summary flags for
  the rest).
- A **"recent & pending changes" feed** — the design hook for the
  auto-updating behavior — with status tags (Enacted / Effective / Court ruling /
  In committee) and change dots on affected states.
- Search, a filterable legend, and a persistent **"not legal advice"** disclaimer.

## The core idea: staying current

The map keeping itself up to date is the central challenge. The plan's approach
(see [`docs/PLAN.md`](docs/PLAN.md) §6) is a **detect → draft → review → publish**
pipeline:

1. **Detect** — scheduled jobs watch legislative + court trackers
   ([LegiScan](https://legiscan.com/legiscan),
   [Open States](https://docs.openstates.org/api-v3/), court dockets) plus baseline
   datasets ([RAND](https://www.rand.org/research/gun-policy/tools-and-data.html),
   [Giffords](https://giffords.org/lawcenter/resources/scorecard/)).
2. **Draft** — a classifier maps each event to a tracked provision and drafts a
   plain-language change.
3. **Review** — a human editor confirms against the **primary statute** (nothing
   publishes automatically).
4. **Publish** — a new versioned record + a changelog entry + subscriber
   notifications.

This human-in-the-loop design is deliberate: firearm law is too consequential to
publish from an unreviewed scraper.

## Status & next steps

Concept stage. The suggested build order is in the plan's roadmap
([`docs/PLAN.md`](docs/PLAN.md) §12): data spine → public MVP → live-update
pipeline → subscriptions → historical/API depth.
