// seed.js
// Wipes and repopulates the database with realistic sample data so the
// app is immediately usable after `npm run seed`.

import { db, initSchema } from './db.js';

initSchema();

console.log('Clearing existing data...');
db.exec(`
  DELETE FROM configuration_items;
  DELETE FROM configurations;
  DELETE FROM slot_compatible_parts;
  DELETE FROM model_slots;
  DELETE FROM cycle_models;
  DELETE FROM part_price_history;
  DELETE FROM parts;
  DELETE FROM sqlite_sequence;
`);

function insertPart({ sku, name, category, price, unit = 'each', skipInitialHistory = false }) {
  const insert = db.prepare(`
    INSERT INTO parts (sku, name, category, current_price, unit)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(sku, name, category, price, unit);
  const partId = result.lastInsertRowid;

  if (!skipInitialHistory) {
    db.prepare(`
      INSERT INTO part_price_history (part_id, price, effective_from, note)
      VALUES (?, ?, datetime('now'), 'Initial seed price')
    `).run(partId, price);
  }

  return partId;
}

console.log('Seeding parts...');

const parts = {
  // Frames
  frameSteel: insertPart({ sku: 'FRM-STL-01', name: 'Steel Frame - Standard', category: 'frame', price: 1800 }),
  frameAlloy: insertPart({ sku: 'FRM-ALY-01', name: 'Alloy Frame - Lightweight', category: 'frame', price: 3200 }),
  frameMTB: insertPart({ sku: 'FRM-MTB-01', name: 'MTB Frame - Reinforced', category: 'frame', price: 4100 }),

  // Gear sets
  gearSingle: insertPart({ sku: 'GER-SGL-01', name: 'Single Speed', category: 'gear_set', price: 400 }),
  gear7: insertPart({ sku: 'GER-7SP-01', name: '7-Speed Shimano', category: 'gear_set', price: 1450 }),
  gear21: insertPart({ sku: 'GER-21SP-01', name: '21-Speed Shimano', category: 'gear_set', price: 2600 }),

  // Tyres (priced per tyre; most configs need 2)
  tyreStandard: insertPart({ sku: 'TYR-STD-26', name: 'Standard Tyre 26"', category: 'tyre', price: 230, skipInitialHistory: true }),
  tyrePuncture: insertPart({ sku: 'TYR-PRF-26', name: 'Puncture-Resistant Tyre 26"', category: 'tyre', price: 380 }),
  tyreOffroad: insertPart({ sku: 'TYR-OFR-27', name: 'Off-Road Knobby Tyre 27.5"', category: 'tyre', price: 520 }),

  // Brakes
  brakeRim: insertPart({ sku: 'BRK-RIM-01', name: 'Rim Brake Set', category: 'brake', price: 350 }),
  brakeDisc: insertPart({ sku: 'BRK-DSC-01', name: 'Mechanical Disc Brake Set', category: 'brake', price: 900 }),

  // Seats
  seatStandard: insertPart({ sku: 'SEA-STD-01', name: 'Standard Cushion Seat', category: 'seat', price: 250 }),
  seatGel: insertPart({ sku: 'SEA-GEL-01', name: 'Gel Comfort Seat', category: 'seat', price: 600 }),

  // Handlebar
  handlebarFlat: insertPart({ sku: 'HBR-FLT-01', name: 'Flat Handlebar', category: 'handlebar', price: 300 }),
  handlebarRiser: insertPart({ sku: 'HBR-RIS-01', name: 'Riser Handlebar', category: 'handlebar', price: 450 }),
};

// Simulate a historical price change for tyres (Jan -> Dec), matching the
// brief's example ("a tyre priced at ₹200 in January may be ₹230 by December").
db.prepare(`
  INSERT INTO part_price_history (part_id, price, effective_from, note)
  VALUES (?, ?, ?, ?)
`).run(parts.tyreStandard, 200, '2025-01-15 00:00:00', 'Price as of January 2025');
db.prepare(`
  INSERT INTO part_price_history (part_id, price, effective_from, note)
  VALUES (?, ?, ?, ?)
`).run(parts.tyreStandard, 230, '2025-12-01 00:00:00', 'Raw material cost increase - December 2025');

console.log('Seeding cycle models...');

function insertModel({ name, code, description, basePrice }) {
  const result = db.prepare(`
    INSERT INTO cycle_models (name, code, description, base_price)
    VALUES (?, ?, ?, ?)
  `).run(name, code, description, basePrice);
  return result.lastInsertRowid;
}

function insertSlot(modelId, { category, label, quantity = 1, isRequired = 1, sortOrder = 0 }) {
  const result = db.prepare(`
    INSERT INTO model_slots (model_id, category, label, quantity, is_required, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(modelId, category, label, quantity, isRequired, sortOrder);
  return result.lastInsertRowid;
}

function linkCompatibleParts(slotId, partIds) {
  const insert = db.prepare(`
    INSERT INTO slot_compatible_parts (slot_id, part_id) VALUES (?, ?)
  `);
  for (const partId of partIds) insert.run(slotId, partId);
}

// --- Sprint City (basic commuter cycle) ---
const sprintCity = insertModel({
  name: 'Sprint City',
  code: 'SPRINT-CITY',
  description: 'Everyday commuter cycle, built for city roads.',
  basePrice: 600, // assembly + frame finishing base cost
});

linkCompatibleParts(
  insertSlot(sprintCity, { category: 'frame', label: 'Frame', sortOrder: 1 }),
  [parts.frameSteel, parts.frameAlloy]
);
linkCompatibleParts(
  insertSlot(sprintCity, { category: 'gear_set', label: 'Gear Set', sortOrder: 2 }),
  [parts.gearSingle, parts.gear7]
);
linkCompatibleParts(
  insertSlot(sprintCity, { category: 'tyre', label: 'Tyres', quantity: 2, sortOrder: 3 }),
  [parts.tyreStandard, parts.tyrePuncture]
);
linkCompatibleParts(
  insertSlot(sprintCity, { category: 'brake', label: 'Brakes', sortOrder: 4 }),
  [parts.brakeRim, parts.brakeDisc]
);
linkCompatibleParts(
  insertSlot(sprintCity, { category: 'seat', label: 'Seat', sortOrder: 5 }),
  [parts.seatStandard, parts.seatGel]
);
linkCompatibleParts(
  insertSlot(sprintCity, { category: 'handlebar', label: 'Handlebar', sortOrder: 6 }),
  [parts.handlebarFlat]
);

// --- Trail Blazer (MTB) ---
const trailBlazer = insertModel({
  name: 'Trail Blazer',
  code: 'TRAIL-BLAZER',
  description: 'Off-road mountain cycle for rough terrain.',
  basePrice: 900,
});

linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'frame', label: 'Frame', sortOrder: 1 }),
  [parts.frameMTB, parts.frameAlloy]
);
linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'gear_set', label: 'Gear Set', sortOrder: 2 }),
  [parts.gear21, parts.gear7]
);
linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'tyre', label: 'Tyres', quantity: 2, sortOrder: 3 }),
  [parts.tyreOffroad, parts.tyrePuncture]
);
linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'brake', label: 'Brakes', sortOrder: 4 }),
  [parts.brakeDisc]
);
linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'seat', label: 'Seat', sortOrder: 5 }),
  [parts.seatGel, parts.seatStandard]
);
linkCompatibleParts(
  insertSlot(trailBlazer, { category: 'handlebar', label: 'Handlebar', sortOrder: 6 }),
  [parts.handlebarRiser]
);

// --- Lite Rider (budget single speed) ---
const liteRider = insertModel({
  name: 'Lite Rider',
  code: 'LITE-RIDER',
  description: 'Budget-friendly single-speed cycle.',
  basePrice: 400,
});

linkCompatibleParts(
  insertSlot(liteRider, { category: 'frame', label: 'Frame', sortOrder: 1 }),
  [parts.frameSteel]
);
linkCompatibleParts(
  insertSlot(liteRider, { category: 'gear_set', label: 'Gear Set', sortOrder: 2 }),
  [parts.gearSingle]
);
linkCompatibleParts(
  insertSlot(liteRider, { category: 'tyre', label: 'Tyres', quantity: 2, sortOrder: 3 }),
  [parts.tyreStandard]
);
linkCompatibleParts(
  insertSlot(liteRider, { category: 'brake', label: 'Brakes', sortOrder: 4 }),
  [parts.brakeRim]
);
linkCompatibleParts(
  insertSlot(liteRider, { category: 'seat', label: 'Seat', sortOrder: 5 }),
  [parts.seatStandard]
);
linkCompatibleParts(
  insertSlot(liteRider, { category: 'handlebar', label: 'Handlebar', sortOrder: 6 }),
  [parts.handlebarFlat]
);

console.log('Seed complete.');
console.log(`Models: Sprint City (#${sprintCity}), Trail Blazer (#${trailBlazer}), Lite Rider (#${liteRider})`);
