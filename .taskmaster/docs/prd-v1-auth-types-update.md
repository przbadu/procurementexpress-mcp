# PRD: V1 API Support, Types Update, and Staging Tests

## 1. Overview

### Problem Statement
The MCP server currently only supports V3 OAuth2 authentication. Users who have V1 API tokens (authentication_token + app_company_id) cannot use the server. Additionally, the TypeScript types are incomplete compared to the actual API serializer responses, and tests use the production domain.

### Changes Required
1. **Dual API version support**: V1 (token auth) and V3 (OAuth2) via `PE_API_VERSION` env var
2. **Updated types**: Match all serializer response fields from the Rails app
3. **Staging domain**: Use https://staging.procurementexpress.com for tests

## 2. Change 1: Dual API Version Support

### Environment Variable
- `PE_API_VERSION`: "v1" (default) or "v3"
- V1: Requires `PE_AUTH_TOKEN` and `PE_COMPANY_ID` env vars
- V3: Requires `PE_CLIENT_ID` and `PROCUREMENTEXPRESS_CLIENT_SECRET` env vars (current behavior)

### V1 Authentication
- Headers: `authentication_token: <token>`, `app_company_id: <id>`
- No OAuth flow needed - token is static
- The `authenticate` tool accepts authentication_token directly (or reads from env)

### V3 Authentication (existing)
- OAuth2 password grant flow
- Headers: `Authorization: Bearer <token>`, `app_company_id: <id>`

### API Path Changes
- All paths must use dynamic version prefix: `/api/${version}/endpoint`
- Remove hardcoded `/api/v1/` and `/api/v3/` from all tool files

### Files to Change
- `src/api-client.ts`: Add version support, V1 header format
- `src/auth.ts`: Add V1 token-based auth mode
- `src/index.ts`: Read PE_API_VERSION, register appropriate auth tools
- All `src/tools/*.ts`: Use dynamic API version in paths

## 3. Change 2: Update Types

Update `src/types.ts` with all fields from actual Rails serializers:

### Key Missing Fields (from serializer analysis)
- User: approver_name, network_id, roles (top-level)
- Budget: base_amount, base_rate, summary, archived, chart_of_account_id, chart_of_account_name, approved_this_month, qbo_class
- Company: employees_count, default_tax_rate, prepaid_subscription, multicompany_pack, payment_term_ff_enabled, scan_and_match_ff_enabled, approval_flow_ff_enabled, policy_ff_enabled
- CompanySetting: Many missing fields (gross_or_net, fixed_product_price, reserve_po_number, etc.)
- PurchaseOrder: Many missing fields (delivery_status, payment_status, share_key, etc.)
- PurchaseOrderItem: Many missing fields (gross_amount, tax_rate, base amounts, product_id, etc.)
- Invoice: Many missing fields (validation_date, balance_amount, sage_exported, etc.)
- InvoiceLineItem: Many missing fields (tax_amount, calculated_gross_amount, etc.)
- Supplier: payment_terms, currency_id, department_ids
- Product: currency_id, archived, tax_rate_id
- Custom fields: on_invoice, on_invoice_item, on_supplier, on_rfq, on_product, default_value, readonly
- Department: supplier_ids, company_id
- Webhook: send_as_text, basic_auth fields, webhook_attributes
- And more...

## 4. Change 3: Staging Domain for Tests

- Update default test base URL to `https://staging.procurementexpress.com`
- Update `.env.example` to show staging option
- Mock server tests remain unchanged (they use localhost)

## 5. Implementation Order
1. Update types.ts with complete serializer fields
2. Update api-client.ts with version support and V1 auth headers
3. Update auth.ts with V1 token-based auth
4. Update index.ts with version-aware auth tool registration
5. Update all tool files to use dynamic API version paths
6. Update tests and .env.example
7. Build and verify
