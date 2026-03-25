---
phase: 01-schema-type-foundation
plan: 03
subsystem: api
tags: [typescript, zod, schemas, purchase-orders, invoices, rails, refactor]

# Dependency graph
requires:
  - 01-01 (src/schemas.ts with shared customFieldValueSchema, lineItemSchema, invoiceLineItemSchema)
  - 01-02 (PurchaseOrderSummary and InvoiceSummary types in src/types.ts)
provides:
  - purchase-orders.ts using shared schemas from src/schemas.ts (no inline duplication)
  - invoices.ts using shared schemas from src/schemas.ts (no inline duplication)
  - list_purchase_orders typed as PurchaseOrderSummary[] not PurchaseOrder[]
  - list_invoices typed as InvoiceSummary[] not Invoice[]
  - validation_date param exposed on create_invoice and update_invoice
affects:
  - All MCP clients using list_purchase_orders (accurate Summary type)
  - All MCP clients using list_invoices (accurate Summary type)
  - create_invoice and update_invoice callers (new optional validation_date param)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import shared schemas from ../schemas.js — never define customFieldValueSchema inline in tool files"
    - "List endpoints use *Summary types — PurchaseOrderSummary[], InvoiceSummary[]"
    - "Optional params are widening-only — backwards-compat safe"

# Key files
key-files:
  created: []
  modified:
    - src/tools/purchase-orders.ts
    - src/tools/invoices.ts

# Decisions
decisions:
  - "Removed inline customFieldValueSchema, lineItemSchema, invoiceLineItemSchema from tool files — src/schemas.ts is the single source of truth"
  - "list_purchase_orders now returns PurchaseOrderSummary[] matching Rails PurchaseOrderSerializer list endpoint"
  - "list_invoices now returns InvoiceSummary[] matching Rails InvoiceSerializer list endpoint"
  - "validation_date added as optional param — Rails invoice_params permits it but it was previously missing"

# Metrics
metrics:
  duration: "~8 minutes"
  completed: "2026-03-25T13:38:01Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 01 Plan 03: PO and Invoice Schema Wiring Summary

Wire shared schemas from src/schemas.ts into purchase-orders.ts and invoices.ts, eliminating inline duplication, and fix list tool return types to use the correct Summary types from src/types.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Align purchase-orders.ts with Rails po_params and wire shared schemas | 9bbea83 | src/tools/purchase-orders.ts |
| 2 | Align invoices.ts with Rails invoice_params and wire shared schemas | a2a0f4b | src/tools/invoices.ts |

## What Was Built

**Task 1 — purchase-orders.ts schema wiring:**
- Removed inline `customFieldValueSchema` (5 lines) and `lineItemSchema` (20 lines) definitions
- Added import: `import { customFieldValueSchema, lineItemSchema } from "../schemas.js"`
- Added `PurchaseOrderSummary` to the types import line
- Changed `list_purchase_orders` handler type annotation from `PurchaseOrder[]` to `PurchaseOrderSummary[]`
- The shared `lineItemSchema` in src/schemas.ts already includes `net_amount` (added in Plan 01 as SCHEMA-01 fix)

**Task 2 — invoices.ts schema wiring:**
- Removed inline `customFieldValueSchema` (5 lines) and `invoiceLineItemSchema` (20 lines) definitions
- Added import: `import { customFieldValueSchema, invoiceLineItemSchema } from "../schemas.js"`
- Added `InvoiceSummary` to the types import line
- Changed `list_invoices` handler type annotation from `Invoice[]` to `InvoiceSummary[]`
- Added `validation_date: z.string().optional()` to both `create_invoice` and `update_invoice` inputSchemas (Rails permits this param but it was missing from MCP schemas)

## Verification

- `npm run build` — zero TypeScript errors
- `npm test` — 200/200 tests passing (44 test files)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder or stub values introduced.

## Self-Check: PASSED

- [x] src/tools/purchase-orders.ts contains `import { customFieldValueSchema, lineItemSchema } from "../schemas.js"`
- [x] src/tools/purchase-orders.ts contains `PurchaseOrderSummary` in list tool type annotation
- [x] src/tools/purchase-orders.ts does NOT contain `const customFieldValueSchema = z.object`
- [x] src/tools/purchase-orders.ts does NOT contain `const lineItemSchema = z.object`
- [x] src/tools/invoices.ts contains `import { customFieldValueSchema, invoiceLineItemSchema } from "../schemas.js"`
- [x] src/tools/invoices.ts contains `InvoiceSummary` in list tool type annotation
- [x] src/tools/invoices.ts does NOT contain `const customFieldValueSchema = z.object`
- [x] src/tools/invoices.ts does NOT contain `const invoiceLineItemSchema = z.object`
- [x] src/tools/invoices.ts contains `validation_date: z.string().optional()` in create_invoice
- [x] src/tools/invoices.ts contains `validation_date: z.string().optional()` in update_invoice
- [x] Commits 9bbea83 and a2a0f4b exist in git log
