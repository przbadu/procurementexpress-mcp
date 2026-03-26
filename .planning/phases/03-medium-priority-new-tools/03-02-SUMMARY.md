---
phase: 03-medium-priority-new-tools
plan: "02"
subsystem: products, approval-flows
tags: [new-tools, bulk-operations, e2e-tests, approval-flows]
dependency_graph:
  requires: [03-01]
  provides: [bulk_create_products, list_product_skus, approval-flow-LOW10-coverage]
  affects: [src/tools/products.ts, tests/e2e/setup.ts, tests/e2e/products.test.ts, tests/e2e/approval-flows.test.ts]
tech_stack:
  added: []
  patterns: [TDD-apiClient-direct, mock-route-ordering-before-generic]
key_files:
  created:
    - tests/e2e/products.test.ts
    - tests/e2e/approval-flows.test.ts
  modified:
    - src/tools/products.ts
    - tests/e2e/setup.ts
decisions:
  - Mock routes for /products/skus and /products/bulk_create registered BEFORE generic vPath("products") to prevent route interception
  - registerUploadTools already present in index.ts from Plan 01 — no changes required
  - approval-flows test uses apiClient directly (same pattern as uploads.test.ts) for precise HTTP verification
metrics:
  duration: "~16 minutes"
  completed: "2026-03-26T07:17:13Z"
  tasks_completed: 2
  files_changed: 4
requirements_fulfilled: [PROD-01, PROD-02, LOW-10]
---

# Phase 3 Plan 02: Product Bulk Operations + Approval Flow Tests Summary

**One-liner:** Bulk product catalog operations (POST /products/bulk_create, GET /products/skus) and E2E coverage for 3 LOW-10 approval flow tools (unpublish, version_details, rerun) with 145 total tests passing.

## Tasks Completed

| # | Task | Commit | Files Changed |
|---|------|--------|---------------|
| 1 | Add bulk_create_products and list_product_skus tools with E2E tests | ec98129 | src/tools/products.ts, tests/e2e/setup.ts, tests/e2e/products.test.ts |
| 2 | Wire uploads into index.ts, add approval-flows E2E tests for LOW-10 | 37abcde | tests/e2e/setup.ts, tests/e2e/approval-flows.test.ts |

## What Was Built

### Task 1: Product Bulk Operations

Added 2 new tools to `src/tools/products.ts`:

**`bulk_create_products`** (PROD-01)
- Sends `POST /products/bulk_create` with body `{ supplier_id, product: { product_item_attributes: [...] } }`
- Accepts `supplier_id` (required) and `products` array with min(1) validation
- Each product item has `description` (required), `sku`, `unit_price` (optional)

**`list_product_skus`** (PROD-02)
- Sends `GET /products/skus` with optional `query`, `supplier_id`, `archived` query params
- Returns `string[]` of non-blank SKU values

Mock routes added to `tests/e2e/setup.ts` BEFORE the generic `vPath("products")` route:
- `GET /api/v[13]/products/skus` — returns `["WDG-001", "WDG-002", "GAD-001"]`
- `POST /api/v[13]/products/bulk_create` — validates `supplier_id` + `product_item_attributes`, returns `true`

### Task 2: Approval Flow LOW-10 Coverage + Upload Wiring

**`registerUploadTools`** — already present in `src/index.ts` from Plan 01. No changes needed.

Mock routes added to `tests/e2e/setup.ts`:
- `PATCH /api/v[13]/approval_flows/:id/unpublish` — returns `{ id, name, published: false }`
- `GET /api/v[13]/approval_flows/:id/version_details?version_id=N` — returns version details object
- `POST /api/v[13]/approval_flows/rerun_approval_flows` — returns `{ message, order_ids, invoice_ids }`

E2E tests in `tests/e2e/approval-flows.test.ts` cover:
- `unpublish_approval_flow` — verifies PATCH to correct path, `published: false` response
- `get_approval_flow_version_details` — verifies GET with `version_id` query param
- `rerun_approval_flows` — verifies POST with `order_ids` and `invoice_ids` separately

## Deviations from Plan

None — plan executed exactly as written.

Note: `src/index.ts` already had `registerUploadTools` import and call from Plan 01 commits. The plan documented this as Task 2 action but the work was already done. Verified and confirmed correct — no changes needed.

## Verification Results

```
npm run build    → tsc exits 0 (all TypeScript compiles)
npm test         → 145 tests, 28 test files, all pass
```

Tool count in products.ts: 6 (4 existing + 2 new), confirmed via grep.

## Known Stubs

None — all tools wire directly to API endpoints with no placeholder data.

## Self-Check: PASSED

- [x] src/tools/products.ts contains `bulk_create_products` and `list_product_skus`
- [x] tests/e2e/products.test.ts exists with 4 tests
- [x] tests/e2e/approval-flows.test.ts exists with 4 tests
- [x] tests/e2e/setup.ts contains mock routes for /products/skus, /products/bulk_create, /approval_flows unpublish/version_details/rerun
- [x] src/index.ts contains `registerUploadTools`
- [x] Commits ec98129 and 37abcde exist
- [x] Full suite: 145 tests pass
