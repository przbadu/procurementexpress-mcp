# Testing Patterns

**Analysis Date:** 2026-03-25

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Globals enabled (`globals: true`) -- no need to import `describe`, `it`, `expect` but the test files import them explicitly anyway
- Test timeout: 30000ms (30 seconds)

**Assertion Library:**
- Vitest built-in `expect` (Chai-compatible API)

**Run Commands:**
```bash
npm test                              # Run all tests (vitest run)
npm run test:e2e                      # Run E2E tests only (vitest run tests/e2e)
npm run test:watch                    # Watch mode (vitest)
npx vitest run tests/e2e/auth.test.ts # Run a single test file
```

## Test File Organization

**Location:**
- All tests in `tests/e2e/` directory (separate from source, not co-located)
- No unit test directory -- all tests are E2E-style against a mock HTTP server

**Naming:**
- Test files: `{resource}.test.ts` matching the tool file name
- Setup file: `tests/e2e/setup.ts` (not a test file)

**Structure:**
```
tests/
  e2e/
    setup.ts              # MockApiServer class + registerStandardRoutes()
    api-client.test.ts    # ApiClient HTTP methods, headers, path building
    auth.test.ts          # V1 and V3 authentication flows
    budgets.test.ts       # Budget CRUD
    comments.test.ts      # PO and invoice comments
    companies.test.ts     # Company endpoints
    departments.test.ts   # Department CRUD
    invoices.test.ts      # Invoice CRUD + approve
    purchase-orders.test.ts # PO CRUD + cancel + custom fields
    suppliers.test.ts     # Supplier endpoints
    supplementary.test.ts # Chart of accounts, currencies, etc.
    users.test.ts         # Current user profile
```

**Test count:** 49 tests across 11 test files.

## Test Structure

**Suite Organization:**
```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Resource E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list resources", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/resources"));
    expect(result).toHaveLength(2);
  });
});
```

**Patterns:**
- **Setup:** Each `describe` block creates its own `MockApiServer` instance, registers standard routes, starts it on a random port, and creates a fresh `ApiClient` pointed at that port
- **Teardown:** `afterAll` stops the mock server
- **Auth:** Resource tests default to V1 auth via `auth.authenticateV1("mock_token", "100")`
- **No shared state:** Each test file is fully independent with its own mock server instance

## Mock Server

**Framework:** Custom `MockApiServer` class in `tests/e2e/setup.ts` using Node.js `http.createServer`.

**Key features:**
- Routes registered via `mock.registerRoute({ method, path, handler })`
- `path` accepts either a string (exact match) or `RegExp`
- Records all requests for later assertion: `mock.getRequests()` / `mock.clearRequests()`
- Listens on port 0 (OS-assigned random port) to avoid conflicts

**Route registration pattern:**
```typescript
mock.registerRoute({
  method: "GET",
  path: /^\/api\/v[13]\/budgets$/,  // Version-agnostic regex
  handler: () => ({
    status: 200,
    body: [{ id: 1, name: "Q1 Budget", amount: 50000 }],
  }),
});
```

**Version-agnostic path helpers in `setup.ts`:**
```typescript
vPath("budgets")                    // /^\/api\/v[13]\/budgets$/
vPathWithId("budgets")              // /^\/api\/v[13]\/budgets\/\d+$/
vPathSuffix("companies", "employees") // /^\/api\/v[13]\/companies\/employees$/
vPathIdSuffix("purchase_orders", "cancel") // /^\/api\/v[13]\/purchase_orders\/\d+\/cancel$/
```

These helpers use `v[13]` regex to match both V1 and V3 API paths, so the same mock routes work regardless of API version.

**Standard routes:** `registerStandardRoutes(mock)` pre-registers mock endpoints for all major resources (budgets, companies, departments, suppliers, products, purchase orders, invoices, tax rates, webhooks, currencies, approval flows, comments, and OAuth2 auth endpoints).

## Test Approach

**Tests call `ApiClient` directly** -- they do NOT test through the MCP tool registration layer. Tests verify:
1. Correct API paths are called via `apiClient.buildPath()`
2. Request bodies are structured correctly
3. Response data is parsed correctly
4. Auth headers are sent correctly (via `mock.getRequests()`)

**This means:** Tests validate the HTTP client layer and mock response shapes, but do NOT test Zod schema validation, tool registration, or the `withErrorHandling()` wrapper.

```typescript
// Typical test: calls ApiClient directly, not through MCP tool
it("should list budgets", async () => {
  const result = await apiClient.get<any[]>(apiClient.buildPath("/budgets"));
  expect(result).toHaveLength(2);
  expect(result[0].name).toBe("Q1 Budget");
});
```

## Mocking

**Framework:** No mocking library (no jest.mock, no vitest.mock). The `MockApiServer` replaces the real API entirely at the HTTP level.

**What is mocked:**
- The entire ProcurementExpress API via `MockApiServer` (HTTP-level mock)
- Mock responses return minimal but structurally valid JSON

**What is NOT mocked:**
- `ApiClient` class -- used as-is against the mock server
- `AuthManager` class -- used as-is
- `fetch` -- real fetch calls hit the mock HTTP server on localhost

**Request inspection pattern:**
```typescript
it("should send correct auth headers", async () => {
  mock.clearRequests();
  await apiClient.get(apiClient.buildPath("/resource"));

  const requests = mock.getRequests();
  expect(requests[0].headers.authentication_token).toBe("mock_token");
  expect(requests[0].headers.app_company_id).toBe("100");
});
```

## Fixtures and Factories

**Test Data:**
- Mock response data is inline in route handlers within `tests/e2e/setup.ts`
- No separate fixtures directory or factory functions
- Data is minimal (only fields needed for assertions)

```typescript
// Inline fixture in registerStandardRoutes()
mock.registerRoute({
  method: "GET",
  path: vPathWithId("budgets"),
  handler: () => ({
    status: 200,
    body: { id: 1, name: "Q1 Budget", amount: 50000, currency_id: 1, remaining_amount: 30000 },
  }),
});
```

**For custom routes in specific tests:**
```typescript
// api-client.test.ts registers its own routes
mock.registerRoute({
  method: "GET",
  path: "/api/test/unauthorized",
  handler: () => ({ status: 401, body: { message: "Unauthorized" } }),
});
```

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
npx vitest run --coverage   # Not configured but available
```

## Test Types

**Unit Tests:**
- None exist as a separate category. All tests are in `tests/e2e/`.

**Integration/E2E Tests:**
- All 49 tests are "E2E" tests that exercise `ApiClient` + `AuthManager` against a mock HTTP server
- They validate the full request/response cycle: path building, header injection, body serialization, response parsing
- Tests do NOT spin up the MCP server or test through the MCP tool layer

**End-to-End Tests (full stack):**
- No tests that run the actual MCP server with stdio transport
- No tests against the real ProcurementExpress API

## Common Patterns

**Async Testing:**
```typescript
it("should create a purchase order", async () => {
  const po = await apiClient.post<any>(apiClient.buildPath("/purchase_orders"), {
    commit: "Send",
    purchase_order: { creator_id: 1, currency_id: 1, supplier_id: 1,
      purchase_order_items_attributes: [{ description: "Widget", quantity: 5, unit_price: 9.99 }],
    },
  });
  expect(po.id).toBe(2);
  expect(po.status).toBe("Pending");
});
```

**Error Testing:**
```typescript
it("should throw ApiClientError on 401", async () => {
  const client = new ApiClient(`http://localhost:${port}`);
  try {
    await client.get("/api/test/unauthorized");
    expect.fail("Should have thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(401);
  }
});

// Alternative: rejects matcher
it("should fail authentication with invalid credentials", async () => {
  await expect(badAuth.authenticateV3("bad@example.com", "wrong")).rejects.toThrow();
});
```

**Auth-specific tests use both V1 and V3 `describe` blocks:**
```typescript
describe("Authentication E2E - V3 (OAuth2)", () => { /* ... */ });
describe("Authentication E2E - V1 (Token)", () => { /* ... */ });
```

## CI/CD Integration

**Pipeline:** GitHub Actions in `.github/workflows/ci.yml`

**Triggers:** Push to `main` and pull requests targeting `main`

**Matrix:**
- Node.js 18, 20, 22
- Ubuntu latest

**Steps:**
1. `npm ci` -- install dependencies
2. `npm run build` -- compile TypeScript
3. `npm test` -- run all vitest tests

**No separate CI test commands** -- all tests run via `npm test` (which runs `vitest run`).

## Test Coverage Gaps

**MCP Tool Layer (HIGH priority):**
- No tests exercise the `server.registerTool()` registration or Zod schema validation
- The `withErrorHandling()` wrapper is not tested in isolation or through tool calls
- Tool descriptions and schema constraints are untested

**Missing resource test files:**
- No `tests/e2e/approval-flows.test.ts` -- 13 tools untested
- No `tests/e2e/payments.test.ts` -- 3 tools untested
- No `tests/e2e/tax-rates.test.ts` (beyond list) -- CRUD untested
- No `tests/e2e/webhooks.test.ts` (beyond list) -- CRUD untested

**Missing operation tests:**
- PO update, approve, reject, archive, delete, delivery operations
- Invoice update, reject, cancel, archive, dearchive, rerun operations
- Budget update operation
- Supplier update operation
- Department update/get operations

**Edge cases not tested:**
- 204 No Content response handling (DELETE operations)
- Paginated responses with multiple pages
- Query parameter encoding for special characters
- Empty response bodies
- `buildPath()` with query strings already in the path

---

*Testing analysis: 2026-03-25*
