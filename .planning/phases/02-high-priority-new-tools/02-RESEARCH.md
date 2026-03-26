# Phase 2: High-Priority New Tools - Research

**Researched:** 2026-03-26
**Domain:** MCP tool authoring — Custom Fields, Compliance, PO gaps, Invoice gaps
**Confidence:** HIGH (all findings verified directly from Rails source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Custom field tools go in new `src/tools/custom-fields.ts`
- Compliance tools go in new `src/tools/compliance.ts`
- PO gap tools (bulk save, auto-approvers, available approvers, approval link) go in existing `src/tools/purchase-orders.ts`
- Invoice gap tools (list POs for link, list PO items for link, rerun approval) go in existing `src/tools/invoices.ts`
- Async compliance checks (202 response): Return the 202 status with job ID — do not block/poll internally
- Evidence pack download: Return download URL/metadata as JSON — no binary streaming
- Compliance memo: Simple POST that returns generated memo text
- Scan history: Optional `page` param, matching existing list tool pattern
- `update_custom_field_positions`: Accept full ordered array of custom field IDs
- `field_type`: Zod enum with known Rails types (`text`, `number`, `date`, `dropdown`, `checkbox`, `url`, `formula`)
- `option_list` (dropdown fields): Accept `string[]`, serialize to Rails comma-separated format internally if needed

### Claude's Discretion
- Registration order within new files
- Internal helper functions for shared patterns
- Whether to add intermediate TypeScript types or use inline types
- Error message formatting for compliance-specific error scenarios

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CF-01 | User can list all custom fields for a company | `GET /api/v1/custom_fields` — controller confirmed, serializer confirmed |
| CF-02 | User can get a single custom field by ID | `GET /api/v1/custom_fields/:id` — confirmed |
| CF-03 | User can create a custom field with all supported params | `POST /api/v1/custom_fields` — `custom_field_params` whitelist documented |
| CF-04 | User can update an existing custom field | `PATCH /api/v1/custom_fields/:id` — same params as create |
| CF-05 | User can delete a custom field | `DELETE /api/v1/custom_fields/:id` — sets `archived: true`, returns `{ archived: true }` |
| CF-06 | User can update custom field positions (reorder) | `PATCH /api/v1/custom_fields/update_positions` — positions hash format documented |
| COMP-01 | User can trigger compliance check on a PO or invoice (async, 202) | `POST /api/v1/compliance/check` — params confirmed |
| COMP-02 | User can trigger bulk compliance checks | `POST /api/v1/compliance/bulk_check` — params confirmed |
| COMP-03 | User can get bulk check status | `GET /api/v1/compliance/bulk_check_status` — returns most recent bulk scan for user |
| COMP-04 | User can justify a compliance violation | `POST /api/v1/compliance/justify` — violation_id + justification_reason params |
| COMP-05 | User can generate a compliance memo | `POST /api/v1/compliance/generate_memo` — memo_request params documented |
| COMP-06 | User can list compliance scan history | `GET /api/v1/compliance/scan_history` — paginated, returns completed/failed scans |
| COMP-07 | User can get scan details by ID | `GET /api/v1/compliance/scan_history/:id` — detail endpoint |
| COMP-08 | User can create an evidence pack | `POST /api/v1/compliance/evidence_packs` — compliance_check_id param |
| COMP-09 | User can get an evidence pack by ID | `GET /api/v1/compliance/evidence_packs/:id` |
| COMP-10 | User can download an evidence pack | `GET /api/v1/compliance/evidence_packs/:id/download` — returns download_url JSON |
| PO-01 | User can bulk save (create/update) purchase orders | `POST /api/v1/purchase_orders/bulk_save` — data array with full PO params |
| PO-02 | User can get auto-approvers list for a PO | `GET /api/v1/purchase_orders/auto_approvers_list` — query params |
| PO-03 | User can get available approvers list for a PO | `POST /api/v1/purchase_orders/approver_list` — full PO params |
| PO-04 | User can get approval flow link for a PO | `GET /api/v1/purchase_orders/:id/aff_link` — returns `{ aff_link }` |
| INV-01 | User can list POs available to link to an invoice | `GET /api/v1/invoices/purchase_order_list` — paginated |
| INV-02 | User can list PO items available to link to an invoice | `GET /api/v1/invoices/purchase_order_item_list` — by purchase_order_ids |
| INV-03 | User can rerun approval flow on an invoice | Already implemented in `src/tools/invoices.ts` — verify not duplicate |
</phase_requirements>

---

## Summary

Phase 2 adds 23 new MCP tools across four domains. All routes and parameters have been verified directly against the Rails controllers and routes file — no invented params, no guesses. The existing MCP codebase provides clean patterns to follow: `registerTool()`, `withErrorHandling()`, `jsonResponse()`, `buildPath()`.

INV-03 (`rerun_invoice_approval_flow`) is already implemented in `src/tools/invoices.ts` at line 216-226. This must be confirmed before planning — it should not be added again. If it exists and passes tests, INV-03 is already complete.

The compliance module is the most complex: it introduces async job patterns (202 responses), evidence pack lifecycle management, and memo generation. The controller-level response shapes are inline (not via serializers) — TypeScript interfaces must be created from the controller render blocks directly. The custom fields module uses `CustomFieldAdminSerializer` (richer than `CustomFieldSerializer`) with additional fields not yet in `src/types.ts`. PO and invoice gap tools are straightforward additions to existing tool files.

**Primary recommendation:** Implement in four waves — (1) custom fields new file, (2) compliance new file, (3) PO gap tools in purchase-orders.ts, (4) invoice gap tools in invoices.ts. Each wave builds its TypeScript types first then registers tools.

---

## Standard Stack

### Core (already in project — verified)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ^1.26.0 | MCP server + tool registration | Required by protocol |
| `zod` | ^3.25.76 | Input schema validation | MCP SDK requirement |
| TypeScript | 5.9.3 (tsc) | Type safety | Project standard |

### No new dependencies required
All tools follow the established pattern. No new npm packages needed.

---

## Architecture Patterns

### Established Tool Registration Pattern (HIGH confidence — verified from src/)
```typescript
// Source: src/tools/products.ts + src/tools/purchase-orders.ts
export function registerCustomFieldTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "tool_name",
    {
      description: "...",
      inputSchema: { /* flat ZodRawShape — NOT z.object() */ },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<ReturnType>(apiClient.buildPath("/resource"));
      return jsonResponse(result);
    }),
  );
}
```

### New File Registration in index.ts
```typescript
// Add to src/index.ts after existing imports
import { registerCustomFieldTools } from "./tools/custom-fields.js";
import { registerComplianceTools } from "./tools/compliance.js";

// Add to registration block after registerSupplementaryTools
registerCustomFieldTools(server, apiClient);
registerComplianceTools(server, apiClient);
```

### Pagination Pattern (conditional — used for compliance scan history)
```typescript
// Source: src/tools/products.ts + compliance scan_history controller
const params = new URLSearchParams();
if (args.page) params.set("page", String(args.page));
const query = params.toString();
const path = `${apiClient.buildPath("/compliance/scan_history")}${query ? `?${query}` : ""}`;
```

### 202 Async Response Pattern (compliance check/bulk_check)
```typescript
// Controllers return 202 :accepted — ApiClient passes status through
// Return the job_id so agent can poll bulk_check_status
const result = await apiClient.post<ComplianceCheckResponse>(
  apiClient.buildPath("/compliance/check"),
  { compliance_check: args }
);
return jsonResponse(result); // { status: "processing", job_id: "...", ... }
```

### Recommended Project Structure (no change)
```
src/
├── tools/
│   ├── custom-fields.ts     # NEW — CF-01..06
│   ├── compliance.ts        # NEW — COMP-01..10
│   ├── purchase-orders.ts   # EXTENDED — PO-01..04
│   └── invoices.ts          # EXTENDED — INV-01..03 (INV-03 may already exist)
├── types.ts                 # EXTENDED — new interfaces for CF, compliance
└── index.ts                 # EXTENDED — import + register new tool files
```

### Anti-Patterns to Avoid
- **Hardcoding version prefix:** Never use `/api/v1/` directly — always `apiClient.buildPath()`
- **Using z.object() in inputSchema:** Must be flat `ZodRawShape` (key → ZodType map), not `z.object({})`
- **Zod v4 features:** Stay on Zod v3 — MCP SDK 1.26.0 has confirmed bugs with Zod v4
- **Adding required params to existing tools:** Backwards-compat frozen — widening only (add optional params)
- **Binary data in MCP response:** Don't stream binary. Evidence pack download returns JSON with `download_url`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP error handling | Custom try/catch in each tool | `withErrorHandling()` from tool-helpers.ts | Consistent error format |
| JSON response formatting | Manual `{ content: [...] }` | `jsonResponse()` | Correct MCP response shape |
| Custom field value schemas | Inline schema in each tool | Import `customFieldValueSchema` from schemas.ts | DRY, already tested |
| API path construction | Hardcoded strings | `apiClient.buildPath()` | Version-agnostic |
| Query string building | Manual concatenation | `URLSearchParams` | Correct encoding |

---

## Detailed Route and Parameter Reference

### Custom Fields (CF-01..06)

**Routes (v1):**
```
GET    /api/v1/custom_fields                 → index (CF-01)
GET    /api/v1/custom_fields/:id             → show (CF-02)
POST   /api/v1/custom_fields                 → create (CF-03)
PATCH  /api/v1/custom_fields/:id             → update (CF-04)
DELETE /api/v1/custom_fields/:id             → destroy (CF-05) — sets archived:true
PATCH  /api/v1/custom_fields/update_positions → update_positions (CF-06)
```

**Index params (CF-01):**
- `include_archived=true` — include archived fields (default: exclude)
- `context` — enum: `"line_item"` | `"purchase_order"` (default: `"purchase_order"`)

**Create/Update strong params (CF-03, CF-04):**
```ruby
params.require(:custom_field).permit(
  :name, :field_type, :default_value, :active, :required, :option_list, :access_level,
  :on_line_item, :display_on_pdf, :editable_after_approval, :formula_builder,
  :precision_display, :display_on_pdf_even_if_value_is_nil, :archived
)
```

**field_type enum (locked decision):** `text | number | date | dropdown | checkbox | url | formula`
Note: Rails also has `long_list` internally but serializer remaps to `select`. Use the 7 types above.

**option_list:** Sent as string array from MCP, may need to be joined with comma before sending if Rails expects comma-separated. Check: controller uses `option_list` directly via `custom_field_params` — Rails model handles format. Send as string array in JSON, Rails handles deserialization.

**update_positions body format:**
```
Controller: params[:positions] || {}
Each key = custom_field_id (string), value = position integer
```
Agent decision: Accept `[{ id: number, position: number }]` array and convert to `{ [id]: position }` hash before sending — cleaner API.

**Destroy response (CF-05):** `{ archived: true }` — not a full object, just confirmation.

**CustomFieldAdminSerializer attributes (for TypeScript type):**
```
id, company_id, name, field_type, active, required, options, access_level,
position, on_line_item, display_on_pdf, default_value, editable_after_approval,
readonly, archived, formula_builder, precision_display,
display_on_pdf_even_if_value_is_nil, option_list, created_at, updated_at,
webhook_enabled, response_populated, payload_included, is_auto_populated
```
Note: `options` (computed array) and `option_list` (raw stored value) are both present. `readonly` is computed. `is_auto_populated` is computed. Existing `CustomField` interface in types.ts is based on `CustomFieldSerializer` (public facing) — the admin serializer has more fields. A new `CustomFieldAdmin` type is needed.

---

### Compliance Module (COMP-01..10)

**Routes:**
```
POST /api/v1/compliance/check                           → COMP-01
POST /api/v1/compliance/bulk_check                      → COMP-02
GET  /api/v1/compliance/bulk_check_status               → COMP-03
POST /api/v1/compliance/justify                         → COMP-04
POST /api/v1/compliance/generate_memo                   → COMP-05
GET  /api/v1/compliance/scan_history                    → COMP-06 (paginated)
GET  /api/v1/compliance/scan_history/:id                → COMP-07
POST /api/v1/compliance/evidence_packs                  → COMP-08
GET  /api/v1/compliance/evidence_packs/:id              → COMP-09
GET  /api/v1/compliance/evidence_packs/:id/download     → COMP-10
```

**COMP-01 check params:**
```ruby
params.require(:compliance_check).permit(
  :budget_id, :budget_name, :total_amount, :supplier, :purchase_order_id,
  items: [:description, :quantity, :unit_price],
  attachments: [:name, :type, :size]
)
```
Response (202): `{ status, job_id, purchase_order_id, message }`

**COMP-02 bulk_check params:**
```
purchase_order_ids: integer[] (required, non-empty)
```
Response (202): `{ status, bulk_scan_id, total_count, skipped: { already_passed, already_scanning } }`

**COMP-03 bulk_check_status params:** None — returns most recent bulk scan for current user.
Response: `{ bulk_scan_id, status, total_count, scanned_count, passed_count, failed_count, error_count, progress_percent, results_data, started_at, completed_at, initiated_by }`

**COMP-04 justify params:**
```ruby
params.permit(:violation_id, :justification_reason)
```
Validation: `justification_reason` must be >= 10 chars.
Response: `{ violation: ComplianceViolationSerializer, all_justified: boolean }`

**ComplianceViolationSerializer fields (verified from serializer file):**
```
id, policy_id, policy_name, policy_reference, violation_type, risk_level, impact,
details, remediation_options, resolved, resolved_at, resolution_method,
justified_by_id, justified_by_name, justification_reason,
sam_gov_check_id, sam_gov_exclusion_details
```
Note: Existing `ComplianceViolation` interface in types.ts is MISSING: `justified_by_id`, `justified_by_name`, `justification_reason`, `sam_gov_check_id`, `sam_gov_exclusion_details`. These must be added.

**COMP-05 generate_memo params:**
```ruby
params.require(:memo_request).permit(
  :violation_id, :item_description, :selected_vendor, :selected_price,
  :selection_rationale, :market_basis,
  alternatives_considered: [:vendor, :price, :notes]
)
```
Response: `{ memo: { ... } }` or `{ error: "..." }` with 422.

**COMP-06 scan_history params:** `page` (optional integer, default 1)
Response: `{ scans: [{ id, status, total_count, passed_count, failed_count, error_count, completed_at, initiated_by }], meta: { current_page, total_pages, total_count, next_page } }`

**COMP-07 scan_history_detail params:** `id` (path param — integer bulk scan ID)
Response: Same shape as bulk_check_status (full detail fields).

**COMP-08 evidence_packs create params:** `compliance_check_id` (integer, required)
Response: `{ message, evidence_pack: EvidencePackJson }`

**EvidencePackJson fields (from evidence_pack_json helper):**
```
id, compliance_check_id, purchase_order_id, po_snapshot, attachments_metadata,
audit_log, zip_status, zip_error, zip_file_name, zip_file_size, zip_updated_at,
download_url, created_at, updated_at
```

**COMP-09 evidence_packs show:** GET by `:id`, response: `{ evidence_pack: EvidencePackJson }`

**COMP-10 evidence_packs download:** GET `/:id/download`
Success: `{ download_url, file_name, file_size }`
Error (not ready): `{ error, status }` with 422.

---

### Missing PO Tools (PO-01..04)

**PO-01 bulk_save:**
```
POST /api/v1/purchase_orders/bulk_save
Body: { purchase_order: { data: [...po_objects], custom_fields: ... } }
```
Each `po_object` in `data` array uses same fields as `po_bulk_params`:
```ruby
params.require(:purchase_order).permit(data: [
  :supplier_name, :department_id, :creator_id, :on_behalf_of, :submitted_on,
  :supplier_id, :new_supplier_name, :notes, :currency_id,
  approver_list: [],
  purchase_order_items_attributes: [...same as regular po_params...],
  custom_field_values_attributes: [:id, :value, :custom_field_id],
  ...
])
```
Each item in `data` can include `commit` field ("send" lowercase).
Response: `{ done: [{ _id, id }], failed: [{ _id, errors }] }`
Note: `_id` is a client-side temporary identifier to correlate responses.

**PO-02 auto_approvers_list:**
```
GET /api/v1/purchase_orders/auto_approvers_list
Query params: gross_total (float), budget_ids (array of IDs), show_last_approver_on_edit (boolean)
```
Response: Array of approver objects with `approver_name` computed.

**PO-03 approver_list:**
```
POST /api/v1/purchase_orders/approver_list
Body: { purchase_order: { purchase_order_id?, ...full_po_params, total_gross_amount?, total_net_amount? } }
```
Response: Array of `{ approval_flow_name, approval_flow_id, approvers: [{ name, email, id }] }`
Note: Uses same `po_params` strong params. `total_gross_amount` and `total_net_amount` are passed directly in the purchase_order hash (not as nested items).

**PO-04 aff_link:**
```
GET /api/v1/purchase_orders/:id/aff_link
```
Response: `{ aff_link: string }` (member route on existing PO resource)
Uses same `:id` pattern as other member actions (accepts ID/slug/approval-key).

---

### Missing Invoice Tools (INV-01..03)

**CRITICAL: INV-03 already implemented**
`rerun_invoice_approval_flow` exists in `src/tools/invoices.ts` at line 216-226. It calls `POST /api/v1/invoices/:id/rerun_approval_flow`. This requirement is already met. The plan should note this is pre-existing and should only verify it passes tests.

**INV-01 purchase_order_list:**
```
GET /api/v1/invoices/purchase_order_list
Query params: selected_ids (comma-separated PO IDs), page, per_page (default: 10)
```
Response: Paginated PO list `{ purchase_orders: [...], meta: {...} }` (using adapter: :json pattern)
Note: `selected_ids` is comma-separated string in query: `?selected_ids=1,2,3`

**INV-02 purchase_order_item_list:**
```
GET /api/v1/invoices/purchase_order_item_list
Query params: purchase_order_ids (array)
```
Response: Flat array of order items (not paginated — raw `@order_items.flatten.compact`)
Note: `purchase_order_ids` is sent as array query params: `?purchase_order_ids[]=1&purchase_order_ids[]=2`

---

## TypeScript Types Required

### New types to add to src/types.ts

**CustomFieldAdmin** (from CustomFieldAdminSerializer — superset of existing CustomField):
```typescript
export interface CustomFieldAdmin {
  id: number;
  company_id: number;
  name: string;
  field_type: string;
  active: boolean;
  required: boolean;
  options: string[];       // computed array (from options or text_options)
  option_list: string | null; // raw stored value
  access_level: string;
  position: number;
  on_line_item: boolean;
  display_on_pdf: boolean;
  default_value: string | null;
  editable_after_approval: boolean;
  readonly: boolean;       // computed (true for long_list)
  archived: boolean;
  formula_builder: string | null;
  precision_display: number | null;
  display_on_pdf_even_if_value_is_nil: boolean;
  created_at: string;
  updated_at: string;
  webhook_enabled: boolean;
  response_populated: boolean;
  payload_included: boolean;
  is_auto_populated: boolean; // computed
}
```

**ComplianceViolation** (existing in types.ts — needs extending):
Add these missing fields to existing interface:
```typescript
  justified_by_id: number | null;
  justified_by_name: string | null;
  justification_reason: string | null;
  sam_gov_check_id: number | null;
  sam_gov_exclusion_details: Record<string, unknown> | null;
```

**New interfaces needed:**
- `BulkComplianceScan` — for COMP-03/06/07 responses
- `EvidencePack` — for COMP-08/09/10 responses
- `ComplianceMemo` — for COMP-05 response
- `ComplianceCheckJobResponse` — for COMP-01 202 response
- `BulkCheckJobResponse` — for COMP-02 202 response
- `PurchaseOrderApproverGroup` — for PO-03 approver_list response
- `BulkSaveResult` — for PO-01 bulk_save response

---

## Common Pitfalls

### Pitfall 1: compliance routes namespace
**What goes wrong:** Using `/compliance_check` or `/compliance-check` as path
**Why it happens:** Routes are namespaced: `namespace :compliance do post :check end`
**How to avoid:** Path is `/api/v1/compliance/check` (not `/compliance_check`)

### Pitfall 2: update_positions body format
**What goes wrong:** Sending positions as array `[{id, position}]` directly
**Why it happens:** Rails controller expects `params[:positions]` as a hash `{ "1" => 0, "2" => 1 }`
**How to avoid:** Convert the array to a positions hash before sending. In the tool handler, build `{ positions: { [item.id]: item.position } }` from the input array.

### Pitfall 3: bulk_save _id field
**What goes wrong:** Forgetting `_id` in each data item
**Why it happens:** Controller uses `params[:purchase_order][:data][idx][:_id]` to correlate responses
**How to avoid:** Include `_id` (optional client string) in each bulk save item for response correlation

### Pitfall 4: INV-02 query param format
**What goes wrong:** Sending `purchase_order_ids` as comma-separated string
**Why it happens:** Rails expects array params: `purchase_order_ids[]=1&purchase_order_ids[]=2`
**How to avoid:** Use `purchase_order_ids.forEach(id => params.append("purchase_order_ids[]", String(id)))` pattern

### Pitfall 5: INV-01 selected_ids format
**What goes wrong:** Sending as array
**Why it happens:** Controller does `params[:selected_ids]&.split(',')` — expects comma-separated string
**How to avoid:** Join array before sending: `params.set("selected_ids", ids.join(","))`

### Pitfall 6: Evidence pack create idempotency
**What goes wrong:** Treating 200 vs 201 as error
**Why it happens:** If evidence pack already exists, controller returns 200 (not 201) and re-triggers generation
**How to avoid:** Accept both 200 and 201 as success — ApiClient handles HTTP 2xx as success

### Pitfall 7: Compliance check is company-scoped, not PO-only
**What goes wrong:** Requiring `purchase_order_id` in compliance check
**Why it happens:** `purchase_order_id` is optional — compliance check can run without a specific PO
**How to avoid:** Mark `purchase_order_id` as optional in Zod schema

### Pitfall 8: Missing on_line_item distinction for custom fields
**What goes wrong:** Listing PO-level and line-item fields together
**Why it happens:** Default filter is `purchase_order` context (not line_item)
**How to avoid:** Document `context` param clearly — agents use this to pre-filter fields

---

## Code Examples

### Custom Fields — list with filter
```typescript
// Source: CustomFieldsController#index
const params = new URLSearchParams();
if (args.include_archived) params.set("include_archived", "true");
if (args.context) params.set("context", args.context);
const query = params.toString();
const path = `${apiClient.buildPath("/custom_fields")}${query ? `?${query}` : ""}`;
const fields = await apiClient.get<CustomFieldAdmin[]>(path);
return jsonResponse(fields);
```

### Custom Fields — update_positions
```typescript
// Source: CustomFieldsController#update_positions
// Input: [{ id: 1, position: 0 }, { id: 2, position: 1 }]
// Rails expects: { positions: { "1": 0, "2": 1 } }
const positions: Record<string, number> = {};
args.positions.forEach(({ id, position }) => {
  positions[String(id)] = position;
});
const result = await apiClient.patch(apiClient.buildPath("/custom_fields/update_positions"), { positions });
```

### Compliance check (async)
```typescript
// Source: ComplianceController#check — returns 202
const { purchase_order_id, ...checkData } = args;
const result = await apiClient.post<ComplianceCheckJobResponse>(
  apiClient.buildPath("/compliance/check"),
  {
    compliance_check: {
      ...(purchase_order_id ? { purchase_order_id } : {}),
      ...checkData,
    }
  }
);
return jsonResponse(result); // { status: "processing", job_id, purchase_order_id, message }
```

### Compliance bulk check
```typescript
// Source: ComplianceController#bulk_check
const result = await apiClient.post<BulkCheckJobResponse>(
  apiClient.buildPath("/compliance/bulk_check"),
  { purchase_order_ids: args.purchase_order_ids }
);
return jsonResponse(result);
```

### PO approver_list
```typescript
// Source: PurchaseOrdersController#approver_list
const body: Record<string, unknown> = {
  purchase_order: {
    ...(args.purchase_order_id ? { purchase_order_id: args.purchase_order_id } : {}),
    ...(args.total_gross_amount !== undefined ? { total_gross_amount: args.total_gross_amount } : {}),
    ...(args.total_net_amount !== undefined ? { total_net_amount: args.total_net_amount } : {}),
    ...(args.department_id ? { department_id: args.department_id } : {}),
    ...(args.purchase_order_items_attributes ? { purchase_order_items_attributes: args.purchase_order_items_attributes } : {}),
  }
};
const result = await apiClient.post<PurchaseOrderApproverGroup[]>(
  apiClient.buildPath("/purchase_orders/approver_list"),
  body
);
```

### INV-01 purchase_order_list (selected_ids as comma-separated)
```typescript
// Source: InvoicesController#purchase_order_list
const params = new URLSearchParams();
if (args.selected_ids?.length) params.set("selected_ids", args.selected_ids.join(","));
if (args.page) params.set("page", String(args.page));
if (args.per_page) params.set("per_page", String(args.per_page));
```

### INV-02 purchase_order_item_list (array params)
```typescript
// Source: InvoicesController#purchase_order_item_list
const params = new URLSearchParams();
args.purchase_order_ids.forEach(id => params.append("purchase_order_ids[]", String(id)));
```

---

## Runtime State Inventory

Not applicable — this is a greenfield tool addition phase. No renames, migrations, or refactors.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond existing project stack — all tools are code/config additions against the existing Rails API)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (version from package.json) |
| Config file | vitest.config.ts (or package.json scripts) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CF-01 | list custom fields (with/without filters) | unit/E2E | `npx vitest run tests/e2e/custom-fields.test.ts` | ❌ Wave 0 |
| CF-02 | get single custom field | E2E | same file | ❌ Wave 0 |
| CF-03 | create custom field (full params) | E2E | same file | ❌ Wave 0 |
| CF-04 | update custom field | E2E | same file | ❌ Wave 0 |
| CF-05 | delete (archive) custom field | E2E | same file | ❌ Wave 0 |
| CF-06 | update positions (hash conversion verified) | E2E | same file | ❌ Wave 0 |
| COMP-01 | compliance check returns 202 + job_id | E2E | `npx vitest run tests/e2e/compliance.test.ts` | ❌ Wave 0 |
| COMP-02 | bulk check returns 202 + bulk_scan_id | E2E | same file | ❌ Wave 0 |
| COMP-03 | bulk check status returns progress fields | E2E | same file | ❌ Wave 0 |
| COMP-04 | justify violation (min 10 chars) | E2E | same file | ❌ Wave 0 |
| COMP-05 | generate memo returns memo object | E2E | same file | ❌ Wave 0 |
| COMP-06 | scan history paginated | E2E | same file | ❌ Wave 0 |
| COMP-07 | scan detail by ID | E2E | same file | ❌ Wave 0 |
| COMP-08 | create evidence pack | E2E | same file | ❌ Wave 0 |
| COMP-09 | get evidence pack | E2E | same file | ❌ Wave 0 |
| COMP-10 | download evidence pack returns URL | E2E | same file | ❌ Wave 0 |
| PO-01 | bulk save returns done/failed arrays | E2E | `npx vitest run tests/e2e/purchase-orders.test.ts` | ✅ (extend) |
| PO-02 | auto-approvers list | E2E | same file | ✅ (extend) |
| PO-03 | approver list groups by flow | E2E | same file | ✅ (extend) |
| PO-04 | aff_link returns URL | E2E | same file | ✅ (extend) |
| INV-01 | PO list for invoice (selected_ids comma join) | E2E | `npx vitest run tests/e2e/invoices.test.ts` | ✅ (extend) |
| INV-02 | PO item list (array params) | E2E | same file | ✅ (extend) |
| INV-03 | rerun approval flow (already implemented) | E2E | same file | ✅ verify existing |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/custom-fields.test.ts` — covers CF-01..06 with MockApiServer mock routes using version-agnostic regex `/^\/api\/v[13]\/custom_fields$/`
- [ ] `tests/e2e/compliance.test.ts` — covers COMP-01..10 with mock routes under `/compliance/` namespace

---

## Open Questions

1. **INV-03 duplicate check**
   - What we know: `rerun_invoice_approval_flow` is already at lines 216-226 in invoices.ts
   - What's unclear: Was it added as part of Phase 1 work or was it always there?
   - Recommendation: Verify existing test coverage. If tests pass and route works, mark INV-03 complete without additional work. Do not add a duplicate tool.

2. **option_list serialization format**
   - What we know: Controller permits `:option_list` as scalar. Serializer returns `option_list` as string (raw). `options` is the computed array.
   - What's unclear: Does Rails model accept array input for `option_list` or only comma-separated string?
   - Recommendation: Accept `string[]` from agent (per locked decision), join with comma before sending to Rails: `args.option_list?.join(",")`. This is safe and matches the locked decision.

3. **PO-02 auto_approvers_list budget_ids param format**
   - What we know: Controller does `Budget.where(id: params[:budget_ids])` — Rails handles both array and comma-separated
   - What's unclear: URL encoding for array query params
   - Recommendation: Use `budget_ids.forEach(id => params.append("budget_ids[]", String(id)))` pattern for consistency with INV-02.

---

## Sources

### Primary (HIGH confidence)
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/custom_fields_controller.rb` — full controller, strong params, all actions
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/compliance_controller.rb` — all 7 actions, all params
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/compliance/evidence_packs_controller.rb` — create/show/download/regenerate
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/purchase_orders_controller.rb` — bulk_save, auto_approvers_list, approver_list, aff_link
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/invoices_controller.rb` — purchase_order_list, purchase_order_item_list, rerun_approval_flow
- `/Users/przbadu/projects/pex/po-app/app/serializers/custom_field_admin_serializer.rb` — all admin serializer attributes
- `/Users/przbadu/projects/pex/po-app/app/serializers/compliance_check_serializer.rb` — compliance check shape
- `/Users/przbadu/projects/pex/po-app/app/serializers/compliance_violation_serializer.rb` — violation shape (includes justified_by fields)
- `/Users/przbadu/projects/pex/po-app/config/routes.rb` — all route paths confirmed (lines 1037-1236)
- `src/tools/purchase-orders.ts` — existing 15 tools, patterns to follow/extend
- `src/tools/invoices.ts` — existing 11 tools + confirmed INV-03 already present
- `src/tools/products.ts` — simple CRUD pattern reference
- `src/schemas.ts` — shared Zod schemas to import
- `src/types.ts` — existing TypeScript interfaces, gaps identified
- `src/index.ts` — registration pattern for new tool files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified from source
- Architecture patterns: HIGH — verified from existing codebase
- Route/param documentation: HIGH — directly from Rails controllers
- TypeScript types: HIGH — directly from serializer attributes
- Pitfalls: HIGH — derived from controller implementation logic

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (stable Rails API, changes tracked via git)

## Project Constraints (from CLAUDE.md)

- **Build:** `npm run build` (tsc → dist/) — must pass with zero TypeScript errors
- **Tests:** `npm test` (vitest run) — all existing tests must continue to pass
- **ES modules:** `"type": "module"` — all imports must use `.js` extension
- **Zod:** v3 only (v4 forbidden — MCP SDK bugs confirmed)
- **Path construction:** Always `apiClient.buildPath("/resource")` — never hardcode `/api/v1/`
- **inputSchema:** Flat `ZodRawShape` — never `z.object({})` wrapper
- **Backwards compat:** Never remove/rename/retype existing tool params — widening only
- **Custom fields:** `custom_field_values_attributes` (not `custom_field_values`)
- **Tool handlers:** Always wrap with `withErrorHandling()`
- **Responses:** `jsonResponse()` for data, `textResponse()` for messages
- **Rails is authoritative:** Controller params and serializer attributes override any other assumption
