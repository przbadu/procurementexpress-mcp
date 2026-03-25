# Architecture Patterns

**Domain:** MCP Server for Rails REST API alignment
**Researched:** 2026-03-25

## Recommended Architecture

The existing architecture is correct and should be preserved. The update is additive — extending the current pattern, not replacing it.

### Current Architecture (to preserve)

```
MCP Client (Claude Desktop / Claude Code)
      |
      | stdio transport
      v
index.ts  ←→  ApiClient  ←→  Rails API (HTTPS)
      |              |
      |        AuthManager
      |
  register*Tools() calls
      |
  src/tools/*.ts  →  types.ts
                  →  tool-helpers.ts
```

### Annotated Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `index.ts` | Entry point. Creates instances, registers auth tools (V1/V3 branch), calls all register*Tools(), starts stdio transport | ApiClient, AuthManager, McpServer, all tool files |
| `api-client.ts` | HTTP client. Manages auth headers, `buildPath()`, GET/POST/PUT/PATCH/DELETE. Stateful: holds token + companyId | Underlying `fetch()` to Rails API |
| `auth.ts` | Dual authentication. V1: static token. V3: OAuth2 password grant. `validateToken()`, `revokeToken()` differ by version | ApiClient |
| `tool-helpers.ts` | `textResponse()`, `jsonResponse()`, `withErrorHandling()`. Zero state, pure utilities | Used by every tool file |
| `types.ts` | TypeScript interfaces matching Rails serializer output. No logic, no side effects | Imported by tool files for type-checking |
| `src/tools/*.ts` | Domain tool files. Each exports a single `register*Tools(server, apiClient)` function. 14 files, 88 tools | ApiClient (HTTP calls), McpServer (tool registration), types.ts (response typing) |

### Data Flow

```
MCP Client sends tool call
   → index.ts routes to registered tool handler
   → withErrorHandling() wraps the call
   → tool handler builds URLSearchParams or request body
   → apiClient.get/post/patch/etc(buildPath("/resource"))
   → buildPath() prepends /api/{version}/ prefix
   → ApiClient injects auth headers + app_company_id
   → fetch() hits Rails API
   → response typed as TypeScript interface from types.ts
   → jsonResponse() or textResponse() wraps it
   → MCP client receives content array
```

---

## Structural Changes Required

### 1. List vs Detail Type Split in types.ts

**Current problem:** Several types lack a list variant, causing tools to either over-fetch or misrepresent response shape. Confirmed by comparing Rails serializers:

| Resource | List Serializer | Detail Serializer | Status in types.ts |
|----------|----------------|-------------------|--------------------|
| PurchaseOrder | `PurchaseOrderSerializer` | `PurchaseOrderDetailsSerializer` | Both exist (`PurchaseOrderSummary`, `PurchaseOrder`) |
| Invoice | `InvoiceSerializer` | `InvoiceDetailSerializer` | Both exist (`InvoiceSummary`, `Invoice`) |
| ApprovalFlow | `ApprovalFlowSerializer` | `ApprovalFlowDetailSerializer` | Only one (`ApprovalFlow`) with optional `approval_steps` |
| Webhook | `WebhookSerializer` | `WebhookDetailSerializer` | Only one (`Webhook`) — detail fields mixed in |
| Company | `CompanySerializer` | `CompanyDetailSerializer` | Both exist conceptually, but `CompanyDetail` in types is inconsistent |

**Pattern to establish in types.ts:**
```typescript
// Naming convention: Resource = detail, ResourceSummary = list
// Where Rails uses different serializers for index vs show

export interface ApprovalFlowSummary {  // from ApprovalFlowSerializer
  id, name, document_type, status, company_id, version_no, archived,
  in_progress_entities_count, completed_entities_count, ...
}

export interface ApprovalFlow {  // from ApprovalFlowDetailSerializer (extends summary)
  ...ApprovalFlowSummary,
  approval_steps: ApprovalStep[],
  approval_conditions: ApprovalCondition[]
}
```

**Naming convention (use consistently):**
- `Foo` = detail response (show endpoint)
- `FooSummary` = list response (index endpoint)

---

### 2. New Tool Modules

**Build order:** New tool files that have no dependencies on each other can be added in any order. Dependencies between modules:

```
types.ts (add new interfaces first)
    ↓
src/tools/custom-fields.ts    (no deps on other tools)
src/tools/compliance.ts       (may reference PO types)
src/tools/uploads.ts          (may reference PO/invoice types)
src/tools/digital-invoices.ts (depends on Invoice types)
src/tools/policies.ts         (no deps on other tools)
src/tools/chat-messages.ts    (V3 only, no deps)
    ↓
index.ts (add register*Tools() call for each new file)
```

**New files to create in `src/tools/`:**

| File | Tools Count | Phase | Dependencies |
|------|-------------|-------|--------------|
| `custom-fields.ts` | 6 | Phase 2 | types: CustomField (exists) |
| `compliance.ts` | 10 | Phase 2 | types: ComplianceCheck (exists), new ComplianceBulkStatus |
| `uploads.ts` | 3 | Phase 3 | types: Upload (exists), new UploadStatus |
| `digital-invoices.ts` | 1 | Phase 3 | types: Invoice (exists) |
| `policies.ts` | ~6 | Phase 4 | types: new Policy, PolicyTemplate |
| `chat-messages.ts` | ~3 | Phase 4 | types: new ChatMessage (V3 only) |

---

### 3. Tool File Size and Organization

Current tool files range from 43 to 369 lines. The pattern scales well up to ~400 lines per file. For 100+ tools total, the `src/tools/` directory approach remains correct — do not create subdirectories.

**Rationale:** Each file is a flat register function, no internal routing needed. MCP SDK registration is the only "routing." Grouping by domain (one file per Rails controller group) is the right granularity.

**Projected final tool count by file:**

| File | Current Tools | New Tools | Final |
|------|--------------|-----------|-------|
| `purchase-orders.ts` | 15 | 4 (bulk_save, auto_approvers_list, approver_list, aff_link) | 19 |
| `invoices.ts` | 11 | 3 (purchase_order_list, purchase_order_item_list, rerun_approval_flow) | 14 |
| `approval-flows.ts` | 13 | 3 (unpublish moved here, version_details, bulk rerun) | 13 (unchanged — unpublish already there?) |
| `products.ts` | 4 | 2 (bulk_create, list_skus) | 6 |
| `custom-fields.ts` | 0 | 6 | 6 |
| `compliance.ts` | 0 | 10 | 10 |
| `uploads.ts` | 0 | 3 | 3 |
| `digital-invoices.ts` | 0 | 1 | 1 |
| `policies.ts` | 0 | ~6 | ~6 |
| `chat-messages.ts` | 0 | ~3 | ~3 |
| All other existing | ~45 | schema updates only | ~45 |

**Total projected: ~126 tools across ~20 tool files.**

---

### 4. Zod Schema Update Pattern

Every tool's `inputSchema` maps 1:1 to a Rails controller `permit()` block. The update pattern is:

```typescript
// Before (incomplete):
inputSchema: {
  name: z.string().describe("Name"),
  archived: z.boolean().optional(),
}

// After (complete, matching permit() exactly):
inputSchema: {
  name: z.string().describe("Name"),
  archived: z.boolean().optional(),
  // newly discovered params from permit():
  external_vendor_id: z.string().optional().describe("External vendor ID for ERP integration"),
  uei: z.string().optional().describe("Unique Entity Identifier (SAM.gov)"),
  cage_code: z.string().optional().describe("CAGE code (SAM.gov)"),
}
```

**Shared schemas (define once, reuse):**
```typescript
// Already in purchase-orders.ts and invoices.ts — move to shared location
const customFieldValueSchema = z.object({ ... });
```

**Recommended: extract to `src/schemas.ts`** — shared Zod schemas imported by multiple tool files. Prevents duplication across custom-fields, invoices, purchase-orders, budgets.

---

### 5. Error Handling Enhancement

Current `ApiClientError` catches HTTP error responses and extracts `message` field. Rails returns two formats:

```json
// Format 1 (most endpoints):
{"error": "Authentication token is invalid", "status": 401}

// Format 2 (validation errors):
{"message": "Name can't be blank", "status": 422}
```

The `api-client.ts` currently reads `errorBody.message` but Rails typically uses `errorBody.error` for auth errors. This should be fixed:

```typescript
message = errorBody.error || errorBody.message || response.statusText;
```

---

## Patterns to Follow

### Pattern 1: One-to-One Tool-to-Endpoint Mapping

Each MCP tool maps to exactly one Rails API endpoint. Never combine two endpoints into one tool.

**When:** Always.

**Example:**
```typescript
// CORRECT: separate tools for list and detail
server.registerTool("list_purchase_orders", ...)  // GET /purchase_orders
server.registerTool("get_purchase_order", ...)    // GET /purchase_orders/:id

// WRONG: one tool that decides which to call
server.registerTool("purchase_orders", ...) // ambiguous, brittle
```

### Pattern 2: buildPath() for All Routes

```typescript
// CORRECT
const result = await apiClient.get(apiClient.buildPath("/compliance/check"));

// WRONG: hardcoded version
const result = await apiClient.get("/api/v1/compliance/check");
```

### Pattern 3: withErrorHandling() Wraps Every Handler

```typescript
server.registerTool("tool_name", schema, withErrorHandling(async (args) => {
  // handler body
}));
```

### Pattern 4: List Types in tool function signature, use correct interface

```typescript
// For index endpoints (list), use Summary type:
const result = await apiClient.get<{ purchase_orders: PurchaseOrderSummary[]; meta: PaginationMeta }>(
  `${apiClient.buildPath("/purchase_orders")}?${params}`
);

// For show endpoints (detail), use full type:
const result = await apiClient.get<PurchaseOrder>(
  apiClient.buildPath(`/purchase_orders/${args.id}`)
);
```

### Pattern 5: URLSearchParams for GET query strings

```typescript
const params = new URLSearchParams();
if (args.page) params.set("page", String(args.page));
if (args.search) params.set("search", args.search);
const result = await apiClient.get(`${path}?${params}`);
```

### Pattern 6: Nested attributes follow Rails convention

```typescript
// Create: no id
// Update: include id
// Delete: id + _destroy: true
const nested = z.object({
  id: z.number().int().optional().describe("ID — include to update existing; omit to create"),
  field: z.string(),
  _destroy: z.boolean().optional().describe("Set true to delete this record on update"),
});
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Importing InvoiceSummary Where Invoice Is Needed

**What:** Using the list type `InvoiceSummary` for a `get_invoice` tool response.

**Why bad:** List types omit line items, supplier details, comments. AI agent cannot access full PO/invoice data.

**Instead:** Import the detail type (`Invoice`, `PurchaseOrder`) for `get_*` tools.

### Anti-Pattern 2: Hardcoded API Version in buildPath Calls

**What:** `apiClient.get("/api/v1/compliance/check")`

**Why bad:** Breaks when `PROCUREMENTEXPRESS_API_VERSION=v3`, V3 path prefix is different.

**Instead:** `apiClient.get(apiClient.buildPath("/compliance/check"))` — `buildPath()` inserts the correct version.

### Anti-Pattern 3: Duplicating Shared Zod Schemas

**What:** Defining `customFieldValueSchema` identically in `purchase-orders.ts`, `invoices.ts`, `budgets.ts`.

**Why bad:** Changes need to be made in 3+ places, causing drift.

**Instead:** Extract shared schemas to `src/schemas.ts`, import where needed.

### Anti-Pattern 4: Single Type for List and Detail

**What:** One `ApprovalFlow` interface with `approval_steps?: ApprovalStep[]` (optional).

**Why bad:** TypeScript won't catch the difference. AI agents get wrong shape expectations.

**Instead:** `ApprovalFlowSummary` (no steps) and `ApprovalFlow` (with steps).

### Anti-Pattern 5: Registering Tools Inside index.ts Beyond Auth

**What:** Adding new tool registrations directly to `index.ts` instead of a tool file.

**Why bad:** `index.ts` becomes a monolith. Auth tools are the only justified exception (version branching logic).

**Instead:** Create a new `src/tools/domain.ts` file with `register*Tools()` function, add one call in `index.ts`.

---

## Build Order (Phase Dependency Graph)

Phase ordering is driven by type dependencies and risk reduction:

```
Phase 1: Fix Existing Tools (types.ts + schema corrections)
   - types.ts: add missing fields, add Summary vs Detail splits
   - api-client.ts: fix error parsing (error vs message field)
   - All 14 existing tool files: update Zod schemas to match permit()
   - No new files — safe, additive changes to existing code

Phase 2: New High-Priority Tools (new tool files)
   - types.ts: add CustomField (update existing), ComplianceBulkStatus, EvidencePack
   - src/tools/custom-fields.ts (new — 6 tools)
   - src/tools/compliance.ts (new — 10 tools, refs existing ComplianceCheck type)
   - Purchase-orders.ts: add 4 missing tools
   - Invoices.ts: add 3 missing tools
   - index.ts: add 2 register*Tools() calls

Phase 3: Medium-Priority Tools
   - types.ts: add UploadStatus, NpaymentDetail updates
   - src/tools/uploads.ts (new — 3 tools)
   - src/tools/digital-invoices.ts (new — 1 tool)
   - products.ts: add bulk_create, list_skus
   - approval-flows.ts: add version_details, bulk rerun
   - index.ts: add 2 register*Tools() calls

Phase 4: Low-Priority Tools
   - types.ts: add Policy, PolicyTemplate, ChatMessage, SamGovCheck
   - src/tools/policies.ts (new — ~6 tools)
   - src/tools/chat-messages.ts (new — ~3 tools, V3 only)
   - Suppliers: add supplier_approvals
   - Supplementary: add payment terms management
   - index.ts: add register*Tools() calls

Phase 5: Tests
   - tests/e2e/*.test.ts for every new tool file
   - Update existing tests for schema changes
   - MockApiServer routes: add new paths
```

**Rationale for this order:**
- Phase 1 first: correct existing type interfaces before new code depends on wrong shapes
- Phase 2 before Phase 3: compliance and custom fields are used by POs/invoices, should exist before uploading or digital invoices
- Phases can be done independently within a phase (no intra-phase dependency)
- Phase 5 last but tests should be written alongside each phase in practice

---

## Scalability Considerations

| Concern | At 88 tools (now) | At 126 tools (after) | At 200+ tools |
|---------|-------------------|----------------------|---------------|
| File size | 14 files, avg 150 lines | ~20 files, avg 150 lines | Same pattern, more files |
| Tool registration | 14 function calls in index.ts | ~20 function calls | Still manageable |
| types.ts size | ~800 lines | ~1200 lines | Consider splitting by domain |
| Test suite | 49 tests, 11 files | ~80 tests, 15+ files | Vitest handles well |
| Build time | Fast (tsc) | Minimal change | No concern |

**At 200+ tools:** types.ts should be split into `src/types/` directory with per-domain files (`purchase-orders.ts`, `invoices.ts`, etc.) and a barrel `src/types/index.ts` re-exporting everything. Not needed now.

---

## Sources

- `src/index.ts` — entry point, tool registration pattern (read directly)
- `src/api-client.ts` — HTTP client, buildPath, auth header logic (read directly)
- `src/types.ts` — existing interface definitions (read directly)
- `src/tools/purchase-orders.ts`, `src/tools/invoices.ts` — existing tool patterns (read directly)
- `po-app/app/serializers/purchase_order_serializer.rb` — confirmed list serializer fields (read directly)
- `po-app/app/serializers/purchase_order_details_serializer.rb` — confirmed detail serializer fields (read directly)
- `po-app/app/serializers/invoice_serializer.rb`, `invoice_detail_serializer.rb` — confirmed split (read directly)
- `po-app/app/controllers/api/v1/` and `/v3/` — confirmed controller list for new tool modules (read directly)
- `pex-api-skills/references/_standards.md` — confirmed error response formats, pagination shape (read directly)
- `pex-api-skills/references/compliance.md` — confirmed compliance endpoint parameters (read directly)
- `.planning/PROJECT.md` — requirements, phase structure, constraints (read directly)
