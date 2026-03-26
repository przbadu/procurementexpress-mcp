# Requirements: ProcurementExpress MCP Server — Audit & Update

**Defined:** 2026-03-25
**Core Value:** Every MCP tool must be a faithful, complete representation of the corresponding Rails API endpoint

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Schema Alignment

- [x] **SCHEMA-01**: All PO tool input Zod schemas match Rails PurchaseOrdersController strong params exactly
- [x] **SCHEMA-02**: All Invoice tool input Zod schemas match Rails InvoicesController strong params exactly
- [x] **SCHEMA-03**: All Supplier tool input Zod schemas match Rails SuppliersController strong params exactly
- [x] **SCHEMA-04**: All Budget tool input Zod schemas match Rails BudgetsController strong params exactly
- [x] **SCHEMA-05**: All Department tool input Zod schemas match Rails DepartmentsController strong params exactly
- [x] **SCHEMA-06**: All Company tool input Zod schemas match Rails CompaniesController strong params exactly
- [x] **SCHEMA-07**: All Webhook tool input Zod schemas match Rails WebhooksController strong params exactly
- [x] **SCHEMA-08**: All ApprovalFlow tool input Zod schemas match Rails ApprovalFlowsController strong params exactly
- [x] **SCHEMA-09**: All Payment tool input Zod schemas match Rails PaymentsController strong params exactly
- [x] **SCHEMA-10**: All TaxRate tool input Zod schemas match Rails TaxRatesController strong params exactly
- [x] **SCHEMA-11**: All Product tool input Zod schemas match Rails ProductsController strong params exactly
- [x] **SCHEMA-12**: All Comment tool input Zod schemas match Rails CommentsController strong params exactly

### Type System

- [x] **TYPE-01**: PurchaseOrder has separate Summary (list) and Detail (get) TypeScript types matching respective serializers
- [x] **TYPE-02**: Invoice has separate Summary (list) and Detail (get) TypeScript types matching respective serializers
- [x] **TYPE-03**: Company has separate Summary (list) and Detail (get) TypeScript types matching respective serializers
- [x] **TYPE-04**: Webhook has separate Summary (list) and Detail (get) TypeScript types matching respective serializers
- [x] **TYPE-05**: ApprovalFlow has separate Summary (list) and Detail (get) TypeScript types matching respective serializers
- [x] **TYPE-06**: All response type fields match Rails ActiveModelSerializer attributes exactly (no missing, no invented)
- [x] **TYPE-07**: Conditional serializer fields typed as optional (e.g., authentication_token, third_party_id_mappings)

### Infrastructure

- [x] **INFRA-01**: ApiClient error handler supports both `{ error: "..." }` and `{ errors: [...] }` response formats
- [x] **INFRA-02**: Shared Zod schemas extracted to src/schemas.ts (customFieldValues, lineItems, nested attributes)
- [x] **INFRA-03**: Non-paginated endpoints (departments, companies, currencies, employees, approvers) handle plain array responses correctly
- [x] **INFRA-04**: Paginated endpoints document meta fields (current_page, next_page, prev_page, total_pages, total_count)

### Custom Fields Module

- [x] **CF-01**: User can list all custom fields for a company
- [x] **CF-02**: User can get a single custom field by ID
- [x] **CF-03**: User can create a custom field with all supported params (name, field_type, default_value, active, required, option_list, access_level, on_line_item, display_on_pdf, editable_after_approval, formula_builder, precision_display, archived)
- [x] **CF-04**: User can update an existing custom field
- [x] **CF-05**: User can delete a custom field
- [x] **CF-06**: User can update custom field positions (reorder)

### Compliance Module

- [x] **COMP-01**: User can trigger a compliance check on a PO or invoice (async, 202 response)
- [x] **COMP-02**: User can trigger bulk compliance checks
- [x] **COMP-03**: User can get bulk check status
- [x] **COMP-04**: User can justify a compliance violation
- [x] **COMP-05**: User can generate a compliance memo (AI-generated)
- [x] **COMP-06**: User can list compliance scan history
- [x] **COMP-07**: User can get scan details by ID
- [x] **COMP-08**: User can create an evidence pack
- [x] **COMP-09**: User can get an evidence pack by ID
- [x] **COMP-10**: User can download an evidence pack

### File Uploads Module

- [x] **UPLOAD-01**: User can upload a file to a purchase order
- [x] **UPLOAD-02**: User can upload a file to a comment
- [x] **UPLOAD-03**: User can check upload status by token

### Missing PO Tools

- [x] **PO-01**: User can bulk save (create/update) purchase orders
- [x] **PO-02**: User can get auto-approvers list for a PO
- [x] **PO-03**: User can get available approvers list for a PO
- [x] **PO-04**: User can get approval flow link for a PO

### Missing Invoice Tools

- [x] **INV-01**: User can list POs available to link to an invoice
- [x] **INV-02**: User can list PO items available to link to an invoice
- [x] **INV-03**: User can rerun approval flow on an invoice

### Missing Product Tools

- [x] **PROD-01**: User can bulk create products
- [x] **PROD-02**: User can list product SKUs

### Policies Module

- [x] **POL-01**: User can list policies
- [x] **POL-02**: User can get a policy by ID
- [x] **POL-03**: User can create a policy
- [x] **POL-04**: User can update a policy
- [x] **POL-05**: User can delete a policy
- [x] **POL-06**: User can list policy templates

### Low-Priority Tools

- [x] **LOW-01**: User can check a supplier against SAM.gov database
- [x] **LOW-02**: User can list chat messages (V3 only)
- [x] **LOW-03**: User can create a chat message (V3 only)
- [x] **LOW-04**: User can delete a chat message (V3 only)
- [x] **LOW-05**: User can list pending supplier approval requests
- [x] **LOW-06**: User can create a digital invoice from upload (scan & create)
- [x] **LOW-07**: User can create an NPayment (multi-invoice/PO settlement)
- [x] **LOW-08**: User can get an NPayment by ID
- [x] **LOW-09**: User can list pending invites for a company
- [x] **LOW-10**: Missing approval flow tools (unpublish, version_details, bulk rerun)

### Testing

- [x] **TEST-01**: Every modified tool has E2E tests validating request body shape against MockApiServer
- [x] **TEST-02**: Every new tool has E2E tests with MockApiServer mock routes
- [ ] **TEST-03**: MockApiServer validates request bodies (not just routes)
- [ ] **TEST-04**: Negative tests exist for invalid input (Zod rejection)
- [x] **TEST-05**: Build passes with zero TypeScript errors
- [ ] **TEST-06**: All existing tests continue to pass (no regressions)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Real-time webhook event testing/simulation
- **ADV-02**: Batch operations across multiple companies
- **ADV-03**: Report generation tools (spend reports, budget summaries)
- **ADV-04**: Automated schema drift detection (compare MCP schemas to Rails source)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Sign-in/Register API tools | Users must use pre-provisioned tokens; security risk |
| Rails backend modifications | MCP must conform to backend, not vice versa |
| UI/frontend changes | This is a CLI MCP server |
| Breaking tool name changes | Must preserve backwards compatibility for MCP clients |
| New runtime dependencies | Stack is locked; all work is manual schema authoring |
| Zod v4 migration | MCP SDK has known bugs with Zod v4 schemas |
| Exchange rate management | Handled via company settings, not standalone tools |
| Billing/subscription admin | Not appropriate for MCP agent access |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 1 | Complete |
| SCHEMA-02 | Phase 1 | Complete |
| SCHEMA-03 | Phase 1 | Complete |
| SCHEMA-04 | Phase 1 | Complete |
| SCHEMA-05 | Phase 1 | Complete |
| SCHEMA-06 | Phase 1 | Complete |
| SCHEMA-07 | Phase 1 | Complete |
| SCHEMA-08 | Phase 1 | Complete |
| SCHEMA-09 | Phase 1 | Complete |
| SCHEMA-10 | Phase 1 | Complete |
| SCHEMA-11 | Phase 1 | Complete |
| SCHEMA-12 | Phase 1 | Complete |
| TYPE-01 | Phase 1 | Complete |
| TYPE-02 | Phase 1 | Complete |
| TYPE-03 | Phase 1 | Complete |
| TYPE-04 | Phase 1 | Complete |
| TYPE-05 | Phase 1 | Complete |
| TYPE-06 | Phase 1 | Complete |
| TYPE-07 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| CF-01 | Phase 2 | Complete |
| CF-02 | Phase 2 | Complete |
| CF-03 | Phase 2 | Complete |
| CF-04 | Phase 2 | Complete |
| CF-05 | Phase 2 | Complete |
| CF-06 | Phase 2 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| COMP-06 | Phase 2 | Complete |
| COMP-07 | Phase 2 | Complete |
| COMP-08 | Phase 2 | Complete |
| COMP-09 | Phase 2 | Complete |
| COMP-10 | Phase 2 | Complete |
| PO-01 | Phase 2 | Complete |
| PO-02 | Phase 2 | Complete |
| PO-03 | Phase 2 | Complete |
| PO-04 | Phase 2 | Complete |
| INV-01 | Phase 2 | Complete |
| INV-02 | Phase 2 | Complete |
| INV-03 | Phase 2 | Complete |
| UPLOAD-01 | Phase 3 | Complete |
| UPLOAD-02 | Phase 3 | Complete |
| UPLOAD-03 | Phase 3 | Complete |
| PROD-01 | Phase 3 | Complete |
| PROD-02 | Phase 3 | Complete |
| LOW-10 | Phase 3 | Complete |
| POL-01 | Phase 4 | Complete |
| POL-02 | Phase 4 | Complete |
| POL-03 | Phase 4 | Complete |
| POL-04 | Phase 4 | Complete |
| POL-05 | Phase 4 | Complete |
| POL-06 | Phase 4 | Complete |
| LOW-01 | Phase 4 | Complete |
| LOW-02 | Phase 4 | Complete |
| LOW-03 | Phase 4 | Complete |
| LOW-04 | Phase 4 | Complete |
| LOW-05 | Phase 4 | Complete |
| LOW-06 | Phase 4 | Complete |
| LOW-07 | Phase 4 | Complete |
| LOW-08 | Phase 4 | Complete |
| LOW-09 | Phase 4 | Complete |
| TEST-01 | Phase 5 | Complete |
| TEST-02 | Phase 5 | Complete |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Complete |
| TEST-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 67 total
- Mapped to phases: 67
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after roadmap creation — full per-requirement traceability expanded*
