---
description: Mandatory rules for working on GOLA Engineered Standards audit items
---

# GOLA Engineered Standards — Mandate

> **This file is the authoritative reference for all GOLA Engineered Standards work.**
> You MUST read and follow these rules before creating, modifying, or debugging any GOLA audit scenario.

---

## Rule 1: Golden Dataset Primacy

All GOLA test data **MUST** originate from the canonical order list:

```
src/data/GOLA-Audit-Order-List.json
```

- This file was extracted from `User Doc/GOLA Audit Scenario.xlsx` and contains the definitive 25-order universe.
- **Never mock up, fabricate, or generate synthetic orders.** Every order, SKU, location, and unit count must come directly from this file.
- **Never modify this file.** If the dataset needs to change, it must be re-extracted from an updated Excel sheet with explicit user approval.

---

## Rule 2: Job Type Definitions

Before building or modifying any GOLA scenario, consult the full definitions in:

```
.gemini/antigravity/brain/<conversation-id>/gola_job_type_definitions.md
```

Below is the summary of each job type and its order eligibility rules:

### OBPP — Order-Based Pick & Pack
- **All 25 orders** eligible.
- 1 Pick Job = 1 Order. Job Code = Order Code.
- Packing is part of the same job, per order.

### PUTW — Put-Wall (Batch Pick → Sort → Pack)
- **All 25 orders** eligible.
- Phase 1: 1 Batch Picking Job (all 40 pick lines).
- Phase 2: 1 Sorting Job (55 units sorted into 25 cubbies).
- Phase 3: 25 individual Pack Jobs (1 per order).

### MICP — Multi-Item Carton Profiling
- **All 25 orders** eligible.
- Cart-based picking, max **12 orders (totes) per cart**.
- 1 Pick Job = 1 Cart. Orders may have multiple SKUs/units.
- Packing: 1 Pack Job per order.

### SICP — Single-Item Carton Profiling
- **Only single-SKU + single-unit orders** eligible.
- Cart-based picking, max **12 totes per cart**, 1 SKU per tote.
- All orders sharing the same SKU go into the same tote.
- Packing: 1 Pack Job per order.

### SIBP — Single-Item Batch Pick
- **Only single-SKU + single-unit orders** eligible.
- 1 giant batch Pick Job for ALL eligible orders (no cart/tote concept).
- Packing: 1 Pack Job per order.

### IIBP — Item-In-Box Profiling
- **Only single-SKU + single-unit orders** eligible.
- 1 Pick Job per unique SKU (all orders for that SKU batched together).
- 1 Pack Job per unique SKU (all orders for that SKU packed together).

### IOBP — Identical Order Batch Profiling
- **All 25 orders** eligible.
- Orders with the **exact same SKU + Unit combination** are grouped into 1 Pick Job.
- **Location is NOT part of the grouping definition.**
- Packing: 1 Pack Job per order.

---

## Rule 3: Order Eligibility Filter

When a job type is restricted to "single-SKU + single-unit" orders, the filter is:

```
order.lines.length === 1 && order.totalUnits === 1
```

From the current golden dataset, **only Order11–Order20** (10 orders) pass this filter. All share SKU-11 at Loc-11.

---

## Rule 4: Mathematical Expectations

Every GOLA scenario's `expectedResults.totalStandardSeconds` must be calculated using the engineered standards from:

```
src/data/global-engineered-standards.json
```

Use the matching `picking_<type>` and `packing_<type>` cards. Never hardcode expected values without deriving them from the standard variables and activities.

---

## Rule 5: Scenario JSON Structure

All scenarios live in `src/data/gola-audit-scenarios.json`. Each must contain:

| Field | Description |
|---|---|
| `id` | Unique ID (e.g., `OBPP-01`) |
| `name` | Human-readable name |
| `description` | What the scenario validates |
| `category` | Must be `ENGINEERED_STANDARDS` |
| `expectedResults.totalStandardSeconds` | Mathematically derived expected value |
| `testData` | Array of task rows sourced from the golden dataset |

---

## Rule 6: Inject Payload Support

Every GOLA scenario with `category: ENGINEERED_STANDARDS` must support the "Inject Payload" button. This requires:

1. The scenario `id` is listed in the `includes()` array inside `AuditScenarioGrid.tsx`.
2. The scenario `id` is listed in the `includes()` array inside `handleGenerateAndInject()` in `GOLAAuditRunner.tsx`.
3. The `testData` array contains properly formatted rows that the CSV converter can process.

---

## Quick Reference: Summary Matrix

| Job Type | Eligible Orders | Pick Jobs | Sort Jobs | Pack Jobs | Lines | Units |
|---|---|---|---|---|---|---|
| **OBPP** | 25 | 25 | 0 | 25 | 40 | 55 |
| **PUTW** | 25 | 1 | 1 | 25 | 40 | 55 |
| **MICP** | 25 | 3 | 0 | 25 | 40 | 55 |
| **SICP** | 10 | 1 | 0 | 10 | 10 | 10 |
| **SIBP** | 10 | 1 | 0 | 10 | 10 | 10 |
| **IIBP** | 10 | 1 | 0 | 1 | 10 | 10 |
| **IOBP** | 25 | 10 | 0 | 25 | 40 | 55 |
