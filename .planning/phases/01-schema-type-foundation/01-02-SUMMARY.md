---
phase: 01-schema-type-foundation
plan: 02
subsystem: api
tags: [typescript, types, serializers, rails, webhooks, approval-flows, purchase-orders, invoices]

# Dependency graph
requires: []
provides:
  - WebhookSummary type matching WebhookSerializer (list endpoint, no auth fields or webhook_attributes)
  - ApprovalFlowSummary type matching ApprovalFlowSerializer (list endpoint, no steps/conditions)
  - ApprovalFlowVersion type for list_approval_flow_versions response
  - PurchaseOrderSummary with compliance_status, delivered_on, delivery_status, payment_status, xero_export_status, synced_with_xero, xero_is_changed
  - PurchaseOrder detail with xero_export_status, xero_export_error_message, xero_last_export_at, xero_is_changed, can_justify, has_global_policies
  - InvoiceSummary with xero_export_status, xero_is_changed
  - Invoice detail with xero_export_status, xero_export_error_message, xero_last_export_at, xero_is_changed
  - CompanyDetail with sam_gov_enabled
affects:
  - 01-03 (purchase-orders tool type alignment)
  - 01-04 (invoices tool type alignment)
  - 01-05 (webhooks tool type alignment)
  - 01-06 (approval-flows tool type alignment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Summary/Detail type split: list endpoints use *Summary type (compact), detail endpoints use full type"
    - "Optional fields for conditional/feature-flag serializer attributes use ? suffix"
    - "Serializer comment convention: // Webhook List (WebhookSerializer) vs // Webhook Detail (WebhookDetailSerializer)"

key-files:
  created: []
  modified:
    - src/types.ts

key-decisions:
  - "All new fields added as optional (?) per prior decision on conditional/feature-flag fields"
  - "INFRA-03 (non-paginated arrays) and INFRA-04 (paginated meta) require no code changes — already correct"
  - "ApprovalFlow interface kept unchanged as detail type; new ApprovalFlowSummary is the list type"

patterns-established:
  - "Summary type: list-serializer shape, no nested arrays of entities"
  - "Detail type: full serializer shape with all nested associations"

requirements-completed: [TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07, INFRA-03, INFRA-04]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 01 Plan 02: Type Splits and Missing Serializer Fields Summary

**Summary/Detail TypeScript type splits for Webhook, ApprovalFlow, PO, and Invoice with all missing Rails serializer fields added to src/types.ts**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T13:26:36Z
- **Completed:** 2026-03-25T13:27:58Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 20 missing serializer fields across PurchaseOrderSummary, PurchaseOrder, InvoiceSummary, Invoice, and CompanyDetail types
- Created WebhookSummary type (list serializer: no send_as_text, basic_auth_*, or webhook_attributes)
- Created ApprovalFlowSummary type (list serializer: no approval_steps or approval_conditions)
- Created ApprovalFlowVersion type for the versions endpoint response shape

## Task Commits

1. **Task 1: Add missing fields to PurchaseOrderSummary, PurchaseOrder, InvoiceSummary, Invoice, CompanyDetail** - `bcc94e4` (feat)
2. **Task 2: Create WebhookSummary, ApprovalFlowSummary, ApprovalFlowVersion types** - `ecd4e81` (feat)

## Files Created/Modified

- `src/types.ts` - Added 3 new interface types and 20+ missing optional fields across 5 existing interfaces

## Decisions Made

- All new fields added as optional (`?`) per the pre-existing decision on conditional/feature-flag fields — Rails serializers conditionally emit these fields based on company settings and integrations
- INFRA-03 and INFRA-04 required no code changes — non-paginated arrays and pagination meta fields are already handled correctly in the codebase
- The existing `ApprovalFlow` interface was kept as the detail type with its comment updated; `ApprovalFlowSummary` is the new list type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All type splits are in place; tool files (purchase-orders.ts, invoices.ts, webhooks.ts, approval-flows.ts) can now import and use the correct Summary vs Detail types
- Tool files referencing `PurchaseOrder[]` for list responses should now use `PurchaseOrderSummary[]`
- Tool files referencing `Invoice[]` for list responses should now use `InvoiceSummary[]`
- Tool files referencing `Webhook[]` for list responses should now use `WebhookSummary[]`
- Tool files referencing `ApprovalFlow[]` for list responses should now use `ApprovalFlowSummary[]`

---
*Phase: 01-schema-type-foundation*
*Completed: 2026-03-25*
