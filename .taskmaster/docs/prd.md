# PRD: ProcurementExpress MCP Server

## 1. Overview

### Problem Statement
LLMs and AI agents need structured access to the ProcurementExpress API to help users manage purchase orders, invoices, budgets, suppliers, and procurement workflows. Currently, there's no MCP server that exposes this API, forcing manual API interaction.

### Target Users
- AI agents (Claude, etc.) that need to interact with ProcurementExpress on behalf of users
- Developers building AI-powered procurement automation
- Claude Code / Claude Desktop users managing procurement workflows

### Success Metrics
- All critical ProcurementExpress API endpoints exposed as MCP tools
- Zero known security vulnerabilities
- E2E test coverage for all tools
- Clean build with no TypeScript errors
- Server starts and responds correctly via stdio transport

## 2. Functional Decomposition

### Capability 1: Authentication
**Features:**
- `authenticate`: Sign in via OAuth2 to get a bearer token
- `validate_token`: Check if current token is valid
- `revoke_token`: Sign out / revoke bearer token

**Behavior:** Server accepts OAuth2 credentials (email, password, client_id, client_secret) via environment variables or tool parameters. Tokens are managed in-memory for the session.

### Capability 2: User Management
**Features:**
- `get_current_user`: Get the authenticated user's profile and company memberships
- `update_current_user`: Update user profile (email, name, phone)
- `list_currencies`: List enabled currencies for the company
- `list_all_currencies`: List all available currencies

### Capability 3: Budget Management
**Features:**
- `list_budgets`: List budgets with pagination and filters (department, archived, active)
- `get_budget`: Get a specific budget with remaining amount
- `create_budget`: Create a new budget
- `update_budget`: Update an existing budget

### Capability 4: Company Management
**Features:**
- `list_companies`: List all companies
- `get_company`: Get company details with settings and custom fields
- `create_company`: Create a new company with settings
- `list_approvers`: List approvers filtered by department
- `list_all_approvers`: List all approvers
- `list_employees`: List all employees with roles
- `invite_user`: Invite a user to the company

### Capability 5: Department Management
**Features:**
- `list_departments`: List departments with filters
- `get_department`: Get department details
- `create_department`: Create a new department
- `update_department`: Update a department

### Capability 6: Supplier Management
**Features:**
- `list_suppliers`: List suppliers with pagination and filters
- `get_supplier`: Get supplier details
- `create_supplier`: Create a new supplier
- `update_supplier`: Update a supplier

### Capability 7: Product Management
**Features:**
- `list_products`: List products with filters
- `get_product`: Get product details
- `create_product`: Create a product
- `update_product`: Update a product

### Capability 8: Purchase Order Management
**Features:**
- `list_purchase_orders`: List POs with pagination and search
- `get_purchase_order`: Get PO details with line items, comments, approvals
- `create_purchase_order`: Create a PO (send or draft)
- `approve_purchase_order`: Approve a PO using accept token
- `reject_purchase_order`: Reject a PO using reject token
- `cancel_purchase_order`: Cancel a PO
- `archive_purchase_order`: Archive a PO
- `list_pending_requests`: List pending approval requests
- `get_pending_request_count`: Get count of pending requests
- `override_and_approve_purchase_order`: Finance user approval override

### Capability 9: Invoice Management
**Features:**
- `list_invoices`: List invoices with filters and pagination
- `get_invoice`: Get invoice details
- `create_invoice`: Create an invoice
- `update_invoice`: Update an invoice
- `accept_invoice`: Accept an invoice (awaiting review)
- `approve_invoice`: Approve an invoice
- `reject_invoice`: Reject an invoice
- `cancel_invoice`: Cancel an invoice
- `archive_invoice`: Archive an invoice
- `dearchive_invoice`: Restore an archived invoice

### Capability 10: Approval Flow Management
**Features:**
- `list_approval_flows`: List approval flows with search and pagination
- `get_approval_flow`: Get approval flow details
- `create_approval_flow`: Create an approval flow with steps and conditions
- `update_approval_flow`: Update an approval flow
- `delete_approval_flow`: Delete an approval flow
- `archive_approval_flow`: Archive an approval flow
- `list_approval_flow_runs`: List runs for a flow with filters

### Capability 11: Comments
**Features:**
- `add_purchase_order_comment`: Add a comment to a purchase order
- `add_invoice_comment`: Add a comment to an invoice

### Capability 12: Payment Management
**Features:**
- `create_payment`: Create a payment (feature flagged)
- `create_po_payment`: Create a payment for a purchase order

### Capability 13: Tax Rate Management
**Features:**
- `list_tax_rates`: List all tax rates
- `get_tax_rate`: Get a specific tax rate
- `create_tax_rate`: Create a tax rate
- `update_tax_rate`: Update a tax rate

### Capability 14: Webhook Management
**Features:**
- `list_webhooks`: List webhooks
- `get_webhook`: Get webhook details
- `create_webhook`: Create a webhook
- `update_webhook`: Update a webhook

### Capability 15: Supplementary Features
**Features:**
- `list_chart_of_accounts`: List chart of accounts with search
- `list_qbo_customers`: List QuickBooks customers with search
- `list_qbo_classes`: List QuickBooks classes with search
- `list_send_to_supplier_templates`: List email templates
- `forward_purchase_order`: Forward a PO to supplier via email

## 3. Structural Decomposition

```
src/
├── index.ts                    # Entry point, server setup, transport
├── auth.ts                     # Authentication manager (token lifecycle)
├── api-client.ts               # HTTP client wrapper (fetch, headers, error handling)
├── types.ts                    # Shared TypeScript interfaces for API responses
├── tools/
│   ├── users.ts                # User & currency tools
│   ├── budgets.ts              # Budget CRUD tools
│   ├── companies.ts            # Company, approvers, employees tools
│   ├── departments.ts          # Department CRUD tools
│   ├── suppliers.ts            # Supplier CRUD tools
│   ├── products.ts             # Product CRUD tools
│   ├── purchase-orders.ts      # PO CRUD + approval + receiving tools
│   ├── invoices.ts             # Invoice CRUD + approval tools
│   ├── approval-flows.ts       # Approval flow CRUD + runs tools
│   ├── comments.ts             # Comment tools
│   ├── payments.ts             # Payment tools
│   ├── tax-rates.ts            # Tax rate CRUD tools
│   ├── webhooks.ts             # Webhook CRUD tools
│   └── supplementary.ts        # Chart of accounts, QBO, templates, forwarding
tests/
├── e2e/
│   ├── setup.ts                # Test server setup, mock API
│   ├── auth.test.ts            # Auth tool E2E tests
│   ├── users.test.ts           # User tool tests
│   ├── budgets.test.ts         # Budget tool tests
│   ├── companies.test.ts       # Company tool tests
│   ├── departments.test.ts     # Department tool tests
│   ├── suppliers.test.ts       # Supplier tool tests
│   ├── products.test.ts        # Product tool tests
│   ├── purchase-orders.test.ts # PO tool tests
│   ├── invoices.test.ts        # Invoice tool tests
│   ├── approval-flows.test.ts  # Approval flow tests
│   ├── payments.test.ts        # Payment tests
│   ├── tax-rates.test.ts       # Tax rate tests
│   ├── webhooks.test.ts        # Webhook tests
│   └── supplementary.test.ts   # Supplementary tool tests
```

## 4. Technical Architecture

### Stack
- **Runtime**: Node.js (ES2022)
- **Language**: TypeScript (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Validation**: `zod@3`
- **Transport**: Stdio (StdioServerTransport)
- **Testing**: Vitest + MCP Client SDK for E2E
- **Build**: TypeScript compiler (tsc)

### Authentication Flow
1. Server reads `PROCUREMENTEXPRESS_API_BASE_URL`, `PROCUREMENTEXPRESS_CLIENT_ID`, `PROCUREMENTEXPRESS_CLIENT_SECRET` from environment
2. User provides email/password via the `authenticate` tool
3. Server stores bearer token in memory
4. All subsequent API calls include `Authorization: Bearer <token>` and `app_company_id` headers
5. `app_company_id` is provided per-tool call or set as default after authentication

### API Client Design
- Single `ApiClient` class handles all HTTP requests
- Automatic header injection (auth token, company ID, content type)
- Typed error responses matching ProcurementExpress error codes (400, 401, 403, 404, 5xx)
- No retry logic (keep it simple, let the LLM handle retries)

### Security Considerations
- Never log or expose tokens in tool responses
- Validate all inputs with zod schemas
- No `eval()`, no dynamic code execution
- Environment variables for secrets only
- No hardcoded credentials
- Use `console.error()` for logging (not `console.log()` which corrupts stdio)

## 5. Implementation Roadmap

### Phase 1: Project Foundation
1. Initialize npm project with TypeScript
2. Install dependencies (@modelcontextprotocol/sdk, zod@3, vitest)
3. Configure tsconfig.json, package.json
4. Create src/index.ts with MCP server skeleton
5. Create src/api-client.ts with HTTP client
6. Create src/auth.ts with token management
7. Create src/types.ts with shared interfaces

### Phase 2: Core Tools (High-Value CRUD)
8. Implement authentication tools
9. Implement user tools
10. Implement budget tools
11. Implement company tools
12. Implement department tools
13. Implement supplier tools
14. Implement product tools

### Phase 3: Purchase Order & Invoice Workflows
15. Implement purchase order tools (CRUD + approval)
16. Implement invoice tools (CRUD + approval)
17. Implement comment tools
18. Implement payment tools

### Phase 4: Advanced Features
19. Implement approval flow tools
20. Implement tax rate tools
21. Implement webhook tools
22. Implement supplementary tools (chart of accounts, QBO, templates)

### Phase 5: Testing & Polish
23. Set up E2E test infrastructure (mock server, MCP client)
24. Write E2E tests for all tool groups
25. Security audit (dependency check, input validation review)
26. Build verification, README documentation

## 6. Test Strategy

### E2E Testing Approach
- Use Vitest as the test runner
- Create a mock HTTP server that simulates ProcurementExpress API responses
- Use the MCP Client SDK to connect to the server and invoke tools
- Test the full flow: client -> MCP server -> mock API -> response -> client

### Test Categories
1. **Happy path**: Each tool with valid inputs returns expected results
2. **Error handling**: Invalid inputs, API errors (401, 404, 500) handled gracefully
3. **Authentication**: Token lifecycle (authenticate, validate, revoke)
4. **Input validation**: Zod schemas reject invalid parameters

### Test Execution
```bash
npm test          # Run all tests
npm run test:e2e  # Run E2E tests only
```

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| API rate limiting | Return clear error messages, no auto-retry |
| Token expiry mid-session | validate_token tool lets LLM check, re-authenticate if needed |
| Large API responses | Pagination support in list tools |
| Breaking API changes | Types are separate, easy to update |
| Secret exposure | Environment variables only, never in tool responses |
