---
phase: 02-high-priority-new-tools
plan: 04
subsystem: invoices
tags: [invoice, purchase-orders, tools, e2e-tests]
dependency_graph:
  requires: []
  provides: [INV-01, INV-02, INV-03]
  affects: [src/tools/invoices.ts, tests/e2e/setup.ts, tests/e2e/invoices.test.ts]
tech_stack:
  added: []
  patterns: [URLSearchParams comma-join for selected_ids, URLSearchParams array params for purchase_order_ids[]]
key_files:
  created: []
  modified:
    - src/tools/invoices.ts
    - tests/e2e/setup.ts
    - tests/e2e/invoices.test.ts
decisions:
  - selected_ids serialized as comma-separated string (Rails does params[:selected_ids]&.split(","))
  - purchase_order_ids serialized as array params (purchase_order_ids[]=N) per Rails array param convention
  - mock route regex for purchase_order_item_list uses optional query string pattern to match URLs with params
metrics:
  duration: "3 minutes"
  completed: "2026-03-26T06:35:25Z"
  tasks_completed: 1
  files_modified: 3
---

# Phase 02 Plan 04: Invoice Purchase Order Linking Tools Summary

Two new invoice tools added for PO discovery during invoice creation, plus E2E test coverage for existing INV-03 (rerun approval flow).

## What Was Built

- **list_invoice_purchase_orders (INV-01):** GET `/invoices/purchase_order_list` — returns paginated POs available to link; `selected_ids` serialized as comma-separated string per Rails controller expectation (`params[:selected_ids]&.split(',')`)
- **list_invoice_purchase_order_items (INV-02):** GET `/invoices/purchase_order_item_list` — returns line items for given PO IDs; `purchase_order_ids` serialized as array params (`purchase_order_ids[]=1&purchase_order_ids[]=2`) per Rails array param convention
- **INV-03 verified:** `rerun_invoice_approval_flow` already existed; mock route + test added to verify behavior

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `selected_ids` as comma join | Rails controller does `params[:selected_ids]&.split(',')` — not standard array params |
| `purchase_order_ids` as array params | Rails uses `params[:purchase_order_ids]` which expects `purchase_order_ids[]=N` format |
| Regex with optional `(\?.*)?$` for item list mock | Mock server regex `.test(fullUrl)` includes query string; `$` anchor would fail on parameterized requests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mock route regex for purchase_order_item_list needed optional query string**
- **Found during:** Task 1 verification (test run)
- **Issue:** `vPathSuffix("invoices", "purchase_order_item_list")` generates `^/api/v[13]/invoices/purchase_order_item_list$` which fails `.test()` when URL includes `?purchase_order_ids[]=1`
- **Fix:** Changed to explicit regex `/^\/api\/v[13]\/invoices\/purchase_order_item_list(\?.*)?$/` that allows optional query string
- **Files modified:** tests/e2e/setup.ts
- **Commit:** dcf9089

## Known Stubs

None — all tools wire to real API endpoints, all tests validate actual response shapes.

## Self-Check: PASSED
