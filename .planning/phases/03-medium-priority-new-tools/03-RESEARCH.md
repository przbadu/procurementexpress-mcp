# Phase 3: Medium-Priority New Tools - Research

**Researched:** 2026-03-26
**Domain:** File uploads (multipart), product bulk ops, approval flow completions
**Confidence:** HIGH

## Summary

Phase 3 implements six requirements: UPLOAD-01, UPLOAD-02, UPLOAD-03, PROD-01, PROD-02, and LOW-10. The Rails backend was read directly — all blockers from STATE.md are now resolved.

**Upload encoding:** The Rails `UploadsController` (both v1 and v3) uses Paperclip `has_attached_file :file`. The strong params permit `:file` as a multipart field. The controller has no base64 decode path — file upload is raw `multipart/form-data`, not JSON. This requires extending `ApiClient` to support multipart POST, since the current `request()` method only sends `application/json`.

**Products bulk_create and skus:** Both endpoints exist in `ProductsController` and are registered in the v1 and v3 routes. `bulk_create` takes `{ product: { product_item_attributes: [{sku, description, unit_price}] }, supplier_id: N }` and returns `true` on success. `skus` is a GET collection endpoint returning an array of SKU strings.

**Approval flow gaps (LOW-10):** The `approval-flows.ts` file already has 13 tools registered. Reviewing the tool list against the requirements, `unpublish_approval_flow`, `get_approval_flow_version_details`, and `rerun_approval_flows` are **all already implemented** as of Phase 2 completion. LOW-10 requires "unpublish, version_details, bulk rerun" — all three exist. LOW-10 is therefore **already satisfied** by the existing tool set. The plan should verify this and mark as done rather than re-implement.

**Primary recommendation:** Create `src/tools/uploads.ts` for the three upload tools, extend `ApiClient.postMultipart()` for form-data POST, add `bulk_create_products` and `list_product_skus` to `products.ts`, and confirm LOW-10 is already complete.

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

### Claude's Discretion
All implementation choices at Claude's discretion (pure infrastructure phase).

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLOAD-01 | User can upload a file to a purchase order | Rails: POST /uploads/po with multipart/form-data `{ po_id, uploads_attributes: { file, upload_token } }` |
| UPLOAD-02 | User can upload a file to a comment | Rails: POST /uploads/poc with multipart/form-data `{ poc_id, uploads_attributes: { file, upload_token } }` |
| UPLOAD-03 | User can check upload status by token | Rails: GET /uploads/status?upload_token=TOKEN — returns Upload serializer |
| PROD-01 | User can bulk create products | Rails: POST /products/bulk_create with `{ product: { product_item_attributes: [...] }, supplier_id: N }` |
| PROD-02 | User can list product SKUs | Rails: GET /products/skus?query=&archived= — returns string[] |
| LOW-10 | Missing approval flow tools (unpublish, version_details, bulk rerun) | Already implemented in approval-flows.ts as `unpublish_approval_flow`, `get_approval_flow_version_details`, `rerun_approval_flows` — verify only |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 3.25.x | Input schema validation | Locked — MCP SDK requirement, v4 has known bugs |
| @modelcontextprotocol/sdk | 1.27.1 | MCP server and tool registration | Project foundation |
| TypeScript | current | Type safety | Project language |
| vitest | current | E2E testing | Project test framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:http | built-in | MockApiServer in tests | All E2E tests |
| node:fs / node:buffer | built-in | Read file bytes for multipart | Upload tool tests only |

**No new runtime dependencies.** All work is schema authoring and one ApiClient method extension.

## Architecture Patterns

### File Organization
```
src/
├── api-client.ts         # Add postMultipart() method
├── tools/
│   ├── uploads.ts        # New: UPLOAD-01, UPLOAD-02, UPLOAD-03
│   └── products.ts       # Extend: add bulk_create_products, list_product_skus
tests/e2e/
│   ├── uploads.test.ts   # New: E2E for all 3 upload tools
│   └── products.test.ts  # New: E2E for bulk_create_products, list_product_skus
```

### Pattern 1: Multipart POST in ApiClient

The current `ApiClient.request()` sets `Content-Type: application/json` in `buildHeaders()` and JSON-stringifies the body. File uploads require `multipart/form-data`. A new method `postMultipart()` must NOT set `Content-Type` manually — the browser/Node `fetch` sets it automatically with the boundary when given a `FormData` body.

```typescript
// ApiClient extension — do NOT set Content-Type; fetch sets it with boundary
async postMultipart<T>(
  path: string,
  form: FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const url = `${this.baseUrl}${path}`;
  // Build headers WITHOUT Content-Type (omit it so fetch sets multipart boundary)
  const headers: Record<string, string> = {};
  if (this.token) {
    if (this.authMode === "v1") {
      headers["authentication_token"] = this.token;
    } else {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
  }
  if (this.companyId) headers["app_company_id"] = this.companyId;
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const response = await fetch(url, { method: "POST", headers, body: form });
  if (!response.ok) { /* same error handling as request() */ }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}
```

### Pattern 2: Upload Tool Shape

Rails strong params for PO upload: `params.permit(:po_id, uploads_attributes: [:file, :upload_token])`

MCP agents cannot send binary file buffers directly, but they can send a file path or base64 string and the MCP server converts it to a Blob for FormData. The tool should accept `file_path` (a local filesystem path) which the tool reads and attaches.

```typescript
// Tool input schema for upload_file_to_purchase_order
{
  po_id: z.number().int().positive().describe("Purchase Order ID"),
  file_path: z.string().describe("Absolute path to the file to upload"),
  upload_token: z.string().min(7).describe("Unique client-generated token (min 7 chars) for idempotency and status tracking"),
  file_name: z.string().optional().describe("Override filename (defaults to basename of file_path)"),
}

// Tool implementation
const fileBuffer = await fs.promises.readFile(args.file_path);
const fileName = args.file_name ?? path.basename(args.file_path);
const blob = new Blob([fileBuffer]);
const form = new FormData();
form.append("po_id", String(args.po_id));
form.append("uploads_attributes[file]", blob, fileName);
form.append("uploads_attributes[upload_token]", args.upload_token);
const result = await apiClient.postMultipart<Upload>(apiClient.buildPath("/uploads/po"), form);
```

### Pattern 3: Products Bulk Create

Rails strong params: `params.require(:product).permit(product_item_attributes: [:sku, :description, :unit_price])` plus top-level `supplier_id`.

Response is `true` (JSON boolean), not an object. The Rails controller calls `success_response(true)`.

```typescript
// Tool input
{
  supplier_id: z.number().int().positive().describe("Supplier ID to associate all products with"),
  products: z.array(z.object({
    sku: z.string().optional().describe("SKU code"),
    description: z.string().describe("Product description (required)"),
    unit_price: z.number().optional().describe("Unit price"),
  })).min(1).describe("Products to create"),
}

// Request body shape
{
  supplier_id: args.supplier_id,
  product: {
    product_item_attributes: args.products,
  }
}
```

### Pattern 4: Products SKUs

Rails action: `GET /products/skus?query=&archived=` — returns `@products.map(&:sku).reject(&:blank?)` as a plain JSON array of strings.

```typescript
// Tool input
{
  query: z.string().optional().describe("Search query for SKU text"),
  supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
  archived: z.boolean().optional().describe("Include archived products (default: false)"),
}
// Returns: string[]
```

### Pattern 5: LOW-10 Verification

The three tools required by LOW-10 already exist in `src/tools/approval-flows.ts`:
- `unpublish_approval_flow` — line 193, PATCH `/approval_flows/:id/unpublish`
- `get_approval_flow_version_details` — line 263, GET `/approval_flows/:id/version_details?version_id=N`
- `rerun_approval_flows` — line 279, POST `/approval_flows/rerun_approval_flows`

The plan for LOW-10 should be a verification wave: run `npm test`, confirm all 3 tool tests pass, mark LOW-10 complete.

### Routes (verified from routes.rb)

| Endpoint | HTTP | Rails Route |
|----------|------|-------------|
| Upload to PO | POST | `/api/v{1,3}/uploads/po` |
| Upload to comment | POST | `/api/v{1,3}/uploads/poc` |
| Upload status | GET | `/api/v{1,3}/uploads/status?upload_token=` |
| Bulk create products | POST | `/api/v{1,3}/products/bulk_create` |
| List product SKUs | GET | `/api/v{1,3}/products/skus` |
| Unpublish flow | PATCH | `/api/v{1,3}/approval_flows/:id/unpublish` |
| Version details | GET | `/api/v{1,3}/approval_flows/:id/version_details?version_id=` |
| Bulk rerun flows | POST | `/api/v{1,3}/approval_flows/rerun_approval_flows` |

### Anti-Patterns to Avoid
- **Setting Content-Type: multipart/form-data manually:** When using `FormData` with `fetch`, never set `Content-Type` — the browser/Node runtime sets it with the correct boundary parameter automatically. Setting it manually breaks the boundary parsing.
- **Using `apiClient.post()` for file uploads:** The existing `post()` method always sets `application/json` and calls `JSON.stringify(body)`. File uploads must use the new `postMultipart()` method.
- **Inline Zod schemas in tools:** All reusable schemas belong in `src/schemas.ts`. Upload and product schemas can be file-local since they are not shared.
- **Hardcoding `/api/v1/` paths:** Always use `apiClient.buildPath("/uploads/po")`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File reading | Custom file reader | `node:fs/promises.readFile()` | Built-in, handles all edge cases |
| FormData construction | Manual boundary string | Node.js global `FormData` + `Blob` | Node 18+ has native FormData/Blob |
| Upload token generation | Custom hash | Pass caller-provided string (min 7 chars) | Rails validates length ≥ 7; callers generate their own idempotency tokens |
| MIME type detection | Custom extension mapping | Let `Blob` carry binary; Rails Paperclip detects MIME from content | Paperclip validates MIME against `SUPPORTED_MIMETYPES` server-side |

## Common Pitfalls

### Pitfall 1: FormData Content-Type Header
**What goes wrong:** Request body is sent as plain text or JSON instead of multipart; Rails Paperclip cannot parse the file attachment; upload fails with "file can't be blank".
**Why it happens:** Developer manually sets `Content-Type: multipart/form-data` without a boundary, or wraps the body in `JSON.stringify`.
**How to avoid:** In `postMultipart()`, omit `Content-Type` from headers entirely. Pass a `FormData` instance as the `body` option to `fetch`. Node 18+ native `fetch` (or `undici`) handles boundary injection.
**Warning signs:** Server returns 422 with "file can't be blank" even though a file was provided.

### Pitfall 2: upload_token Validation
**What goes wrong:** Upload rejected with 400 "token blank" or "invalid token".
**Why it happens:** Rails `validate_upload_token` checks (1) token must be present and (2) length must be ≥ 7. The Zod schema must enforce `min(7)`.
**How to avoid:** Input schema: `upload_token: z.string().min(7).describe(...)`. Include this in the tool description so callers know the constraint.
**Warning signs:** 400 response with "invalid_token" i18n message.

### Pitfall 3: bulk_create response shape
**What goes wrong:** Code tries to call `jsonResponse(result.product)` or similar — result is just `true`.
**Why it happens:** `success_response(true)` in Rails returns `{ "success": true }` or the boolean directly depending on base controller implementation.
**How to avoid:** Check the Rails BaseController `success_response` implementation. Use `textResponse()` with a success message, or `jsonResponse(result)` where result is the raw boolean/object.
**Warning signs:** TypeScript error trying to access properties on `boolean`.

### Pitfall 4: product skus collection route ordering in tests
**What goes wrong:** Mock route for `/products/skus` accidentally matches `/products/:id` pattern.
**Why it happens:** `vPath("products")` matches `/api/v1/products` but `vPathWithId("products")` also matches paths like `/api/v1/products/skus` if `skus` is treated as an ID.
**How to avoid:** Register the `/products/skus` mock route BEFORE the `vPathWithId("products")` route, since MockApiServer uses first-match. Use a specific regex: `/^\/api\/v[13]\/products\/skus(\?.*)?$/`.
**Warning signs:** `get_product` mock route intercepts `list_product_skus` calls in tests.

### Pitfall 5: LOW-10 "missing tools" that aren't missing
**What goes wrong:** Plan creates duplicate tools for unpublish/version_details/rerun that already exist, breaking tool count or causing name conflicts.
**Why it happens:** STATE.md blocker said "approval flows tool count discrepancy (13 vs 13+3) — clarify". On inspection, all 13 tools (including the 3 in question) are already in approval-flows.ts.
**How to avoid:** Verification plan only — no new code for LOW-10. Confirm test coverage exists, mark complete.

## Code Examples

### Upload tool registration pattern
```typescript
// Source: Rails UploadsController strong params (verified)
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

server.registerTool(
  "upload_file_to_purchase_order",
  {
    description: "Upload a file attachment to a purchase order. " +
      "Provide a local file path. upload_token must be at least 7 chars — " +
      "use it later with get_upload_status to confirm the upload.",
    inputSchema: {
      po_id: z.number().int().positive().describe("Purchase Order ID"),
      file_path: z.string().describe("Absolute local path to the file"),
      upload_token: z.string().min(7).describe("Client-generated unique token (min 7 chars)"),
      file_name: z.string().optional().describe("Override filename"),
    },
  },
  withErrorHandling(async (args) => {
    const fileBuffer = await readFile(args.file_path);
    const fileName = args.file_name ?? basename(args.file_path);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append("po_id", String(args.po_id));
    form.append("uploads_attributes[file]", blob, fileName);
    form.append("uploads_attributes[upload_token]", args.upload_token);
    const result = await apiClient.postMultipart<Upload>(
      apiClient.buildPath("/uploads/po"),
      form,
    );
    return jsonResponse(result);
  }),
);
```

### Upload status tool
```typescript
// Source: Rails UploadsController#status (verified)
// GET /uploads/status?upload_token=TOKEN
// Returns Upload serializer: { id, file_file_name, file_content_type, url, upload_token }
server.registerTool(
  "get_upload_status",
  {
    description: "Check upload status by token. Returns upload details if found.",
    inputSchema: {
      upload_token: z.string().describe("The upload_token used during upload"),
    },
  },
  withErrorHandling(async (args) => {
    const path = `${apiClient.buildPath("/uploads/status")}?upload_token=${encodeURIComponent(args.upload_token)}`;
    const result = await apiClient.get<Upload>(path);
    return jsonResponse(result);
  }),
);
```

### Bulk create products
```typescript
// Source: Rails ProductsController#bulk_create strong params (verified)
server.registerTool(
  "bulk_create_products",
  {
    description: "Create multiple products in a single call, all associated with one supplier.",
    inputSchema: {
      supplier_id: z.number().int().positive().describe("Supplier ID"),
      products: z.array(z.object({
        description: z.string().describe("Product description (required)"),
        sku: z.string().optional().describe("SKU code"),
        unit_price: z.number().optional().describe("Unit price"),
      })).min(1).describe("Products to create"),
    },
  },
  withErrorHandling(async (args) => {
    const body = {
      supplier_id: args.supplier_id,
      product: {
        product_item_attributes: args.products,
      },
    };
    const result = await apiClient.post(apiClient.buildPath("/products/bulk_create"), body);
    return jsonResponse(result);
  }),
);
```

### List product SKUs
```typescript
// Source: Rails ProductsController#skus (verified)
// Returns: string[] (blank SKUs filtered out)
server.registerTool(
  "list_product_skus",
  {
    description: "List all non-blank product SKUs. Optionally filter by text query, supplier, or archived status.",
    inputSchema: {
      query: z.string().optional().describe("Search text within SKU values"),
      supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
      archived: z.boolean().optional().describe("Include archived products (default: false)"),
    },
  },
  withErrorHandling(async (args) => {
    const params = new URLSearchParams();
    if (args.query) params.set("query", args.query);
    if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
    if (args.archived !== undefined) params.set("archived", String(args.archived));
    const query = params.toString();
    const path = `${apiClient.buildPath("/products/skus")}${query ? `?${query}` : ""}`;
    const skus = await apiClient.get<string[]>(path);
    return jsonResponse(skus);
  }),
);
```

### ApiClient.postMultipart() addition
```typescript
// Source: ApiClient pattern — do NOT set Content-Type
async postMultipart<T>(
  path: string,
  form: FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const url = `${this.baseUrl}${path}`;
  // Build headers WITHOUT Content-Type
  const headers: Record<string, string> = {};
  if (this.token) {
    if (this.authMode === "v1") {
      headers["authentication_token"] = this.token;
    } else {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
  }
  if (this.companyId) headers["app_company_id"] = this.companyId;
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const response = await fetch(url, { method: "POST", headers, body: form });
  if (!response.ok) {
    let message: string;
    try {
      const errorBody = (await response.json()) as Record<string, unknown>;
      if (typeof errorBody.error === "string") message = errorBody.error;
      else if (Array.isArray(errorBody.error)) message = (errorBody.error as string[]).join("; ");
      else if (Array.isArray(errorBody.errors)) message = (errorBody.errors as string[]).join("; ");
      else if (typeof errorBody.message === "string") message = errorBody.message;
      else message = response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new ApiClientError(response.status, `${response.status}: ${message}`);
  }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}
```

## TypeScript Types to Add

```typescript
// Source: UploadSerializer attributes (verified from app/serializers/upload_serializer.rb)
export interface Upload {
  id: number;
  file_file_name: string;
  file_content_type: string;
  url: string;
  upload_token: string | null;
}
```

## Environment Availability

Step 2.6: Audited. No external dependencies beyond Node.js built-ins.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node:fs/promises | Upload file reading | Yes | Node 18+ (built-in) | — |
| FormData (global) | Multipart POST | Yes | Node 18+ native | — |
| Blob (global) | Multipart POST | Yes | Node 18+ native | — |
| node:path | File basename | Yes | built-in | — |

**No missing dependencies.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (current) |
| Config file | vite.config.ts or vitest defaults |
| Quick run command | `npx vitest run tests/e2e/uploads.test.ts tests/e2e/products.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPLOAD-01 | upload_file_to_purchase_order sends multipart POST with po_id, file, upload_token | E2E (mock) | `npx vitest run tests/e2e/uploads.test.ts` | ❌ Wave 0 |
| UPLOAD-02 | upload_file_to_comment sends multipart POST with poc_id, file, upload_token | E2E (mock) | `npx vitest run tests/e2e/uploads.test.ts` | ❌ Wave 0 |
| UPLOAD-03 | get_upload_status sends GET with upload_token query param | E2E (mock) | `npx vitest run tests/e2e/uploads.test.ts` | ❌ Wave 0 |
| PROD-01 | bulk_create_products sends POST with correct nested body shape | E2E (mock) | `npx vitest run tests/e2e/products.test.ts` | ❌ Wave 0 |
| PROD-02 | list_product_skus sends GET to /products/skus, returns string[] | E2E (mock) | `npx vitest run tests/e2e/products.test.ts` | ❌ Wave 0 |
| LOW-10 | unpublish/version_details/rerun_approval_flows tools exist and are tested | E2E verification | `npm test` | ❌ needs approval-flows.test.ts |

### Sampling Rate
- **Per task commit:** `npm run build && npx vitest run tests/e2e/uploads.test.ts tests/e2e/products.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green (133+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/uploads.test.ts` — covers UPLOAD-01, UPLOAD-02, UPLOAD-03
- [ ] `tests/e2e/products.test.ts` — covers PROD-01, PROD-02 (new tools only; existing product tests may need integration)
- [ ] `tests/e2e/approval-flows.test.ts` — covers LOW-10 existing tools (unpublish, version_details, rerun)
- [ ] `Upload` interface in `src/types.ts` — needed before upload tools compile
- [ ] `ApiClient.postMultipart()` — needed before upload tools compile

**Note on MockApiServer and multipart:** The MockApiServer reads the raw request body as a string (`body += chunk.toString()`). For multipart tests, the mock routes for upload endpoints should validate the body contains the expected boundary fields (check for `upload_token`, `po_id`, `file` field names in the raw multipart string). The actual binary file content doesn't need to be correct in tests — just verify the FormData keys are present.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| base64-encoded JSON body upload | Native multipart/form-data | Rails always used multipart | No migration needed — just implement correctly |
| Individual product create loop | bulk_create collection action | Always existed | Use bulk_create for batch operations |

## Open Questions

1. **Rails BaseController success_response(true) shape**
   - What we know: `ProductsController#bulk_create` calls `success_response(true)`
   - What's unclear: Does Rails BaseController wrap this as `{ success: true }` or return the raw boolean?
   - Recommendation: During implementation, read `app/controllers/api/v1/base_controller.rb` to check the exact `success_response` method. Use `jsonResponse(result)` on the MCP side regardless — the response is passed through to the agent.

2. **MockApiServer multipart body capture**
   - What we know: `setup.ts` reads body as raw string — multipart bodies will be readable as text
   - What's unclear: Whether the `"content-type": "application/json"` assertion in existing tests will interfere with multipart routes
   - Recommendation: Upload test routes should NOT assert `Content-Type` header. Check that the mock body string contains the expected field boundaries.

## Sources

### Primary (HIGH confidence)
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/uploads_controller.rb` — strong params, route actions, token validation
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v3/uploads_controller.rb` — confirms v3 is identical to v1
- `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/products_controller.rb` — bulk_create and skus actions, strong params
- `/Users/przbadu/projects/pex/po-app/app/serializers/upload_serializer.rb` — Upload response shape
- `/Users/przbadu/projects/pex/po-app/app/models/upload.rb` — SUPPORTED_MIMETYPES, Paperclip `has_attached_file :file`, upload_token uniqueness validation
- `/Users/przbadu/projects/pex/po-app/config/routes.rb` lines 969-971, 1015-1035 — confirmed v1 and v3 routes for uploads, products bulk_create, products skus
- `/Users/przbadu/projects/pex/procurementexpress-mcp/src/tools/approval-flows.ts` — confirmed all 13 tools including unpublish, version_details, rerun

### Secondary (MEDIUM confidence)
- Node.js documentation (training knowledge): FormData and Blob are global since Node 18; fetch is global since Node 18

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Upload API contract: HIGH — read directly from Rails controllers and model
- Products bulk_create/skus: HIGH — read directly from Rails controller and routes
- LOW-10 status: HIGH — counted tools in approval-flows.ts directly
- Multipart implementation pattern: HIGH — standard Node 18+ fetch + FormData
- Test patterns: HIGH — read from existing setup.ts

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable Rails backend, unlikely to change)
