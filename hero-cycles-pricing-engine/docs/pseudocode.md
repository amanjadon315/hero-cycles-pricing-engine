# Pseudocode — Part 2 (Conceptual Solution)

This describes the core pricing logic conceptually, independent of the
actual JS implementation in `backend/src/pricingEngine.js`. See that file
(and its tests in `backend/tests/pricingEngine.test.js`) for the real,
working code.

## Data shapes

```
Part:
  id, sku, name, category, current_price, unit, is_active

PartPriceHistory:
  part_id, price, effective_from, note
  // append-only — every price change adds a new row, never edits one

CycleModel:
  id, name, code, base_price

ModelSlot:
  id, model_id, category, label, quantity, is_required
  // e.g. { category: "tyre", label: "Tyres", quantity: 2, is_required: true }

SlotCompatiblePart:
  slot_id, part_id
  // many-to-many: which parts are valid choices for which slot

Configuration (saved quote):
  id, model_id, customer_name, salesperson_name, created_at

ConfigurationItem:
  configuration_id, slot_id, part_id, quantity, unit_price_snapshot
  // unit_price_snapshot is captured at save time and never recalculated
```

## Algorithm 1 — Validate a proposed configuration

```
function validateSelections(slots, compatibilityMap, selections):
    errors = []

    for each slot in slots:
        chosenPartId = selections[slot.id]

        if chosenPartId is missing:
            if slot.is_required:
                errors.append("Slot {slot.label} is required")
            continue

        compatibleParts = compatibilityMap[slot.id]
        if chosenPartId not in compatibleParts:
            errors.append("Selected part not valid for slot {slot.label}")

    return { valid: errors.is_empty(), errors }
```

**Why this shape:** validation must run server-side regardless of what the
UI sends, since a malicious or buggy client could submit any part/slot
pairing. Keeping it a pure function over plain data (no DB calls inside the
loop) means it's fast and trivially unit-testable.

## Algorithm 2 — Compute a price breakdown

```
function computeBreakdown(model, items):
    // items = [{ slot_label, part_name, sku, quantity, unit_price }, ...]
    // already validated and resolved from the DB by the caller

    lineItems = []
    for each item in items:
        lineTotal = round2(item.unit_price * item.quantity)
        lineItems.append({
            slot_label: item.slot_label,
            part_name: item.part_name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: round2(item.unit_price),
            line_total: lineTotal
        })

    partsTotal = round2(sum of all lineItem.line_total)
    baseCost = round2(model.base_price or 0)
    grandTotal = round2(baseCost + partsTotal)

    return {
        model_name: model.name,
        base_cost: baseCost,
        line_items: lineItems,
        parts_total: partsTotal,
        grand_total: grandTotal
    }
```

**Why round at each step, not just the end:** floating point arithmetic on
currency (`0.1 * 3` in raw JS ≠ exactly `0.3`) can produce values that look
wrong by a paisa when displayed. Rounding each line item independently
matches what a human would expect to see on a printed receipt — every
visible number adds up exactly.

## Algorithm 3 — Live quote vs. saved quote (the snapshot guarantee)

This is the piece that directly answers the brief's "tyre was ₹200 in
January, ₹230 by December" scenario.

```
function getLiveQuote(model_id, selections):
    items = []
    for each (slot_id, part_id) in selections:
        part = lookupPart(part_id)               // reads CURRENT price
        items.append({ ..., unit_price: part.current_price })
    return computeBreakdown(lookupModel(model_id), items)


function saveConfiguration(model_id, selections, customer_name, salesperson_name):
    validate(selections)  // Algorithm 1

    configuration = createConfigurationRecord(model_id, customer_name, salesperson_name)

    for each (slot_id, part_id) in selections:
        part = lookupPart(part_id)               // reads CURRENT price, ONCE
        createConfigurationItem(
            configuration.id, slot_id, part_id,
            quantity: slot.quantity,
            unit_price_snapshot: part.current_price   // <-- frozen forever
        )

    return configuration


function getSavedQuote(configuration_id):
    items = loadConfigurationItems(configuration_id)
    // each item.unit_price_snapshot was written once, at save time,
    // and is read back as-is — NEVER re-joined against parts.current_price
    return computeBreakdown(..., items using unit_price_snapshot)
```

**The key invariant:** `getLiveQuote` always reflects today's prices.
`getSavedQuote` always reflects the prices that were true the moment
`saveConfiguration` ran, forever, regardless of how many times the
underlying parts get repriced afterward. This is verified directly by an
integration test (`saved configuration price is immune to later price
changes` in `backend/tests/api.integration.test.js`), which: saves a quote,
bumps a part's price, then asserts the saved quote's total is unchanged
while a brand-new live quote reflects the new price.

## Algorithm 4 — Updating a part's price (the "every few months" workflow)

```
function updatePartPrice(part_id, new_price, note):
    if new_price < 0: reject

    update Part.current_price = new_price  // for fast reads everywhere else
    insert into PartPriceHistory:
        part_id, price: new_price, effective_from: now(), note

    // nothing else changes. Existing ConfigurationItems keep their
    // unit_price_snapshot untouched. Only future getLiveQuote calls
    // and future saveConfiguration calls see the new price.
```
