// db.js
// Sets up a single SQLite connection (using Node's built-in node:sqlite
// module) and the schema. Requires Node 22.13+ (when the
// --experimental-sqlite flag became unnecessary); still prints an
// "experimental" warning on startup, which is expected.
// Using the built-in driver instead of better-sqlite3 deliberately --
// it avoids native module compilation, so `npm install` works with zero
// build toolchain on any machine with a recent enough Node. See README.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.HERO_CYCLES_TEST_DB || path.join(__dirname, '..', 'data', 'hero_cycles.db');

// node:sqlite does not create missing parent directories on its own, so
// make sure backend/data/ exists before opening the file (it's gitignored
// apart from a .gitkeep, so a fresh clone won't have the .db file yet, but
// should still have the directory -- this is just a defensive backstop).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');

export function initSchema() {
  db.exec(`
    -- A purchasable component, e.g. "MTB Frame - Steel", "Tyre - 26 inch"
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,         -- e.g. frame, gear_set, tyre, brake, seat, handlebar
      current_price REAL NOT NULL,    -- current price in INR, kept in sync with price_history
      unit TEXT NOT NULL DEFAULT 'each',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Every price change is logged here. current_price on parts is a
    -- denormalized cache of the latest row here, for fast reads.
    CREATE TABLE IF NOT EXISTS part_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      effective_from TEXT NOT NULL DEFAULT (datetime('now')),
      note TEXT
    );

    -- A sellable cycle model, e.g. "Sprint Pro 26T"
    CREATE TABLE IF NOT EXISTS cycle_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      base_price REAL NOT NULL DEFAULT 0, -- assembly/frame-license/base cost not tied to a swappable part
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Defines which categories a model needs filled in, and how many
    -- (e.g. a cycle needs exactly 1 frame, 1 gear_set, 2 tyres).
    CREATE TABLE IF NOT EXISTS model_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL REFERENCES cycle_models(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      label TEXT NOT NULL,            -- display label, e.g. "Front Tyre"
      quantity INTEGER NOT NULL DEFAULT 1,
      is_required INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- Which parts are valid options for a given slot. A part can be valid
    -- for multiple slots/models (e.g. a tyre used across models).
    CREATE TABLE IF NOT EXISTS slot_compatible_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL REFERENCES model_slots(id) ON DELETE CASCADE,
      part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      UNIQUE(slot_id, part_id)
    );

    -- A saved configuration a salesperson has built for a customer/quote.
    CREATE TABLE IF NOT EXISTS configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL REFERENCES cycle_models(id),
      customer_name TEXT,
      salesperson_name TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | finalized
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- The chosen part for each slot in a configuration, with the price
    -- AT THE TIME OF SELECTION captured (snapshot), so historical quotes
    -- don't silently change if a part's price later changes.
    CREATE TABLE IF NOT EXISTS configuration_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      configuration_id INTEGER NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
      slot_id INTEGER NOT NULL REFERENCES model_slots(id),
      part_id INTEGER NOT NULL REFERENCES parts(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_snapshot REAL NOT NULL,
      UNIQUE(configuration_id, slot_id)
    );

    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
    CREATE INDEX IF NOT EXISTS idx_price_history_part ON part_price_history(part_id, effective_from);
    CREATE INDEX IF NOT EXISTS idx_model_slots_model ON model_slots(model_id);
    CREATE INDEX IF NOT EXISTS idx_slot_compat_slot ON slot_compatible_parts(slot_id);
    CREATE INDEX IF NOT EXISTS idx_config_items_config ON configuration_items(configuration_id);
  `);
}
