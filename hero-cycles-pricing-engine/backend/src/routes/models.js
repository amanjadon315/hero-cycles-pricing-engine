// routes/models.js
import { Router } from 'express';
import { db } from '../db.js';

export const modelsRouter = Router();

// GET /api/models  - list all active models, lightweight
modelsRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM cycle_models WHERE is_active = 1 ORDER BY name').all();
  res.json(rows);
});

// GET /api/models/:id  - full model detail: slots + compatible parts for each slot
modelsRouter.get('/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM cycle_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });

  const slots = db.prepare(`
    SELECT * FROM model_slots WHERE model_id = ? ORDER BY sort_order, id
  `).all(req.params.id);

  const slotIds = slots.map((s) => s.id);
  const compatiblePartsBySlot = {};

  for (const slot of slots) {
    const compatible = db.prepare(`
      SELECT p.*
      FROM slot_compatible_parts scp
      JOIN parts p ON p.id = scp.part_id
      WHERE scp.slot_id = ? AND p.is_active = 1
      ORDER BY p.current_price ASC
    `).all(slot.id);
    compatiblePartsBySlot[slot.id] = compatible;
  }

  res.json({
    ...model,
    slots: slots.map((slot) => ({
      ...slot,
      compatibleParts: compatiblePartsBySlot[slot.id] || [],
    })),
  });
});
