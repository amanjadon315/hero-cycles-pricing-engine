// routes/parts.js
import { Router } from 'express';
import { db } from '../db.js';

export const partsRouter = Router();

// GET /api/parts?category=tyre
partsRouter.get('/', (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM parts WHERE category = ? AND is_active = 1 ORDER BY name').all(category);
  } else {
    rows = db.prepare('SELECT * FROM parts WHERE is_active = 1 ORDER BY category, name').all();
  }
  res.json(rows);
});

// GET /api/parts/:id
partsRouter.get('/:id', (req, res) => {
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  res.json(part);
});

// GET /api/parts/:id/history
partsRouter.get('/:id/history', (req, res) => {
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });

  const history = db.prepare(`
    SELECT id, price, effective_from, note
    FROM part_price_history
    WHERE part_id = ?
    ORDER BY effective_from ASC
  `).all(req.params.id);

  res.json({ part, history });
});

// POST /api/parts  { sku, name, category, price, unit }
partsRouter.post('/', (req, res) => {
  const { sku, name, category, price, unit } = req.body;

  if (!sku || !name || !category || price === undefined) {
    return res.status(400).json({ error: 'sku, name, category, and price are required' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO parts (sku, name, category, current_price, unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(sku, name, category, price, unit || 'each');

    db.prepare(`
      INSERT INTO part_price_history (part_id, price, note)
      VALUES (?, ?, 'Initial price on creation')
    `).run(result.lastInsertRowid, price);

    const created = db.prepare('SELECT * FROM parts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    res.status(500).json({ error: 'Failed to create part' });
  }
});

// PATCH /api/parts/:id/price  { price, note }
// This is the key endpoint for "part costs change every few months":
// it updates current_price AND appends to history, never overwrites blindly.
partsRouter.patch('/:id/price', (req, res) => {
  const { price, note } = req.body;
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);

  if (!part) return res.status(404).json({ error: 'Part not found' });
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }

  db.prepare(`UPDATE parts SET current_price = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(price, req.params.id);

  db.prepare(`
    INSERT INTO part_price_history (part_id, price, note)
    VALUES (?, ?, ?)
  `).run(req.params.id, price, note || null);

  const updated = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/parts/:id  (soft delete)
partsRouter.delete('/:id', (req, res) => {
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });

  db.prepare(`UPDATE parts SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});
