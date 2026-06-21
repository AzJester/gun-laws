# Data model

The data layer is **versioned and provenance-first**: every published fact is tied
to a source and a verified date, and changes append new versions rather than
overwriting. This enables the changelog, the "as-of-date" view, and an audit trail.

## Entities

```
state ──< state_policy >── policy_type          provision ──< provision_version
  │                                                   │
  └──< provision                                       └──< source
                                                  change_event ──> provision
```

### `state`
| field | type | notes |
|---|---|---|
| code | char(2) PK | `CA`, `TX`, `DC`… |
| name | text | "California" |
| overall_grade | text | derived; **A = fewest restrictions, F = most** (from `lawtotal`: 0-9 A … 80+ F). Opposite orientation from gun-safety scorecards. |
| law_count | int null | number of tracked laws in effect (0–134; null where not in the source dataset, e.g. DC) |
| preemption_note | text | local-authority summary |

### `policy_type`
Canonical list of trackable policies (drives the map's single-policy color modes
and the at-a-glance flags).
| field | type |
|---|---|
| key | text PK (`permitless_carry`, `universal_bg_check`, `red_flag`, `awb`, `mag_limit`, `waiting_period`, …) |
| label | text |
| category | text (Carry, Purchase, Prohibited weapons, Storage, Extreme risk, …) |
| direction | text (does "true" mean more or fewer restrictions) |

### `state_policy`  (current at-a-glance value per state × policy)
| field | type | notes |
|---|---|---|
| state_code | FK | |
| policy_key | FK | |
| value | enum/bool/text | yes / no / partial / n-rounds / n-days |
| provision_id | FK nullable | links to the governing provision |

### `provision`  (a specific law in a state)
| field | type | notes |
|---|---|---|
| id | PK | |
| state_code | FK | |
| category | text | see taxonomy in PLAN §13 |
| title | text | "10-day waiting period" |
| current_version_id | FK | pointer to live version |

### `provision_version`  (append-only history)
| field | type | notes |
|---|---|---|
| id | PK | |
| provision_id | FK | |
| summary | text | plain-language description |
| citation | text | `Pen. Code §26815` |
| status | enum | `in_effect` / `enacted_not_yet_effective` / `enjoined` / `struck` / `repealed` |
| enacted_date | date | |
| effective_date | date | |
| verified_at | timestamp | last human verification |
| verified_by | FK user | |
| confidence | enum | `confirmed` / `auto_suggested` |
| superseded_by | FK nullable | next version |

### `source`
| field | type |
|---|---|
| id | PK |
| provision_version_id | FK |
| kind | enum (`statute`, `enrolled_bill`, `court_order`, `agency_rule`, `dataset`) |
| url | text |
| label | text |
| retrieved_at | timestamp |

### `change_event`  (powers the "recent changes" feed + notifications)
| field | type | notes |
|---|---|---|
| id | PK | |
| state_code | FK | |
| policy_key | FK nullable | |
| provision_id | FK nullable | |
| kind | enum | `enacted` / `effective` / `court_ruling` / `introduced` / `amended` / `repealed` |
| headline | text | feed text |
| event_date | date | |
| external_ref | text | LegiScan bill id / docket no. |
| review_status | enum | `auto_detected` / `in_review` / `published` / `rejected` |

### `subscription` (v2)
| field | type |
|---|---|
| id | PK |
| email | text |
| scope | json (states[], policies[]) |
| channel | enum (`email`, `rss`) |

## Notes
- **Provenance is mandatory:** a `provision_version` cannot be `published` without
  at least one `source` and a `verified_at`/`verified_by`.
- **Soft transitions:** an enjoined/struck law keeps its row with a status change —
  never hard-deleted — so history stays intact.
- The canonical sample dataset (all 50 states + DC, with policy flags, derived
  grade, and categorized `provisions`) lives in
  [`data/sample-states.json`](../data/sample-states.json); pre-projected map
  geometry is in [`data/us-geo.json`](../data/us-geo.json). Both the mockup and the
  `web/` app are built from these. Regenerate provisions with
  [`tools/gen-provisions.js`](../tools/gen-provisions.js).
