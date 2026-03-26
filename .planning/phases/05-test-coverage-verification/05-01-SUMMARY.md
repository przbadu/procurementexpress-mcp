---
phase: 05-test-coverage-verification
plan: 01
subsystem: testing
tags: [vitest, zod, e2e, validation, schemas]

# Dependency graph
requires:
  - phase: 01-schema-type-foundation
    provides: lineItemSchema, invoiceLineItemSchema, destroyRequiresId exported from src/schemas.ts
provides:
  - Zod rejection tests for all 10 Group A tool test files
  - Invoice comment E2E test coverage (was missing)
  - Schema validation boundary tests for all major tool groups
affects: [05-test-coverage-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import z from zod and schemas from src/schemas.js in test files for safeParse-based Zod rejection tests"
    - "Use .safeParse() with invalid input and assert success === false for schema boundary tests"
    - "Register mock routes in beforeAll before mock.start() for test-specific endpoints"

key-files:
  created: []
  modified:
    - tests/e2e/purchase-orders.test.ts
    - tests/e2e/invoices.test.ts
    - tests/e2e/budgets.test.ts
    - tests/e2e/departments.test.ts
    - tests/e2e/suppliers.test.ts
    - tests/e2e/companies.test.ts
    - tests/e2e/comments.test.ts
    - tests/e2e/custom-fields.test.ts
    - tests/e2e/compliance.test.ts
    - tests/e2e/approval-flows.test.ts

key-decisions:
  - "Used safeParse approach for Zod rejection tests — simpler than wiring full MCP transport, consistent with existing schemas.test.ts pattern"
  - "Recreated inline tool schemas (commit enum, status enums) in tests since they are not exported from tool files"
  - "Invoice comment mock route registered in beforeAll before mock.start() to ensure handler is available"

patterns-established:
  - "Zod rejection test pattern: import schema, call .safeParse(invalidInput), assert result.success === false"
  - "New describe('Zod schema validation') block appended to existing describe — no existing tests modified"
  - "Test-specific mock routes registered in beforeAll before mock.start() call"

requirements-completed:
  - TEST-01
  - TEST-02
  - TEST-05

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 05 Plan 01: Zod Rejection and Negative Tests for All Group A Tool Files Summary

**Zod safeParse rejection tests added to all 10 Group A tool test files, covering required fields, enum validation, array minimums, and cross-field refinements, plus invoice comment E2E coverage**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-26T13:43:00Z
- **Completed:** 2026-03-26T13:51:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added Zod rejection tests to all 10 Group A tool test files (purchase-orders, invoices, budgets, departments, suppliers, companies, comments, custom-fields, compliance, approval-flows)
- Added invoice comment E2E test to comments.test.ts (was only 1 test covering PO comments; invoice body shape `{ invoice_comments: { comment } }` now verified)
- Full test suite passes: 358 tests across 66 test files with zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod rejection tests for PO, invoice, budget, department, supplier** - `6b9fb8a` (test)
2. **Task 2: Zod rejection tests for companies, comments, custom-fields, compliance, approval-flows** - `a81411b` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tests/e2e/purchase-orders.test.ts` - Added describe("Zod schema validation") with 3 tests: lineItemSchema _destroy rejection, min(1) array, commit enum
- `tests/e2e/invoices.test.ts` - Added 2 Zod tests: invoiceLineItemSchema _destroy rejection, status enum rejection
- `tests/e2e/budgets.test.ts` - Added 1 Zod test: budget name required as string
- `tests/e2e/departments.test.ts` - Added 1 Zod test: department name required as string
- `tests/e2e/suppliers.test.ts` - Added 1 Zod test: supplier name required
- `tests/e2e/companies.test.ts` - Added 2 Zod tests: email required, invalid email format rejection
- `tests/e2e/comments.test.ts` - Added invoice comment E2E test + 1 Zod test: non-empty text required
- `tests/e2e/custom-fields.test.ts` - Added 2 Zod tests: name+field_type required, field_type enum rejection
- `tests/e2e/compliance.test.ts` - Added 2 Zod tests: purchase_order_id|invoice_id required (refine), bulk_check min(1) array
- `tests/e2e/approval-flows.test.ts` - Added 1 Zod test: rerun requires order_ids or invoice_ids (refine)

## Decisions Made
- Used safeParse approach for Zod rejection tests — consistent with existing `schemas.test.ts` pattern, no MCP transport wiring needed
- Recreated inline enums (commit enum, status filter enum, field_type enum) in tests since they are defined inline in tool files and not exported
- Invoice comment mock route registered before `mock.start()` in `beforeAll` — this is the correct placement per setup.ts route registration order

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 10 Group A tool test files now have Zod rejection tests
- All 165+ existing tests pass with no regressions (total: 358 tests)
- Plan 02 (remaining Group B/C test coverage) can proceed

---
*Phase: 05-test-coverage-verification*
*Completed: 2026-03-26*

## Self-Check: PASSED
