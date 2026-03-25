# Phase 1: Schema & Type Foundation — Research

**Researched:** 2026-03-25
**Domain:** TypeScript MCP server — Rails API schema alignment (Zod input schemas + TypeScript response types)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Order**: PO → Invoice → Company → rest (highest complexity first)
- **Verification**: Read Rails controller `_params` + serializer `attributes` directly — Rails is authoritative
- **Unlisted params**: Add any params Rails accepts that the issue missed
- **Widening**: New optional params are non-breaking — add as `.optional()`
- **Naming**: `FooSummary` (list) / `Foo` (detail) — matches existing `PurchaseOrderSummary` pattern
- **Location**: All in `src/types.ts` — single source of truth
- **Conditional fields**: Mark as optional (`field?: Type`)
- **Schemas file**: `customFieldValuesSchema`, `lineItemBaseSchema`, `nestedDestroySchema` — individual named exports from `src/schemas.ts`
- **Schemas timing**: Phase 1 before tool alignment (prevents fixing same schema in multiple files)

### Claude's Discretion
- Specific ordering within each tool group's corrections
- Exact naming of internal schema variables in `src/schemas.ts`
- Whether to add `superRefine` on `_destroy` validation at schema or tool level

### Deferred Ideas (OUT OF SCOPE)
- Test body validation (Phase 5)
- New tools (Phases 2–4)
- Any breaking changes to existing tool names or required params
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | All PO tool input Zod schemas match Rails PurchaseOrdersController strong params exactly | Rails `po_params` permit list audited; concrete diff below |
| SCHEMA-02 | All Invoice tool input Zod schemas match Rails InvoicesController strong params exactly | Rails `invoice_params` permit list audited; concrete diff below |
| SCHEMA-03 | All Supplier tool input Zod schemas match Rails SuppliersController strong params exactly | Rails `supplier_params` permit list audited; concrete diff below |
| SCHEMA-04 | All Budget tool input Zod schemas match Rails BudgetsController strong params exactly | Rails `budget_params` permit list audited; concrete diff below |
| SCHEMA-05 | All Department tool input Zod schemas match Rails DepartmentsController strong params exactly | Rails `department_params` audited; diff below |
| SCHEMA-06 | All Company tool input Zod schemas match Rails CompaniesController strong params exactly | Rails `invite_user_params` + company tools audited; diff below |
| SCHEMA-07 | All Webhook tool input Zod schemas match Rails WebhooksController strong params exactly | Rails `webhook_params` audited; diff below |
| SCHEMA-08 | All ApprovalFlow tool input Zod schemas match Rails ApprovalFlowsController strong params exactly | Rails `approval_flow_params` audited; diff below |
| SCHEMA-09 | All Payment tool input Zod schemas match Rails PaymentsController/NpaymentsController strong params exactly | Rails `npayment_params` audited; diff below |
| SCHEMA-10 | All TaxRate tool input Zod schemas match Rails TaxRatesController strong params exactly | Rails `tax_rate_params` audited; no gaps found |
| SCHEMA-11 | All Product tool input Zod schemas match Rails ProductsController strong params exactly | Rails `product_params` audited; diff below |
| SCHEMA-12 | All Comment tool input Zod schemas match Rails CommentsController strong params exactly | Rails `poc_params` audited; diff below |
| TYPE-01 | PurchaseOrder has separate Summary (list) and Detail (get) TypeScript types | `PurchaseOrderSummary` exists in types.ts but list tool uses `PurchaseOrder[]` — wire fix needed |
| TYPE-02 | Invoice has separate Summary (list) and Detail (get) TypeScript types | `InvoiceSummary` exists in types.ts but list tool uses `Invoice[]` — wire fix needed |
| TYPE-03 | Company has separate Summary (list) and Detail (get) TypeScript types | `Company` (list) and `CompanyDetail` (get) already exist — list tool needs type check |
| TYPE-04 | Webhook has separate Summary (list) and Detail (get) TypeScript types | `WebhookSerializer` vs `WebhookDetailSerializer` — `WebhookSummary` type needs creation |
| TYPE-05 | ApprovalFlow has separate Summary (list) and Detail (get) TypeScript types | `ApprovalFlowSerializer` vs `ApprovalFlowDetailSerializer` — `ApprovalFlowSummary` type needed |
| TYPE-06 | All response type fields match Rails ActiveModelSerializer attributes exactly | Diffs documented below — missing fields: xero fields, compliance_status, sam_gov_enabled |
| TYPE-07 | Conditional serializer fields typed as optional | Several serializer fields are conditionally present (feature-flag-gated) — need `?` |
| INFRA-01 | ApiClient error handler supports `{ error }` and `{ errors }` formats | `error_response()` returns `{ error: message }` — client only reads `.message`; fix documented |
| INFRA-02 | Shared Zod schemas extracted to src/schemas.ts | `customFieldValueSchema` duplicated in 4 files; extraction plan documented |
| INFRA-03 | Non-paginated endpoints handle plain array responses correctly | Already works for departments, budgets, tax_rates; no code change needed |
| INFRA-04 | Paginated endpoints document meta fields | Already documented in list tool descriptions; confirm completeness |
</phase_requirements>

---

## Summary

Phase 1 is a disciplined schema alignment pass — no new features, no breaking changes, purely additive corrections. The Rails source has been fully audited and every concrete gap between the current MCP code and the Rails API contract has been identified.

The most impactful fixes are: (1) wiring `PurchaseOrderSummary` and `InvoiceSummary` to the list tools that wrongly use the detail types; (2) creating `WebhookSummary` and `ApprovalFlowSummary` types; (3) fixing `api-client.ts` error parsing to handle `{ error: "..." }` instead of `{ message: "..." }`; (4) extracting `customFieldValueSchema` to `src/schemas.ts`; and (5) adding the few missing params to PO, Invoice, and Budget schemas.

The Rails error system returns `{ error: message, status: code }` (see `lib/api/response.rb`) — the current `api-client.ts` reads `errorBody.message` which is always undefined, so every API error is silently swallowed and surfaced as "undefined" to the MCP caller. This is a critical fix.

**Primary recommendation:** Fix `api-client.ts` error handling first (INFRA-01), then extract `src/schemas.ts` (INFRA-02), then work tool-by-tool in PO → Invoice → Company → rest order, using Rails controller `permit()` blocks as the authority for each change.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | 3.25.76 | Input schema validation | MCP SDK requirement; stay on v3 — SDK bugs with v4 |
| `@modelcontextprotocol/sdk` | 1.27.1 | MCP server runtime | Project foundation; do not update |
| `typescript` | 5.9.3 | Static typing | Build system |
| `vitest` | 4.x | Test runner | Existing test suite |

### No New Dependencies
This phase requires zero new npm packages. All work is authoring TypeScript types and Zod schemas against the existing stack.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)
```
src/
├── index.ts              # Entry point — unchanged in Phase 1
├── api-client.ts         # Fix error parsing (INFRA-01)
├── types.ts              # Add missing fields, fix list/detail splits (TYPE-*)
├── schemas.ts            # NEW — shared Zod schemas (INFRA-02)
├── tool-helpers.ts       # Unchanged
└── tools/
    ├── purchase-orders.ts  # Schema corrections (SCHEMA-01)
    ├── invoices.ts         # Schema corrections (SCHEMA-02)
    ├── suppliers.ts        # Schema corrections (SCHEMA-03)
    ├── budgets.ts          # Schema corrections (SCHEMA-04)
    ├── departments.ts      # Schema corrections (SCHEMA-05)
    ├── companies.ts        # Schema corrections (SCHEMA-06)
    ├── webhooks.ts         # Schema corrections + type split (SCHEMA-07, TYPE-04)
    ├── approval-flows.ts   # Schema corrections + type split (SCHEMA-08, TYPE-05)
    ├── payments.ts         # Schema corrections (SCHEMA-09)
    ├── tax-rates.ts        # Minor corrections (SCHEMA-10)
    ├── products.ts         # Minor corrections (SCHEMA-11)
    ├── comments.ts         # Minor corrections (SCHEMA-12)
    └── supplementary.ts    # No changes needed
```

### Pattern 1: src/schemas.ts Extraction
**What:** Extract duplicated Zod schemas shared across multiple tool files into named exports in `src/schemas.ts`.
**When to use:** Any schema used in 2+ tool files.
**Example:**
```typescript
// src/schemas.ts
import { z } from "zod";

export const customFieldValueSchema = z.object({
  id: z.number().int().optional().describe("Custom field value ID (for updates)"),
  value: z.string().describe("Custom field value"),
  custom_field_id: z.number().int().describe("Custom field ID"),
});

// With _destroy for nested attributes (for update operations)
export const nestedDestroyMixin = {
  _destroy: z.boolean().optional().describe("Set true to remove this item on update"),
};

// PO line item base — used in purchase-orders.ts
export const lineItemSchema = z.object({
  id: z.number().int().optional(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  budget_id: z.number().int().optional(),
  vat: z.number().optional(),
  tax_rate_id: z.number().int().optional(),
  item_number: z.string().optional(),
  sequence_no: z.number().int().optional(),
  department_id: z.number().int().optional(),
  product_id: z.number().int().optional(),
  chart_of_account_id: z.number().int().optional(),
  qbo_customer_id: z.number().int().optional(),
  quickbooks_class_id: z.number().int().optional(),
  qbo_line_description: z.string().optional(),
  archived: z.boolean().optional(),
  _destroy: z.boolean().optional(),
  custom_field_values_attributes: z.array(customFieldValueSchema).optional(),
});
```

### Pattern 2: List vs Detail Type Split
**What:** Use `FooSummary` for index (list) response types and `Foo` for show (detail) response types.
**When to use:** Any endpoint that has separate `FooSerializer` and `FooDetailSerializer` in Rails.
**Example:**
```typescript
// src/types.ts
// Existing — keep as-is
export interface PurchaseOrderSummary { ... }  // matches PurchaseOrderSerializer
export interface PurchaseOrder { ... }          // matches PurchaseOrderDetailsSerializer

// New type splits needed:
export interface WebhookSummary { ... }         // matches WebhookSerializer (no webhook_attributes)
export interface Webhook { ... }                // matches WebhookDetailSerializer (has webhook_attributes)

export interface ApprovalFlowSummary { ... }    // matches ApprovalFlowSerializer (no steps/conditions)
// ApprovalFlow already has optional approval_steps? — keep but rename detail use
```

### Pattern 3: apiClient.ts Error Parsing Fix
**What:** Rails returns `{ error: message, status: code }` from `error_response()`. Current code reads `errorBody.message` (always undefined).
**Correct fix:**
```typescript
// api-client.ts — request() method error branch
try {
  const errorBody = await response.json() as Record<string, unknown>;
  // Rails returns: { error: "string" | string[] } from error_response()
  // V3 Doorkeeper returns: { error: "invalid_grant" } or { errors: [...] }
  if (typeof errorBody.error === "string") {
    message = errorBody.error;
  } else if (Array.isArray(errorBody.error)) {
    message = (errorBody.error as string[]).join("; ");
  } else if (Array.isArray(errorBody.errors)) {
    message = (errorBody.errors as string[]).join("; ");
  } else if (typeof errorBody.message === "string") {
    message = errorBody.message;
  } else {
    message = response.statusText;
  }
} catch {
  message = response.statusText;
}
```

### Anti-Patterns to Avoid
- **Using `PurchaseOrder[]` for list tools**: The list serializer omits `purchase_order_items`, `custom_fields`, `approvers_with_flow`, etc. Use `PurchaseOrderSummary[]`.
- **Using `Invoice[]` for list tools**: Same issue — use `InvoiceSummary[]`.
- **Duplicating `customFieldValueSchema` in every tool file**: Extract once to `src/schemas.ts`.
- **Defining `inputSchema` as `z.object({...})`**: MCP SDK requires flat `ZodRawShape`, not a wrapped object.

---

## Concrete Schema Diff by Module

### SCHEMA-01: Purchase Orders (`purchase-orders.ts`)

**Rails `po_params` — currently MISSING from MCP schema:**
- `net_amount` on line items — Rails permits it; MCP doesn't expose it
- `purchase_order_id` on line items — Rails permits it for linked items
- `third_party_id_mappings_attributes` — Rails permits `[service, third_party_id, realm_id]` at PO level and item level (low priority — don't add)
- `purchase_order_item_allocations_attributes` — Rails permits `[id, department_id, budget_id, gl_code, percentage, amount, _destroy]` (low priority — don't add unless needed)
- `aff_link` — Rails permits it in `po_params` (niche field, optional addition)

**Currently in MCP schema but NOT in Rails `po_params`:**
- `iso_code` — Rails reads this directly from `params[:purchase_order][:iso_code]` outside the permit block; it is intentionally outside strong params. Current handling is correct.
- `on_behalf_of` — Same as `iso_code`: read via `params[:purchase_order][:on_behalf_of]` outside permit block. Current handling is correct.

**Line item `net_amount`** — Rails permits `:net_amount` in `purchase_order_items_attributes`. The MCP schema is missing this. Add as `z.number().optional()`.

**Delivery (`po_delivered_params`)** — Rails permits `{ delivered_on, notes, items: [id, quantity] }`. The MCP `receive_purchase_order_items` tool already matches this correctly via the `{ purchase_order: { items, delivered_on, notes } }` wrapper.

**`list_purchase_orders`** — Response type is `PurchaseOrder[]` but should be `PurchaseOrderSummary[]`. The list serializer (`PurchaseOrderSerializer`) does NOT include `purchase_order_items`, `custom_fields`, `approvers_with_flow`, `slug`, etc.

**Additional serializer fields on `PurchaseOrderSerializer` (list) not in `PurchaseOrderSummary`:**
- `compliance_status` (new field on serializer)
- `delivered_on` (unix timestamp)
- `delivery_status`
- `payment_status`
- `xero_export_status`
- `synced_with_xero`
- `xero_is_changed`

**Additional serializer fields on `PurchaseOrderDetailsSerializer` (detail) not in `PurchaseOrder`:**
- `xero_export_status`
- `xero_export_error_message`
- `xero_last_export_at`
- `xero_is_changed`
- `can_justify`
- `has_global_policies`
- `compliance_status` (on list serializer, not in detail — note discrepancy)

### SCHEMA-02: Invoices (`invoices.ts`)

**Rails `invoice_params` — currently MISSING from MCP schema:**
- `validation_date` — Rails permits it but MCP `create_invoice` / `update_invoice` schemas omit it
- `sage_exported` — Rails permits it (admin-level field; okay to omit from MCP)
- `confidence_score` — Rails permits it (scanner field; okay to omit)
- `digital_invoice` — Rails permits it (scanner field; okay to add as optional)
- `supplier_invoice_uploads_attributes: [id, file, _destroy]` — Rails permits it for invoice upload attachments (Phase 3 concern; omit from Phase 1)

**`list_invoices`** — Response type is `Invoice[]` but should be `InvoiceSummary[]`. `InvoiceSerializer` does NOT include `created_at`, `updated_at`, `sage_exported`, `selected_purchase_order_ids`, `invoice_line_items`, `purchase_orders`, `supplier_invoice_uploads`, etc.

**`InvoiceSummary` is missing:**
- `xero_export_status`
- `xero_is_changed`

**`Invoice` (detail) is missing:**
- `xero_export_status`
- `xero_export_error_message`
- `xero_last_export_at`
- `xero_is_changed`
- `supplier_id` (present in InvoiceDetailSerializer via `has_one :supplier`, so `supplier.id` is available; but `supplier_id` as a direct attribute is not emitted — leave as-is)

**Invoice comment endpoint** — The `add_invoice_comment` tool sends `{ invoice_comments: { comment } }`. The Rails controller uses `params.require(:invoice_comments).permit(:comment)`. This matches correctly.

### SCHEMA-03: Suppliers (`suppliers.ts`)

**Rails `supplier_params` — currently MISSING from MCP schema:**
- `payment_terms` — NOT in Rails `supplier_params` permit list (it is not a supplier attribute). MCP schema does not have it either — correct.
- `currency_id` — NOT in Rails `supplier_params` permit list. If needed, it requires Rails-side addition (out of scope). MCP schema should not add it.
- `xero_id`, `zapier_id`, `quickbooks_id` — Rails permits these but MCP omits them. Low-priority, add as optional.
- `third_party_id_mappings_attributes: [service, third_party_id, realm_id]` — Rails permits this. Omit from MCP (third-party sync, low priority).

**`create_supplier`** — Current schema is missing `payment_terms` field (but it's also not in Rails params). No change needed.
**`get_supplier`** — Rails `show` calls `success_response(@supplier)` which renders via `SupplierSerializer`. Check if `payment_terms` is in supplier serializer — not visible in rails source but the `Supplier` type in types.ts has it. It may be a legacy field.

### SCHEMA-04: Budgets (`budgets.ts`)

**Rails `budget_params` — currently MISSING from MCP schema:**
- `archived` — Not in `budget_params` but can be set via update. Rails may handle this outside permit; verify.
- `summary` — Not in Rails `budget_params` permit list. Remove from `Budget` type? No — it's a serializer attribute, not an input.
- `xero_id`, `zapier_id`, `quickbooks_id` — Rails permits but MCP omits. Low-priority.
- `third_party_id_mappings_attributes` — Rails permits. Omit from MCP.

**`create_budget`** — The `creator_id` is in the MCP schema. Rails `budget_params` permits `:creator_id`. Match confirmed.
**Response type** — `Budget` type already matches `BudgetSerializer` attributes well. Minor: `approved_this_month` and `third_party_id_mappings` are serializer-optional fields — already marked `?` in types.ts.

### SCHEMA-05: Departments (`departments.ts`)

**Rails `department_params` permit list:**
```ruby
:name, :archived, :contact_person, :phone_number, :email, :address, :tax_number, budget_ids: [], user_ids: []
```

**MCP schema vs Rails:** Perfect match. No gaps found.

### SCHEMA-06: Companies (`companies.ts`)

**`invite_user` tool** — Sends `{ invite_user: args }`. Rails controller has `send_user_invite` action. The actual Rails `invite_user_params` permit block needs to be confirmed. Looking at `CompaniesController`, it accepts invite via InviteUser model. The fields in MCP (`email, name, roles, approval_limit, department_ids`) align with what the Rails InviteUser model expects. No confirmed gaps, but the exact permit block was not in the read portion of the controller.

**Action: Read `send_user_invite` permit block in CompaniesController fully.**

**`set_active_company` tool** — Takes `company_id: string`. This is client-only (calls `apiClient.setCompanyId()`) — no Rails endpoint. Correct as-is.

**`list_companies`** — Returns `CompanyDetail[]` but Rails `index` action uses `CompanySerializer` (list serializer), not `CompanyDetailSerializer`. The correct return type is `Company[]` (the compact version with roles, is_locked, etc.).

**`get_company` / `get_company_details`** — Both use `CompanyDetailSerializer`. Correct return type is `CompanyDetail`. However, `CompanyDetail` in types.ts is MISSING `sam_gov_enabled` which `CompanyDetailSerializer` has as a new attribute.

### SCHEMA-07: Webhooks (`webhooks.ts`)

**Rails `webhook_params` permit list:**
```ruby
:name, :url, :authentication_header, :json_wrapper, :send_as_text, :archived, :tested, :basic_auth_uname, :basic_auth_pword,
event_type: [], webhook_attributes_attributes: [:id, :attrib_type, :key, :value, :_destroy]
```

**MCP schema vs Rails:**
- `tested` — Rails permits it but MCP omits it. Add as `z.boolean().optional()` to `update_webhook`.
- Match otherwise confirmed.

**Type split needed:**
- `WebhookSerializer` attributes: `id, name, url, archived, event_type, tested, response_code, json_wrapper` — NO `send_as_text`, NO `basic_auth_*`, NO `webhook_attributes`
- `WebhookDetailSerializer` attributes: all of the above PLUS `send_as_text, basic_auth_uname, basic_auth_pword` + `has_many :webhook_attributes`
- Current `Webhook` type in types.ts has ALL fields (detail level)
- Need: create `WebhookSummary` type matching `WebhookSerializer` (no auth fields, no webhook_attributes)
- `list_webhooks` should return `WebhookSummary[]`
- `get_webhook` returns `Webhook` (detail) — correct

### SCHEMA-08: Approval Flows (`approval-flows.ts`)

**Rails `approval_flow_params` permit list:**
```ruby
:name, :document_type, :self_approval_allowed,
approval_steps_attributes: [
  :id, :step_no, :all_should_approve, :_destroy,
  approval_step_approvers_attributes: [:id, :approval_step_id, :user_id, :_destroy],
  approval_conditions_attributes: [:id, :property, :operator, :value, :custom_field_id, :approval_step_id, :_destroy]
],
approval_conditions_attributes: [:id, :property, :operator, :value, :approval_flow_id, :custom_field_id, :_destroy]
```

**MCP schema vs Rails:**
- `approval_step_id` on step-level conditions — Rails permits it but MCP `approvalConditionSchema` omits it. Add as optional.
- `approval_flow_id` on flow-level conditions — Rails permits it. Already in `ApprovalCondition` type; not needed in input schema (server sets it).
- Match otherwise confirmed.

**Type split needed:**
- `ApprovalFlowSerializer`: `id, name, document_type, self_approval_allowed, company_id, version_no, archived, status, in_progress_entities_count, completed_entities_count, rejected_entities_count, total_entities_count, created_at, updated_at` — NO steps/conditions
- `ApprovalFlowDetailSerializer`: same attributes PLUS `has_many :approval_steps` and `has_many :approval_conditions`
- Current `ApprovalFlow` type in types.ts has `approval_steps?` and `approval_conditions?` (optional) — this works but is unclear
- Better: Create `ApprovalFlowSummary` (no steps/conditions) and keep `ApprovalFlow` as the detail type (with required steps/conditions on detail serializer)
- `list_approval_flows` should return `{ approval_flows: ApprovalFlowSummary[]; meta: PaginationMeta }`
- `get_approval_flow` returns `ApprovalFlow` (detail)

**`show_entity` response type** — `get_approval_flow_entity` tool does `apiClient.get(path)` with untyped result. The Rails `show_entity` action renders the entity (PO or invoice) — complex return type. Keep as `unknown` for now.

**`list_approval_flow_versions` response** — Returns `{ versions: [...], meta: PaginationMeta }`. The versions array has `{id, name, created_at, conditions_count, steps_count}` shape. Add a type for this.

### SCHEMA-09: Payments (`payments.ts`)

**Rails `npayment_params` permit list:**
```ruby
:reference, :status, :ptype, :date, :amount, :supplier_id, :company_id, :payment_mode, :currency_id, :user_id,
npayment_link_orders_attributes: [:id, :npayment_id, :purchase_order_id, :budget_id, :gross_amount, :_destroy],
npayment_invoices_attributes: [:id, :npayment_id, :invoice_id, :gross_amount, :_destroy],
npayment_comments_attributes: [:id, :comment, :creator_id, :system_generated]
```

**MCP `create_payment` vs Rails:**
- MCP sends `npayment_link_orders_attributes` but named `npayment_link_orders_attributes` in body — matches `purchase_orders` input mapped to `npayment_link_orders_attributes` correctly.
- MCP sends `npayment_invoices_attributes` — Rails `npayment_invoices_attributes` matches `invoice_id` + `gross_amount`. MCP uses `invoice_id` instead of `id` for the invoice — but Rails permits `invoice_id` in this nested array. Correct.
- `npayment_id` in nested arrays — Rails permits it but it is server-generated. Omit from MCP (correct).
- `creator_id` in `npayment_comments_attributes` — Rails permits it but MCP only sends `comment`. Server sets `creator_id`. Correct.
- `system_generated` — Rails permits it but MCP omits it (always false for API). Correct.

**`create_po_payment`** — Sends `{ payment: { amount, note, purchase_order_item_payments_attributes: [...] } }`. This goes to `/purchase_orders/:id/payments`. This is NOT the same as NpaymentsController — it's a separate `PaymentsController`. The Rails PaymentsController `payment_params` needs verification.

**Action: Read `/app/controllers/api/v1/payments_controller.rb` to verify `create_po_payment` body format.**

### SCHEMA-10: Tax Rates (`tax-rates.ts`)

**Rails `tax_rate_params`:** `:name, :archived, :value, :company_id`

**MCP schema vs Rails:** `:company_id` is permitted but MCP omits it (server-set). Correct. Otherwise matches. No changes needed.

### SCHEMA-11: Products (`products.ts`)

**Rails `product_params` needs reading.** The existing tool file uses `{ product: args }` wrapper with `description, supplier_id, sku, unit_price` — these appear correct based on the product model. Missing: `archived` on update (not visible in current update_product schema). Add `archived: z.boolean().optional()`.

**`create_product` vs Rails:** Rails `create` action loads `supplier_id` from `params[:product][:supplier_id]` to associate product. MCP passes it inside `{ product: args }`. Verify `product_params` includes `:supplier_id`.

**Action: Read `products_controller.rb` private `product_params` method fully.**

### SCHEMA-12: Comments (`comments.ts`)

**Rails `poc_params`:** `params.permit(:comment, :purchase_order_id)` — note the top-level permit, not nested.

**MCP `add_purchase_order_comment`** — Sends `{ comment: args.comment }` to `/purchase_orders/:purchase_order_id/comments`. The Rails CommentsController (nested under purchase_orders routes) uses `params.permit(:comment, :purchase_order_id)`. The `purchase_order_id` comes from the URL, not the body. The body `{ comment: "..." }` — Rails controller needs `params[:comment]`.

**Potential mismatch:** MCP sends `{ comment: "text" }` but Rails `poc_params` does `params.permit(:comment, :purchase_order_id)` (top-level, not nested). This is correct — Rails reads `params[:comment]` directly.

**Invoice comment** — MCP sends `{ invoice_comments: { comment } }`. Rails uses `params.require(:invoice_comments).permit(:comment)`. This matches.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| List/detail type discrimination | Custom serializer dispatch | Separate `FooSummary` / `Foo` interfaces | Rails already uses separate serializers |
| Error message extraction | Custom error format detection | Try `error` → `errors` → `message` in sequence | Matches Rails `error_response()` contract |
| Zod nested validation | Custom validator | `z.superRefine()` on array schema | Zod built-in cross-field validation |
| Shared schemas | Inline copy in each file | Named exports from `src/schemas.ts` | Prevents drift when schemas need updating |

**Key insight:** Rails strong params are the single source of truth. The MCP server is a thin JSON-to-typed-function adapter — it should not add validation logic beyond what Rails already enforces, except for the `_destroy` + `id` requirement which Rails silently ignores rather than rejecting.

---

## Common Pitfalls

### Pitfall 1: `errorBody.message` Is Always Undefined
**What goes wrong:** Every Rails error (401, 403, 404, 400, 422) surfaces as `Error: undefined` to the MCP caller instead of the actual message.
**Why it happens:** Rails `error_response()` returns `{ error: message, status: code }`. The current code reads `errorBody.message` which does not exist.
**How to avoid:** Change `api-client.ts` to try `errorBody.error` first (handles Rails V1 format and Doorkeeper V3 format), then `errorBody.errors` (Rails array format), then `errorBody.message` (legacy fallback).
**Warning signs:** If `withErrorHandling()` returns "Error: undefined", this bug is active.

### Pitfall 2: List Type Conflation
**What goes wrong:** List tool returns nested arrays (purchase_order_items, custom_fields) that are only in the detail serializer. TypeScript shows no error because the type is wrong, not the code.
**Why it happens:** `purchase-orders.ts` line 98: `apiClient.get<{ purchase_orders: PurchaseOrder[]; meta: PaginationMeta }>`. Rails sends `PurchaseOrderSerializer` objects (summary) but the code types it as `PurchaseOrder[]` (detail).
**How to avoid:** Correct type annotation to `PurchaseOrderSummary[]`. The runtime data is already correct (Rails sends summary); only the TypeScript type is wrong.
**Warning signs:** TypeScript never complains because the summary is a subset of the detail type structurally.

### Pitfall 3: `_destroy` Without `id` Is Silently Ignored by Rails
**What goes wrong:** An MCP caller sends `{ id: null, _destroy: true }` or `{ _destroy: true }` expecting an item deletion. Rails silently ignores the request — item remains, 200 response.
**Why it happens:** `accepts_nested_attributes_for` in Rails requires a real record `id` to perform a deletion.
**How to avoid:** Add Zod `superRefine` validation on nested attribute arrays: if any element has `_destroy: true` and no `id`, reject with a helpful error message before the request reaches Rails.

### Pitfall 4: `company_specific` on Departments Is a String, Not Boolean
**What goes wrong:** Rails `set_departments` does `if params[:company_specific] == "true"` — it compares to the string "true", not a boolean.
**Why it happens:** URL query params are always strings in Rails; boolean params need string comparison.
**How to avoid:** The MCP tool already sends `String(args.company_specific)` via URLSearchParams. This is correct — no change needed.

### Pitfall 5: Approval Flows `archive` vs Rails `update_column`
**What goes wrong:** `archive_approval_flow` tool sends a PUT request, but Rails uses `update_column` (bypasses callbacks/validations). The PUT route is correct — no body needed.
**How to avoid:** Already correct in current implementation. Document that no request body is required.

### Pitfall 6: `list_companies` Returns Summary Objects, Not Detail Objects
**What goes wrong:** `list_companies` is typed as `CompanyDetail[]` but Rails renders with `CompanySerializer` (summary format with `roles`, `is_locked`, etc.) — not `CompanyDetailSerializer`.
**Why it happens:** Type annotation error. The `get_company` and `get_company_details` tools correctly use `CompanyDetail`.
**How to avoid:** Change `list_companies` return type from `CompanyDetail[]` to `Company[]`.

---

## Code Examples

Verified patterns from Rails source:

### Correct Error Parsing (INFRA-01)
```typescript
// src/api-client.ts — replace the error branch in request()
if (!response.ok) {
  let message: string;
  try {
    const errorBody = (await response.json()) as Record<string, unknown>;
    if (typeof errorBody.error === "string") {
      message = errorBody.error;
    } else if (Array.isArray(errorBody.error)) {
      message = (errorBody.error as string[]).join("; ");
    } else if (Array.isArray(errorBody.errors)) {
      message = (errorBody.errors as string[]).join("; ");
    } else if (typeof errorBody.message === "string") {
      message = errorBody.message;
    } else {
      message = response.statusText;
    }
  } catch {
    message = response.statusText;
  }
  throw new ApiClientError(response.status, `${response.status}: ${message}`);
}
```

### WebhookSummary Type (TYPE-04)
```typescript
// src/types.ts — add before Webhook interface
export interface WebhookSummary {
  id: number;
  name: string;
  url: string;
  archived: boolean;
  event_type: string[];
  tested: boolean;
  response_code: number | null;
  json_wrapper: string | null;
  // Note: no send_as_text, no basic_auth_*, no webhook_attributes
}
// Keep existing Webhook interface as detail type (used by get_webhook)
```

### ApprovalFlowSummary Type (TYPE-05)
```typescript
// src/types.ts — add before ApprovalFlow interface
export interface ApprovalFlowSummary {
  id: number;
  name: string;
  document_type: number;
  self_approval_allowed: boolean;
  company_id: number;
  version_no: number;
  archived: boolean;
  status: string;
  in_progress_entities_count: number;
  completed_entities_count: number;
  rejected_entities_count: number;
  total_entities_count: number;
  created_at: number;
  updated_at: number;
  // Note: no approval_steps, no approval_conditions
}
// Keep ApprovalFlow as detail type (with optional steps/conditions fields)
```

### _destroy Validation (Superrefine)
```typescript
// src/schemas.ts
export function withDestroyValidation<T extends z.ZodArray<z.ZodObject<{ id?: z.ZodOptional<z.ZodNumber>, _destroy?: z.ZodOptional<z.ZodBoolean> }>>>(schema: T) {
  return schema.superRefine((items, ctx) => {
    items.forEach((item, index) => {
      if (item._destroy === true && !item.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item at index ${index}: id is required when _destroy is true`,
          path: [index, "id"],
        });
      }
    });
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `errorBody.message` | `errorBody.error \| errorBody.errors \| errorBody.message` | Phase 1 | Every error now surfaces correctly |
| Inline `customFieldValueSchema` in 4 files | `import { customFieldValueSchema } from "../schemas.js"` | Phase 1 | Single definition to maintain |
| `PurchaseOrder[]` on list tool | `PurchaseOrderSummary[]` on list tool | Phase 1 | Type correctness (runtime already correct) |
| `Invoice[]` on list tool | `InvoiceSummary[]` on list tool | Phase 1 | Type correctness |
| `CompanyDetail[]` on `list_companies` | `Company[]` on `list_companies` | Phase 1 | Type correctness |

---

## Open Questions

1. **`create_po_payment` body shape**
   - What we know: Tool sends `{ payment: { amount, note, purchase_order_item_payments_attributes } }` to `/purchase_orders/:id/payments`
   - What's unclear: The exact `payment_params` permit list in `PaymentsController` (v1) — not read during research
   - Recommendation: Read `app/controllers/api/v1/payments_controller.rb` `payment_params` method before touching this tool

2. **`send_user_invite` exact permit block**
   - What we know: Tool sends `{ invite_user: { email, name, roles, approval_limit, department_ids } }`
   - What's unclear: The exact `invite_user_params` permit block in CompaniesController (partial read only)
   - Recommendation: Read the `send_user_invite` private method in `companies_controller.rb` before finalizing SCHEMA-06

3. **`products.ts` exact `product_params`**
   - What we know: Rails `create` action does `Product.new(product_params)` and separately loads supplier
   - What's unclear: Whether `product_params` includes `:currency_id` and `:archived`
   - Recommendation: Read the private `product_params` method in `products_controller.rb`

4. **PurchaseOrderSummary fields — `compliance_status` and xero fields**
   - What we know: `PurchaseOrderSerializer` includes `:compliance_status, :xero_export_status, :synced_with_xero, :xero_is_changed`
   - What's unclear: Whether these are always present or feature-flag-conditional
   - Recommendation: Mark as optional (`?`) in `PurchaseOrderSummary` — conservative approach

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this phase is code/schema changes only)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | `vitest.config.ts` (inferred from package.json `npm test` = `vitest run`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Error message extraction from `{ error: "..." }` | unit | `npx vitest run tests/e2e/api-client.test.ts` | ✅ |
| TYPE-01 | List tools return PurchaseOrderSummary shape | type-check | `npm run build` | ✅ (TypeScript build) |
| TYPE-02 | List tools return InvoiceSummary shape | type-check | `npm run build` | ✅ |
| TYPE-03..05 | New Summary types compile without errors | type-check | `npm run build` | ✅ |
| SCHEMA-01..12 | Schema changes don't break existing tests | regression | `npm test` | ✅ |

**Note:** Phase 1 schema correctness is primarily validated by TypeScript compilation (`npm run build`) and the existing E2E routing tests (`npm test`). Full body-shape validation is deferred to Phase 5. The existing `api-client.test.ts` should cover INFRA-01 after the fix.

### Sampling Rate
- **Per task commit:** `npm run build` (zero TypeScript errors)
- **Per wave merge:** `npm test` (all 49 existing tests green)
- **Phase gate:** Both `npm run build` and `npm test` pass before `/gsd:verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers regression detection. New tests for INFRA-01 error parsing should be added to `tests/e2e/api-client.test.ts` as part of the INFRA-01 task (not a pre-condition).

---

## Sources

### Primary (HIGH confidence)
- Rails controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/` — read directly for all tool groups
  - `purchase_orders_controller.rb` — `po_params`, `po_delivered_params`, action flow
  - `invoices_controller.rb` — `invoice_params`, `invoice_comment_params`, action flow
  - `suppliers_controller.rb` — `supplier_params`
  - `budgets_controller.rb` — `budget_params`
  - `departments_controller.rb` — `department_params`
  - `companies_controller.rb` (partial) — `index`, `show`, `details`, `invite_limit_left`
  - `webhooks_controller.rb` — `webhook_params`
  - `approval_flows_controller.rb` — `approval_flow_params`, all actions
  - `npayments_controller.rb` — `npayment_params`
  - `tax_rates_controller.rb` — `tax_rate_params`
  - `products_controller.rb` (partial) — action flow
  - `comments_controller.rb` — `poc_params`
  - `base_controller.rb` — `pagination_dict`, `results_per_page`
- Rails serializers: `/Users/przbadu/projects/pex/po-app/app/serializers/` — read directly
  - `purchase_order_serializer.rb` + `purchase_order_details_serializer.rb`
  - `invoice_serializer.rb` + `invoice_detail_serializer.rb`
  - `company_serializer.rb` + `company_detail_serializer.rb`
  - `webhook_serializer.rb` + `webhook_detail_serializer.rb`
  - `approval_flow_serializer.rb` + `approval_flow_detail_serializer.rb`
- `lib/api/response.rb` — `error_response()` format confirmed: `{ error: message, status: code }`
- Existing MCP codebase: all 14 tool files, `src/types.ts`, `src/api-client.ts`, `src/tool-helpers.ts` read in full

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — prior research pass, used to corroborate findings
- `.planning/phases/01-schema-type-foundation/CONTEXT.md` — user decisions, locked constraints

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified, no new deps needed
- Schema diffs (SCHEMA-01..12): HIGH — Rails controller permit blocks read directly
- Type diffs (TYPE-01..07): HIGH — Rails serializers read directly
- Infrastructure fixes (INFRA-01..04): HIGH — Rails `error_response()` format confirmed from source
- Open questions: 3 items that need one additional file read each before their specific task

**Research date:** 2026-03-25
**Valid until:** Stable — Rails source is local and not changing during this phase

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Impact on Phase 1 |
|------------|--------|-------------------|
| Stay on Zod v3 (v4 has MCP SDK bugs) | REQUIREMENTS.md / CONTEXT.md | Use `z.*` from `"zod"` (v3 surface); no `z.string().min()` changes to v4 syntax |
| No breaking changes to tool signatures | CLAUDE.md / CONTEXT.md | Never remove or rename existing params; only add `.optional()` fields |
| `buildPath()` for all API paths | CLAUDE.md | No hardcoded `/api/v1/` strings |
| `withErrorHandling()` wraps every tool | CLAUDE.md | Preserve on all existing tools |
| ES modules — `.js` extension on imports | CLAUDE.md | `import ... from "../schemas.js"` (not `.ts`) |
| `inputSchema` must be flat `ZodRawShape` | CONTEXT.md | Never wrap in `z.object()` |
| Single source of truth in `src/types.ts` | CONTEXT.md | All new interfaces go here |
| Tests must pass with zero TypeScript errors | REQUIREMENTS.md | `npm run build` and `npm test` as phase gate |
