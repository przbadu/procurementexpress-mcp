# Architecture

**Analysis Date:** 2026-03-25

## Pattern Overview

**Overall:** MCP Server (Model Context Protocol) - a subprocess-based tool server communicating over stdio transport with MCP clients (Claude Desktop, Claude Code, etc.)

**Key Characteristics:**
- Single-process Node.js server, no HTTP listener in production (stdio transport only)
- Flat tool registration pattern — 14 tool groups + 3 auth tools, all registered at startup
- Thin API gateway — tools are lightweight wrappers around REST API calls to ProcurementExpress backend
- Dual auth mode (V1 static token / V3 OAuth2) determined at startup, not runtime switchable
- No database, no local state beyond in-memory auth token/company ID

## Layers

**Transport Layer (MCP SDK):**
- Purpose: Handles stdio communication with MCP clients
- Location: `@modelcontextprotocol/sdk` (external dependency)
- Contains: `McpServer`, `StdioServerTransport`
- Used by: `src/index.ts` entry point

**Tool Registration Layer:**
- Purpose: Defines all 88+ MCP tools with Zod input schemas and handlers
- Location: `src/tools/*.ts` (14 files) + auth tools in `src/index.ts`
- Contains: `register*Tools()` functions, Zod schemas for input validation
- Depends on: `ApiClient`, `tool-helpers`
- Used by: `src/index.ts` (called during initialization)

**Tool Helpers Layer:**
- Purpose: Shared response formatting and error handling for all tools
- Location: `src/tool-helpers.ts`
- Contains: `textResponse()`, `jsonResponse()`, `withErrorHandling()`, `Server` type alias
- Depends on: MCP SDK types
- Used by: All tool files and `src/index.ts`

**HTTP Client Layer:**
- Purpose: Centralized HTTP client for all ProcurementExpress API calls
- Location: `src/api-client.ts`
- Contains: `ApiClient` class with `get()`, `post()`, `put()`, `patch()`, `delete()`, `buildPath()`
- Depends on: Native `fetch`, `src/types.ts` for `ApiError`
- Used by: All tool files, `AuthManager`

**Auth Layer:**
- Purpose: Manages authentication state for both V1 and V3 API versions
- Location: `src/auth.ts`
- Contains: `AuthManager` class with `authenticateV1()`, `authenticateV3()`, `validateToken()`, `revokeToken()`
- Depends on: `ApiClient`
- Used by: `src/index.ts` (auth tools)

**Type Definitions:**
- Purpose: TypeScript interfaces for all API response shapes
- Location: `src/types.ts` (806 lines)
- Contains: ~40 interfaces based on Rails serializers
- Depends on: Nothing
- Used by: All tool files, `ApiClient`, `AuthManager`

## Module Dependency Graph

```
src/index.ts (entry point)
├── @modelcontextprotocol/sdk  (McpServer, StdioServerTransport)
├── zod                         (auth tool schemas only)
├── src/api-client.ts           (ApiClient)
├── src/auth.ts                 (AuthManager)
│   └── src/api-client.ts       (uses ApiClient for HTTP calls)
│   └── src/types.ts            (OAuthTokenResponse, TokenInfo, User)
├── src/tool-helpers.ts         (textResponse, jsonResponse, withErrorHandling)
│   └── @modelcontextprotocol/sdk  (McpServer type)
└── src/tools/*.ts              (14 register*Tools functions)
    ├── zod                     (input schemas)
    ├── src/api-client.ts       (ApiClient type)
    ├── src/tool-helpers.ts     (Server type, response helpers)
    └── src/types.ts            (response type interfaces)
```

All tool files follow the exact same dependency pattern: they import `zod`, `ApiClient` type, `Server` type + helpers from `tool-helpers`, and relevant types from `types.ts`.

## Data Flow

**MCP Tool Invocation (primary flow):**

1. MCP client sends JSON-RPC request over stdio → `StdioServerTransport`
2. `McpServer` routes to registered tool handler by tool name
3. Zod validates input schema; rejects invalid input automatically
4. `withErrorHandling()` wrapper catches any errors in the handler
5. Handler builds API path via `apiClient.buildPath("/resource")`
6. `ApiClient.request()` adds auth headers (V1: `authentication_token` / V3: `Authorization: Bearer`) and `app_company_id`
7. `fetch()` sends HTTP request to ProcurementExpress API backend
8. Response parsed as JSON, typed via generics (`apiClient.get<Type>()`)
9. `jsonResponse()` or `textResponse()` wraps result into MCP content format
10. Response returned to MCP client over stdio

**Authentication Flow (V1):**
1. `authenticate` tool called with token + company_id (or reads from env vars)
2. `AuthManager.authenticateV1()` stores token and company_id on `ApiClient` instance
3. All subsequent API calls include `authentication_token` and `app_company_id` headers

**Authentication Flow (V3):**
1. `authenticate` tool called with email + password
2. `AuthManager.authenticateV3()` POSTs to `/oauth/token` with client_id/secret
3. OAuth2 response contains `access_token`; stored on `ApiClient` instance
4. All subsequent API calls include `Authorization: Bearer <token>` header
5. Company ID set separately via `set_active_company` tool

**Auto-Authentication (V1 only):**
1. At startup, `src/index.ts` checks for `PROCUREMENTEXPRESS_AUTH_TOKEN` + `PROCUREMENTEXPRESS_COMPANY_ID` env vars
2. If both present, calls `authManager.authenticateV1()` before server starts
3. Server is immediately ready for API calls without explicit authentication

**State Management:**
- All state is in-memory on the `ApiClient` instance: `token`, `companyId`, `baseUrl`, `apiVersion`
- No persistence — state lost on process restart
- Single `ApiClient` instance shared across all tools (created once in `src/index.ts`)

## Key Abstractions

**ApiClient (`src/api-client.ts`):**
- Purpose: Encapsulates all HTTP communication with the ProcurementExpress API
- Pattern: Singleton-like (one instance created in `index.ts`, passed to all tools)
- Key method: `buildPath("/resource")` → `/api/{version}/resource` — ensures version-agnostic tool code
- Auth header injection is automatic based on `authMode` (v1 or v3)

**AuthManager (`src/auth.ts`):**
- Purpose: Abstracts dual auth strategies behind a single interface
- Pattern: Strategy pattern (V1 vs V3 behavior determined by `apiClient.getApiVersion()`)
- Delegates token storage to `ApiClient.setToken()`

**Tool Registration Functions (`src/tools/*.ts`):**
- Purpose: Each file groups related MCP tools for one API domain
- Pattern: Module pattern — each exports a single `register*Tools(server, apiClient)` function
- Signature: `(server: Server, apiClient: ApiClient) => void`
- Examples: `src/tools/budgets.ts`, `src/tools/purchase-orders.ts`, `src/tools/invoices.ts`

**withErrorHandling (`src/tool-helpers.ts`):**
- Purpose: Uniform error handling wrapper for every tool handler
- Pattern: Higher-order function wrapping async handlers
- Catches any error, returns `textResponse("Error: ...")` instead of throwing

**Response Helpers (`src/tool-helpers.ts`):**
- `jsonResponse(data)` — Serializes data to pretty-printed JSON wrapped in MCP text content
- `textResponse(text)` — Wraps plain text in MCP content format `{ content: [{ type: "text", text }] }`

## Entry Points

**Production Entry (`src/index.ts`):**
- Location: `src/index.ts` (172 lines)
- Triggers: `node dist/index.js` or `npx @procurementexpress.com/mcp`
- Shebang: `#!/usr/bin/env node`
- Initialization sequence:
  1. Create `ApiClient` (reads `PROCUREMENTEXPRESS_API_BASE_URL`, `PROCUREMENTEXPRESS_API_VERSION` from env)
  2. Create `AuthManager` (reads `PROCUREMENTEXPRESS_CLIENT_ID`, `PROCUREMENTEXPRESS_CLIENT_SECRET` from env)
  3. Determine `isV1` flag from API version
  4. Create `McpServer` instance with name/version/description
  5. Register auth tools (V1 or V3 variant based on `isV1`)
  6. Register all 14 tool groups via `register*Tools(server, apiClient)`
  7. Auto-authenticate V1 if env vars present
  8. Create `StdioServerTransport` and connect

**Test Entry (`tests/e2e/setup.ts`):**
- Location: `tests/e2e/setup.ts`
- Purpose: Provides `MockApiServer` for E2E tests
- Creates a real HTTP server on random port that simulates the ProcurementExpress API
- Tests create `ApiClient` pointing to `http://localhost:{port}` instead of production URL

## Error Handling

**Strategy:** Catch-and-return (never throw from tool handlers)

**Patterns:**
- `withErrorHandling()` wraps every tool handler — catches errors and returns them as text responses
- `ApiClientError` class (`src/api-client.ts`) carries HTTP status code + message
- Non-OK HTTP responses parsed for JSON error body; falls back to `statusText`
- 204 No Content responses return empty object `{} as T`
- Auth errors in V3 flow surface as `ApiClientError` (e.g., 401 from `/oauth/token`)
- Fatal startup errors caught in `main().catch()` → `process.exit(1)`

## Cross-Cutting Concerns

**Logging:** `console.error()` only — used for startup messages and auto-auth confirmation. No structured logging framework. stderr used because stdout is reserved for MCP stdio transport.

**Validation:** Zod schemas on every tool's `inputSchema`. MCP SDK validates inputs before handler is called. No additional runtime validation in handlers.

**Authentication:** Managed by `ApiClient` header injection. Tools never handle auth directly — they call `apiClient.get/post/put/patch/delete` and headers are added automatically.

**API Versioning:** `apiClient.buildPath()` abstracts version prefix. Tools never reference `/api/v1/` or `/api/v3/` directly. Version determined once at startup from `PROCUREMENTEXPRESS_API_VERSION` env var (default: `v1`).

---

*Architecture analysis: 2026-03-25*
