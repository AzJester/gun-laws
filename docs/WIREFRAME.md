# Wireframe (ASCII)

A text rendering of the layout for readers who can't open the interactive
[`mockup/index.html`](../mockup/index.html). The mockup is the canonical visual.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ GunLawMap   Interactive US firearm-law atlas        [ ⌕ Search a state… ]  │
│                                              ● Data synced Jun 21, 2026          │
├───────────────────────────────────────────┬────────────────────────────────────┤
│  Overall regulation strength               │   CALIFORNIA                  ┌──┐  │
│  Tile grid · one square per state    [Grade│Carry│Bkgd│RedFlag]            │A │  │
│                                            │   Grade A · very strong restr. └──┘  │
│   ┌──┐                            ┌──┐     │   ┌────────────┐ ┌────────────┐     │
│   │AK│                            │ME│     │   │✓ Permit req│ │✓ Universal │     │
│   └──┘            ┌──┐      ┌──┐┌──┐       │   │  carry     │ │  bkgd check│     │
│        ┌──┐┌──┐┌──┐│WI│  ┌──┐│VT││NH│       │   ├────────────┤ ├────────────┤     │
│        │WA││ID││MT│└──┘  │MI││NY││MA│  ...   │   │✓ Red-flag  │ │✓ Mag limit │     │
│        └──┘└──┘└──┘ ...  └──┘└──┘└──┘       │   └────────────┘ └────────────┘     │
│        ┌──┐┌──┐┌──┐┌──┐ ...                 │   ● Carry                            │
│        │OR││NV││WY││SD│  (recognizable      │     – Shall-issue CCW permit (…)     │
│        └──┘└──┘└──┘└──┘   US shape)         │   ● Purchase & background checks     │
│        ┌──┐ ...  ┌──┐┌──┐                    │     – Universal checks (§28050)      │
│        │CA│      │TX││FL│                    │     – 10-day waiting period (…)      │
│        └──┘      └──┘└──┘                    │   ● Prohibited weapons              │
│                                            │     – Assault-weapon ban (§30605)   │
│  Fewer ▢F ▢D ▢C ▢B ■A  More restrictions   │     – Magazines >10 rds (§32310)     │
├───────────────────────────────────────────┼────────────────────────────────────┤
│  (legend swatches filter the map)          │   RECENT & PENDING CHANGES          │
│  ● = state has a recently flagged change   │   Jun 15  LA — permitless carry …    │
│                                            │           [Effective]               │
│                                            │   May 02  CO — firearms excise tax …  │
│                                            │           [Effective]               │
│                                            │   Apr 18  ME — 72-hr wait upheld …    │
│                                            │           [Court ruling]            │
└───────────────────────────────────────────┴────────────────────────────────────┘
  ⚠ Illustrative mockup — not legal advice. Sample data only.
```

## Interactions shown in the mockup
- **Click a tile** → detail panel updates to that state.
- **Mode tabs** (Grade / Carry / Bkgd / Red flag) → recolor the whole map by that
  single policy.
- **Legend swatches** (Grade mode) → filter/dim states to one grade tier.
- **Search** → type a state name/abbr + Enter to jump to it.
- **Recent-changes feed** → click an item to select that state.
- **Yellow dot** on a tile → that state has a recently flagged change.
