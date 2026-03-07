---
name: pex:settings
description: >
  ProcurementExpress settings, reference data, and integrations. Covers tax rates, webhooks,
  currencies, chart of accounts (GL codes), and QuickBooks (QBO) customers/classes. Use when
  managing tax rates, setting up webhooks for PO events, querying currencies, looking up
  chart of accounts or GL codes, or working with QuickBooks data. Routes to MCP tools:
  list_tax_rates, get_tax_rate, create_tax_rate, update_tax_rate, list_webhooks, get_webhook,
  create_webhook, update_webhook, delete_webhook, list_currencies, list_all_currencies,
  list_chart_of_accounts, get_chart_of_account, list_qbo_customers, get_qbo_customer,
  list_qbo_classes, get_qbo_class. Triggers on: tax rate, VAT, webhook, delete webhook,
  currency, chart of accounts, GL code, QuickBooks, QBO customer, QBO class,
  accounting integration.
---

# ProcurementExpress Settings & Reference Data

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.

## Tax Rate Tools

### list_tax_rates
List tax rates for the current company.
- **Params:** `archived` (optional, boolean, default: false)
- **Returns:** `TaxRate[]` — each has: id, name, value, archived, company_id, tax_type, tax_rate_items[]

### get_tax_rate
- **Params:** `id` (required, integer)
- **Returns:** `TaxRate`

### create_tax_rate
- **Params:** `name` (required, string, e.g. "VAT 20%"), `value` (required, number, e.g. 20)
- **Returns:** `TaxRate`

### update_tax_rate
- **Params:** `id` (required) + `name`, `value`, `archived` (all optional)
- **Returns:** `TaxRate`

## Currency Tools

### list_currencies
List currencies enabled for the current company. Company default currency is listed first.
- **Params:** None
- **Returns:** `Currency[]` — each has: id, iso_code, iso_numeric, name, symbol

### list_all_currencies
List ALL available currencies globally (sorted by popularity if company is set).
- **Params:** None
- **Returns:** `Currency[]`

## Webhook Tools

Webhooks fire on PO lifecycle events. Each webhook sends an HTTP POST to the configured URL.

### list_webhooks
- **Params:** `archived` (optional, boolean, default: false)
- **Returns:** `Webhook[]`

### get_webhook
- **Params:** `id` (required, integer)
- **Returns:** `Webhook` — includes: id, name, url, event_type[], tested, response_code, webhook_attributes[]

### create_webhook
- **Params:**
  - `name` (required, string)
  - `url` (required, string) — handler URL
  - `event_type` (required, string array) — one or more of:
    - `"new_po"`, `"po_approved"`, `"po_delivered"`, `"po_paid"`, `"po_cancelled"`, `"po_update"`
  - `authentication_header` (optional, string) — custom auth header value
  - `json_wrapper` (optional, string) — root key for JSON payload
  - `send_as_text` (optional, boolean) — send as text instead of JSON
  - `basic_auth_uname` (optional, string) — basic auth username
  - `basic_auth_pword` (optional, string) — basic auth password
  - `webhook_attributes` (optional, array) — custom key-value pairs sent with each webhook:
    - `attrib_type` (required), `key` (required), `value` (required)
- **Returns:** `Webhook`

### update_webhook
- **Params:** `id` (required) + any create_webhook params + `archived` (optional, boolean)
- For webhook_attributes updates: include `id` to update existing, `_destroy: true` to remove
- **Returns:** `Webhook`

### delete_webhook
Permanently delete a webhook.
- **Params:** `id` (required, integer)
- **Returns:** Deletion confirmation

## Chart of Accounts Tools (GL Codes)

Used for accounting classification on PO/invoice line items.

### list_chart_of_accounts
- **Params:** `search` (optional), `page` (optional, integer), `per_page` (optional, integer)
- **Returns:** `{ chart_of_accounts: ChartOfAccount[], meta: PaginationMeta }`

### get_chart_of_account
- **Params:** `id` (required, integer)
- **Returns:** `ChartOfAccount` — id, name, classification, account_type, currency_code, account_number, display_name, archived

## QuickBooks Tools

### list_qbo_customers
- **Params:** `search` (optional), `page` (optional), `per_page` (optional)
- **Returns:** `{ qbo_customers: QboCustomer[], meta: PaginationMeta }`

### get_qbo_customer
- **Params:** `id` (required, integer)
- **Returns:** `QboCustomer` — id, fully_qualified_name, archived

### list_qbo_classes
- **Params:** `search` (optional), `page` (optional), `per_page` (optional)
- **Returns:** `{ quickbooks_classes: QboClass[], meta: PaginationMeta }`

### get_qbo_class
- **Params:** `id` (required, integer)
- **Returns:** `QboClass` — id, fully_qualified_name, archived

## Where Reference Data Is Used

| Data | Used In |
|------|---------|
| Tax rates | PO line items (`tax_rate_id`), invoice line items, products |
| Currencies | Budgets, POs, invoices, payments, suppliers |
| Chart of accounts | PO line items, invoice line items, budgets |
| QBO customers | PO line items, invoice line items |
| QBO classes | PO line items, invoice line items, budgets |
