// routes/configurations.js
import { Router } from 'express';
import { db } from '../db.js';
import { computeBreakdown, validateSelections, PricingError } from '../pricingEngine.js';

export const configurationsRouter = Router();

// POST /api/configurations/price
// Stateless "quote" endpoint: given a model + slot->part selections,
// validate and return the price breakdown WITHOUT saving anything.
// This is what the UI calls on every change for instant feedback.
//
// Body: { modelId, selections: { [slotId]: partId } }
configurationsRouter.post('/price', (req, res) => {
  const { modelId, selections = {} } = req.body;

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }

  const model = db.prepare('SELECT * FROM cycle_models WHERE id = ?').get(modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });

  const slots = db.prepare('SELECT * FROM model_slots WHERE model_id = ? ORDER BY sort_order, id').all(modelId);

  const compatibilityMap = new Map();
  for (const slot of slots) {
    const rows = db.prepare('SELECT part_id FROM slot_compatible_parts WHERE slot_id = ?').all(slot.id);
    compatibilityMap.set(slot.id, new Set(rows.map((r) => r.part_id)));
  }

  // Normalize selections keys to numbers (JSON object keys arrive as strings).
  // Skip any slot explicitly set to null/empty (an optional slot left unfilled)
  // rather than coercing it to 0, which would look like a real (invalid) part id.
  const normalizedSelections = {};
  for (const [slotId, partId] of Object.entries(selections)) {
    if (partId === null || partId === undefined || partId === '') continue;
    normalizedSelections[Number(slotId)] = Number(partId);
  }

  const { valid, errors } = validateSelections(slots, compatibilityMap, normalizedSelections);
  if (!valid) {
    return res.status(422).json({ error: 'Invalid configuration', details: errors });
  }

  const items = [];
  for (const slot of slots) {
    const partId = normalizedSelections[slot.id];
    if (partId === undefined) continue; // optional slot left empty

    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId);
    items.push({
      slot_label: slot.label,
      category: slot.category,
      part_name: part.name,
      sku: part.sku,
      quantity: slot.quantity,
      unit_price: part.current_price,
    });
  }

  try {
    const breakdown = computeBreakdown(model, items);
    res.json(breakdown);
  } catch (err) {
    if (err instanceof PricingError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// POST /api/configurations
// Persist a configuration (a saved quote), snapshotting unit prices at
// time of save so later price changes don't retroactively alter a quote
// that was already given to a customer.
//
// Body: { modelId, customerName, salespersonName, selections: { [slotId]: partId } }
configurationsRouter.post('/', (req, res) => {
  const { modelId, customerName, salespersonName, selections = {} } = req.body;

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }

  const model = db.prepare('SELECT * FROM cycle_models WHERE id = ?').get(modelId);
  if (!model) return res.status(404).json({ error: 'Model not found' });

  const slots = db.prepare('SELECT * FROM model_slots WHERE model_id = ? ORDER BY sort_order, id').all(modelId);
  const compatibilityMap = new Map();
  for (const slot of slots) {
    const rows = db.prepare('SELECT part_id FROM slot_compatible_parts WHERE slot_id = ?').all(slot.id);
    compatibilityMap.set(slot.id, new Set(rows.map((r) => r.part_id)));
  }

  const normalizedSelections = {};
  for (const [slotId, partId] of Object.entries(selections)) {
    if (partId === null || partId === undefined || partId === '') continue;
    normalizedSelections[Number(slotId)] = Number(partId);
  }

  const { valid, errors } = validateSelections(slots, compatibilityMap, normalizedSelections);
  if (!valid) {
    return res.status(422).json({ error: 'Invalid configuration', details: errors });
  }

  const insertConfig = db.prepare(`
    INSERT INTO configurations (model_id, customer_name, salesperson_name)
    VALUES (?, ?, ?)
  `);
  const configResult = insertConfig.run(modelId, customerName || null, salespersonName || null);
  const configId = configResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO configuration_items (configuration_id, slot_id, part_id, quantity, unit_price_snapshot)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const slot of slots) {
    const partId = normalizedSelections[slot.id];
    if (partId === undefined) continue;
    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId);
    insertItem.run(configId, slot.id, partId, slot.quantity, part.current_price);
  }

  res.status(201).json(getFullConfiguration(configId));
});

// GET /api/configurations  - list saved configurations (most recent first)
configurationsRouter.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, cm.name as model_name, cm.code as model_code
    FROM configurations c
    JOIN cycle_models cm ON cm.id = c.model_id
    ORDER BY c.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/configurations/:id  - full saved configuration with breakdown
configurationsRouter.get('/:id', (req, res) => {
  const config = getFullConfiguration(req.params.id);
  if (!config) return res.status(404).json({ error: 'Configuration not found' });
  res.json(config);
});

function getFullConfiguration(id) {
  const config = db.prepare(`
    SELECT c.*, cm.name as model_name, cm.code as model_code, cm.base_price
    FROM configurations c
    JOIN cycle_models cm ON cm.id = c.model_id
    WHERE c.id = ?
  `).get(id);

  if (!config) return null;

  const items = db.prepare(`
    SELECT ci.*, ms.label as slot_label, ms.category, p.name as part_name, p.sku
    FROM configuration_items ci
    JOIN model_slots ms ON ms.id = ci.slot_id
    JOIN parts p ON p.id = ci.part_id
    WHERE ci.configuration_id = ?
    ORDER BY ms.sort_order, ms.id
  `).all(id);

  const lineItems = items.map((item) => ({
    slotLabel: item.slot_label,
    category: item.category,
    partName: item.part_name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unit_price_snapshot,
    lineTotal: Math.round((item.unit_price_snapshot * item.quantity + Number.EPSILON) * 100) / 100,
  }));

  const partsTotal = Math.round((lineItems.reduce((sum, li) => sum + li.lineTotal, 0) + Number.EPSILON) * 100) / 100;
  const baseCost = config.base_price || 0;
  const grandTotal = Math.round((baseCost + partsTotal + Number.EPSILON) * 100) / 100;

  return {
    id: config.id,
    modelId: config.model_id,
    modelName: config.model_name,
    modelCode: config.model_code,
    customerName: config.customer_name,
    salespersonName: config.salesperson_name,
    status: config.status,
    createdAt: config.created_at,
    updatedAt: config.updated_at,
    baseCost,
    lineItems,
    partsTotal,
    grandTotal,
  };
}
