# ProcurementExpress MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides LLMs with access to the [ProcurementExpress](https://www.procurementexpress.com/) API. Manage purchase orders, invoices, budgets, suppliers, and procurement workflows through natural language.

## Features

- **88 tools** covering the full ProcurementExpress API surface
- **Dual API version support** — V1 (token-based) and V3 (OAuth2) authentication
- **Version-agnostic tool layer** — all tools work identically across API versions
- **Type-safe** — comprehensive TypeScript interfaces for all API entities
- **Zero external runtime dependencies** — only `@modelcontextprotocol/sdk` and `zod`

## Quick Start

### Prerequisites

- Node.js 18+
- A ProcurementExpress account with API access

### Installation

No installation required — run directly with `npx`:

```bash
npx -y @procurementexpress.com/mcp
```

### Usage with Claude Desktop

Add this to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "procurementexpress": {
      "command": "npx",
      "args": ["-y", "@procurementexpress.com/mcp"],
      "env": {
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
      "command": "npx",
      "args": ["-y", "@procurementexpress.com/mcp"],
      "env": {
        "PROCUREMENTEXPRESS_API_VERSION": "v1",
        "PROCUREMENTEXPRESS_AUTH_TOKEN": "your_token",
        "PROCUREMENTEXPRESS_COMPANY_ID": "your_company_id"
      }
    }
  }
}
```

### Configuration

The server is configured entirely via environment variables (set them in the `env` block above).

#### V1 Authentication (Recommended)

Static token authentication. The token never expires.

| Variable | Value |
|----------|-------|
| `PROCUREMENTEXPRESS_API_VERSION` | `v1` |
| `PROCUREMENTEXPRESS_AUTH_TOKEN` | Your authentication token |
| `PROCUREMENTEXPRESS_COMPANY_ID` | Your company ID |

#### V3 Authentication (OAuth2)

OAuth2 password grant. Tokens are time-limited and require `client_id`/`client_secret`.

| Variable | Value |
|----------|-------|
| `PROCUREMENTEXPRESS_API_VERSION` | `v3` |
| `PROCUREMENTEXPRESS_CLIENT_ID` | Your OAuth2 client ID |
| `PROCUREMENTEXPRESS_CLIENT_SECRET` | Your OAuth2 client secret |

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

### Companies (12 tools)

| Tool | Description |
|------|-------------|
| `list_companies` | List all companies the current user belongs to |
| `get_company` | Get company details by ID including settings and currencies |
| `get_company_details` | Get details for the currently active company |
| `set_active_company` | Set active company ID for subsequent API calls |
| `list_approvers` | List approvers filtered by department |
| `list_all_approvers` | List all approvers regardless of routing |
| `list_employees` | List all active employees with roles |
| `invite_user` | Invite a user (roles: companyadmin, approver, finance, teammember) |
| `get_invite_limit` | Get remaining invite slots for the company |
| `list_pending_invites` | List pending user invitations |
| `cancel_invite` | Cancel a pending user invitation |
| `resend_invite` | Resend a pending user invitation email |

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

### Suppliers (5 tools)

| Tool | Description |
|------|-------------|
| `list_suppliers` | List suppliers with pagination and filters |
| `get_top_suppliers` | Get top suppliers by spend |
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

### Purchase Orders (15 tools)

| Tool | Description |
|------|-------------|
| `list_purchase_orders` | List POs with pagination, search, and filters |
| `get_purchase_order` | Get PO details with line items, comments, approvals |
| `create_purchase_order` | Create a PO (commit='Send' to submit, 'Draft' to save) |
| `update_purchase_order` | Update an existing PO |
| `approve_purchase_order` | Approve using the accept token from approver request |
| `reject_purchase_order` | Reject using the reject token from approver request |
| `override_and_approve_purchase_order` | Finance override approval (no token required) |
| `cancel_purchase_order` | Cancel a purchase order |
| `archive_purchase_order` | Toggle archive status of a purchase order |
| `delete_purchase_order` | Permanently delete a purchase order |
| `generate_purchase_order_pdf` | Generate a PDF and return a download link |
| `get_pending_request_count` | Get count of pending approval requests |
| `receive_purchase_order_items` | Mark line items as received (partial or full delivery) |
| `cancel_receiving_items` | Cancel all received deliveries for a PO |
| `complete_purchase_order_delivery` | Mark a PO as fully delivered |

### Invoices (11 tools)

| Tool | Description |
|------|-------------|
| `list_invoices` | List invoices with pagination and filters |
| `get_invoice` | Get invoice details |
| `create_invoice` | Create a new invoice |
| `update_invoice` | Update an existing invoice |
| `accept_invoice` | Accept an invoice awaiting review |
| `approve_invoice` | Approve an invoice |
| `reject_invoice` | Reject an invoice |
| `cancel_invoice` | Cancel an invoice |
| `archive_invoice` | Archive an invoice |
| `dearchive_invoice` | Restore an archived invoice |
| `rerun_invoice_approval_flow` | Rerun approval flow for a specific invoice |

### Approval Flows (13 tools)

| Tool | Description |
|------|-------------|
| `list_approval_flows` | List approval flows with search and pagination |
| `get_approval_flow` | Get flow details with steps, approvers, conditions |
| `create_approval_flow` | Create a flow (document_type: 0=PO, 1=invoice) |
| `update_approval_flow` | Update an existing approval flow |
| `delete_approval_flow` | Delete an approval flow permanently |
| `archive_approval_flow` | Archive an approval flow (soft delete) |
| `publish_approval_flow` | Publish an approval flow to make it active |
| `unpublish_approval_flow` | Unpublish an approval flow to deactivate it |
| `list_approval_flow_runs` | List runs with status and date filters |
| `get_approval_flow_entity` | Get details about an entity that went through a flow |
| `list_approval_flow_versions` | List all version history of an approval flow |
| `get_approval_flow_version_details` | Get full details of a specific version |
| `rerun_approval_flows` | Rerun approval flows for specific POs and/or invoices |

### Payments (3 tools)

| Tool | Description |
|------|-------------|
| `get_payment` | Get a specific payment by ID |
| `create_payment` | Create a payment (types: bank_transfer, card, check, cash, etc.) |
| `create_po_payment` | Create item-level payments for a purchase order |

### Tax Rates (4 tools)

| Tool | Description |
|------|-------------|
| `list_tax_rates` | List all tax rates (single and combined) |
| `get_tax_rate` | Get a specific tax rate |
| `create_tax_rate` | Create a new tax rate |
| `update_tax_rate` | Update a tax rate |

### Webhooks (5 tools)

| Tool | Description |
|------|-------------|
| `list_webhooks` | List webhooks with optional archived filter |
| `get_webhook` | Get a specific webhook |
| `create_webhook` | Create a webhook (events: new_po, po_approved, po_delivered, po_paid, po_cancelled, po_update) |
| `update_webhook` | Update a webhook |
| `delete_webhook` | Delete a webhook |

### Comments (2 tools)

| Tool | Description |
|------|-------------|
| `add_purchase_order_comment` | Add a comment to a purchase order |
| `add_invoice_comment` | Add a comment to an invoice |

### Supplementary (8 tools)

| Tool | Description |
|------|-------------|
| `list_chart_of_accounts` | List chart of accounts (GL codes) with search |
| `get_chart_of_account` | Get a specific chart of account |
| `list_qbo_customers` | List QuickBooks customers with search |
| `get_qbo_customer` | Get a specific QuickBooks customer |
| `list_qbo_classes` | List QuickBooks classes with search |
| `get_qbo_class` | Get a specific QuickBooks class |
| `list_send_to_supplier_templates` | List email templates for sending POs |
| `forward_purchase_order` | Email a PO to supplier(s) |

## AI Agent Skills

The server ships with 10 module-specific [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code) in `.claude/skills/` that route AI agents to the correct MCP tool calls without reading entire source files. Skills use the `pex:` namespace:

| Skill | Tools | Description |
|-------|-------|-------------|
| `pex:auth` | 5 | Authentication (V1/V3), token management, user profile |
| `pex:companies` | 12 | Company details, employees, invitations, approvers |
| `pex:budgets` | 4 | Budget CRUD with custom field support |
| `pex:departments` | 4 | Department CRUD |
| `pex:suppliers` | 9 | Supplier and product management |
| `pex:purchase-orders` | 18 | PO lifecycle, delivery, PDF, forwarding, comments |
| `pex:invoices` | 12 | Invoice lifecycle, approval, comments |
| `pex:payments` | 3 | Payment creation and retrieval |
| `pex:approval-flows` | 13 | Approval flow configuration, runs, versions |
| `pex:settings` | 17 | Tax rates, webhooks, currencies, chart of accounts, QBO |

Skills with complex schemas include `references/` subdirectories for progressive disclosure (e.g., line item schemas, approval conditions, workflows).

### Installing Skills in Your Project

To use these skills in your own project alongside the MCP server, copy the `.claude/skills/pex-*` directories into your project:

```bash
# From your project root
mkdir -p .claude/skills

# Copy all PEX skills from the package
cp -r node_modules/@procurementexpress.com/mcp/.claude/skills/pex-* .claude/skills/
```

Or cherry-pick only the skills you need:

```bash
# Example: only purchase orders and invoices
cp -r node_modules/@procurementexpress.com/mcp/.claude/skills/pex-purchase-orders .claude/skills/
cp -r node_modules/@procurementexpress.com/mcp/.claude/skills/pex-invoices .claude/skills/
```

Once installed, Claude Code will automatically discover the skills and use them to route to the correct MCP tool calls (e.g., `/pex:purchase-orders`, `/pex:invoices`).

## Project Structure

```
src/
  index.ts              # Entry point — MCP server setup, auth tools, tool registration
  api-client.ts         # HTTP client with versioned path building and auth headers
  auth.ts               # Dual auth manager (V1 token / V3 OAuth2)
  tool-helpers.ts       # Shared response helpers and error handling wrapper
  types.ts              # TypeScript interfaces for all API entities
  tools/
    approval-flows.ts   # Approval flow CRUD, publish/unpublish, runs, versions
    budgets.ts          # Budget CRUD
    comments.ts         # PO and invoice comments
    companies.ts        # Company details, employees, approvers, invitations
    departments.ts      # Department CRUD
    invoices.ts         # Invoice CRUD, approve/reject/cancel/archive, rerun approval
    payments.ts         # Payment creation (standalone and PO-linked) and get
    products.ts         # Product CRUD
    purchase-orders.ts  # PO CRUD, approve/reject/cancel/archive/delete, delivery, PDF
    supplementary.ts    # Chart of accounts, QBO integration, email forwarding
    suppliers.ts        # Supplier CRUD + top suppliers
    tax-rates.ts        # Tax rate CRUD
    users.ts            # Current user profile and currency listing
    webhooks.ts         # Webhook CRUD + delete
tests/
  e2e/
    setup.ts            # MockApiServer with version-agnostic route registration
    *.test.ts           # E2E tests for each tool group
```

## Development

For contributors who want to work on the server itself:

```bash
git clone https://github.com/procurementexpress/mcp.git
cd mcp
npm install
```

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

## Releasing a New Version

To publish a new version to npm:

1. Ensure your working tree is clean and all tests pass:
   ```bash
   npm test
   ```

2. Bump the version, create a git tag, and publish:
   ```bash
   # Choose one: patch (bug fixes), minor (new features), major (breaking changes)
   npm version patch -m "v%s"   # or minor / major

   # Push the commit and tag
   git push && git push --tags

   # Publish to npm (auto-builds via prepublishOnly)
   npm publish
   ```

3. Verify the published version:
   ```bash
   npm view @procurementexpress.com/mcp version
   ```

The package is published as [`@procurementexpress.com/mcp`](https://www.npmjs.com/package/@procurementexpress.com/mcp) on npm.

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
