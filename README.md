# ProcurementExpress MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides LLMs with access to the [ProcurementExpress](https://www.procurementexpress.com/) API. Manage purchase orders, invoices, budgets, suppliers, and procurement workflows through natural language.

## Features

- **70+ tools** covering the full ProcurementExpress API surface
- **Dual API version support** — V1 (token-based) and V3 (OAuth2) authentication
- **Version-agnostic tool layer** — all tools work identically across API versions
- **Type-safe** — comprehensive TypeScript interfaces for all API entities
- **Zero external runtime dependencies** — only `@modelcontextprotocol/sdk` and `zod`

## Quick Start

### Prerequisites

- Node.js 18+
- A ProcurementExpress account with API access

### Installation

```bash
git clone <repository-url>
cd procurementexpress-mcp
npm install
npm run build
```

### Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

#### V1 Authentication (Recommended)

Static token authentication. The token never expires.

```env
PROCUREMENTEXPRESS_API_BASE_URL=https://app.procurementexpress.com
PROCUREMENTEXPRESS_API_VERSION=v1
PROCUREMENTEXPRESS_AUTH_TOKEN=your_authentication_token
PROCUREMENTEXPRESS_COMPANY_ID=your_company_id
```

#### V3 Authentication (OAuth2)

OAuth2 password grant. Tokens are time-limited and require `client_id`/`client_secret`.

```env
PROCUREMENTEXPRESS_API_BASE_URL=https://app.procurementexpress.com
PROCUREMENTEXPRESS_API_VERSION=v3
PROCUREMENTEXPRESS_CLIENT_ID=your_client_id
PROCUREMENTEXPRESS_CLIENT_SECRET=your_client_secret
```

### Usage with Claude Desktop

Add this to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "procurementexpress": {
      "command": "node",
      "args": ["/absolute/path/to/procurementexpress-mcp/dist/index.js"],
      "env": {
        "PROCUREMENTEXPRESS_API_BASE_URL": "https://app.procurementexpress.com",
        "PROCUREMENTEXPRESS_API_VERSION": "v1",
        "PROCUREMENTEXPRESS_AUTH_TOKEN": "your_token",
        "PROCUREMENTEXPRESS_COMPANY_ID": "your_company_id"
      }
    }
  }
}
```

### Usage with Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "procurementexpress": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "PROCUREMENTEXPRESS_API_BASE_URL": "https://app.procurementexpress.com",
        "PROCUREMENTEXPRESS_API_VERSION": "v1",
        "PROCUREMENTEXPRESS_AUTH_TOKEN": "your_token",
        "PROCUREMENTEXPRESS_COMPANY_ID": "your_company_id"
      }
    }
  }
}
```

## Authentication

The server supports two authentication modes, selected by the `PROCUREMENTEXPRESS_API_VERSION` environment variable.

### V1 — Token-Based (Default)

Set `PROCUREMENTEXPRESS_API_VERSION=v1`. Provide your static token and company ID via environment variables or pass them to the `authenticate` tool at runtime.

- Sends `authentication_token` and `app_company_id` headers on every request
- Token never expires — no refresh logic needed
- Environment variables: `PROCUREMENTEXPRESS_AUTH_TOKEN`, `PROCUREMENTEXPRESS_COMPANY_ID`

### V3 — OAuth2

Set `PROCUREMENTEXPRESS_API_VERSION=v3`. Requires `PROCUREMENTEXPRESS_CLIENT_ID` and `PROCUREMENTEXPRESS_CLIENT_SECRET` environment variables. Call the `authenticate` tool with email/password to obtain a Bearer token.

- Sends `Authorization: Bearer <token>` header on every request
- Tokens are time-limited with refresh support
- After authenticating, use `set_active_company` to select a company

## Available Tools

### Authentication (3 tools)

| Tool | Description |
|------|-------------|
| `authenticate` | V1: Set token + company ID. V3: OAuth2 login with email/password |
| `validate_token` | V1: Fetch current user to verify token. V3: Get token metadata |
| `revoke_token` | V1: Clear local token. V3: Revoke OAuth2 token |

### Users (4 tools)

| Tool | Description |
|------|-------------|
| `get_current_user` | Get authenticated user's profile and company memberships |
| `update_current_user` | Update profile (email, name, phone, password) |
| `list_currencies` | List enabled currencies for the current company |
| `list_all_currencies` | List all available currencies globally |

### Companies (7 tools)

| Tool | Description |
|------|-------------|
| `list_companies` | List all companies the current user belongs to |
| `get_company` | Get company details including settings and currencies |
| `set_active_company` | Set active company ID for subsequent API calls |
| `list_approvers` | List approvers filtered by department |
| `list_all_approvers` | List all approvers regardless of routing |
| `list_employees` | List all employees with roles |
| `invite_user` | Invite a user (roles: companyadmin, approver, finance, teammember) |

### Budgets (4 tools)

| Tool | Description |
|------|-------------|
| `list_budgets` | List budgets with pagination, filter by department/archived/active |
| `get_budget` | Get budget details including remaining amount |
| `create_budget` | Create a new budget |
| `update_budget` | Update an existing budget |

### Departments (4 tools)

| Tool | Description |
|------|-------------|
| `list_departments` | List departments with optional archived filter |
| `get_department` | Get a specific department |
| `create_department` | Create a new department |
| `update_department` | Update a department |

### Suppliers (4 tools)

| Tool | Description |
|------|-------------|
| `list_suppliers` | List suppliers with pagination and filters |
| `get_supplier` | Get a specific supplier |
| `create_supplier` | Create a supplier (name must be unique) |
| `update_supplier` | Update a supplier |

### Products (4 tools)

| Tool | Description |
|------|-------------|
| `list_products` | List products with supplier/archived filters |
| `get_product` | Get a specific product |
| `create_product` | Create a new product |
| `update_product` | Update a product |

### Purchase Orders (10 tools)

| Tool | Description |
|------|-------------|
| `list_purchase_orders` | List POs with pagination and search |
| `get_purchase_order` | Get PO details with line items, comments, approvals |
| `create_purchase_order` | Create a PO (commit='Send' to submit, 'Draft' to save) |
| `approve_purchase_order` | Approve using the accept token from approver request |
| `reject_purchase_order` | Reject using the reject token from approver request |
| `override_and_approve_purchase_order` | Finance override approval (no token required) |
| `cancel_purchase_order` | Cancel a purchase order |
| `archive_purchase_order` | Archive a purchase order |
| `get_pending_request_count` | Get count of pending approval requests |
| `receive_purchase_order_items` | Mark items as received |

### Invoices (10 tools)

| Tool | Description |
|------|-------------|
| `list_invoices` | List invoices with pagination and filters (100 per page) |
| `get_invoice` | Get invoice details |
| `create_invoice` | Create a new invoice |
| `update_invoice` | Update an existing invoice |
| `accept_invoice` | Accept an invoice awaiting review |
| `approve_invoice` | Approve an invoice |
| `reject_invoice` | Reject an invoice |
| `cancel_invoice` | Cancel an invoice |
| `archive_invoice` | Archive an invoice |
| `dearchive_invoice` | Restore an archived invoice |

### Approval Flows (6 tools)

| Tool | Description |
|------|-------------|
| `list_approval_flows` | List approval flows with search and pagination |
| `get_approval_flow` | Get flow details with steps, approvers, conditions |
| `create_approval_flow` | Create a flow (document_type: 0=PO, 1=invoice) |
| `delete_approval_flow` | Delete an approval flow |
| `archive_approval_flow` | Archive an approval flow |
| `list_approval_flow_runs` | List runs with status and date filters |

### Payments (2 tools)

| Tool | Description |
|------|-------------|
| `create_payment` | Create a payment (types: bank_transfer, card, check, cash, etc.) |
| `create_po_payment` | Create item-level payments for a purchase order |

### Tax Rates (4 tools)

| Tool | Description |
|------|-------------|
| `list_tax_rates` | List all tax rates (single and combined) |
| `get_tax_rate` | Get a specific tax rate |
| `create_tax_rate` | Create a new tax rate |
| `update_tax_rate` | Update a tax rate |

### Webhooks (4 tools)

| Tool | Description |
|------|-------------|
| `list_webhooks` | List webhooks with optional archived filter |
| `get_webhook` | Get a specific webhook |
| `create_webhook` | Create a webhook (events: new_po, po_approved, po_delivered, po_paid, po_cancelled, po_update) |
| `update_webhook` | Update a webhook |

### Comments (2 tools)

| Tool | Description |
|------|-------------|
| `add_purchase_order_comment` | Add a comment to a purchase order |
| `add_invoice_comment` | Add a comment to an invoice |

### Supplementary (5 tools)

| Tool | Description |
|------|-------------|
| `list_chart_of_accounts` | List chart of accounts with search |
| `list_qbo_customers` | List QuickBooks customers with search |
| `list_qbo_classes` | List QuickBooks classes with search |
| `list_send_to_supplier_templates` | List email templates for sending POs |
| `forward_purchase_order` | Email a PO to supplier(s) |

## Project Structure

```
src/
  index.ts              # Entry point — MCP server setup, auth tools, tool registration
  api-client.ts         # HTTP client with versioned path building and auth headers
  auth.ts               # Dual auth manager (V1 token / V3 OAuth2)
  tool-helpers.ts       # Shared response helpers and error handling wrapper
  types.ts              # TypeScript interfaces for all API entities
  tools/
    approval-flows.ts   # Approval flow CRUD and run listing
    budgets.ts          # Budget CRUD
    comments.ts         # PO and invoice comments
    companies.ts        # Company details, employees, approvers, invitations
    departments.ts      # Department CRUD
    invoices.ts         # Invoice CRUD, approve/reject/cancel/archive
    payments.ts         # Payment creation (standalone and PO-linked)
    products.ts         # Product CRUD
    purchase-orders.ts  # PO CRUD, approve/reject/cancel/archive, receiving
    supplementary.ts    # Chart of accounts, QBO integration, email forwarding
    suppliers.ts        # Supplier CRUD
    tax-rates.ts        # Tax rate CRUD
    users.ts            # Current user profile and currency listing
    webhooks.ts         # Webhook CRUD
tests/
  e2e/
    setup.ts            # MockApiServer with version-agnostic route registration
    *.test.ts           # E2E tests for each tool group (49 tests, 11 files)
```

## Development

### Build

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
```

### Test

```bash
npm test                                    # Run all tests
npm run test:e2e                            # Run E2E tests only
npx vitest run tests/e2e/auth.test.ts       # Run a single test file
npm run test:watch                          # Watch mode
```

Tests use a `MockApiServer` — a lightweight HTTP server that simulates the ProcurementExpress API. Mock routes use version-agnostic regex patterns (`/api/v[13]/`) so tests work for both V1 and V3 configurations.

### Adding a New Tool

1. Add TypeScript interfaces to `src/types.ts` if needed
2. Create or edit a file in `src/tools/` following the existing pattern:

```typescript
import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";

export function registerMyTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "my_tool_name",
    {
      description: "What this tool does",
      inputSchema: {
        id: z.number().int().positive().describe("Resource ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get(apiClient.buildPath(`/my_resource/${args.id}`));
      return jsonResponse(result);
    }),
  );
}
```

3. Register the tool group in `src/index.ts`:

```typescript
import { registerMyTools } from "./tools/my-tools.js";
registerMyTools(server, apiClient);
```

4. Add mock routes and tests in `tests/e2e/`

**Key conventions:**
- Always use `apiClient.buildPath("/resource")` — never hardcode `/api/v1/` or `/api/v3/`
- Wrap every handler with `withErrorHandling()`
- Use `jsonResponse()` for data and `textResponse()` for messages
- All imports must use `.js` extension (ES modules)

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROCUREMENTEXPRESS_API_BASE_URL` | No | `https://app.procurementexpress.com` | API base URL |
| `PROCUREMENTEXPRESS_API_VERSION` | No | `v1` | API version (`v1` or `v3`) |
| `PROCUREMENTEXPRESS_COMPANY_ID` | V1 | — | Company ID for V1 auth |
| `PROCUREMENTEXPRESS_AUTH_TOKEN` | V1 | — | Static authentication token for V1 |
| `PROCUREMENTEXPRESS_CLIENT_ID` | V3 | — | OAuth2 client ID for V3 |
| `PROCUREMENTEXPRESS_CLIENT_SECRET` | V3 | — | OAuth2 client secret for V3 |

## License

ISC
