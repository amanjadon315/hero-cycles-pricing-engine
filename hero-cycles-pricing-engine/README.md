# Hero Cycles — Pricing Configurator

A pricing engine for Hero Cycles' sales team: pick a cycle model, choose a
part for each slot (frame, gear set, tyres, brakes, seat, handlebar), and
get an instant, itemized price breakdown. Part prices can be updated as
costs change, and every change is logged so historical quotes never
silently drift.

Built for the Tech Hiring Assignment (Full-Stack Engineer, Fresher).

---

## Stack

- **Backend:** Node.js + Express + SQLite (via Node's built-in `node:sqlite`
  module — no native compilation, no extra DB install required)
- **Frontend:** React (Vite)
- **Tests:** Node's built-in test runner (`node --test`), 20 tests covering
  the pricing engine and the live API

## Requirements

- **Node.js v22.13.0 or later** (this is the version that shipped `node:sqlite`
  without requiring the `--experimental-sqlite` flag). Check with:
  ```
  node --version
  ```
  If you're on an older Node, install the latest LTS from
  [nodejs.org](https://nodejs.org) or via `nvm install 22`.
- npm (ships with Node)

No Docker, no Postgres, no global installs needed.

---

## Quickstart (2 terminals)

### 1. Backend

```bash
cd backend
npm install
npm run seed     # creates backend/data/hero_cycles.db with sample parts & models
npm start         # starts API on http://localhost:4000
```

You should see:
```
Hero Cycles pricing engine API running on http://localhost:4000
```

Verify it's working:
```bash
curl http://localhost:4000/api/health
# {"status":"ok","timestamp":"..."}
```

### 2. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
cp .env.example .env   # default already points at http://localhost:4000/api
npm run dev
```

Open the URL it prints (typically **http://localhost:5173**).

That's it — you should see the configurator with three sample cycle models
(Sprint City, Trail Blazer, Lite Rider) ready to price.

---

## Running tests

```bash
cd backend
npm test
```

Runs 20 tests: pure unit tests for the pricing/validation logic, plus
integration tests that spin up the real Express app against a throwaway
SQLite file and exercise the actual HTTP routes — including a test that
proves a saved quote's price stays locked even after a part's price
changes later (see `backend/tests/`).

---

## Project structure

```
hero-cycles-pricing-engine/
├── backend/
│   ├── src/
│   │   ├── server.js           # entry point — starts the HTTP server
│   │   ├── app.js              # Express app wiring (used by server.js and tests)
│   │   ├── db.js                # SQLite connection + schema
│   │   ├── seed.js              # sample data loader
│   │   ├── pricingEngine.js     # pure pricing/validation functions (unit tested)
│   │   └── routes/
│   │       ├── parts.js         # parts CRUD + price history
│   │       ├── models.js        # cycle models + their slots/compatible parts
│   │       └── configurations.js # price computation + saved quotes
│   ├── tests/
│   │   ├── pricingEngine.test.js
│   │   └── api.integration.test.js
│   └── data/                    # SQLite file lives here (gitignored)
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js               # API client
│       └── components/
│           ├── ModelPicker.jsx
│           ├── SlotList.jsx
│           ├── PriceTag.jsx      # the live price breakdown panel
│           ├── PartsManager.jsx  # update part prices, view price history
│           └── SavedQuotes.jsx
└── docs/
    ├── problem-breakdown.md
    ├── assumptions-and-questions.md
    ├── pseudocode.md
    ├── prompts-log.md
    └── wireframes.md
```

---

## What the app does

1. **Build a Quote** — pick a cycle model, choose a part for each slot.
   The price breakdown updates live on the right as a "price tag" — base
   cost, each part's line total, parts subtotal, grand total. Save it
   with an optional customer/salesperson name.
2. **Manage Parts & Prices** — see every part grouped by category with its
   current price. Update a price (e.g. when a supplier raises tyre cost)
   and the change is logged with a timestamp and optional note — it never
   overwrites history.
3. **Saved Quotes** — every saved quote is permanently locked to the part
   prices that were current *at the moment it was saved*, even if those
   parts get repriced afterward. This was the core ambiguity in the brief
   ("part costs change every few months") and is the main design decision
   documented in `docs/assumptions-and-questions.md`.

## Notes on `node:sqlite`

This project deliberately avoids `better-sqlite3` / `sqlite3` npm packages.
Both require native compilation (`node-gyp`) on install, which is the #1
cause of "works on my machine" submission failures in take-home
assignments — it depends on having Python, a C++ toolchain, and matching
headers available. Node 22.13+'s built-in `node:sqlite` needs none of that:
`npm install` only pulls `express` and `cors`. You'll see one experimental
warning printed on startup — that's expected and harmless for this scope.
