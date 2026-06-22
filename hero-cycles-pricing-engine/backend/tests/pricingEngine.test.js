// pricingEngine.test.js
// Run with: npm test  (uses Node's built-in test runner, no extra deps)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeBreakdown, validateSelections, priceAtDate, PricingError } from '../src/pricingEngine.js';

describe('computeBreakdown', () => {
  test('sums base cost + line items correctly', () => {
    const model = { name: 'Sprint City', code: 'SPRINT-CITY', base_price: 600 };
    const items = [
      { slot_label: 'Frame', category: 'frame', part_name: 'Steel Frame', sku: 'FRM-1', quantity: 1, unit_price: 1800 },
      { slot_label: 'Tyres', category: 'tyre', part_name: 'Standard Tyre', sku: 'TYR-1', quantity: 2, unit_price: 230 },
    ];

    const result = computeBreakdown(model, items);

    assert.equal(result.baseCost, 600);
    assert.equal(result.lineItems.length, 2);
    assert.equal(result.lineItems[1].lineTotal, 460); // 230 * 2
    assert.equal(result.partsTotal, 1800 + 460);
    assert.equal(result.grandTotal, 600 + 1800 + 460);
  });

  test('handles zero items (base price only)', () => {
    const model = { name: 'Bare Model', code: 'BARE', base_price: 500 };
    const result = computeBreakdown(model, []);

    assert.equal(result.partsTotal, 0);
    assert.equal(result.grandTotal, 500);
  });

  test('throws PricingError when model is missing', () => {
    assert.throws(() => computeBreakdown(null, []), PricingError);
  });

  test('rounds to 2 decimal places to avoid floating point drift', () => {
    const model = { name: 'M', code: 'M', base_price: 0.1 };
    const items = [
      { slot_label: 'A', category: 'a', part_name: 'A', sku: 'A', quantity: 3, unit_price: 0.1 },
    ];
    const result = computeBreakdown(model, items);
    // 0.1 * 3 = 0.30000000000000004 in raw JS float math; must be cleaned to 0.3
    assert.equal(result.partsTotal, 0.3);
    assert.equal(result.grandTotal, 0.4);
  });

  test('defaults missing base_price to 0', () => {
    const model = { name: 'M', code: 'M' }; // no base_price field
    const result = computeBreakdown(model, []);
    assert.equal(result.baseCost, 0);
  });
});

describe('validateSelections', () => {
  const slots = [
    { id: 1, label: 'Frame', is_required: 1 },
    { id: 2, label: 'Tyres', is_required: 1 },
    { id: 3, label: 'Bell', is_required: 0 }, // optional slot
  ];

  test('passes when all required slots filled with compatible parts', () => {
    const compatibilityMap = new Map([
      [1, new Set([101, 102])],
      [2, new Set([201])],
      [3, new Set([301])],
    ]);
    const selections = { 1: 101, 2: 201 };

    const { valid, errors } = validateSelections(slots, compatibilityMap, selections);
    assert.equal(valid, true);
    assert.deepEqual(errors, []);
  });

  test('fails when a required slot is missing', () => {
    const compatibilityMap = new Map([
      [1, new Set([101])],
      [2, new Set([201])],
      [3, new Set([301])],
    ]);
    const selections = { 1: 101 }; // Tyres slot missing

    const { valid, errors } = validateSelections(slots, compatibilityMap, selections);
    assert.equal(valid, false);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Tyres/);
  });

  test('fails when a selected part is incompatible with its slot', () => {
    const compatibilityMap = new Map([
      [1, new Set([101])],
      [2, new Set([201])],
      [3, new Set([301])],
    ]);
    const selections = { 1: 999, 2: 201 }; // 999 not valid for Frame slot

    const { valid, errors } = validateSelections(slots, compatibilityMap, selections);
    assert.equal(valid, false);
    assert.match(errors[0], /Frame/);
  });

  test('does not require optional slots to be filled', () => {
    const compatibilityMap = new Map([
      [1, new Set([101])],
      [2, new Set([201])],
      [3, new Set([301])],
    ]);
    const selections = { 1: 101, 2: 201 }; // Bell (optional) left empty

    const { valid, errors } = validateSelections(slots, compatibilityMap, selections);
    assert.equal(valid, true);
  });
});

describe('priceAtDate', () => {
  const history = [
    { price: 200, effective_from: '2025-01-15 00:00:00' },
    { price: 230, effective_from: '2025-12-01 00:00:00' },
  ];

  test('returns the price effective at a date between two changes', () => {
    assert.equal(priceAtDate(history, '2025-06-01'), 200);
  });

  test('returns the latest price for a date after the last change', () => {
    assert.equal(priceAtDate(history, '2026-01-01'), 230);
  });

  test('returns the exact price on the effective date itself', () => {
    assert.equal(priceAtDate(history, '2025-12-01'), 230);
  });

  test('returns null when queried before any price record exists', () => {
    assert.equal(priceAtDate(history, '2024-01-01'), null);
  });
});
