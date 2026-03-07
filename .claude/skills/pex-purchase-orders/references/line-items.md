# PO Line Item Schema

## Creating/Updating Line Items

Each line item in the `line_items` array accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | For updates | Existing line item ID (omit for new items) |
| `description` | string | Yes | Item description |
| `quantity` | number | Yes | Quantity |
| `unit_price` | number | Yes | Unit price |
| `budget_id` | integer | No | Budget to charge against |
| `vat` | number | No | VAT/tax percentage |
| `tax_rate_id` | integer | No | Tax rate ID (from pex-settings) |
| `item_number` | string | No | Item number (if company has show_po_item_number enabled) |
| `sequence_no` | integer | No | Display order |
| `department_id` | integer | No | Department for this line item |
| `product_id` | integer | No | Product ID (auto-fills description, SKU, unit_price from catalog) |
| `chart_of_account_id` | integer | No | GL code (from pex-settings) |
| `qbo_customer_id` | integer | No | QuickBooks customer |
| `quickbooks_class_id` | integer | No | QuickBooks class |
| `qbo_line_description` | string | No | QuickBooks line description override |
| `archived` | boolean | No | Archive this line item |
| `_destroy` | boolean | No | Set true to delete this line item (updates only) |
| `custom_field_values_attributes` | array | No | Line-item-level custom field values: `[{id?, value, custom_field_id}]` |

## Line Item Response Fields

Each `PurchaseOrderItem` in the response contains:

- `id`, `description`, `quantity`, `unit_price`, `item_number`, `sequence_no`
- `budget_id`, `budget_name` — associated budget
- `gross_amount`, `net_amount`, `vat` — calculated amounts
- `tax_rate_id` — applied tax rate
- `product_id` — linked product
- `received_quantity` — quantity received so far
- `chart_of_account` — GL code details (id, name, display_name)
- `qbo_customer` — QuickBooks customer details
- `quickbooks_class` — QuickBooks class details
- `custom_field_values[]` — custom field data for this line item
- `department_id`, `purchase_order_id`

## Tips

- When using `product_id`, the product's description, SKU, and unit_price will be used as defaults
- To update existing line items, include their `id`. To add new items, omit `id`
- To remove a line item during update, include `id` and `_destroy: true`
- The `budget_id` determines which budget is charged when the PO is approved
- If the company uses `gross_or_net` setting, amounts are calculated accordingly
- Custom fields can be set at both PO level and line item level via `custom_field_values_attributes`
- Get available custom field IDs from `get_company_details` (pex-companies) → `custom_fields[]`
- For reference data IDs: use pex-settings tools (`list_tax_rates`, `list_chart_of_accounts`, `list_qbo_customers`, `list_qbo_classes`)
