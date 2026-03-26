# Phase 5: Test Coverage & Verification - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Every tool — new and modified — has E2E test coverage that validates request shape against MockApiServer, and the full suite passes with zero TypeScript errors. This phase adds missing negative tests, Zod rejection tests, and body validation to mock handlers.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints:
- E2E tests use MockApiServer with version-agnostic regex patterns
- Tests default to V1 auth via auth.authenticateV1()
- Every test file follows existing patterns in tests/e2e/
- Zod rejection tests should invoke tools with invalid inputs and verify error without server call
- Mock handlers should validate request body fields, not just route matching

</decisions>

<code_context>
## Existing Code Insights

### Current Test Coverage (165 tests, 32 files)
- auth.test.ts (11), api-client.test.ts (9), schemas.test.ts (6)
- purchase-orders.test.ts (11), invoices.test.ts (8), companies.test.ts (5+)
- budgets.test.ts (3), departments.test.ts (2), suppliers.test.ts (4+)
- custom-fields.test.ts (6), compliance.test.ts (10)
- uploads.test.ts (4), products.test.ts (4), approval-flows.test.ts (4)
- policies.test.ts (8), chat-messages.test.ts (4), digital-invoices.test.ts (2)
- payments.test.ts (3), comments.test.ts (1), supplementary.test.ts (4)
- users.test.ts (3), tax-rates.test.ts (4), webhooks.test.ts (3)

### Gaps to Address
- Some tool groups lack negative/invalid payload tests
- Some mock handlers only match routes without body validation
- Need Zod rejection tests per tool group

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
