---
phase: 01-schema-type-foundation
plan: 01
subsystem: infra
tags: [zod, api-client, error-handling, schemas, rails]

# Dependency graph
requires: []
provides:
  - Fixed Rails error parsing in ApiClient (all error formats surface readable messages)
  - src/schemas.ts with customFieldValueSchema, nestedDestroyMixin, lineItemSchema, invoiceLineItemSchema
affects:
  - 01-02-schema-alignment
  - 01-03-response-types
  - All Wave 2 plans that import from schemas.ts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Record<string, unknown> cast for flexible Rails error body parsing"
    - "Shared Zod schemas in src/schemas.ts imported by tool files"

key-files:
  created:
    - src/schemas.ts
  modified:
    - src/api-client.ts

key-decisions:
  - "Use Record<string, unknown> cast (not ApiError) for error body — Rails returns { error } not { message }"
  - "Create schemas.ts as pure export file — no tool imports modified in Wave 1 (left for Wave 2)"
  - "Add net_amount to lineItemSchema at creation time per SCHEMA-01 — Rails permits it but was previously missing"

patterns-established:
  - "Pattern 1: Rails error_response() returns { error: string } — always check errorBody.error first"
  - "Pattern 2: Shared Zod schemas live in src/schemas.ts and are imported by tool files via '../schemas.js'"
  - "Pattern 3: nestedDestroyMixin provides reusable _destroy field for nested Rails attributes"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 01 Plan 01: Infrastructure Foundations Summary

**Fixed Rails error parsing in ApiClient (all 4 error formats now surface readable messages) and created src/schemas.ts with 4 shared Zod schemas ready for Wave 2 tool imports**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T13:11:00Z
- **Completed:** 2026-03-25T13:27:49Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Rails API errors now surface as readable strings instead of "Error: undefined" — handles { error: string }, { error: [...] }, { errors: [...] }, { message: string } formats
- Created src/schemas.ts with customFieldValueSchema, nestedDestroyMixin, lineItemSchema, and invoiceLineItemSchema
- lineItemSchema includes net_amount field that was previously missing (SCHEMA-01 alignment fix)
- Zero TypeScript errors, all 150 tests pass (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix ApiClient error parsing for Rails error formats (INFRA-01)** - `613f164` (fix)
2. **Task 2: Create src/schemas.ts with shared Zod schemas (INFRA-02)** - `7b6b455` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/api-client.ts` - Replaced ApiError cast with Record<string, unknown>; added multi-format error extraction logic; removed unused ApiError import
- `src/schemas.ts` - New shared Zod schemas: customFieldValueSchema, nestedDestroyMixin, lineItemSchema (+ net_amount), invoiceLineItemSchema

## Decisions Made
- Used `Record<string, unknown>` cast instead of `ApiError` for error body parsing — Rails never uses the `message` field that `ApiError` expected
- Did NOT modify any tool files in this plan — tool imports from schemas.ts are deferred to Wave 2 plans to keep this plan minimal and focused
- Added `net_amount` to `lineItemSchema` at creation time since SCHEMA-01 identified it as a missing Rails-permitted field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- src/schemas.ts is ready for import by purchase-orders.ts, invoices.ts, budgets.ts in Wave 2 plans
- Error handler fix is transparent to callers — no test changes needed
- Wave 2 plans can remove duplicated schema definitions from individual tool files and import from schemas.ts

## Self-Check: PASSED

- FOUND: src/api-client.ts
- FOUND: src/schemas.ts
- FOUND: .planning/phases/01-schema-type-foundation/01-01-SUMMARY.md
- FOUND: commit 613f164 (Task 1 - fix ApiClient error parsing)
- FOUND: commit 7b6b455 (Task 2 - create schemas.ts)
- Task 1 acceptance criteria: all 4 checks passed (typeof errorBody.error, Array.isArray errors, Record<string,unknown> cast, no ApiError cast)
- Task 2 acceptance criteria: all 6 exports verified (customFieldValueSchema, nestedDestroyMixin, lineItemSchema, invoiceLineItemSchema, net_amount, zod import)

---
*Phase: 01-schema-type-foundation*
*Completed: 2026-03-25*
