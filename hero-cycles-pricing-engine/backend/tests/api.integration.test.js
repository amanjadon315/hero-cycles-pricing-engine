// api.integration.test.js
// Spins up the actual Express app against a throwaway SQLite file and
// exercises the real HTTP routes, including the snapshot-pricing
// guarantee (saved quotes don't change when part prices change later).
//
// Run with: npm test

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', 'data', 'test_hero_cycles.db');

// Point the db module at a dedicated test database file before importing
// anything that touches it, so we never run integration tests against
// real seeded data.
process.env.HERO_CYCLES_TEST_DB = TEST_DB;

let app;
let server;
let baseUrl;

before(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  const { buildApp } = await import('../src/app.js');
  const { initSchema } = await import('../src/db.js');
  initSchema();
  app = buildApp();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });

  // Minimal fixtures: one part, one model, one slot, one compatibility link
  const fetchJson = (path, options) =>
    fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    }).then((r) => r.json());

  global.__testFetch = fetchJson;
});

after(() => {
  server?.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('Parts API', () => {
  let createdPartId;

  test('POST /parts creates a part', async () => {
    const part = await global.__testFetch('/parts', {
      method: 'POST',
      body: JSON.stringify({ sku: 'TEST-TYR-01', name: 'Test Tyre', category: 'tyre', price: 200 }),
    });
    assert.equal(part.sku, 'TEST-TYR-01');
    assert.equal(part.current_price, 200);
    createdPartId = part.id;
  });

  test('POST /parts rejects duplicate SKU', async () => {
    const res = await fetch(`${baseUrl}/parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'TEST-TYR-01', name: 'Dup', category: 'tyre', price: 100 }),
    });
    assert.equal(res.status, 409);
  });

  test('PATCH /parts/:id/price updates price and logs history', async () => {
    const updated = await global.__testFetch(`/parts/${createdPartId}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price: 230, note: 'December increase' }),
    });
    assert.equal(updated.current_price, 230);

    const { history } = await global.__testFetch(`/parts/${createdPartId}/history`);
    assert.equal(history.length, 2); // initial + this update
    assert.equal(history[history.length - 1].price, 230);
  });

  test('PATCH /parts/:id/price rejects negative price', async () => {
    const res = await fetch(`${baseUrl}/parts/${createdPartId}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: -5 }),
    });
    assert.equal(res.status, 400);
  });
});

describe('Configuration pricing + snapshot guarantee', () => {
  let modelId, slotId, partId;

  before(async () => {
    const part = await global.__testFetch('/parts', {
      method: 'POST',
      body: JSON.stringify({ sku: 'TEST-FRM-01', name: 'Test Frame', category: 'frame', price: 1000 }),
    });
    partId = part.id;

    // Models/slots have no POST route by design (they're seeded data /
    // admin-managed), so we insert directly via the db module for this test.
    const { db } = await import('../src/db.js');
    const modelResult = db.prepare(`
      INSERT INTO cycle_models (name, code, description, base_price) VALUES (?, ?, ?, ?)
    `).run('Test Model', 'TEST-MODEL', 'For integration tests', 500);
    modelId = modelResult.lastInsertRowid;

    const slotResult = db.prepare(`
      INSERT INTO model_slots (model_id, category, label, quantity, is_required, sort_order)
      VALUES (?, 'frame', 'Frame', 1, 1, 1)
    `).run(modelId);
    slotId = slotResult.lastInsertRowid;

    db.prepare(`INSERT INTO slot_compatible_parts (slot_id, part_id) VALUES (?, ?)`).run(slotId, partId);
  });

  test('POST /configurations/price computes correct total', async () => {
    const result = await global.__testFetch('/configurations/price', {
      method: 'POST',
      body: JSON.stringify({ modelId, selections: { [slotId]: partId } }),
    });
    assert.equal(result.baseCost, 500);
    assert.equal(result.partsTotal, 1000);
    assert.equal(result.grandTotal, 1500);
  });

  test('POST /configurations/price rejects incompatible part', async () => {
    const res = await fetch(`${baseUrl}/configurations/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, selections: { [slotId]: 999999 } }),
    });
    assert.equal(res.status, 422);
  });

  test('an optional slot explicitly set to null is treated as unfilled, not as part id 0', async () => {
    // Add a second, optional slot to the test model (e.g. an accessory bell)
    const { db } = await import('../src/db.js');
    const optionalSlot = db.prepare(`
      INSERT INTO model_slots (model_id, category, label, quantity, is_required, sort_order)
      VALUES (?, 'accessory', 'Bell', 1, 0, 2)
    `).run(modelId);
    const optionalSlotId = optionalSlot.lastInsertRowid;

    // null (what the UI sends when "— none —" is chosen) must NOT be
    // coerced to 0 and treated as an invalid part selection.
    const result = await global.__testFetch('/configurations/price', {
      method: 'POST',
      body: JSON.stringify({
        modelId,
        selections: { [slotId]: partId, [optionalSlotId]: null },
      }),
    });
    assert.equal(result.grandTotal, 1500, 'optional slot left null should not affect price or fail validation');
  });

  test('saved configuration price is immune to later price changes', async () => {
    const saved = await global.__testFetch('/configurations', {
      method: 'POST',
      body: JSON.stringify({ modelId, selections: { [slotId]: partId }, customerName: 'Test Co' }),
    });
    assert.equal(saved.grandTotal, 1500);

    // Now bump the frame's price way up
    await global.__testFetch(`/parts/${partId}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price: 5000, note: 'price spike' }),
    });

    // The already-saved configuration must NOT change
    const refetched = await global.__testFetch(`/configurations/${saved.id}`);
    assert.equal(refetched.grandTotal, 1500, 'saved quote must stay locked to its snapshot price');

    // But a brand new live quote must reflect the new price
    const newQuote = await global.__testFetch('/configurations/price', {
      method: 'POST',
      body: JSON.stringify({ modelId, selections: { [slotId]: partId } }),
    });
    assert.equal(newQuote.grandTotal, 5500, 'new quotes must reflect current prices');
  });
});
