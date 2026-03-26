---
phase: "05"
plan: "02"
subsystem: "test-coverage"
tags: ["testing", "zod", "e2e", "vitest", "mock-server"]
dependency_graph:
  requires: ["05-01"]
  provides: ["full-test-suite-green", "zod-rejection-coverage-group-b"]
  affects: ["tests/e2e/setup.ts", "tests/e2e/payments.test.ts", "tests/e2e/webhooks.test.ts", "tests/e2e/tax-rates.test.ts", "tests/e2e/products.test.ts", "tests/e2e/uploads.test.ts", "tests/e2e/policies.test.ts", "tests/e2e/chat-messages.test.ts", "tests/e2e/digital-invoices.test.ts", "tests/e2e/supplementary.test.ts", "tests/e2e/users.test.ts"]
tech_stack:
  added: []
  patterns: ["Zod safeParse for schema rejection tests", "MockApiServer body validation with 422 responses"]
key_files:
  created:
    - tests/e2e/webhooks.test.ts
    - tests/e2e/tax-rates.test.ts
  modified:
    - tests/e2e/setup.ts
    - tests/e2e/payments.test.ts
    - tests/e2e/products.test.ts
    - tests/e2e/uploads.test.ts
    - tests/e2e/policies.test.ts
    - tests/e2e/chat-messages.test.ts
    - tests/e2e/digital-invoices.test.ts
    - tests/e2e/supplementary.test.ts
    - tests/e2e/users.test.ts
decisions:
  - "Zod rejection tests use safeParse with explicit schema definitions matching tool inputSchema constraints"
  - "setup.ts mock handlers for tax-rates, webhooks, npayments validate required fields and return 422 with error message"
  - "PO-level payment mock uses regex path matching for /purchase_orders/:id/payments"
  - "users.test.ts uses behavioral 404 test + simple Zod integer test since GET-only tools have no required input params"
metrics:
  duration: "10 minutes"
  completed_date: "2026-03-26"
  tasks: 2
  files_modified: 11
---

# Phase 05 Plan 02: Group B Zod Rejection Tests and Mock Handler Validation Summary

Added Zod rejection tests and negative tests to all Group B tool test files, added body-validating mock handlers to setup.ts for tax-rates, webhooks, and payments, and verified the full test suite passes with zero failures.

## What Was Done

### Task 1: setup.ts + Group B First Five

**setup.ts — new body-validating mock handlers:**
- Tax rates: POST validates `parsed.tax_rate?.name` (422 if missing), GET single, PUT, DELETE
- Webhooks: POST validates `parsed.webhook?.url` (422 if missing), GET single, PUT, DELETE
- NPayments: POST validates `parsed.npayment?.amount` (422 if missing), GET list, GET single
- PO-level payments: POST with regex path `/purchase_orders/\d+/payments`

**New test files created:**
- `tests/e2e/webhooks.test.ts` — 7 tests: list, get single, create, 422 missing url, delete, + 2 Zod rejection tests
- `tests/e2e/tax-rates.test.ts` — 6 tests: list, get single, create, 422 missing name, + 2 Zod rejection tests

**Zod rejection tests added to existing files:**
- `payments.test.ts` — 2 new Zod tests: supplier_id required, amount must be number
- `products.test.ts` — 2 new Zod tests: bulk_create non-empty array, create_product requires description
- `uploads.test.ts` — 2 new Zod tests: po_id positive number, upload_token non-empty string

### Task 2: Remaining Group B Files + Final Verification

**Zod rejection tests added:**
- `policies.test.ts` — 2 new Zod tests: name min-length, status enum rejects invalid
- `chat-messages.test.ts` — 2 new Zod tests: document_type required, document_type enum validation
- `digital-invoices.test.ts` — 2 new Zod tests: upload_type enum rejects "receipt", accepts valid values
- `supplementary.test.ts` — 2 new Zod tests: page must be positive integer, emails required for forward_po
- `users.test.ts` — 1 behavioral test (404 for non-existent endpoint) + 1 Zod test (currency_id positive integer)

## Final Verification Results

- `npm run build`: 0 TypeScript errors
- `npm test`: **140 tests, 23 test files, 0 failures** (up from 111 tests / 21 files before plan)
- Total new tests added: 29 (13 from Task 1, 9 from Task 2, plus 7 new webhook tests)

## Coverage After This Plan

Every tool group test file now has at least one Zod schema rejection test:

| File | Zod Tests |
|------|-----------|
| payments.test.ts | 2 |
| webhooks.test.ts | 2 (new file) |
| tax-rates.test.ts | 2 (new file) |
| products.test.ts | 2 |
| uploads.test.ts | 2 |
| policies.test.ts | 2 |
| chat-messages.test.ts | 2 |
| digital-invoices.test.ts | 2 |
| supplementary.test.ts | 2 |
| users.test.ts | 1 |

## Commits

- `3c4e4c6` — feat(05-02): add body-validating mock handlers and Zod rejection tests for Group B (payments, webhooks, tax-rates, products, uploads)
- `1f9112e` — feat(05-02): add Zod rejection tests to remaining Group B test files and run final verification

## Deviations from Plan

### Pre-execution deviation: Branch merge required

**Found during:** Plan start
**Issue:** The worktree branch (`worktree-agent-a27eecd4`) was missing all code from phases 01-04 (source tools: uploads.ts, policies.ts, chat-messages.ts, digital-invoices.ts; test files: payments.test.ts, products.test.ts, uploads.test.ts, policies.test.ts, chat-messages.test.ts, digital-invoices.test.ts)
**Fix:** Merged `mcp-update` branch into worktree branch (fast-forward merge, no conflicts)
**Rule:** Rule 3 (auto-fix blocking issue)
**Commit:** Resolved via `git merge mcp-update`

No other deviations — plan executed as written after merge.

## Known Stubs

None. All test assertions use concrete mock responses or Zod schema validation. No placeholder data flows to UI (this is a CLI MCP server with no UI).

## Self-Check: PASSED
