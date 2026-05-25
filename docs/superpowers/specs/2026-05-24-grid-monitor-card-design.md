# Grid Monitor Card — Design Spec

**Date:** 2026-05-24  
**Status:** Approved  
**Feature:** 4th metric card on the demo/dashboard page showing live grid operator data, locale-switched.

---

## Context

The demo page (`app/demo/page.tsx`) has three primary metric cards: **Wattage**, **DR Tier**, and **Inference**. Below them sits `GridSignalPanel` — a complex multi-source component the user described as "confusing."

This spec replaces `GridSignalPanel` with a simpler 4th metric card (`GridMonitorCard`) that slots directly into the existing 3-card row. The new card shows the grid operator relevant to each locale, with live demand data from the existing `gridSignal` state.

---

## Architecture

### New file
`app/demo/GridMonitorCard.tsx` — self-contained component, exported as a named export.

### Changes to `app/demo/page.tsx`
1. Import `GridMonitorCard`.
2. Change metric grid: `grid-cols-1 sm:grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (in both the loading skeleton block and the loaded block).
3. Loading skeleton: change `[0,1,2].map(...)` → `[0,1,2,3].map(...)`.
4. Add `<GridMonitorCard signal={gridSignal} locale={locale} g={g} />` as the 4th child of the loaded metric grid.
5. Remove the `GridSignalPanel` function definition (lines ~134–289) and its JSX call (line ~536).

---

## Component Interface

```ts
// app/demo/GridMonitorCard.tsx

import type { GridSignal, GridSource } from '@/app/hooks/useFlexState'
// Translations type is the return type of the `t` object used in the demo page.
// Import as: import type { Translations } from '@/app/lib/translations/en'
// (en.ts exports the canonical type; fr.ts and pt.ts satisfy the same shape)

interface GridMonitorCardProps {
  signal: GridSignal | null
  locale: 'en' | 'fr' | 'pt'
  g: Translations
}
```

---

## Locale → Operator Mapping

| Locale | Operator name | Signal path | Card label | Logo |
|--------|--------------|-------------|------------|------|
| `fr` | Hydro-Québec | `signal.fr?.hq` | `RÉSEAU ÉLECTRIQUE` | HQ SVG (orange + white) |
| `pt` | ONS Brasil | `signal.pt?.ons` | `REDE ELÉTRICA` | ONS SVG (adapted for dark) |
| `en` | NYISO | `signal.en?.nyiso` | `POWER GRID` | NYISO SVG (cyan + white) |

Operator sub-label (shown under logo):
- `fr`: `"Québec · 40 GW cap."`
- `pt`: `signal.pt?.ons?.area ?? "Sistema Interligado Nacional"`
- `en`: `"New York · NYISO"`

---

## Visual Design

### Card shell
```
border: border-blue-900   (1px solid)
background: rgba(blue-950, 0.05) — very subtle tint
padding: p-5  (matches other 3 cards exactly)
border-radius: rounded-lg
```

### Internal layout (top → bottom)
```
[9px uppercase mono label]  e.g. "REDE ELÉTRICA"
[logo SVG + operator name]  logo ~24px tall, name ~13px blue-300
[blank space]
[hero number]               text-5xl font-bold font-mono, tier color
                            Value: demand_mw formatted with locale space-thousands separator
                            e.g. 20800 → "20 800" (use toLocaleString('fr') or manual split)
[hero unit sub-label]       text-xl font-mono, same color at 70% opacity  → "MW"
[bottom row]                9px font-mono: "52% carga · T0 · ✓ OK"
```

### Tier color palette
Same as the DR Tier card:
| Tier | Color |
|------|-------|
| 0 | `#4ade80` (green-400) |
| 1 | `#eab308` (yellow-500) |
| 2 | `#f97316` (orange-500) |
| 3 | `#ef4444` (red-500) |

### Bottom row content
- Demand: `{demand_pct}%` + locale-specific "carga" / "charge" / "load"
- Tier badge: `T{tier}`
- Status: `✓ OK` (green) when tier=0 and no peak; `⚡ POINTE` / `⚡ PEAK` when `peak_event_active`; tier badge color when tier ≥ 1

---

## Logos

All logos are embedded as inline SVG components inside `GridMonitorCard.tsx`. Colors are adapted for the dark terminal background.

### Hydro-Québec (`HqLogo`)
- Source: https://upload.wikimedia.org/wikipedia/commons/a/ae/Hydro-Québec_logo.svg
- Adaptation: Replace `#003366` (navy) → `#e2e8f0` (slate-200/white); keep `#ff9900` orange
- Render at: `height="20"`, `width` auto

### ONS Brasil (`OnsLogo`)
- Source: fetch `https://www.ons.org.br/` in the browser devtools during implementation to locate the logo `<img>` src, then download and embed the SVG. The site uses JS-rendered markup so WebFetch cannot resolve the URL statically.
- Adaptation: Replace dark fills → `#e2e8f0`; keep brand accent color (typically green/teal)
- Render at: `height="20"`, `width` auto
- Fallback if SVG unavailable: `<span className="text-sm font-bold text-green-400 font-mono tracking-widest">ONS</span>`

### NYISO (`NyisoLogo`)
- Source: https://www.nyiso.com/o/nyiso-main-theme/images/logo.svg
- Adaptation: Replace `#333` (dark gray) → `#e2e8f0`; keep `#2baadd` cyan
- Render at: `height="20"`, `width` auto

---

## Null / Loading State

When `signal` is `null`, or the locale-specific source (`signal.fr?.hq`, etc.) is `null` or `undefined`:
- Hero number: `—`
- Hero unit: `MW`
- Bottom row: `— · — · —`
- Card border/background: unchanged (always visible — consistent with other metric cards)
- No spinner; no skeleton (the outer loading skeleton covers the initial load)

---

## Responsive Behavior

Grid class change: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

| Breakpoint | Layout |
|-----------|--------|
| < sm (mobile) | 1 column, all 4 cards stacked |
| sm–lg (tablet) | 2 columns × 2 rows |
| ≥ lg (desktop) | 4 columns, 1 row |

---

## Translations

Three new translation keys needed in `app/lib/translations/{en,fr,pt}.ts`:

```ts
grid_card: {
  label: string          // "POWER GRID" / "RÉSEAU ÉLECTRIQUE" / "REDE ELÉTRICA"
  load_unit: string      // "load" / "charge" / "carga"
  peak_active: string    // "PEAK" / "POINTE" / "PONTA"
  status_ok: string      // "OK" / "OK" / "OK"
}
```

---

## What Is Removed

- `GridSignalPanel` function definition: `app/demo/page.tsx` lines ~134–289
- `<GridSignalPanel signal={gridSignal} locale={locale} demoEvent={demoEvent} now={now} g={g} />` call: line ~536
- No other files are touched. The `GridSignal` type, `gridSignal` state, and the `/api/state` endpoint that populates it remain unchanged.

---

## Out of Scope

- Editing the `/api/state` route or `grid_signal.py`
- Adding historical demand sparklines to the card
- Supporting ISNE or CAISO operators (those locale slots are unused; card only needs hq/ons/nyiso)
