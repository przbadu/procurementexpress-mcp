# Milestones

## v1.0 Comprehensive Audit & Update (Shipped: 2026-03-26)

**Phases completed:** 5 phases, 20 plans, 24 tasks

**Key accomplishments:**

- Fixed Rails error parsing in ApiClient (all 4 error formats now surface readable messages) and created src/schemas.ts with 4 shared Zod schemas ready for Wave 2 tool imports
- Summary/Detail TypeScript type splits for Webhook, ApprovalFlow, PO, and Invoice with all missing Rails serializer fields added to src/types.ts
- Task 1 — purchase-orders.ts schema wiring:
- Found during:
- One-liner:
- Full build + test verification with all 23 Phase 1 requirements confirmed via automated checks and human review
- 6-tool custom fields CRUD module (list, get, create, update, delete, update_positions) using CustomFieldAdmin type with option_list comma serialization and positions hash conversion
- One-liner:
- 4 new PO tools added: bulk_save_purchase_orders, get_po_auto_approvers, get_po_available_approvers, get_po_approval_flow_link with BulkSaveResult and PurchaseOrderApproverGroup types
- 1. [Rule 1 - Bug] Mock route regex for purchase_order_item_list needed optional query string
- Both new tool files (custom-fields.ts, compliance.ts) confirmed registered in src/index.ts — 129 tests pass, zero TypeScript errors, all 23 new tools live
- One-liner:
- One-liner:
- One-liner:
- 3 new government-procurement tools added: SAM.gov eligibility check, supplier approval request listing, and scanned document invoice/PO creation via multipart upload
- All Phase 4 tool files wired into src/index.ts with registerChatMessageTools correctly V3-gated inside the else block, build and all 165 tests passing.
- Zod safeParse rejection tests added to all 10 Group A tool test files, covering required fields, enum validation, array minimums, and cross-field refinements, plus invoice comment E2E coverage
- setup.ts — new body-validating mock handlers:

---
