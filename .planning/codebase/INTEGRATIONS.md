# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**ProcurementExpress API (Primary):**
- Base URL: configurable via `PROCUREMENTEXPRESS_API_BASE_URL` (default: `https://app.procurementexpress.com`)
- Production: `https://app.procurementexpress.com`
- Staging: `https://staging.procurementexpress.com`
- Client: Custom `ApiClient` class in `src/api-client.ts` using native `fetch`
- Transport: JSON over HTTPS (REST API)
- 88 MCP tools mapping to API endpoints across 14 tool files in `src/tools/`

**API Endpoints consumed (by resource):**

| Resource | Endpoints | Tool file |
|----------|-----------|-----------|
| Auth/OAuth | `/oauth/token`, `/oauth/token/info`, `/oauth/revoke`, `/api/{v}/currentuser` | `src/index.ts`, `src/auth.ts` |
| Purchase Orders | `/api/{v}/purchase_orders/*` | `src/tools/purchase-orders.ts` |
| Invoices | `/api/{v}/invoices/*` | `src/tools/invoices.ts` |
| Budgets | `/api/{v}/budgets/*` | `src/tools/budgets.ts` |
| Companies | `/api/{v}/companies/*` | `src/tools/companies.ts` |
| Suppliers | `/api/{v}/suppliers/*` | `src/tools/suppliers.ts` |
| Products | `/api/{v}/products/*` | `src/tools/products.ts` |
| Departments | `/api/{v}/departments/*` | `src/tools/departments.ts` |
| Approval Flows | `/api/{v}/approval_flows/*` | `src/tools/approval-flows.ts` |
| Comments | `/api/{v}/comments/*` | `src/tools/comments.ts` |
| Payments | `/api/{v}/payments/*` | `src/tools/payments.ts` |
| Tax Rates | `/api/{v}/tax_rates/*` | `src/tools/tax-rates.ts` |
| Webhooks | `/api/{v}/webhooks/*` | `src/tools/webhooks.ts` |
| Supplementary | `/api/{v}/chart_of_accounts/*`, QBO, email forwarding | `src/tools/supplementary.ts` |
| Users | `/api/{v}/currentuser`, `/api/{v}/currencies` | `src/tools/users.ts` |

## Authentication

**Dual authentication system** managed by `AuthManager` in `src/auth.ts`:

**V1 - Static Token Auth:**
- Method: Custom header `authentication_token` + `app_company_id`
- Tokens never expire
- Env vars: `PROCUREMENTEXPRESS_AUTH_TOKEN`, `PROCUREMENTEXPRESS_COMPANY_ID`
- Auto-authenticates from env vars on server startup (`src/index.ts` lines 150-157)

**V3 - OAuth2 Password Grant (Doorkeeper):**
- Method: `Authorization: Bearer <token>` header
- Grant type: `password` (email + password)
- Token endpoint: `/oauth/token`
- Token info: `/oauth/token/info`
- Token revocation: `/oauth/revoke`
- Time-limited tokens with `expires_in` field
- Env vars: `PROCUREMENTEXPRESS_CLIENT_ID`, `PROCUREMENTEXPRESS_CLIENT_SECRET`

**Version selection:** `PROCUREMENTEXPRESS_API_VERSION` env var (`v1` or `v3`, default: `v1`)

## Data Storage

**Databases:**
- None. This is a stateless MCP server that proxies to the ProcurementExpress API.

**File Storage:**
- None. No local file storage.

**Caching:**
- None. All API calls are pass-through with no caching layer.

## MCP Transport

**Protocol:** Model Context Protocol (MCP)
- Transport: stdio (stdin/stdout)
- Server is run as a subprocess by MCP clients (Claude Desktop, Claude Code, etc.)
- No HTTP server or open ports
- Connection setup: `StdioServerTransport` in `src/index.ts`

## QuickBooks Online Integration

**Indirect integration via ProcurementExpress API:**
- QBO sync tools exposed in `src/tools/supplementary.ts`
- Chart of accounts sync and QBO integration endpoints
- No direct QBO SDK or API calls from this server

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- `console.error()` for server startup messages and fatal errors
- Tool errors returned as MCP text responses via `withErrorHandling()` in `src/tool-helpers.ts`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- npm registry (`@procurementexpress.com/mcp`) - runs locally as MCP subprocess
- No cloud hosting or server deployment

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Triggers: push/PR to `main`
- Node.js 18/20/22 matrix on ubuntu-latest

**Publishing:**
- `npm publish` with `prepublishOnly` build hook
- Published files: `dist/` and `.claude/skills/`

## Environment Configuration

**Required env vars (V1 auth):**
- `PROCUREMENTEXPRESS_API_BASE_URL` - API server URL
- `PROCUREMENTEXPRESS_API_VERSION` - `v1` (default) or `v3`
- `PROCUREMENTEXPRESS_AUTH_TOKEN` - Static auth token
- `PROCUREMENTEXPRESS_COMPANY_ID` - Company ID

**Required env vars (V3 auth):**
- `PROCUREMENTEXPRESS_API_BASE_URL` - API server URL
- `PROCUREMENTEXPRESS_API_VERSION` - must be `v3`
- `PROCUREMENTEXPRESS_CLIENT_ID` - OAuth2 client ID
- `PROCUREMENTEXPRESS_CLIENT_SECRET` - OAuth2 client secret

**Optional env vars:**
- `ANTHROPIC_API_KEY` - For Task Master AI (not used by MCP server directly)
- `PERPLEXITY_API_KEY` - For Task Master AI (not used by MCP server directly)

**Configuration files:**
- `.env.example` - Template for env vars
- `.mcp.json` - MCP client configuration (for Claude Desktop/Code)

## Webhooks & Callbacks

**Incoming:**
- None. This server does not expose any HTTP endpoints.

**Outgoing:**
- None directly. The server manages webhook configurations on the ProcurementExpress API via `src/tools/webhooks.ts` (CRUD operations for webhook subscriptions), but does not send or receive webhook payloads itself.

## Third-Party SDKs

- None. The only external dependency is `@modelcontextprotocol/sdk` for MCP protocol support. All ProcurementExpress API communication uses native `fetch` with a custom client wrapper.

---

*Integration audit: 2026-03-25*
