# Wireframe (ASCII)

A text rendering of the layout. The canonical visual is the interactive
[`mockup/index.html`](../mockup/index.html); a static render is at
[`mockup/preview.png`](../mockup/preview.png).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ GunLawMap   Interactive US firearm-law atlas        [ ⌕ Search a state… ]  │
│                                              ● Data synced Jun 21, 2026          │
├───────────────────────────────────────────┬────────────────────────────────────┤
│  Restrictions & overall grade              │   ARIZONA                     ┌──┐  │
│  Real US map · grade A = fewest      [Grade│Carry│Bkgd│RedFlag]            │A │  │
│   restrictions                             │   Grade A · no statewide      └──┘  │
│                                            │   restrictions · 0 of 6             │
│        ░░░░░  ▓▓▓  ░░░  ░░░       ┌──┐VT    │   ┌──────────────┐ ┌──────────────┐ │
│      ▓▓░  ░░░░  ░░░░  ░░░ ░░ ░░───┤  │NH    │   │Carry permit  │ │Universal bg  │ │
│      ▒▒  ░░░  ░░░  ░░░ ░░░ ▓▓ ░───┤  │MA    │   │ required  No │ │ checks    No │ │
│      ██  ▒▒  ▓▓  ░░  ░░░ ░░ ░░ ───┤  │NY    │   ├──────────────┤ ├──────────────┤ │
│       ██ ░░  ▓▓  ░░  ░░ ░░░ ──────┤  │NJ    │   │Red-flag law  │ │Assault-wpn   │ │
│        ░░  ░░  ░░ ░░ ░░  ░░ ──────┤  │DE    │   │           No │ │ restr.    No │ │
│  (Albers projection; choropleth   ───────┤  │MD/DC │   └──────────────┘ └──────────────┘ │
│   light = fewer restrictions,     ░░  ░░  │   ● Carry                            │
│   dark = more.  AK & HI inset      ░░░    │     – Permitless carry; optional…   │
│   at lower-left.)                          │   ● Purchase & background checks     │
│   ▒AK    ▓HI                                │     – No state UBC; NICS only        │
│                                            │   ● Extreme risk (red flag)          │
│  Fewer  [A][A-][B][C][D][D-][F]  More      │     – No statewide ERPO law          │
│  restrictions     restrictions             │   ● Local authority                  │
├───────────────────────────────────────────┼────────────────────────────────────┤
│  Grade = # of 6 tracked restrictions       │   RECENT & PENDING CHANGES          │
│  (A = 0 … F = 6). Click a grade to filter. │   Jun 15  Louisiana — permitless …   │
│  Dashed-gold outline = recent change.      │           [Effective]               │
│                                            │   May 02  Colorado — excise tax …    │
│                                            │           [Effective]               │
│                                            │   Apr 18  Maine — 72-hr wait upheld  │
│                                            │           [Court ruling]            │
└───────────────────────────────────────────┴────────────────────────────────────┘
  ⚠ Illustrative mockup — not legal advice. Sample data only.   Geometry: us-atlas (public domain).
```

Legend: `░` light = fewer restrictions (grade A) · `▒`/`▓` mid · `█` dark = more
restrictions (grade F). The small Northeast states (VT, NH, MA, NY, NJ, DE, MD, DC,
CT, RI) are labeled in an external column with leader lines.

## Interactions shown in the mockup
- **Click a state** → detail panel updates to that state.
- **Mode tabs** (Grade / Carry / Bkgd / Red flag) → recolor the whole map by that
  single policy.
- **Legend chips** (Grade mode) → filter/dim states to one grade.
- **Search** → type a state name/abbr + Enter to jump to it.
- **Recent-changes feed** → click an item to select that state.
- **Dashed-gold outline** on a state → it has a recently flagged change.
- Map shapes, labels, and selection highlight are all keyboard-focusable.
