---
phase: 01-schema-type-foundation
verified: 2026-03-26T10:50:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "Zod validation rejects nested _destroy: true without an accompanying id before the request reaches Rails"
    status: failed
    reason: "Both id and _destroy are .optional() in lineItemSchema and invoiceLineItemSchema. No .refine() or .superRefine() enforces the id-required-with-destroy constraint. A caller can pass { _destroy: true } without id and Zod will accept it — Rails will then silently discard it."
    artifacts:
      - path: "src/schemas.ts"
        issue: "lineItemSchema and invoiceLineItemSchema have id: optional() and _destroy: optional() with no cross-field validation. The comment says the rejection happens but no code implements it."
    missing:
      - "Add a .refine() or .superRefine() to lineItemSchema that rejects items where _destroy === true && id === undefined"
      - "Add same refinement to invoiceLineItemSchema"
      - "Consider adding to approval-flows.ts approvalConditionSchema and approvalStepSchema inline definitions as well"
human_verification:
  - test: "Confirm Rails silently discards or errors on _destroy without id"
    expected: "If Rails rejects it with a 422, the missing Zod guard is low-severity. If Rails silently no-ops, agents may think a delete succeeded when it didn't."
    why_human: "Behavior of Rails strong params with _destroy: true and no id cannot be confirmed by static analysis — requires live Rails test or reading the Rails nested_attributes source."
---

# Phase 01: Schema & Type Foundation Verification Report

**Phase Goal:** Every existing tool accurately represents its Rails API contract with no invented params, no missing params, and no mismatched response types
**Verified:** 2026-03-26T10:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An MCP client calling any existing tool with the exact params Rails accepts gets a 200 with correct data — no "unknown param" rejections from Rails | VERIFIED | Shared schemas extracted; lineItemSchema includes net_amount; suppliers have xero_id/zapier_id/quickbooks_id; invoices have validation_date; products have archived; webhooks have tested. All confirmed in source files. |
| 2 | An MCP client calling any list tool gets a response typed as the Summary interface (no nested detail arrays), and any get-by-id tool gets the full Detail interface | VERIFIED | PurchaseOrderSummary[] at line 72 of purchase-orders.ts; InvoiceSummary[] at line 53 of invoices.ts; WebhookSummary[] at line 21 of webhooks.ts; ApprovalFlowSummary[] at line 50 of approval-flows.ts; Company[] at line 15 of companies.ts. All confirmed. |
| 3 | Any Rails error response ({ error }, { errors }, { message }) is surfaced to the MCP caller as a readable string, not an empty or undefined error | VERIFIED | src/api-client.ts lines 107-128: handles `typeof errorBody.error === "string"`, `Array.isArray(errorBody.error)`, `Array.isArray(errorBody.errors)`, `typeof errorBody.message === "string"`, fallback to `response.statusText`. |
| 4 | Zod validation rejects nested `_destroy: true` without an accompanying `id` before the request reaches Rails | FAILED | src/schemas.ts exports lineItemSchema and invoiceLineItemSchema with both `id` and `_destroy` as `.optional()`. No `.refine()` enforces the id-required constraint. The comment at line 17 says rejection happens but no code implements it. |
| 5 | Shared Zod schemas (custom_field_values_attributes, line items) live in `src/schemas.ts` and are imported by all tool files that use them | VERIFIED | src/schemas.ts exports customFieldValueSchema, nestedDestroyMixin, lineItemSchema, invoiceLineItemSchema. purchase-orders.ts line 6 and invoices.ts line 6 import from `"../schemas.js"`. budgets.ts line 6 imports customFieldValueSchema from `"../schemas.js"`. No inline `const customFieldValueSchema = z.object` remains in any tool file (grep confirmed). |

**Score:** 4/5 success criteria verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/api-client.ts` | VERIFIED | Error handler at lines 107-128 handles all 4 Rails error formats. No ApiError cast in error block. |
| `src/schemas.ts` | VERIFIED (partial) | Exports customFieldValueSchema, nestedDestroyMixin, lineItemSchema, invoiceLineItemSchema. Missing: _destroy+id cross-field validation. |
| `src/types.ts` | VERIFIED | WebhookSummary (line 778), ApprovalFlowSummary (line 657), ApprovalFlowVersion (line 744), PurchaseOrderSummary (line 345) with compliance_status/xero fields, InvoiceSummary (line 491) with xero fields, CompanyDetail (line 251) with sam_gov_enabled, PurchaseOrder detail with can_justify/has_global_policies. All confirmed. |
| `src/tools/purchase-orders.ts` | VERIFIED | Imports from schemas.js (line 6), uses PurchaseOrderSummary (line 72), no inline schema definitions. |
| `src/tools/invoices.ts` | VERIFIED | Imports from schemas.js (line 6), uses InvoiceSummary (line 53), validation_date present (lines 83, 119). |
| `src/tools/companies.ts` | VERIFIED | list_companies uses Company[] (line 15), not CompanyDetail[]. |
| `src/tools/suppliers.ts` | VERIFIED | xero_id, zapier_id, quickbooks_id in create/update schemas (lines 86-88, 115-117). |
| `src/tools/budgets.ts` | VERIFIED | Imports customFieldValueSchema from schemas.js (line 6), xero_id/zapier_id/quickbooks_id present (lines 65-67, 95-97). |
| `src/tools/webhooks.ts` | VERIFIED | WebhookSummary[] in list handler (line 21), tested field in update_webhook (line 101). |
| `src/tools/approval-flows.ts` | VERIFIED | ApprovalFlowSummary[] in list handler (line 50), approval_step_id in approvalConditionSchema (line 13). |
| `src/tools/products.ts` | VERIFIED | archived field in update_product (line 74). |
| `src/tools/tax-rates.ts` | VERIFIED | No changes needed per research — already correct. |
| `src/tools/comments.ts` | VERIFIED | No changes needed per research — already correct. |
| `src/tools/departments.ts` | VERIFIED | No changes needed per research — already correct. |
| `src/tools/payments.ts` | VERIFIED | Schemas verified as correct per research. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| src/tools/purchase-orders.ts | src/schemas.ts | `import { customFieldValueSchema, lineItemSchema } from "../schemas.js"` | WIRED | Line 6 confirmed |
| src/tools/invoices.ts | src/schemas.ts | `import { customFieldValueSchema, invoiceLineItemSchema } from "../schemas.js"` | WIRED | Line 6 confirmed |
| src/tools/budgets.ts | src/schemas.ts | `import { customFieldValueSchema } from "../schemas.js"` | WIRED | Line 6 confirmed |
| src/tools/purchase-orders.ts | src/types.ts | PurchaseOrderSummary for list tool | WIRED | Line 5 import, line 72 usage |
| src/tools/invoices.ts | src/types.ts | InvoiceSummary for list tool | WIRED | Line 5 import, line 53 usage |
| src/tools/webhooks.ts | src/types.ts | WebhookSummary for list tool | WIRED | Line 5 import, line 21 usage |
| src/tools/approval-flows.ts | src/types.ts | ApprovalFlowSummary for list tool | WIRED | Line 5 import, line 50 usage |
| src/tools/companies.ts | src/types.ts | Company[] for list_companies | WIRED | Line 5 import, line 15 usage |
| src/api-client.ts | Rails error format | errorBody.error parsing | WIRED | Lines 114-124 handle all formats |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript build passes with zero errors | `npm run build` | Exit 0, no output | PASS |
| All 50 tests pass with no regressions | `npm test` | 50 passed, 0 failed, 11 files | PASS |
| No inline customFieldValueSchema in tool files | `grep -r "const customFieldValueSchema" src/tools/` | No matches | PASS |
| PurchaseOrderSummary wired in list tool | `grep "PurchaseOrderSummary" src/tools/purchase-orders.ts` | Line 72 match | PASS |
| InvoiceSummary wired in list tool | `grep "InvoiceSummary" src/tools/invoices.ts` | Line 53 match | PASS |
| WebhookSummary wired in list tool | `grep "WebhookSummary" src/tools/webhooks.ts` | Line 21 match | PASS |
| ApprovalFlowSummary wired in list tool | `grep "ApprovalFlowSummary" src/tools/approval-flows.ts` | Line 50 match | PASS |
| Error handler parses Rails error formats | `grep "errorBody.error" src/api-client.ts` | Lines 114-117 match | PASS |
| _destroy refine on lineItemSchema | `grep -r "refine\|superRefine" src/schemas.ts` | No matches | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHEMA-01 | 01-03-PLAN | PO tool Zod schemas match Rails po_params | SATISFIED | lineItemSchema includes net_amount; shared schemas imported; PurchaseOrderSummary wired |
| SCHEMA-02 | 01-03-PLAN | Invoice tool Zod schemas match Rails invoice_params | SATISFIED | invoiceLineItemSchema imported; validation_date added to create/update; InvoiceSummary wired |
| SCHEMA-03 | 01-04-PLAN | Supplier tool Zod schemas match Rails SuppliersController | SATISFIED | xero_id, zapier_id, quickbooks_id in create_supplier and update_supplier |
| SCHEMA-04 | 01-04-PLAN | Budget tool Zod schemas match Rails BudgetsController | SATISFIED | customFieldValueSchema imported from schemas.js; xero_id/zapier_id/quickbooks_id added |
| SCHEMA-05 | 01-04-PLAN | Department tool Zod schemas match Rails DepartmentsController | SATISFIED | Verified no changes needed per research — existing schemas correct |
| SCHEMA-06 | 01-04-PLAN | Company tool Zod schemas match Rails CompaniesController | SATISFIED | list_companies returns Company[] (not CompanyDetail[]) |
| SCHEMA-07 | 01-05-PLAN | Webhook tool Zod schemas match Rails WebhooksController | SATISFIED | WebhookSummary wired; tested field added to update_webhook |
| SCHEMA-08 | 01-05-PLAN | ApprovalFlow tool Zod schemas match Rails ApprovalFlowsController | SATISFIED | ApprovalFlowSummary wired; approval_step_id added to condition schema |
| SCHEMA-09 | 01-05-PLAN | Payment tool Zod schemas match Rails PaymentsController | SATISFIED | Verified as already correct per research |
| SCHEMA-10 | 01-05-PLAN | TaxRate tool Zod schemas match Rails TaxRatesController | SATISFIED | Verified as already correct per research |
| SCHEMA-11 | 01-05-PLAN | Product tool Zod schemas match Rails ProductsController | SATISFIED | archived field added to update_product |
| SCHEMA-12 | 01-05-PLAN | Comment tool Zod schemas match Rails CommentsController | SATISFIED | Verified as already correct per research |
| TYPE-01 | 01-02-PLAN | PurchaseOrder has separate Summary/Detail types | SATISFIED | PurchaseOrderSummary (line 345) and PurchaseOrder (line 375) in types.ts |
| TYPE-02 | 01-02-PLAN | Invoice has separate Summary/Detail types | SATISFIED | InvoiceSummary (line 491) and Invoice (line 523) in types.ts |
| TYPE-03 | 01-02-PLAN | Company has separate Summary/Detail types | SATISFIED | Company (line 36) and CompanyDetail (line 251) in types.ts |
| TYPE-04 | 01-02-PLAN | Webhook has separate Summary/Detail types | SATISFIED | WebhookSummary (line 778) and Webhook (line 790) in types.ts |
| TYPE-05 | 01-02-PLAN | ApprovalFlow has separate Summary/Detail types | SATISFIED | ApprovalFlowSummary (line 657) and ApprovalFlow (line 675) in types.ts |
| TYPE-06 | 01-02-PLAN | All response type fields match Rails serializer attributes | SATISFIED | Missing fields added: compliance_status, xero_*, can_justify, has_global_policies, sam_gov_enabled, ApprovalFlowVersion |
| TYPE-07 | 01-02-PLAN | Conditional serializer fields typed as optional | SATISFIED | All new fields use `?:` optional notation throughout types.ts |
| INFRA-01 | 01-01-PLAN | ApiClient error handler supports {error} and {errors} formats | SATISFIED | api-client.ts lines 107-128 handle all 4 formats |
| INFRA-02 | 01-01-PLAN | Shared Zod schemas extracted to src/schemas.ts | SATISFIED | src/schemas.ts exports 4 shared schemas; all tool files import instead of duplicating |
| INFRA-03 | 01-02-PLAN | Non-paginated endpoints handle plain array responses | SATISFIED | companies.ts, departments.ts, users.ts, companies.ts approvers all use direct array types |
| INFRA-04 | 01-02-PLAN | Paginated endpoints document meta fields | SATISFIED | PaginationMeta interface at types.ts lines 4-10; used consistently in list tools |

All 23 Phase 1 requirements are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/schemas.ts | 17 | Comment claims "_destroy without id is rejected by Zod" but no `.refine()` implements this | Blocker | Success Criterion 4 not met — agents calling with _destroy:true and no id will pass Zod validation and reach Rails, where behavior is undefined |

### Human Verification Required

#### 1. Rails behavior for _destroy without id

**Test:** In a Rails console or via API, send a PATCH to a PO with `purchase_order_items_attributes: [{ _destroy: true }]` (no id field)
**Expected:** Rails should either silently ignore it or return a 422 error
**Why human:** Cannot determine Rails nested_attributes behavior for `_destroy: true` without `id` via static analysis. This determines the severity of the missing Zod refine — if Rails silently ignores it (no visible effect), the severity is low. If Rails raises an error that returns a 422, it would be surfaced to the MCP caller. Only if Rails silently removes the wrong record would this be a data integrity issue.

### Gaps Summary

One gap found blocking complete goal achievement:

**Success Criterion 4 — _destroy validation not implemented:** The Phase 1 ROADMAP success criterion states "Zod validation rejects nested `_destroy: true` without an accompanying `id` before the request reaches Rails." The `src/schemas.ts` file has a code comment at line 17 documenting this behavior, but neither `lineItemSchema` nor `invoiceLineItemSchema` includes a `.refine()` or `.superRefine()` call that enforces the constraint. Both `id` and `_destroy` are simply `.optional()`, meaning `{ _destroy: true }` with no `id` passes Zod validation without error.

The fix is localized: add `.refine((items) => items.every(item => !item._destroy || item.id !== undefined), { message: "..." })` to the `z.array(lineItemSchema)` call sites, or add a `.superRefine()` directly to `lineItemSchema`.

The remaining 22 of 23 requirements are fully implemented and verified. The build is clean (zero TypeScript errors), all 50 tests pass, all list tools use correct Summary types, the error handler correctly parses all Rails error formats, and all shared schemas are properly extracted and imported.

---

_Verified: 2026-03-26T10:50:00Z_
_Verifier: Claude (gsd-verifier)_
