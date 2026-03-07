# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile TypeScript (tsc) → dist/
npm test               # Run all tests (vitest run)
npm run test:e2e       # Run E2E tests only
npm run test:watch     # Run tests in watch mode
npm run dev            # TypeScript watch mode (tsc --watch)
npm start              # Run the MCP server (node dist/index.js)
npx vitest run tests/e2e/auth.test.ts  # Run a single test file
```

## Architecture

This is a **Model Context Protocol (MCP) server** that exposes 88 tools for interacting with the ProcurementExpress API. It uses stdio transport and is intended to be run as a subprocess by MCP clients (Claude Desktop, Claude Code, etc.).

### Core modules (`src/`)

- **`index.ts`** — Entry point. Creates `ApiClient`, `AuthManager`, `McpServer`, registers auth tools (V1 vs V3 branching), then calls each `register*Tools()` function. Auth tool registration is version-conditional; all other tool groups are version-agnostic.
- **`api-client.ts`** — HTTP client wrapping `fetch`. Handles auth headers (V1: `authentication_token` header, V3: `Authorization: Bearer` header), `app_company_id` header, and `buildPath()` which prepends `/api/{version}/` to resource paths. Paths starting with `/oauth` or `/api/` pass through unchanged.
- **`auth.ts`** — `AuthManager` with dual auth: `authenticateV1(token, companyId)` (static token) and `authenticateV3(email, password)` (OAuth2 password grant). `validateToken()` and `revokeToken()` behave differently per version.
- **`tool-helpers.ts`** — `textResponse()`, `jsonResponse()`, `withErrorHandling()` — shared MCP response helpers. `Server` type alias for `McpServer`.
- **`types.ts`** — All TypeScript interfaces for API responses. Based on Rails serializers from the backend.

### Tool groups (`src/tools/`)

Each tool file exports a single `register*Tools(server, apiClient)` function. 14 tool files:

| File | Tools | Description |
|------|-------|-------------|
| `approval-flows.ts` | 13 | Approval flow CRUD, publish/unpublish, runs, versions, rerun |
| `budgets.ts` | 4 | Budget CRUD |
| `comments.ts` | 2 | PO and invoice comments |
| `companies.ts` | 12 | Company details, employees, approvers, invitations |
| `departments.ts` | 4 | Department CRUD |
| `invoices.ts` | 11 | Invoice CRUD, approve/reject/cancel/archive, rerun approval |
| `payments.ts` | 3 | Payment creation (standalone, PO-linked) and get |
| `products.ts` | 4 | Product CRUD |
| `purchase-orders.ts` | 15 | PO CRUD, approve/reject/cancel/archive/delete, delivery, PDF |
| `supplementary.ts` | 8 | Chart of accounts, QBO integration, email forwarding |
| `suppliers.ts` | 5 | Supplier CRUD + top suppliers |
| `tax-rates.ts` | 4 | Tax rate CRUD |
| `users.ts` | 4 | Current user profile, currencies |
| `webhooks.ts` | 5 | Webhook CRUD + delete |

Plus 3 auth tools in `index.ts` (authenticate, validate_token, revoke_token).

### Tool pattern

```typescript
server.registerTool(
  "tool_name",
  { description: "...", inputSchema: { /* zod schemas */ } },
  withErrorHandling(async (args) => {
    const result = await apiClient.get<Type>(apiClient.buildPath("/resource"));
    return jsonResponse(result);
  }),
);
```

Always use `apiClient.buildPath("/resource")` for API paths — never hardcode `/api/v1/` or `/api/v3/`.

### Custom field values pattern

POs, invoices, budgets, and their line items support custom fields via `custom_field_values_attributes`:

```typescript
custom_field_values_attributes: [{ id?: number, value: string, custom_field_id: number }]
```

This pattern appears at both the entity level and nested inside line item schemas.

### Dual API versioning

Controlled by `PROCUREMENTEXPRESS_API_VERSION` env var (`v1` or `v3`, default: `v1`).

- **V1**: Static `authentication_token` + `app_company_id` headers. Token never expires.
- **V3**: OAuth2 password grant via Doorkeeper. `Authorization: Bearer <token>` header. Time-limited tokens.
- All resource endpoints are identical between versions — only auth mechanism and path prefix differ.

### Environment variables

All env vars use the `PROCUREMENTEXPRESS_` prefix. See `.env.example` for the full list. Key vars:
- `PROCUREMENTEXPRESS_API_BASE_URL` — API base URL
- `PROCUREMENTEXPRESS_API_VERSION` — `v1` or `v3`
- `PROCUREMENTEXPRESS_AUTH_TOKEN` / `PROCUREMENTEXPRESS_COMPANY_ID` — V1 auth
- `PROCUREMENTEXPRESS_CLIENT_ID` / `PROCUREMENTEXPRESS_CLIENT_SECRET` — V3 OAuth2

### Skills (`.claude/skills/pex-*/`)

10 module-specific skills route AI agents to the correct MCP tool calls without reading entire source files. Each skill has a `SKILL.md` with tool routing and workflow guidance:

- `pex:auth` — Authentication + user profile (5 tools)
- `pex:companies` — Company management, employees, invitations (12 tools)
- `pex:budgets` — Budget CRUD (4 tools)
- `pex:departments` — Department CRUD (4 tools)
- `pex:suppliers` — Suppliers + products (9 tools)
- `pex:purchase-orders` — PO lifecycle, delivery, forwarding (18 tools)
- `pex:invoices` — Invoice lifecycle (12 tools)
- `pex:payments` — Payments (3 tools)
- `pex:approval-flows` — Approval flow configuration (13 tools)
- `pex:settings` — Tax rates, webhooks, currencies, chart of accounts, QBO (17 tools)

### Testing (`tests/e2e/`)

Tests use **vitest** with a `MockApiServer` (plain Node `http.createServer`) defined in `setup.ts`. Mock routes use version-agnostic regex patterns (e.g., `/^\/api\/v[13]\/budgets$/`) so tests work regardless of API version. All resource tests default to V1 auth via `auth.authenticateV1()`. Auth tests cover both V1 and V3 flows.

### CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`. Tests against Node 18, 20, 22 matrix.

## Conventions

- ES modules (`"type": "module"`) — all imports must use `.js` extension
- Zod for input validation schemas (MCP SDK requirement)
- `buildPath()` for all API resource paths — keeps tool code version-agnostic
- `withErrorHandling()` wraps every tool handler
- `jsonResponse()` for data, `textResponse()` for messages
- `custom_field_values_attributes` for custom fields (not `custom_field_values`)
- Published to npm as `@procurementexpress.com/mcp` — use `/npm-publish` skill for releases
