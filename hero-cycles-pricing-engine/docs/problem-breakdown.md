# Part 1 – Problem Breakdown

## Understanding the Problem

Hero Cycles sells bicycles that can be configured using different components such as frames, gear sets, tyres, brakes, seats, and handlebars. The challenge is that component prices change over time, and the sales team currently manages this information using Excel sheets.

This creates several problems:

* No centralized source of truth for current part prices
* Manual effort when calculating cycle prices
* Higher risk of pricing mistakes
* Difficulty tracking historical price changes
* No validation to ensure only valid part combinations are quoted

The goal of this project is to replace that manual process with a system that allows salespeople to configure bicycles, view accurate pricing instantly, and manage changing part prices in a structured way.

---

## Understanding the Users

From the problem statement, I identified two primary user workflows.

### 1. Building Quotations

A salesperson needs to quickly configure a bicycle and provide a customer with an accurate price breakdown.

The workflow should be simple, fast, and require minimal manual effort. Pricing should update immediately as configuration choices change.

### 2. Managing Parts and Pricing

Part prices change periodically due to supplier cost changes.

Someone within the organization needs a way to manage those updates while preserving historical pricing information.

Although these workflows are related, they have different priorities:

* Quote generation focuses on speed and usability
* Price management focuses on accuracy and traceability

Because of this, I chose to separate them into dedicated views within the application rather than combining everything into a single screen.

---

## Breaking the Problem into Components

### 1. Configuration Management

The first challenge is defining what a cycle configuration actually represents.

I modeled a configuration as:

* A cycle model (for example, Trail Blazer)
* A set of configuration slots (Frame, Gear Set, Tyres, Brakes, Seat, Handlebar)
* A collection of compatible parts for each slot
* One selected part per slot

This structure became the foundation for the rest of the application because pricing, validation, and user interactions all depend on it.

### 2. Pricing Engine

Once a valid configuration exists, the system must calculate its price.

The pricing engine is responsible for:

* Calculating the cost of selected parts
* Applying slot quantities where required
* Including any model-level base cost
* Producing a detailed price breakdown
* Returning a final total

I designed the pricing engine as a standalone component so that pricing logic remains independent of the database and user interface.

This makes it easier to test, maintain, and reuse.

### 3. Historical Pricing

The problem statement specifically highlights that part prices change over time.

For example, a tyre may cost ₹200 in January and ₹230 in December.

This introduces an important business requirement:

How should historical quotations behave when prices change?

My solution treats pricing history as an append-only record and stores a snapshot of prices whenever a quotation is saved. This ensures that previously generated quotations remain consistent even after future price updates.

### 4. Validation

Not every part should be compatible with every model.

For example, a part intended for one category of cycle may not be valid for another.

The system therefore validates all selected components against the model definition before calculating pricing.

Validation is enforced on the backend to ensure data integrity regardless of how the frontend behaves.

### 5. User Experience

The assignment explicitly mentions optimizing for efficiency.

I assumed the primary user would often be a salesperson discussing options with a customer in real time.

Because of that, I focused on:

* Immediate pricing feedback
* Minimal navigation
* Clear price breakdowns
* Fast configuration workflows
* Reduced manual input wherever possible

The application is designed to provide useful pricing information from the moment a model is selected, allowing users to reach a quotation quickly.

---

## Defining "Instant Pricing"

The problem statement emphasizes that pricing should be available instantly.

For this project, I interpreted that as providing pricing calculations in real time whenever a configuration changes.

To support this, pricing calculations are performed synchronously using lightweight business logic rather than relying on expensive processing or pre-generated results.

The pricing engine performs three core steps:

1. Validate selected components
2. Calculate component and model costs
3. Generate the final price breakdown

This approach keeps the pricing workflow simple, predictable, and responsive while remaining easy to test and maintain.

---

## Key Insight

While the assignment initially appears to be a pricing calculator, the real challenge is managing changing prices without losing historical accuracy.

The most important design decision was therefore not how totals are calculated, but how pricing history and saved quotations are handled when part costs change over time.

That decision influenced the database design, pricing engine, API design, and overall user workflow.
