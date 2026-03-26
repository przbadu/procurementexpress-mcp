---
phase: 02-high-priority-new-tools
plan: "03"
subsystem: api
tags: [purchase-orders, mcp-tools, bulk-save, approvers, typescript]

# Dependency graph
requires:
  - phase: 01-schema-type-foundation
    provides: "Shared Zod schemas (customFieldValueSchema, lineItemSchema) and base PurchaseOrder types"
provides:
  - "bulk_save_purchase_orders tool — POST /purchase_orders/bulk_save"
  - "get_po_auto_approvers tool — GET /purchase_orders/auto_approvers_list"
  - "get_po_available_approvers tool — POST /purchase_orders/approver_list"
  - "get_po_approval_flow_link tool — GET /purchase_orders/:id/aff_link"
  - "BulkSaveResult and PurchaseOrderApproverGroup TypeScript interfaces"
affects: [pex:purchase-orders skill, phase-03-medium-priority]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URLSearchParams with array params using forEach append for budget_ids[]"
    - "POST body with { purchase_order: { data: [...] } } for bulk operations"
    - "Regex mock routes with optional query string: /^path(\?.*)?$/ for GET endpoints with params"

key-files:
  created: []
  modified:
    - src/types.ts
    - src/tools/purchase-orders.ts
    - tests/e2e/setup.ts
    - tests/e2e/purchase-orders.test.ts

key-decisions:
  - "Auto-approvers mock route uses query-string-tolerant regex (?.*)?$ since GET requests pass params in URL"
  - "bulk_save sends data wrapped as { purchase_order: { data: [...] } } matching Rails strong params"
  - "get_po_available_approvers only includes defined fields in POST body to avoid sending null values"

patterns-established:
  - "Pattern: GET endpoints with URLSearchParams need query-tolerant mock regex (/path(\\?.*)?$/)"

requirements-completed: [PO-01, PO-02, PO-03, PO-04]

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 02 Plan 03: Missing PO Tools (Bulk Save, Approvers, AFF Link) Summary

**4 new PO tools added: bulk_save_purchase_orders, get_po_auto_approvers, get_po_available_approvers, get_po_approval_flow_link with BulkSaveResult and PurchaseOrderApproverGroup types**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-26T06:30:00Z
- **Completed:** 2026-03-26T06:36:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `bulk_save_purchase_orders` — bulk create/update POs via POST /purchase_orders/bulk_save, sending `{ purchase_order: { data: [...] } }` format
- Added `get_po_auto_approvers` — GET auto-approvers by gross_total and budget_ids[] params
- Added `get_po_available_approvers` — preview approvers via POST /purchase_orders/approver_list before submitting
- Added `get_po_approval_flow_link` — GET shareable AFF link for a PO (accepts ID/slug/approval-key)
- Added `BulkSaveResult` and `PurchaseOrderApproverGroup` TypeScript interfaces to types.ts
- 4 new E2E tests, all 54 total tests pass with no regressions

## Task Commits

1. **Task 1: Add PO types and 4 new tools** - `ec732f8` (feat)
2. **Task 2: Add mock routes and E2E tests** - `5027c87` (test)

## Files Created/Modified

- `src/types.ts` — Added BulkSaveResult and PurchaseOrderApproverGroup interfaces after PurchaseOrder
- `src/tools/purchase-orders.ts` — Added 4 new tool registrations inside registerPurchaseOrderTools; updated import
- `tests/e2e/setup.ts` — Added 4 mock routes for bulk_save, auto_approvers_list, approver_list, aff_link
- `tests/e2e/purchase-orders.test.ts` — Added 4 new E2E tests

## Decisions Made

- Auto-approvers mock route uses query-string-tolerant regex (`(\?.*)?$`) because the tool appends params to the URL and the mock server routes match the full URL including query string for RegExp paths
- `get_po_available_approvers` builds the POST body dynamically, only including defined fields to avoid sending undefined values to the Rails API
- Imported only `BulkSaveResult` and `PurchaseOrderApproverGroup` for the two new types that require explicit typing; other returns use generic inference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed auto_approvers_list mock route regex to allow query string**
- **Found during:** Task 2 (E2E test execution)
- **Issue:** `vPathSuffix` generates regex with `$` anchor; GET test sends URL with `?gross_total=5000`, causing 404 in mock
- **Fix:** Used inline regex `/^\/api\/v[13]\/purchase_orders\/auto_approvers_list(\?.*)?$/` instead of `vPathSuffix`
- **Files modified:** tests/e2e/setup.ts
- **Verification:** All 11 purchase-orders tests pass
- **Committed in:** `5027c87` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in mock route matching)
**Impact on plan:** Necessary fix for test correctness. No scope creep.

## Issues Encountered

None beyond the mock route regex issue documented above.

## Next Phase Readiness

- PO tools now cover 19 tools total (15 existing + 4 new)
- Ready for invoice missing tools plan (02-04)
- No blockers

---
*Phase: 02-high-priority-new-tools*
*Completed: 2026-03-26*
