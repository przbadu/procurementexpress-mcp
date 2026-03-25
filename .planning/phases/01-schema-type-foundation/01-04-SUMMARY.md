---
phase: 01-schema-type-foundation
plan: "04"
subsystem: tool-schemas
tags: [schemas, zod, companies, suppliers, budgets, departments, type-alignment]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06]
  affects: [src/tools/companies.ts, src/tools/suppliers.ts, src/tools/budgets.ts]
tech_stack:
  added: []
  patterns: [shared-schema-import, list-vs-detail-type-split]
key_files:
  created: []
  modified:
    - src/tools/companies.ts
    - src/tools/suppliers.ts
    - src/tools/budgets.ts
decisions:
  - "Company[] used for list_companies (Rails CompanySerializer), CompanyDetail[] kept for get_company/get_company_details"
  - "Integration IDs (xero_id, zapier_id, quickbooks_id) added as optional to suppliers and budgets matching Rails strong params"
  - "budgets.ts inline customFieldValueSchema removed in favour of shared import from ../schemas.js"
  - "departments.ts verified already matches Rails permit list exactly — no changes made"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 3
---

# Phase 01 Plan 04: Mid-complexity Tool Schema Alignment Summary

Fix list_companies return type (Company[] not CompanyDetail[]), add missing third-party integration IDs to suppliers and budgets, wire shared customFieldValueSchema import in budgets.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Fix list_companies return type (SCHEMA-06) | 0d1efa3 | src/tools/companies.ts |
| 2 | Align supplier/budget/department schemas with Rails (SCHEMA-03, SCHEMA-04, SCHEMA-05) | fc62b92 | src/tools/suppliers.ts, src/tools/budgets.ts |

## Changes Made

### companies.ts (SCHEMA-06)
- `list_companies` return type changed from `CompanyDetail[]` to `Company[]` — matches Rails `CompanySerializer` (index action uses summary serializer)
- `Company` added to types import alongside existing `CompanyDetail`
- `get_company` and `get_company_details` correctly remain `CompanyDetail` (show action uses full detail serializer)

### suppliers.ts (SCHEMA-03)
- Added `xero_id: z.string().optional()` to `create_supplier` and `update_supplier` schemas
- Added `zapier_id: z.string().optional()` to `create_supplier` and `update_supplier` schemas
- Added `quickbooks_id: z.string().optional()` to `create_supplier` and `update_supplier` schemas
- Existing `uei` and `cage_code` fields confirmed present — no changes needed
- All additions non-breaking (optional params)

### budgets.ts (SCHEMA-04)
- Removed inline `const customFieldValueSchema = z.object({...})` definition (7 lines)
- Added `import { customFieldValueSchema } from "../schemas.js"` — uses shared source of truth
- Added `xero_id: z.string().optional()` to `create_budget` and `update_budget` schemas
- Added `zapier_id: z.string().optional()` to `create_budget` and `update_budget` schemas
- Added `quickbooks_id: z.string().optional()` to `create_budget` and `update_budget` schemas

### departments.ts (SCHEMA-05)
- **No changes made** — research confirmed "Perfect match. No gaps found."
- Existing schemas cover all Rails permit params: `name, archived, contact_person, phone_number, email, address, tax_number, budget_ids[], user_ids[]`

## Verification

- `npm run build` — exits 0, zero TypeScript errors
- `npm test` — 50/50 tests pass, 11 test files

## Deviations from Plan

### Prerequisite: Merged mcp-update branch

**Found during:** Plan start (before Task 1)
**Issue:** The worktree `worktree-agent-aca311be` was branched from the original `mcp-update` base (commit 49f42e9) before Plans 01-01, 01-02, and 01-03 were committed. `src/schemas.ts` did not exist in this worktree.
**Fix:** Merged `mcp-update` (fast-forward) to bring in all prerequisite changes before executing this plan's tasks.
**Files modified:** All files from Plans 01-01 through 01-05 (already committed on mcp-update).
**Commit:** N/A (merge operation)

## Known Stubs

None — all changes are wiring real optional params that pass through to the Rails API.

## Self-Check: PASSED

- `src/tools/companies.ts` — modified, `Company[]` present in list_companies handler
- `src/tools/suppliers.ts` — modified, `xero_id` and `quickbooks_id` present in both create/update schemas
- `src/tools/budgets.ts` — modified, `from "../schemas.js"` import present, no inline `customFieldValueSchema`
- `src/tools/departments.ts` — unchanged (intentional)
- Commit 0d1efa3 — exists (Task 1: companies.ts)
- Commit fc62b92 — exists (Task 2: suppliers.ts + budgets.ts)
- `npm run build` — passed
- `npm test` — 50/50 passed
