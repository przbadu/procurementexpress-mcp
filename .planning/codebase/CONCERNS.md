# Codebase Concerns

**Analysis Date:** 2026-03-25

## Tech Debt

**Duplicated Zod Schemas:**
- Issue: `customFieldValueSchema` is defined identically in three separate files
- Files: `src/tools/purchase-orders.ts` (line 7), `src/tools/invoices.ts` (line 7), `src/tools/budgets.ts` (line 7)
- Impact: Changes to custom field validation must be replicated in three places, risk of divergence
- Fix approach: Extract `customFieldValueSchema` into a shared `src/schemas.ts` module and import it in each tool file

**Weakly Typed Fields in Types:**
- Issue: Seven fields across response interfaces use `unknown` or `unknown[]` instead of proper types
- Files: `src/types.ts` lines 96, 422-425, 537, 563, 623
- Specific fields:
  - `Budget.qbo_class: unknown | null` (line 96)
  - `PurchaseOrder.payments: unknown[]` (line 422)
  - `PurchaseOrder.purchase_order_item_payments: unknown[]` (line 423)
  - `PurchaseOrder.invoices: unknown[]` (line 425)
  - `Invoice.purchase_orders: unknown[]` (line 537)
  - `InvoiceLineItem.markup_info: unknown | null` (line 563)
  - `Payment.invoices: unknown[]` (line 623)
- Impact: No type safety for these nested objects; consumers must cast or guess structure
- Fix approach: Define proper interfaces based on the Rails serializers for each of these nested types

**Hardcoded MCP Server Version:**
- Issue: MCP server version is hardcoded as `"1.0.0"` while `package.json` is at `"2.0.1"`
- Files: `src/index.ts` (line 32), `package.json` (line 3)
- Impact: MCP clients see stale version info; confusing for debugging version mismatches
- Fix approach: Import version from `package.json` or use a build-time constant, e.g. `import { version } from '../package.json' assert { type: 'json' }`

**Repetitive Query Parameter Building:**
- Issue: Every list tool manually constructs URLSearchParams with repetitive `if (args.X) params.set("X", ...)` patterns
- Files: `src/tools/purchase-orders.ts` (lines 75-95), `src/tools/invoices.ts` (lines 62-75), `src/tools/approval-flows.ts` (lines 40-46), `src/tools/supplementary.ts` (lines 25-29), `src/tools/companies.ts` (lines 70-73)
- Impact: Boilerplate that grows with each new filter parameter; easy to miss a parameter
- Fix approach: Create a `buildQueryString(args, fieldMap?)` helper in `src/tool-helpers.ts` that iterates over defined args and maps them to query params

## Security Considerations

**No Token Refresh for V3 OAuth2:**
- Risk: V3 tokens expire (default 7200 seconds) but there is no automatic refresh mechanism. The `refresh_token` returned by `authenticateV3()` is stored in the response type but never used anywhere in the codebase.
- Files: `src/auth.ts` (line 32-43), `src/types.ts` (line 22)
- Current mitigation: User must re-authenticate manually when token expires
- Recommendations: Implement automatic token refresh in `ApiClient.request()` when a 401 is received, using the stored `refresh_token`. Alternatively, add a `refreshToken()` method to `AuthManager` and expose it as an MCP tool.

**Token Stored in Memory Only:**
- Risk: Auth tokens are stored as plain string properties on the `ApiClient` class. If the MCP server process crashes, auth state is lost and re-authentication is required.
- Files: `src/api-client.ts` (line 17), `src/auth.ts`
- Current mitigation: V1 auto-authenticates from env vars on startup (`src/index.ts` lines 150-157). V3 has no auto-auth from env vars.
- Recommendations: For V3, consider auto-authenticating from env vars if `PROCUREMENTEXPRESS_EMAIL` and `PROCUREMENTEXPRESS_PASSWORD` are set, or persisting tokens to a secure file. Note: this is a stdio MCP server run as a subprocess, so process lifetime matches the client session -- this may be acceptable.

**Approval Tokens Passed as Query Parameters:**
- Risk: Accept/reject tokens for purchase order approvals are passed as URL query parameters, which may appear in server logs
- Files: `src/tools/purchase-orders.ts` (lines 206, 221)
- Current mitigation: This mirrors the Rails API design (tokens come from the API response and are single-use)
- Recommendations: This is a backend API design concern, not actionable in the MCP layer. Low risk since tokens are ephemeral and single-use.

**No Input Sanitization Beyond Zod:**
- Risk: User-provided strings (search terms, notes, comments) are passed directly to the API without sanitization
- Files: All tool files in `src/tools/`
- Current mitigation: Zod validates types and shapes. The Rails backend handles SQL injection and XSS protection.
- Recommendations: This is acceptable for an API client. The backend is responsible for input sanitization. No action needed.

## Performance Considerations

**No Request Timeout:**
- Problem: `fetch()` calls in `ApiClient.request()` have no timeout configured. A slow or unresponsive API server will hang the MCP tool indefinitely.
- Files: `src/api-client.ts` (line 106)
- Cause: Native `fetch` does not set a default timeout
- Improvement path: Add `AbortController` with a configurable timeout (e.g., 30 seconds):
  ```typescript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timeout);
  ```

**No Rate Limiting or Retry Logic:**
- Problem: No retry logic for transient failures (5xx, network errors) and no rate limiting awareness
- Files: `src/api-client.ts`
- Cause: Simple fetch wrapper with no resilience patterns
- Improvement path: Add exponential backoff retry for 5xx and network errors (2-3 attempts). Add 429 handling with `Retry-After` header support.

**Large JSON Responses Serialized to Text:**
- Problem: All API responses are serialized to JSON text via `jsonResponse()` which calls `JSON.stringify(data, null, 2)`. For large list responses (hundreds of POs with nested line items), this creates large text payloads in the MCP response.
- Files: `src/tool-helpers.ts` (line 13)
- Cause: MCP protocol uses text content type; pretty-printing adds ~30% overhead
- Improvement path: Consider using compact JSON (no indentation) for list responses, or implement server-side pagination limits. Low priority since MCP clients handle large responses.

## Fragile Areas

**API Client 204 No Content Handling:**
- Files: `src/api-client.ts` (lines 120-122)
- Why fragile: Returns `{} as T` for 204 responses, which is a type-unsafe cast. If a caller expects a specific return type from a DELETE operation, they get an empty object that doesn't match the type.
- Safe modification: Consider returning `undefined` or `null` for 204 responses and updating the return type to `Promise<T | null>`. This would require updating all callers.
- Test coverage: Covered in `tests/e2e/api-client.test.ts`

**Error Handling Swallows Stack Traces:**
- Files: `src/tool-helpers.ts` (lines 20-31)
- Why fragile: `withErrorHandling` catches all errors and returns only `error.message` as a text response. Stack traces, error codes, and structured error data are lost. Debugging production issues requires reproducing the exact call.
- Safe modification: Include `error.stack` in development mode, or log the full error to stderr while returning the message to the MCP client
- Test coverage: Basic error path tested in `tests/e2e/api-client.test.ts`

**Mock Server Route Matching:**
- Files: `tests/e2e/setup.ts` (lines 30-35)
- Why fragile: Route matching uses string prefix matching (`path.startsWith(r.path + "?")`) which could match unintended routes. For example, a route registered for `/api/v1/purchase_orders` would also match `/api/v1/purchase_orders_archive` if such a path existed.
- Safe modification: Use exact match or regex for all routes
- Test coverage: N/A (test infrastructure itself)

## Test Coverage Gaps

**5 Tool Files Have Zero Tests:**
- What's not tested: All tools in approval-flows, payments, products, tax-rates, and webhooks
- Files:
  - `src/tools/approval-flows.ts` (13 tools, 0 tests)
  - `src/tools/payments.ts` (3 tools, 0 tests)
  - `src/tools/products.ts` (4 tools, 0 tests)
  - `src/tools/tax-rates.ts` (4 tools, 0 tests)
  - `src/tools/webhooks.ts` (5 tools, 0 tests)
- Risk: 29 out of 88 tools (33%) have no test coverage. Changes to these tools or the shared helpers they use could break silently.
- Priority: High -- approval-flows is the most complex untested module (13 tools with nested schemas for steps, conditions, and approvers)

**No Update/Delete Tests for Most Resources:**
- What's not tested: PUT, PATCH, DELETE operations for budgets, departments, suppliers, invoices, companies, purchase orders
- Files: All test files in `tests/e2e/`
- Risk: Write operations are the most critical path and most likely to have serialization bugs (e.g., wrong attribute name mapping like `purchase_order_items_attributes` vs `line_items`)
- Priority: Medium -- the existing tests cover list and create operations but skip update/delete

**No V3 Auth Tests for Resource Endpoints:**
- What's not tested: All resource tests use V1 auth only. No tests verify that V3 Bearer token auth headers are sent correctly for resource operations.
- Files: `tests/e2e/*.test.ts` (all use `auth.authenticateV1()`)
- Risk: V3 auth header construction could break without detection. The auth mechanism is tested in `tests/e2e/auth.test.ts`, but not in combination with resource calls.
- Priority: Low -- header construction is simple and tested in isolation in auth.test.ts

**No Error Response Tests:**
- What's not tested: API error responses (401, 403, 404, 422, 500) and their handling
- Files: `src/api-client.ts` (lines 108-117), `src/tool-helpers.ts` (lines 20-31)
- Risk: Error message extraction from various API error response formats could break
- Priority: Medium

## Dependencies at Risk

**Transitive Vulnerability (hono):**
- Risk: `npm audit` reports a moderate severity prototype pollution vulnerability in `hono` (<4.12.7) via `parseBody({ dot: true })`
- Impact: This is a transitive dependency (likely from `@modelcontextprotocol/sdk`). The MCP server does not use `hono` directly and does not call `parseBody`, so practical risk is minimal.
- Migration plan: Run `npm audit fix` or wait for `@modelcontextprotocol/sdk` to update its dependency

**Caret Version Ranges:**
- Risk: All dependencies use caret (`^`) version ranges, allowing minor/patch updates that could introduce breaking changes
- Impact: `@modelcontextprotocol/sdk` at `^1.26.0` could update to 1.x with breaking API changes
- Migration plan: Low risk given npm lockfile. Pin exact versions only if stability issues arise.

## Missing Critical Features

**No V3 Auto-Authentication:**
- Problem: V1 auto-authenticates from env vars on startup, but V3 requires manual `authenticate` tool call even when `PROCUREMENTEXPRESS_CLIENT_ID`, `PROCUREMENTEXPRESS_CLIENT_SECRET`, and user credentials are available
- Files: `src/index.ts` (lines 149-157)
- Blocks: Seamless V3 startup without user interaction

**No Pagination Helper:**
- Problem: Consumers must manually paginate through results. There is no "fetch all pages" helper for tools that return paginated data.
- Files: All list tools across `src/tools/`
- Blocks: Bulk operations that need all records (e.g., exporting all POs)

**No File Upload Support:**
- Problem: The API supports file attachments (uploads) on POs and invoices, but the MCP server has no file upload tool
- Files: `src/types.ts` (Upload interface at line 335)
- Blocks: Creating POs/invoices with attachments via MCP

## Scaling Limits

**Single Company Context:**
- Current capacity: One active company at a time (stored as `companyId` on `ApiClient`)
- Limit: Cannot make cross-company queries or batch operations across companies
- Scaling path: This matches the API design (company scoping via header). No change needed.

**88 MCP Tools Registered:**
- Current capacity: 88 tools registered in a single MCP server
- Limit: Some MCP clients may have issues displaying or searching through 88 tools. Claude Desktop handles this well, but other clients may not.
- Scaling path: Consider grouping tools into namespaces or offering a "lite" mode with fewer tools for simpler use cases

---

*Concerns audit: 2026-03-25*
