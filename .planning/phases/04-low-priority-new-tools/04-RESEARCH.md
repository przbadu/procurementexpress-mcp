# Phase 4: Low-Priority New Tools - Research

**Researched:** 2026-03-26
**Domain:** MCP tool implementation — policies, SAM.gov, chat messages (V3-only), supplier approvals, digital invoices, NPayments
**Confidence:** HIGH

## Summary

Phase 4 adds 15 narrow-audience capabilities to the MCP server. All target Rails controllers exist and have been verified against the Rails source. The Rails API has both V1 and V3 variants for SAM.gov and digital invoices; chat messages are V3-only (confirmed by routing and controller placement).

One requirement (LOW-09 pending invites) is already implemented in `src/tools/companies.ts` as `list_pending_invites` — this is complete and needs only an E2E test. Two requirements (LOW-07 and LOW-08 NPayment create/get) are also already implemented in `src/tools/payments.ts` as `create_payment` and `get_payment` — these tools use the `/npayments` endpoint and `{ npayment: {...} }` body shape that match Rails exactly. These also need E2E tests.

The remaining work is three new tool files: `src/tools/policies.ts` (POL-01 through POL-06), `src/tools/suppliers-extra.ts` or additions to `src/tools/suppliers.ts` (LOW-01 SAM.gov check, LOW-05 supplier approvals), and `src/tools/chat-messages.ts` (LOW-02 through LOW-04, V3-only). Digital invoice (LOW-06) goes in a new `src/tools/digital-invoices.ts` using `postMultipart()`.

**Primary recommendation:** Create three new tool files (policies, chat-messages, digital-invoices), add SAM.gov and supplier-approvals to suppliers.ts, register V3-only chat tools conditionally in index.ts, then write E2E tests for all new tools plus the already-implemented LOW-07/LOW-08/LOW-09.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- Cross-reference Rails source during implementation — Rails controllers and serializers are authoritative
- Full E2E test coverage required for every new and modified tool using MockApiServer body validation
- Never remove, rename, or retype existing tool input params — backwards-compat frozen
- Stay on Zod v3.25.x — MCP SDK 1.27.1 has confirmed bugs with Zod v4
- All new type fields added as optional (?) per conditional/feature-flag serializer attributes
- src/schemas.ts is the single source of truth for shared Zod schemas
- 202 async responses passed through directly — no internal polling
- V3-only tools: registration gated on API version check in index.ts
- Chat messages are V3 only — register conditionally like auth tools

### Claude's Discretion
All implementation choices.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | User can list policies | `GET /api/v1/policies` — PoliciesController#index, PolicySerializer, paginated, filters: status/archived/scope/category/budget_id/search |
| POL-02 | User can get a policy by ID | `GET /api/v1/policies/:id` — returns `{ policy: PolicyDetailSerializer, versions: [...] }` |
| POL-03 | User can create a policy | `POST /api/v1/policies` — `{ policy: { name, description, status, scope, category, content, min_amount, max_amount, min_quotes_required, archived, budget_ids[], required_attachments[] } }` |
| POL-04 | User can update a policy | `PATCH /api/v1/policies/:id` — same params as create |
| POL-05 | User can delete a policy | `DELETE /api/v1/policies/:id` — soft delete, returns 204 |
| POL-06 | User can list policy templates | `GET /api/v1/policy_templates` — returns `{ templates: [...] }` from PolicyTemplateService.all |
| LOW-01 | User can check a supplier against SAM.gov database | `POST /api/v[13]/sam_gov/check` — params: supplier_id, force(bool). Returns SamGovCheckSerializer or `{ status: "unchecked", supplier_id }` |
| LOW-02 | User can list chat messages (V3 only) | `GET /api/v3/chat_messages` — params: document_type, document_id, supplier_id, before_id. Returns `{ messages: [...], next_cursor }` |
| LOW-03 | User can create a chat message (V3 only) | `POST /api/v3/chat_messages` — params: document_type, document_id, supplier_id, body. Returns message JSON |
| LOW-04 | User can delete a chat message (V3 only) | `DELETE /api/v3/chat_messages/:id` — params: document_type, document_id, supplier_id, id. Returns 204 |
| LOW-05 | User can list pending supplier approval requests | `GET /api/v[13]/supplier_approvals` — SupplierApprovalSerializer, paginated, filter: search. Feature-flagged |
| LOW-06 | User can create a digital invoice from upload (scan & create) | `POST /api/v[13]/digital_invoices` — multipart form: file, upload_type. Returns InvoiceDetailSerializer or PurchaseOrderDetailsSerializer |
| LOW-07 | User can create an NPayment (multi-invoice/PO settlement) | ALREADY IMPLEMENTED as `create_payment` in payments.ts — needs E2E test |
| LOW-08 | User can get an NPayment by ID | ALREADY IMPLEMENTED as `get_payment` in payments.ts — needs E2E test |
| LOW-09 | User can list pending invites for a company | ALREADY IMPLEMENTED as `list_pending_invites` in companies.ts — needs E2E test |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 3.25.x | Input schema validation | Project-locked; MCP SDK compatibility |
| @modelcontextprotocol/sdk | 1.27.1 | MCP server + tool registration | Project standard |
| TypeScript | project version | Type safety | Project standard |
| vitest | ^4.0.18 | E2E test runner | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:http | built-in | MockApiServer in tests | All E2E tests |
| node:form-data | built-in via FormData | Multipart upload (digital invoice) | LOW-06 only |

**No new dependencies required.** All tooling is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/tools/
├── policies.ts          # NEW — POL-01 through POL-06
├── chat-messages.ts     # NEW — LOW-02 through LOW-04 (V3-only)
├── digital-invoices.ts  # NEW — LOW-06
├── suppliers.ts         # EXTEND — add check_sam_gov (LOW-01), list_supplier_approvals (LOW-05)
└── payments.ts          # NO CHANGE — LOW-07/LOW-08 already implemented

tests/e2e/
├── policies.test.ts         # NEW
├── chat-messages.test.ts    # NEW
├── digital-invoices.test.ts # NEW
└── payments.test.ts         # NEW — covers existing create_payment, get_payment + pending_invites slot in companies.test.ts
```

### Pattern 1: Standard Tool Registration

All tools follow the established project pattern:

```typescript
// Source: src/tools/budgets.ts (project convention)
server.registerTool(
  "tool_name",
  { description: "...", inputSchema: { /* zod schemas */ } },
  withErrorHandling(async (args) => {
    const result = await apiClient.get<Type>(apiClient.buildPath("/resource"));
    return jsonResponse(result);
  }),
);
```

### Pattern 2: V3-Only Tool Registration (chat messages)

V3-only tools are gated in `src/index.ts` inside the `!isV1` branch, mirroring the auth tool registration pattern:

```typescript
// Source: src/index.ts — existing V1/V3 branching pattern
if (isV1) {
  // register V1-only tools
} else {
  // register V3-only tools — chat messages go here
  registerChatMessageTools(server, apiClient);
}
```

### Pattern 3: Policy Create/Update Body Shape

```typescript
// Source: api/v1/policies_controller.rb — policy_params
const body = {
  policy: {
    name: args.name,
    description: args.description,
    status: args.status,
    scope: args.scope,            // serialized as "scope" but stored as scope column
    category: args.category,
    content: args.content,
    min_amount: args.min_amount,
    max_amount: args.max_amount,
    min_quotes_required: args.min_quotes_required,
    archived: args.archived,
    budget_ids: args.budget_ids,            // array
    required_attachments: args.required_attachments,  // array
  }
};
```

### Pattern 4: SAM.gov Check — Namespaced Route

The SAM.gov controller is namespaced, not a standard resource. Route: `POST /api/v[13]/sam_gov/check`.

```typescript
// Body params sent as query params or body (controller reads from params)
const body = { supplier_id: args.supplier_id, force: args.force };
await apiClient.post(apiClient.buildPath("/sam_gov/check"), body);
```

A second endpoint exists — `GET /api/v[13]/sam_gov/status/:supplier_id` — for fetching the cached check result. The CONTEXT.md and requirements mention only LOW-01 "check", but the controller also has `status`. Research recommends implementing both `check_sam_gov` and `get_sam_gov_status` since the status endpoint is trivially small. However, LOW-01 only requires the `check` action — implement status as a bonus if scope allows.

### Pattern 5: Chat Messages — Params Shape

Chat messages controller reads params directly (not nested under a root key):

```typescript
// Source: api/v3/chat_messages_controller.rb
// index: GET /api/v3/chat_messages?document_type=purchase_order&document_id=123&supplier_id=456&before_id=789
// create: POST /api/v3/chat_messages — body: { document_type, document_id, supplier_id, body }
// destroy: DELETE /api/v3/chat_messages/:id — query: document_type, document_id, supplier_id
```

Valid `document_type` values (from ChatServiceFactory): `"rfq"`, `"invoice"`, `"purchase_order"`.

```typescript
// Message JSON shape (from ChatService#message_json)
{
  id: number,
  body: string,
  created_at: string,  // ISO8601
  creator: {
    id: number,
    name: string,
    type: string,         // creator_type (polymorphic)
    employer: { id: number, name: string, type: string }
  }
}
```

Response for index: `{ messages: ChatMessage[], next_cursor: number | null }`

### Pattern 6: Digital Invoice — Multipart Upload

```typescript
// Source: api/v1/digital_invoices_controller.rb
// Uses postMultipart() from api-client.ts (established in Phase 3)
const form = new FormData();
form.append("file", fileData);
form.append("upload_type", "invoice"); // or "request" for PO scan
const result = await apiClient.postMultipart<InvoiceDetail>(
  apiClient.buildPath("/digital_invoices"),
  form
);
```

`upload_type` controls response: `"invoice"` → InvoiceDetailSerializer, `"request"` → PurchaseOrderDetailsSerializer.

### Pattern 7: Supplier Approvals — Feature-Flagged List

```typescript
// Source: api/v1/supplier_approvals_controller.rb
// GET /api/v[13]/supplier_approvals
// Query params: search (optional), page (optional)
// Response: { supplier_approvals: SupplierApproval[], meta: PaginationMeta }
```

### Pattern 8: Policy Templates — Static Response

```typescript
// Source: api/v1/policy_templates_controller.rb
// GET /api/v[13]/policy_templates
// Response: { templates: [...] } — from PolicyTemplateService.all (static list, not paginated)
```

### Anti-Patterns to Avoid

- **Nesting chat message params under a root key:** Rails reads `params[:document_type]`, not `params[:message][:document_type]` — do not wrap in a root object.
- **Hardcoding V3 path for chat messages:** Use `apiClient.buildPath("/chat_messages")` — the version is injected by `buildPath()`. Registration in index.ts is what gates V3-only behavior.
- **Assuming DELETE /chat_messages/:id is standalone:** The destroy action requires `document_type`, `document_id`, and `supplier_id` in addition to `:id` — these must be sent as query params.
- **Using `scope` as a Zod field name without aliasing:** `PolicySerializer` uses `attribute :policy_scope, key: :scope` to avoid collision with AMS's internal `scope` method. The JSON key returned is `scope`, not `policy_scope`. The MCP input param should be named `scope` (user-visible), and sent as `scope` in the request body (Rails `policy_params` permits `:scope`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart form encoding | Custom FormData builder | `postMultipart()` from api-client.ts | Already implemented in Phase 3, handles boundary automatically |
| Version detection | Environment var check in tools | `apiClient.getApiVersion()` / `isV1` from AuthManager | Established pattern in index.ts |
| Pagination dict | Custom meta builder | Rails `pagination_dict` on server side, read `meta` field from response | Server returns it; just type it as `PaginationMeta` |
| Error wrapping | Try/catch in tool body | `withErrorHandling()` wrapper | Handles Rails `{ error }` and `{ errors: [] }` formats |

---

## Common Pitfalls

### Pitfall 1: Policy Scope Serializer Key

**What goes wrong:** Developer adds `scope` to TypeScript type but Rails serializer uses `attribute :policy_scope, key: :scope`. The response JSON key is `scope` — this is correct. But if developer looks at serializer and sees `policy_scope`, they may think the JSON key is `policy_scope`.

**Why it happens:** AMS uses `scope` internally; the attribute is aliased to emit `scope` in JSON.

**How to avoid:** Trust the JSON key, not the Ruby attribute name. The TypeScript interface field should be `scope: string`.

**Warning signs:** Seeing `policy_scope` in TypeScript types.

### Pitfall 2: Chat Messages V3-Only Registration

**What goes wrong:** Tools registered unconditionally in index.ts and exposed to V1 clients — V1 doesn't have a V3 chat_messages controller.

**Why it happens:** Forgetting the version gate.

**How to avoid:** Import `registerChatMessageTools` inside the `else` block of the `if (isV1)` branch in index.ts.

**Warning signs:** Build succeeds but chat tools appear in V1 tool list.

### Pitfall 3: Digital Invoice File Param

**What goes wrong:** Passing file as a JSON string rather than as a FormData binary attachment.

**Why it happens:** Rails `params[:file]` in DigitalInvoicesController expects a multipart file upload.

**How to avoid:** Use `postMultipart()` with a `FormData` object. Do not use `apiClient.post()`.

**Warning signs:** Server returns `"File is required"` error even when file data is present.

### Pitfall 4: SAM.gov Routes — Not a Standard Resource

**What goes wrong:** Using `buildPath("/suppliers/sam_gov/check")` or similar — the namespace is `sam_gov`, not nested under suppliers.

**Why it happens:** Misreading the routes file.

**How to avoid:** SAM.gov routes are: `POST /api/v[13]/sam_gov/check` and `GET /api/v[13]/sam_gov/status/:supplier_id`. The `supplier_id` is a **body/query param**, not a URL segment (for `check`).

**Warning signs:** 404 responses when posting to check endpoint.

### Pitfall 5: DELETE Chat Message Requires Context Params

**What goes wrong:** Sending `DELETE /api/v3/chat_messages/123` without `document_type`, `document_id`, `supplier_id` in the request.

**Why it happens:** Rails `destroy` action calls `build_chat_service` which requires all three context params.

**How to avoid:** Include `document_type`, `document_id`, `supplier_id` as query params on the DELETE request.

**Warning signs:** `ArgumentError: Invalid document type` or `undefined supplier` errors.

### Pitfall 6: Policies Feature Flag

**What goes wrong:** Policies API returns 403 unless `FeatureFlag.policies_enabled?` is true for the company.

**Why it happens:** `before_action :feature_enabled?` gates all policy actions.

**How to avoid:** Document the feature flag requirement in the tool description. This is not an MCP implementation issue — just a runtime concern.

**Warning signs:** 403 response with `"Policies feature is not enabled"`.

---

## Code Examples

### Policies — List with Filters

```typescript
// Source: api/v1/policies_controller.rb#index
const params = new URLSearchParams();
if (args.status) params.set("status", args.status);
if (args.archived !== undefined) params.set("archived", String(args.archived));
if (args.scope) params.set("scope", args.scope);
if (args.category) params.set("category", args.category);
if (args.budget_id) params.set("budget_id", String(args.budget_id));
if (args.search) params.set("search", args.search);
if (args.page) params.set("page", String(args.page));
const query = params.toString();
const path = `${apiClient.buildPath("/policies")}${query ? `?${query}` : ""}`;
const result = await apiClient.get<{ policies: PolicySummary[]; meta: PaginationMeta }>(path);
```

### Policy Show Response Shape

```typescript
// Source: api/v1/policies_controller.rb#show
// Response: { policy: PolicyDetail, versions: PolicyVersion[] }
interface PolicyVersion {
  id: number;
  item_type: string;
  item_id: number;
  event: string;
  whodunnit: string | null;
  whodunnit_name: string | null;
  object: Record<string, unknown> | null;
  object_changes: Record<string, unknown> | null;
  created_at: string;
}
```

### SAM.gov Check

```typescript
// Source: api/v1/sam_gov_controller.rb#check
const result = await apiClient.post<SamGovCheck | SamGovUnchecked>(
  apiClient.buildPath("/sam_gov/check"),
  { supplier_id: args.supplier_id, force: args.force ?? false }
);
// Returns SamGovCheckSerializer or { status: "unchecked", supplier_id: number }
```

### Chat Message Create (V3 only)

```typescript
// Source: api/v3/chat_messages_controller.rb#create
const result = await apiClient.post<ChatMessage>(
  apiClient.buildPath("/chat_messages"),
  { document_type: args.document_type, document_id: args.document_id, supplier_id: args.supplier_id, body: args.body }
);
```

### Chat Message Delete (V3 only, query params)

```typescript
// Source: api/v3/chat_messages_controller.rb#destroy
const params = new URLSearchParams({
  document_type: args.document_type,
  document_id: String(args.document_id),
  supplier_id: String(args.supplier_id),
});
await apiClient.delete(
  `${apiClient.buildPath(`/chat_messages/${args.id}`)}?${params.toString()}`
);
```

### Digital Invoice — Multipart

```typescript
// Source: api/v1/digital_invoices_controller.rb#create
// upload_type: "invoice" (default) or "request" (creates a PO instead)
// Returns InvoiceDetailSerializer for "invoice", PurchaseOrderDetailsSerializer for "request"
const form = new FormData();
form.append("file", args.file_data, args.filename);
if (args.upload_type) form.append("upload_type", args.upload_type);
const result = await apiClient.postMultipart(apiClient.buildPath("/digital_invoices"), form);
```

---

## TypeScript Types Needed

The following new interfaces must be added to `src/types.ts`:

### PolicySummary (PolicySerializer)
```typescript
export interface PolicySummary {
  id: number;
  name: string;
  description: string | null;
  status: string;
  archived: boolean;
  category: string | null;
  scope: string | null;
  budget_ids: number[];
  min_amount: number | null;
  max_amount: number | null;
  required_attachments: string[];
  min_quotes_required: number | null;
  source_template_id: number | null;
  versions_count: number;
  created_at: number;
  updated_at: number;
  budgets: PolicyBudget[];
}

export interface PolicyBudget {
  id: number;
  name: string;
}
```

### PolicyDetail (PolicyDetailSerializer extends PolicySerializer)
```typescript
export interface PolicyDetail extends PolicySummary {
  content: string | null;
}

export interface PolicyVersion {
  id: number;
  item_type: string;
  item_id: number;
  event: string;
  whodunnit: string | null;
  whodunnit_name: string | null;
  object: Record<string, unknown> | null;
  object_changes: Record<string, unknown> | null;
  created_at: string;
}
```

### SamGovCheck (SamGovCheckSerializer)
```typescript
export interface SamGovCheck {
  id: number;
  supplier_id: number;
  supplier_name: string;
  uei: string | null;
  status: string;
  total_records: number;
  has_active_exclusions: boolean;
  exclusions: unknown[];
  search_params: Record<string, unknown> | null;
  checked_at: string | null;   // ISO8601
  fresh: boolean;
  verification_pdf_url: string | null;
  sam_gov_search_url: string | null;
}

export interface SamGovUnchecked {
  status: "unchecked";
  supplier_id: number;
}
```

### ChatMessage (chat_service.rb#message_json)
```typescript
export interface ChatMessage {
  id: number;
  body: string;
  created_at: string;   // ISO8601
  creator: {
    id: number;
    name: string;
    type: string;
    employer: { id: number; name: string; type: string };
  };
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  next_cursor: number | null;
}
```

### SupplierApproval (SupplierApprovalSerializer)
```typescript
export interface SupplierApproval {
  id: number;
  name: string;
  notes: string | null;
  phone_number: string | null;
  address: string | null;
  email: string | null;
  status: string;
  requester: { id: number; email: string; name: string; roles: string[] } | Record<string, never>;
  approver: { id: number; email: string; name: string; roles: string[] } | Record<string, never>;
  created_at: number;
  updated_at: number;
  uei: string | null;
  cage_code: string | null;
}
```

### InviteUser (InviteUserSerializer) — for list_pending_invites return type

```typescript
export interface InviteUser {
  id: number;
  email: string;
  name: string | null;
  roles: string[];
  department_ids: number[];
  approval_limit: number | null;
  status: string;
  created_at: number;
  token: string;
  invited_by_name: string | null;
}
```

---

## Pre-existing Implementation Status

**Already complete (need only E2E tests):**

| Tool Name | File | Requirement | Notes |
|-----------|------|-------------|-------|
| `get_payment` | src/tools/payments.ts | LOW-08 | Uses `/npayments/:id`, NpaymentDetailSerializer |
| `create_payment` | src/tools/payments.ts | LOW-07 | Uses `/npayments`, `{ npayment: {...} }` body shape |
| `list_pending_invites` | src/tools/companies.ts | LOW-09 | Uses `/companies/pending_invites`, returns plain array |

**Not yet implemented:**

| Requirement | New File | Notes |
|-------------|----------|-------|
| POL-01 to POL-06 | `src/tools/policies.ts` | Full CRUD + templates |
| LOW-01 | extend `src/tools/suppliers.ts` | SAM.gov check |
| LOW-02, LOW-03, LOW-04 | `src/tools/chat-messages.ts` | V3-only, register in index.ts else block |
| LOW-05 | extend `src/tools/suppliers.ts` | Supplier approvals list |
| LOW-06 | `src/tools/digital-invoices.ts` | Multipart, uses postMultipart() |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POL-01 | List policies with filters | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| POL-02 | Get policy by ID (includes versions) | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| POL-03 | Create policy | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| POL-04 | Update policy | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| POL-05 | Delete policy (204) | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| POL-06 | List policy templates | unit/e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ Wave 0 |
| LOW-01 | Check supplier against SAM.gov | unit/e2e | `npx vitest run tests/e2e/suppliers.test.ts` | ✅ extend |
| LOW-02 | List chat messages (V3) | unit/e2e | `npx vitest run tests/e2e/chat-messages.test.ts` | ❌ Wave 0 |
| LOW-03 | Create chat message (V3) | unit/e2e | `npx vitest run tests/e2e/chat-messages.test.ts` | ❌ Wave 0 |
| LOW-04 | Delete chat message (V3) | unit/e2e | `npx vitest run tests/e2e/chat-messages.test.ts` | ❌ Wave 0 |
| LOW-05 | List supplier approvals | unit/e2e | `npx vitest run tests/e2e/suppliers.test.ts` | ✅ extend |
| LOW-06 | Create digital invoice from upload | unit/e2e | `npx vitest run tests/e2e/digital-invoices.test.ts` | ❌ Wave 0 |
| LOW-07 | Create NPayment | unit/e2e | `npx vitest run tests/e2e/payments.test.ts` | ❌ Wave 0 (no payments.test.ts yet) |
| LOW-08 | Get NPayment by ID | unit/e2e | `npx vitest run tests/e2e/payments.test.ts` | ❌ Wave 0 |
| LOW-09 | List pending invites | unit/e2e | `npx vitest run tests/e2e/companies.test.ts` | ✅ extend |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/policies.test.ts` — covers POL-01 through POL-06
- [ ] `tests/e2e/chat-messages.test.ts` — covers LOW-02 through LOW-04
- [ ] `tests/e2e/digital-invoices.test.ts` — covers LOW-06
- [ ] `tests/e2e/payments.test.ts` — covers LOW-07 and LOW-08

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all work is TypeScript source file authoring using existing npm packages).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool registration in single block | Version-conditional registration in if/else | Phase 1 | V3-only tools go in else block |
| Inline Zod schemas | Shared schemas from src/schemas.ts | Phase 1 | Import from schemas.ts, not inline |
| Simple array responses | Summary/Detail type split | Phase 1 | Use correct type per endpoint |

---

## Open Questions

1. **SAM.gov status endpoint scope**
   - What we know: `GET /api/v[13]/sam_gov/status/:supplier_id` exists in Rails routes and controller
   - What's unclear: LOW-01 only mentions "check a supplier" — not "get cached status"
   - Recommendation: Implement both `check_sam_gov` and `get_sam_gov_status` in the same plan. The status endpoint is trivially small and useful for agents to avoid re-triggering expensive external API calls.

2. **Digital invoice file input in MCP context**
   - What we know: `postMultipart()` accepts a `FormData` object
   - What's unclear: MCP tool inputs are JSON — passing binary file data requires base64 encoding the file content and reconstructing a Blob in the tool handler
   - Recommendation: Accept `file_content` as a base64 string and `filename` as a string; convert to Blob+FormData inside the tool handler. Document this clearly in the tool description.

3. **Chat message delete params delivery**
   - What we know: Rails `destroy` action calls `build_chat_service` which reads `params[:document_type]`, `params[:document_id]`, `params[:supplier_id]`
   - What's unclear: Whether Rails reads these from query string or body on DELETE
   - Recommendation: Send as query string params on DELETE (Rails `params` merges both sources). Use URL construction like the existing comment delete pattern.

---

## Sources

### Primary (HIGH confidence)
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/policies_controller.rb` — strong params, filters, response shape
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/policy_templates_controller.rb` — index only
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/sam_gov_controller.rb` — check + status actions
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v3/sam_gov_controller.rb` — identical to v1
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v3/chat_messages_controller.rb` — V3-only, all params
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/supplier_approvals_controller.rb` — index only
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/digital_invoices_controller.rb` — multipart, upload_type
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/npayments_controller.rb` — show + create, strong params
- Rails source: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/companies_controller.rb` — pending_invites action
- Rails serializers: `policy_serializer.rb`, `policy_detail_serializer.rb`, `sam_gov_check_serializer.rb`, `npayment_detail_serializer.rb`, `supplier_approval_serializer.rb`, `invite_user_serializer.rb`
- Rails service: `/Users/przbadu/projects/pex/po-app/app/services/chat_service.rb` — message_json shape
- Rails service: `/Users/przbadu/projects/pex/po-app/app/services/chat_service_factory.rb` — document_type enum
- Rails routes: `/Users/przbadu/projects/pex/po-app/config/routes.rb` — all endpoint paths confirmed
- MCP source: `src/tools/payments.ts` — confirmed LOW-07/LOW-08 already implemented
- MCP source: `src/tools/companies.ts` — confirmed LOW-09 already implemented
- MCP source: `src/index.ts` — V3-only registration pattern
- MCP source: `src/api-client.ts` — `postMultipart()` available
- MCP source: `src/schemas.ts` — shared Zod schemas
- MCP source: `tests/e2e/setup.ts` — MockApiServer, vPath/vPathWithId/vPathSuffix helpers

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified existing tooling
- Architecture: HIGH — all Rails controllers verified, serializer shapes confirmed
- Pitfalls: HIGH — derived directly from Rails source code
- Pre-existing status: HIGH — checked actual source files for LOW-07/LOW-08/LOW-09

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Rails backend unlikely to change during implementation sprint)
