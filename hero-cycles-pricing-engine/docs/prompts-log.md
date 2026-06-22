# Prompts Log

The brief allows and expects AI tool usage ("You may use AI tools... ChatGPT,
Claude, Copilot, etc."), and asks for the prompts used across brainstorming,
document writing, and coding. This assignment was built in collaboration
with **Claude** (Anthropic), used as a pair-programmer/drafting partner
across the full lifecycle: solutioning, code, tests, docs, and UI design.

This log is an honest summary of the prompting flow, not a verbatim
transcript (the actual conversation included substantial back-and-forth,
clarifying questions, and iteration on each piece).

---

## 1. Initial framing

> "help me finish this task. its a hiring assesment for the job of full
> stack engineer and i have to submit github repo link by today."

This was the seed prompt, attached to the assignment PDF. It led to a few
clarifying questions before any code was written:

- What tech stack? → **Node.js + React** (my choice)
- How should data be stored? → **SQLite** (my choice)
- Did I already have a GitHub repo? → **No, generate everything to push myself**

These answers shaped every decision after — they're why the stack is
Node/Express/React/SQLite rather than, say, Python/Django, and why the
final deliverable is structured as files ready to `git init` and push
rather than a live-hosted demo.

## 2. Brainstorming the data model and architecture

Before any code, I asked Claude to think through the domain model out loud:
what a "cycle configuration" actually consists of, how to represent
"different frames, different gear sets, different tyre types" as a
relational schema, and — critically — how to handle the brief's specific
example of a part's price changing over the year without breaking quotes
that already used the old price. This produced the **slots + compatible
parts + price history + price snapshot** model that everything else is
built on (see `docs/problem-breakdown.md` and `docs/pseudocode.md` for the
result).

## 3. Backend implementation

Built iteratively, in this order, with Claude writing each piece and then
running it to verify before moving on:

1. SQLite schema (`db.js`) — including the deliberate choice of an
   append-only `part_price_history` table rather than overwriting price
   fields in place.
2. Pure pricing-logic module (`pricingEngine.js`) — built standalone, with
   no DB or HTTP dependency, specifically so it could be unit tested in
   isolation.
3. Seed data (`seed.js`) — realistic Hero Cycles-style parts/models,
   including a deliberately reconstructed January→December tyre price
   history matching the brief's own example.
4. Express routes (`parts.js`, `models.js`, `configurations.js`) — thin
   layers that fetch rows and hand them to the pure pricing functions.
5. Unit tests (`pricingEngine.test.js`) and integration tests
   (`api.integration.test.js`) — the integration suite specifically
   includes a test that saves a quote, changes a part's price afterward,
   and asserts the saved quote's total didn't move while a new live quote
   reflects the change. This was written to directly prove the central
   design decision in `docs/assumptions-and-questions.md`.

A real engineering snag and how it was resolved: the first dependency
choice was `better-sqlite3`, but `npm install` failed in the sandboxed
build environment because it needed to compile a native module and
couldn't reach `nodejs.org` for headers. Rather than work around the
network restriction, Claude switched to Node's built-in `node:sqlite`
module — a better choice anyway, since it removes the single most common
cause of "doesn't run on the reviewer's machine" in take-home assignments
(native compilation failures). This is documented directly in the README's
"Notes on `node:sqlite`" section.

## 4. Frontend implementation

Before writing any UI code, Claude read Anthropic's internal
`frontend-design` skill/guidance to deliberately avoid generic
AI-dashboard defaults (cream background + serif display, or near-black +
neon accent, etc.) and instead ground the design in the actual subject
matter. The resulting design brief — used as the literal prompt for the
component styling — was:

> Treat this as a workshop spec tag / parts ledger rather than a SaaS
> dashboard, since that's the real-world artifact a salesperson produces:
> an itemized price tied to one specific bike. Off-white paper background,
> near-black ink, one confident accent color (brick red) for totals and
> brand. Tabular monospace for every price and SKU so columns of numbers
> align like a receipt. One signature element: the live price breakdown
> rendered as a printed parts tag with a perforated top edge and dashed
> section rules.

Components were then built screen-by-screen (`ModelPicker`, `SlotList`,
`PriceTag`, `PartsManager`, `SavedQuotes`), each wired to the backend via a
small `api.js` fetch client.

## 5. Quality pass

After the first working version, Claude ran:

- `npm run build` (Vite production build) to catch any syntax/import errors.
- `npx eslint src/` on the frontend, which caught a real bug (a `<>`
  shorthand fragment used inside a `.map()` without a key, which silently
  breaks React's reconciliation) and a few lint-flagged effect patterns
  that were restructured to avoid synchronous `setState` calls inside
  `useEffect` bodies.
- A full curl-based walkthrough of every API endpoint, including
  deliberately re-pricing a part mid-session to confirm saved quotes stay
  locked while live quotes update — the exact scenario described in
  `docs/pseudocode.md`, Algorithm 3.
- A seed-data bug was caught and fixed this way too: the original seed
  script logged a redundant "initial price" history entry for the tyre
  *in addition to* its manually-dated Jan/Dec 2025 entries, which would
  have shown a confusing duplicate row in the price history UI. Fixed by
  adding a `skipInitialHistory` flag to the seed helper.

## 6. Documentation

Each of the required documents (`problem-breakdown.md`,
`assumptions-and-questions.md`, `pseudocode.md`, `wireframes.md`, this
file) was drafted by Claude based on the actual decisions made during the
build above — not written speculatively in advance — so they reflect what
was really built and why, including the real native-module dependency
problem and how it was actually fixed.

## Tools used

- **Claude** (Sonnet, via Claude.ai) — architecture, code, tests, docs, UI
  design, debugging, all of the above.
- No other AI tools (ChatGPT, Copilot) were used for this submission.
