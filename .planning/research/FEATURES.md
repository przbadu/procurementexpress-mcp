# Feature Landscape

**Domain:** MCP server for a procurement platform (ProcurementExpress Rails API)
**Researched:** 2026-03-25
**Scope:** AI agent workflows — what capabilities matter most for autonomous procurement agents

---

## Current State (Existing 88 Tools)

The server already exposes these tool groups. Analysis below focuses on what is missing, misaligned, or under-specified.

| Tool Group | Tools | Status |
|------------|-------|--------|
| Purchase Orders | 15 | Schema gaps, missing bulk/preview tools |
| Invoices | 11 | Missing purchase_order_list, purchase_order_item_list |
| Approval Flows | 13 | Solid coverage |
| Suppliers | 5 | Solid |
| Budgets | 4 | Solid |
| Departments | 4 | Solid |
| Companies | 12 | Solid |
| Users | 4 | Solid |
| Payments | 3 | Solid |
| Products | 4 | Solid |
| Tax Rates | 4 | Solid |
| Webhooks | 5 | Solid |
| Comments | 2 | Solid |
| Supplementary | 8 | Chart of accounts, QBO, email forwarding |

**Missing entirely:** Custom Fields CRUD, Compliance module, File Uploads, Digital Invoices, NPayments, Policies, Policy Templates, SAM.gov, Chat Messages, Supplier Approvals

---

## Table Stakes

Features an AI agent cannot perform its job without. Missing any of these means the agent will hit dead-ends or produce incorrect state.

### 1. Custom Fields CRUD
**Why expected:** Custom fields appear in PO, invoice, budget, and line item schemas. Without CRUD for custom fields themselves, an agent cannot:
- Know what custom fields exist before constructing a PO/invoice
- Create or configure custom fields for new company setups
- Validate required field IDs before submitting data

**Rails controller:** `Api::V1::CustomFieldsController` — index, show, create, update, destroy, update_positions

| Tool | Complexity | Notes |
|------|------------|-------|
| list_custom_fields | Low | Params: context (line_item/purchase_order), include_archived |
| get_custom_field | Low | Returns CustomFieldAdminSerializer (more fields than current CustomField type) |
| create_custom_field | Medium | Permits: name, field_type, default_value, active, required, option_list, access_level, on_line_item, display_on_pdf, editable_after_approval |
| update_custom_field | Medium | Same params as create, plus archived flag |
| archive_custom_field | Low | Soft-delete: sets archived=true |
| update_custom_field_positions | Low | Params: positions hash {id => position_int} |

**Dependency:** Required before any PO/invoice creation in AI workflows that need to know field IDs.

### 2. PO Approval Preview (approver_list)
**Why expected:** An AI agent building a PO needs to know who will approve it before submitting. Without this, agents submit blind — they cannot verify that the correct approval chain will be triggered, nor report it to users.

**Rails action:** `Api::V1::PurchaseOrdersController#approver_list` — evaluates ApprovalFlows::MatcherService against a draft PO's data.

| Tool | Complexity | Notes |
|------|------------|-------|
| preview_purchase_order_approvers | High | Accepts full PO params including line items; returns grouped-by-flow approver list |

**Dependency:** Only useful after approval flows are configured.

### 3. Invoice PO Linking Support (purchase_order_list, purchase_order_item_list)
**Why expected:** Creating an invoice linked to POs requires knowing which POs are available to link and what their line items are. Without these, agents cannot intelligently link invoices to POs.

**Rails actions:** `Api::V1::InvoicesController#purchase_order_list`, `#purchase_order_item_list`

| Tool | Complexity | Notes |
|------|------------|-------|
| list_linkable_purchase_orders | Low | Paginated, accepts selected_ids to pre-select |
| list_purchase_order_items_for_invoice | Low | Accepts purchase_order_ids array; returns flattened line items |

**Dependency:** Required for create_invoice workflows that link to existing POs.

### 4. File Uploads (PO and Comment Attachments)
**Why expected:** Real procurement workflows require attaching documents: quotes, receipts, contracts, delivery confirmations. An agent that can create a PO but not attach supporting documents is incomplete.

**Rails controller:** `Api::V1::UploadsController` — po (upload to PO), poc (upload to comment), status (check upload status by token)

| Tool | Complexity | Notes |
|------|------------|-------|
| upload_purchase_order_file | Medium | Multipart form: po_id, uploads_attributes[file], uploads_attributes[upload_token] |
| upload_comment_file | Medium | Multipart form: poc_id, uploads_attributes[file], uploads_attributes[upload_token] |
| get_upload_status | Low | Params: upload_token; returns Upload serializer |

**Complexity note:** Multipart file upload is distinct from JSON — requires different Content-Type handling. MCP clients can pass base64 or file paths; the tool must handle encoding.

**Dependency:** Requires a valid upload_token (pre-generated UUID) before calling upload endpoints.

### 5. PO AFF Link
**Why expected:** The `aff_link` is a direct URL to a PO for supplier communication. Already exists in PO detail response as a field, but no tool exposes it as a standalone action. Useful for agents that send POs to suppliers programmatically.

**Rails action:** `Api::V1::PurchaseOrdersController#aff_link`

| Tool | Complexity | Notes |
|------|------------|-------|
| get_purchase_order_aff_link | Low | Returns {aff_link: string} |

---

## Differentiators

Features that give AI agents significant advantages in procurement workflows. Not universally expected, but high value for sophisticated use cases.

### 1. Compliance Module (Full Suite)
**Value:** AI-driven compliance checking is a core differentiator for procurement automation. An agent can submit a PO, trigger a compliance scan, monitor results, justify violations, and generate a compliance memo — fully autonomously.

**Rails controller:** `Api::V1::ComplianceController` — check, bulk_check, bulk_check_status, scan_history, scan_history_detail, justify, generate_memo
**Rails controller:** `Api::V1::Compliance::EvidencePacksController` — create, show, download, regenerate

| Tool | Complexity | Notes |
|------|------------|-------|
| run_compliance_check | Medium | Async — returns job_id; accepts compliance_check params (purchase_order_id, budget_id, items, attachments). Response: {status: "processing", job_id, purchase_order_id} |
| run_bulk_compliance_check | Medium | Accepts purchase_order_ids array; async; returns bulk_scan_id |
| get_bulk_compliance_check_status | Low | Polls status for a bulk scan; returns progress, passed/failed counts |
| list_compliance_scan_history | Low | Paginated history of completed bulk scans |
| get_compliance_scan_detail | Low | Full result data for a specific bulk scan |
| justify_compliance_violation | Medium | Requires violation_id, justification_reason (min 10 chars); triggers audit trail |
| generate_compliance_memo | High | AI-powered memo generation; accepts violation context, alternatives, rationale |
| create_evidence_pack | Medium | Triggers async ZIP generation of compliance evidence; returns evidence_pack with status |
| get_evidence_pack | Low | Returns evidence pack status and download availability |
| download_evidence_pack | Low | Returns signed S3 download URL |
| regenerate_evidence_pack | Low | Triggers re-generation of an existing evidence pack |

**Dependency:** Requires compliance/policies feature flag enabled on the company. Evidence packs require a completed compliance_check. generate_compliance_memo depends on violation_id from a prior check.

**Polling pattern:** run_compliance_check and run_bulk_compliance_check are async. Agents must poll get_bulk_compliance_check_status or re-fetch the PO's latest_compliance_check field.

### 2. Digital Invoice (Scan and Match)
**Value:** An agent can receive a PDF invoice file, scan it with OCR/AI (Mindee), and automatically create a structured invoice with pre-populated fields. Eliminates manual invoice data entry.

**Rails controller:** `Api::V1::DigitalInvoicesController#create`

| Tool | Complexity | Notes |
|------|------------|-------|
| create_digital_invoice | High | Multipart: file (PDF/image), upload_type (invoice or request); returns Invoice or PurchaseOrder; requires scan_and_match feature flag |

**Dependency:** Requires scan_and_match_ff_enabled on company (visible in get_company_details response). For upload_type=request, creates a draft PO from the scan.

### 3. Policies CRUD
**Value:** Procurement policies define what is and isn't allowed. An AI agent managing a compliance-focused workflow needs to read, create, and update policies — not just check against them.

**Rails controller:** `Api::V1::PoliciesController` — index, show, create, update, destroy

| Tool | Complexity | Notes |
|------|------------|-------|
| list_policies | Low | Filters: status, archived, scope, category, budget_id, search; paginated |
| get_policy | Low | Returns PolicyDetailSerializer with version history |
| create_policy | Medium | Permits: name, description, status, scope, category, content, min_amount, max_amount, min_quotes_required, archived, budget_ids[], required_attachments[] |
| update_policy | Medium | Same as create |
| delete_policy | Low | Soft delete (acts_as_paranoid) |
| list_policy_templates | Low | Read-only; returns PolicyTemplateService.all — no params |

**Dependency:** Requires policy_ff_enabled on company.

### 4. NPayments (Settlement Payments)
**Value:** NPayments are invoice settlement records. The existing Payments tools cover PO-level payments, but invoice settlements (npayments) are tracked separately. An agent managing the full invoice-to-payment lifecycle needs both.

**Rails controller:** `Api::V1::NpaymentsController` — already partially exposed via payments.ts

**Gap:** The existing payments.ts creates payments but does not retrieve them. Verify alignment with npayments controller.

| Tool | Complexity | Notes |
|------|------------|-------|
| create_npayment (standalone) | Low | Already in payments.ts as create_payment; verify params match NpaymentsController |
| get_npayment | Low | Already in payments.ts as get_payment; verify response type matches NpaymentDetailSerializer |

**Action:** These may already be covered. Cross-check payments.ts against `Api::V1::NpaymentsController` strong params.

### 5. Bulk PO Creation (bulk_save)
**Value:** AI agents processing batch procurement (importing from ERP, creating multiple POs from a CSV) need to create multiple POs in a single API call. The existing create_purchase_order is single-PO only.

**Rails action:** `Api::V1::PurchaseOrdersController#bulk_save`

| Tool | Complexity | Notes |
|------|------------|-------|
| bulk_create_purchase_orders | High | Accepts purchase_order.data[] array; each item has same params as single PO plus _id (client-side reference) and commit; returns {done: [{_id, id}], failed: [{_id, errors}]} |

**Dependency:** Each sub-PO follows same validation rules as single create. Partial success is possible — bulk_save does not roll back on partial failure.

### 6. SAM.gov Supplier Verification
**Value:** Government procurement agents must verify suppliers against SAM.gov exclusion lists. This check determines whether a supplier is eligible for a government contract.

**Rails controller:** `Api::V1::SamGovController` — check, status

| Tool | Complexity | Notes |
|------|------------|-------|
| check_sam_gov_supplier | Low | Params: supplier_id, force (boolean); triggers async check; returns check status |
| get_sam_gov_supplier_status | Low | Returns most recent SAM.gov check for a supplier |

**Dependency:** Requires policies feature flag enabled (FeatureFlag.policies_enabled?). Supplier must exist.

### 7. Supplier Approvals
**Value:** Companies with supplier qualification workflows require explicit approval of new suppliers before they can be used on POs. An AI onboarding agent needs to read and surface supplier approval status.

**Rails controller:** `Api::V1::SupplierApprovalsController` — index (read-only, no create/update)

| Tool | Complexity | Notes |
|------|------------|-------|
| list_supplier_approvals | Low | Params: search, page; requires add_supplier_approval company setting AND supplier_approval_api_access feature flag |

**Dependency:** Narrow audience — only companies with supplier approval feature enabled.

### 8. Chat Messages (V3 only)
**Value:** Collaborative procurement requires communication on documents. An AI agent participating in a procurement workflow can post status updates, request information, or summarize actions as chat messages on POs or invoices.

**Rails controller:** `Api::V3::ChatMessagesController` — index, create, destroy

| Tool | Complexity | Notes |
|------|------------|-------|
| list_chat_messages | Low | V3 only; params: document_type, document_id, supplier_id, before_id (cursor pagination) |
| create_chat_message | Low | V3 only; params: document_type, document_id, supplier_id, body |
| delete_chat_message | Low | V3 only; params: document_type, document_id, supplier_id, id |

**Dependency:** V3 API only. Not available in V1. Must be gated on API version check.

### 9. Auto-Approvers Preview (Legacy)
**Value:** `auto_approvers_list` is a legacy endpoint (before approval flows) that returns which approvers are required based on budget and amount. Useful for companies not using approval flows.

**Rails action:** `Api::V1::PurchaseOrdersController#auto_approvers_list`

| Tool | Complexity | Notes |
|------|------------|-------|
| get_auto_approvers | Low | Params: gross_total, budget_ids[], show_last_approver_on_edit; returns approver array |

**Dependency:** Relevant only for companies not using approval flows feature.

---

## Anti-Features

Things to deliberately NOT build into this MCP server.

### 1. V1 Sign-In / Register Tools
**What:** The Rails backend has auth_controller endpoints for user sign-in and registration.
**Why avoid:** Pre-provisioned tokens are the intended deployment model. Adding sign-in creates credential management burden in MCP clients and exposes passwords in tool calls. Explicitly called out as out-of-scope in PROJECT.md.
**What to do instead:** Document that clients must configure PROCUREMENTEXPRESS_AUTH_TOKEN (V1) or PROCUREMENTEXPRESS_CLIENT_ID/SECRET (V3 OAuth2) in environment.

### 2. Admin/Billing/Subscription Tools
**What:** Rails has ChargesController, CheckoutsController, admin tools, subscription management.
**Why avoid:** These are not procurement workflow operations. They require admin-level access that MCP clients won't have, and surfacing billing actions in an AI tool creates risk of accidental charges.
**What to do instead:** Leave these in the Rails web UI where they belong.

### 3. QBO/Xero/Sage Direct Sync Tools
**What:** Rails has Xero sync actions, QBO push, Sage export. The supplementary.ts already exposes chart-of-accounts and QBO customer/class lookups.
**Why avoid:** Accounting sync is triggered server-side by the Rails backend automatically on approval/payment events. Exposing manual sync as MCP tools creates double-sync risk and depends on integration state being fully configured.
**What to do instead:** The existing supplementary tools (chart of accounts, QBO customers/classes) cover what agents need for line item coding. Let the backend handle sync triggers.

### 4. Report Generation Tools
**What:** `Api::V1::ReportsController` — generates spend reports, exports.
**Why avoid:** Reports are outputs for humans, not inputs for AI agent workflows. Agents work with structured data from list/get tools, not opaque report blobs.
**What to do instead:** Agents should aggregate data from list_purchase_orders, list_invoices, etc., using filter params (date ranges, status, supplier) and compute summaries themselves.

### 5. Punchout / B2B Catalog Tools
**What:** `Api::V1::PunchoutsController` — B2B catalog punchout integration.
**Why avoid:** Punchout is a specialized e-procurement integration protocol (cXML/OCI) that operates outside the normal MCP tool pattern. It requires browser-based session flows that cannot be handled in stdio.
**What to do instead:** Not applicable to AI agent workflows.

### 6. Bulk Data Controller
**What:** `Api::V1::BulkDatasController` — bulk import operations.
**Why avoid:** Bulk import is a one-time data migration tool, not a routine procurement operation. It also handles file uploads in formats (CSV/Excel) that add significant complexity for minimal agent benefit.
**What to do instead:** Use bulk_create_purchase_orders for programmatic bulk creation.

### 7. Exchange Token Controller
**What:** `Api::V1::ExchangeTokensController` — token exchange for mobile/web clients.
**Why avoid:** This is a session management mechanism for browser/mobile clients, not API consumers. MCP clients use static tokens or OAuth2 directly.
**What to do instead:** Existing auth tools (authenticate_v1, authenticate_v3) cover MCP auth needs.

---

## Feature Dependencies

```
custom fields CRUD → any PO/invoice creation with custom field values
preview_purchase_order_approvers → knows approval flow assignment before submit
list_linkable_purchase_orders → create_invoice (linked to POs)
list_purchase_order_items_for_invoice → create_invoice (linked line items)

run_compliance_check → justify_compliance_violation
run_compliance_check → create_evidence_pack
create_evidence_pack → get_evidence_pack → download_evidence_pack
create_evidence_pack ← completed compliance_check

create_digital_invoice → scan_and_match_ff_enabled (company setting)
list_policies → policy_ff_enabled (company setting)
list_supplier_approvals → add_supplier_approval (company setting) + supplier_approval_api_access (feature flag)
check_sam_gov_supplier → policies_enabled (feature flag)
list_chat_messages → V3 API version only

upload_purchase_order_file → generate upload_token first (client-side UUID)
```

---

## MVP Recommendation for This Milestone

Priority ordering for implementing missing tools:

**Phase 2 (High Priority — core agent workflows):**
1. Custom Fields CRUD (6 tools) — agents are blind without these
2. preview_purchase_order_approvers — essential for PO submission confidence
3. list_linkable_purchase_orders + list_purchase_order_items_for_invoice — completes invoice creation
4. get_purchase_order_aff_link — simple, frequently useful

**Phase 3 (Medium Priority — key differentiators):**
5. File uploads: upload_purchase_order_file, upload_comment_file, get_upload_status
6. create_digital_invoice — AI-powered invoice scanning
7. Compliance module: run_compliance_check, get_bulk_compliance_check_status, justify_compliance_violation, generate_compliance_memo, evidence pack tools (11 tools total)
8. bulk_create_purchase_orders
9. NPayments alignment check (may already be covered)

**Phase 4 (Lower Priority — narrow audience):**
10. Policies + Policy Templates CRUD (6 tools)
11. SAM.gov check/status (2 tools)
12. Chat Messages, V3 only (3 tools)
13. Supplier Approvals (1 tool)
14. get_auto_approvers (1 tool — legacy)

**Defer indefinitely:** Admin, billing, punchout, bulk data, exchange tokens, report generation.

---

## Feature Complexity Summary

| Feature Group | Tools | Complexity | Phase |
|---------------|-------|------------|-------|
| Custom Fields CRUD | 6 | Low-Medium | 2 |
| PO approver preview | 1 | High | 2 |
| Invoice PO linking | 2 | Low | 2 |
| PO aff_link | 1 | Low | 2 |
| File uploads | 3 | Medium-High | 3 |
| Digital invoice | 1 | High | 3 |
| Compliance module | 11 | Medium-High | 3 |
| Bulk PO creation | 1 | High | 3 |
| Policies CRUD | 6 | Medium | 4 |
| SAM.gov | 2 | Low | 4 |
| Chat Messages (V3) | 3 | Low | 4 |
| Supplier Approvals | 1 | Low | 4 |
| Auto-approvers | 1 | Low | 4 |

**Total new tools:** ~39 tools across phases 2-4

---

## Sources

- Rails V1 controller actions read directly from `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/` (authoritative)
- Rails V3 controller actions read from `/Users/przbadu/projects/pex/po-app/app/controllers/api/v3/` (authoritative)
- Existing MCP tool schemas read from `src/tools/*.ts` (current state)
- TypeScript types read from `src/types.ts` (current response types)
- Project requirements from `.planning/PROJECT.md`
- Confidence: HIGH — all findings based on direct Rails source code inspection, not documentation
