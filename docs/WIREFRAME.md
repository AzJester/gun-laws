# Wireframe (ASCII)

A text rendering of the layout for readers who can't open the interactive
[`mockup/index.html`](../mockup/index.html). The canonical visual is the mockup; a
static render is at [`mockup/preview.png`](../mockup/preview.png).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ GunLawMap   Interactive US firearm-law atlas        [ ⌕ Search a state… ]  │
│                                          ● Data: State Firearm Laws DB (2020)    │
├───────────────────────────────────────────┬────────────────────────────────────┤
│  Firearm-law coverage & grade              │   ARIZONA           [as of 2020]┌──┐│
│  Grade A = fewest · 134 tracked laws       │   Grade A · the fewest          │A ││
│                          [Grade│Carry│Bkgd│RedFlag]   restrictions · 8 of 134 └──┘│
│        ░░░░░  ▓▓▓  ░░░  ░░░       ┌──┐VT    │   ┌────────────┐ ┌────────────┐     │
│      ▓▓░  ░░░░  ░░░░  ░░░ ░░ ░░───┤  │NH    │   │Carry permit│ │Universal bg│     │
│      ▒▒  ░░░  ░░░  ░░░ ░░░ ▓▓ ░───┤  │NY    │   │ req.    No │ │ checks  No │     │
│      ██  ▒▒  ▓▓  ░░  ░░░ ░░ ░░ ───┤  │NJ    │   ├────────────┤ ├────────────┤     │
│       ██ ░░  ▓▓  ░░  ░░ ░░░ ──────┤  │DE/MD │   │Red-flag No │ │Mag limit No│     │
│        ░░  ░░  ░░ ░░ ░░  ░░ ──────┤  │DC    │   └────────────┘ └────────────┘     │
│  (Albers projection; choropleth   ░░  ░░   │   ▸ Concealed & open carry (1)       │
│   light = fewer laws, dark = more. ░░░     │       – Open carry of long guns…    │
│   AK & HI inset at lower-left.)            │   ▸ Buyer regulations & permits (1)  │
│   ▒AK    ▓HI                                │       – Background check for amm…   │
│                                            │   …all tracked laws, by category…   │
│  Fewer  [A][A-][B][C][D][D-][F]  More laws  │   (California lists 111 across 17)   │
├───────────────────────────────────────────┼────────────────────────────────────┤
│  Grade = # of the 134 tracked laws a state │   RECENT & PENDING CHANGES          │
│  has in effect (A = fewest). Click a grade │   Jun 15  Louisiana — permitless …   │
│  to highlight.  Gold dash = recent change. │           [Effective]               │
│                                            │   May 02  Colorado — excise tax …    │
│                                            │   Apr 18  Maine — 72-hr wait upheld  │
└───────────────────────────────────────────┴────────────────────────────────────┘
  ⚠ Illustrative — not legal advice. Provisions: State Firearm Laws DB (2020). Geometry: us-atlas.
```

Legend: `░` light = fewer laws (grade A) · `▒`/`▓` mid · `█` dark = more laws (grade
F). The small Northeast states (VT, NH, NY, NJ, DE, MD, DC, CT, RI, MA) are labeled
in an external column with leader lines.

## Interactions shown in the mockup
- **Click a state** → detail panel updates: grade, law count (of 134), policy flags,
  and **every tracked law in effect grouped by category** (scrollable).
- **Mode tabs** (Grade / Carry / Bkgd / Red flag) → recolor the whole map by that
  single policy.
- **Legend chips** (Grade mode) → filter/dim states to one grade.
- **Search** → type a state name/abbr + Enter to jump to it.
- **Recent-changes feed** → click an item to select that state.
- **Dashed-gold outline** on a state → it has a recently flagged change.
- Map shapes are keyboard-focusable.
