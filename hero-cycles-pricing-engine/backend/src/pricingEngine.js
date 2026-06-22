// pricingEngine.js
// Core pricing logic, deliberately kept as pure functions that operate on
// plain JS objects (not directly on the DB) so they're trivial to unit test
// without spinning up SQLite. The route layer is responsible for fetching
// rows and handing them to these functions.

/**
 * Compute the price breakdown for a configuration.
 *
 * @param {Object} model - cycle model row { id, name, code, base_price }
 * @param {Array} items - array of { slot_label, category, part_name, sku, quantity, unit_price }
 * @returns {Object} breakdown: { modelName, baseCost, lineItems: [...], partsTotal, grandTotal }
 */
export function computeBreakdown(model, items) {
  if (!model) {
    throw new PricingError('MODEL_REQUIRED', 'A cycle model is required to compute a price.');
  }

  const lineItems = items.map((item) => {
    const lineTotal = round2(item.unit_price * item.quantity);
    return {
      slotLabel: item.slot_label,
      category: item.category,
      partName: item.part_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: round2(item.unit_price),
      lineTotal,
    };
  });

  const partsTotal = round2(lineItems.reduce((sum, li) => sum + li.lineTotal, 0));
  const baseCost = round2(model.base_price || 0);
  const grandTotal = round2(baseCost + partsTotal);

  return {
    modelName: model.name,
    modelCode: model.code,
    baseCost,
    lineItems,
    partsTotal,
    grandTotal,
  };
}

/**
 * Validate that a proposed set of slot->part selections satisfies a
 * model's slot requirements (all required slots filled, chosen part is
 * actually compatible with that slot).
 *
 * @param {Array} slots - model_slots rows [{ id, category, label, quantity, is_required }]
 * @param {Map<number, Set<number>>} compatibilityMap - slot_id -> Set of valid part_ids
 * @param {Object} selections - { [slot_id]: part_id }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSelections(slots, compatibilityMap, selections) {
  const errors = [];

  for (const slot of slots) {
    const chosenPartId = selections[slot.id];

    if (chosenPartId === undefined || chosenPartId === null) {
      if (slot.is_required) {
        errors.push(`Slot "${slot.label}" is required but no part was selected.`);
      }
      continue;
    }

    const compatibleParts = compatibilityMap.get(slot.id) || new Set();
    if (!compatibleParts.has(chosenPartId)) {
      errors.push(`Selected part is not compatible with slot "${slot.label}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Given a part's full price history (sorted ascending by effective_from),
 * return the price that was effective at a given point in time.
 * Useful for "what would this have cost in January" style queries and
 * for explaining price drift to a salesperson.
 *
 * @param {Array} history - [{ price, effective_from }] sorted ascending
 * @param {string|Date} atDate
 * @returns {number|null} price effective at that date, or null if no record predates it
 */
export function priceAtDate(history, atDate) {
  const target = new Date(atDate).getTime();
  let applicable = null;

  for (const record of history) {
    const recordDate = new Date(record.effective_from).getTime();
    if (recordDate <= target) {
      applicable = record.price;
    } else {
      break;
    }
  }

  return applicable;
}

export class PricingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'PricingError';
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
