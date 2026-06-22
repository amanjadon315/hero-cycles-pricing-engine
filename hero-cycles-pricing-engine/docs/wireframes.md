# Wireframes & Design Notes — Part 3

## Design direction

The brief frames this as a tool a salesperson reaches for constantly, often
mid-conversation with a customer. I treated it less like a SaaS dashboard
and more like a **workshop spec tag / parts ledger** — the kind of itemized
tag that's physically tied to a finished bike, since that's literally the
artifact a salesperson is producing: an itemized price tied to a specific
build.

- **Color:** off-white paper background (`#FAF8F3`), near-black ink text,
  a single confident brick-red accent (`#B33A2E`) for emphasis (totals,
  the brand mark), and a muted steel-blue (`#3D5A6C`) for secondary UI
  state (active selections, optional-slot badges).
- **Type:** prices and SKUs — the actual product of this tool — are always
  set in a tabular-figure monospace face (IBM Plex Mono), so columns of
  numbers align like a printed receipt. Labels and UI chrome use a quiet
  grotesk (IBM Plex Sans).
- **Signature element:** the live price breakdown renders as a printed tag
  — a dark perforated strip across the top, dashed divider before the
  subtotal, oversized total in the accent color. It's the one place I spent
  visual "budget"; everything else (model picker, slot list, parts table)
  stays quiet and functional.

## Screen 1 — Build a Quote (primary screen)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [HC] Hero Cycles            [Build a Quote] [Manage Parts] [Quotes]  │
│      Pricing Configurator                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CYCLE MODEL                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                       │
│  │ SPRINT-CITY│ │TRAIL-BLAZER│ │ LITE-RIDER │   <- model cards,      │
│  │ Sprint City│ │Trail Blazer│ │ Lite Rider │      click to select   │
│  │ Everyday...│ │ Off-road...│ │ Budget...  │                       │
│  └────────────┘ └────────────┘ └────────────┘                       │
│                                                                        │
│  ┌─────────────────────────────────┐  ┌───────────────────────────┐ │
│  │ PARTS FOR SPRINT CITY            │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│  │                                   │  │ QUOTE ESTIMATE   21 Jun   │ │
│  │ Frame        [Steel Frame  ▾] FRM│  │ Sprint City                │ │
│  │ Gear Set     [7-Speed      ▾] GER│  │ SPRINT-CITY                │ │
│  │ Tyres ×2     [Standard     ▾] TYR│  │ ─────────────────────────  │ │
│  │ Brakes       [Rim Brake    ▾] BRK│  │ Base / assembly      ₹600  │ │
│  │ Seat         [Standard     ▾] SEA│  │ Steel Frame        ₹1,800  │ │
│  │ Handlebar    [Flat         ▾] HBR│  │ 7-Speed Shimano    ₹1,450  │ │
│  │                                   │  │ Standard Tyre ×2     ₹460  │ │
│  └─────────────────────────────────┘  │ Rim Brake Set        ₹350  │ │
│                                         │ Standard Seat        ₹250  │ │
│                                         │ Flat Handlebar       ₹300  │ │
│                                         │ - - - - - - - - - - - - -  │ │
│                                         │ Parts subtotal     ₹4,610  │ │
│                                         │                             │ │
│                                         │ TOTAL              ₹5,210  │ │
│                                         │ ─────────────────────────  │ │
│                                         │ Customer name  [_________] │ │
│                                         │ Salesperson    [_________] │ │
│                                         │ [   Save this quote   ]    │ │
│                                         └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Left column = inputs (model, then parts). Right column = output (price),
sticky so it stays visible while scrolling a longer parts list. Every
dropdown change recomputes the price live — no "calculate" button.

## Screen 2 — Manage Parts & Prices

```
┌──────────────────────────────────────────────────────────────────────┐
│ PARTS CATALOG          update a price and it applies to future quotes│
│                                                                        │
│ FRAME                                                                 │
│  SKU          Name                      Current price                │
│  FRM-STL-01   Steel Frame - Standard    ₹1,800   [Update] [History]  │
│  FRM-ALY-01   Alloy Frame - Lightweight ₹3,200   [Update] [History]  │
│                                                                        │
│ TYRE                                                                  │
│  TYR-STD-26   Standard Tyre 26"         ₹230     [Update] [History]  │
│    ↳ expanded history:                                                │
│      ● ₹200   15 Jan 2025   "Price as of January 2025"               │
│      ● ₹230   01 Dec 2025   "Raw material cost increase"             │
│                                                                        │
│  [Update] turns the row into:  [ 230 ] [reason...] [Save] [Cancel]   │
└──────────────────────────────────────────────────────────────────────┘
```

Grouped by category since that's how a salesperson thinks about parts
("show me the tyres"). History is collapsed by default to keep the table
scannable, expandable per-row on demand.

## Screen 3 — Saved Quotes

```
┌──────────────────────────────────────────────────────────────────────┐
│ SAVED QUOTES                                                          │
│  Date         Model         Customer        Salesperson               │
│  21 Jun 2026  Sprint City   Ramesh Traders  Anjali        [View]      │
│  20 Jun 2026  Trail Blazer  —               Vikram        [View]      │
└──────────────────────────────────────────────────────────────────────┘
                                          ┌───────────────────────────┐
  Clicking [View] shows the same          │ tag-style breakdown,      │
  receipt-style tag, but reading          │ frozen to prices at the   │
  from the locked snapshot prices —       │ moment it was saved       │
  not current ones.                       └───────────────────────────┘
```

## Mobile / narrow layout

Below ~900px, the two-column layouts (parts + price tag) stack vertically:
model picker → parts list → price tag, in that order, so the price is
still visible without horizontal scrolling. All interactive elements keep
a visible focus ring (`:focus-visible`) for keyboard navigation.

## What I deliberately left out

- No drag-and-drop, no multi-step wizard — a salesperson selecting six
  dropdowns is already fast; adding ceremony around that would work against
  the brief's explicit "optimize for efficiency" instruction.
- No dark mode — not asked for, and would dilute the single area I spent
  visual effort on (the price tag's accent color).
