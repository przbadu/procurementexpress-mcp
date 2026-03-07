# Invoice Line Item Schema

## Creating/Updating Line Items

Each line item in the `line_items` array accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | For updates | Existing line item ID |
| `description` | string | No | Item description |
| `unit_price` | number | No | Unit price |
| `quantity` | number | No | Quantity |
| `vat` | number | No | VAT/tax percentage |
| `net_amount` | number | No | Net amount |
| `sequence_no` | integer | No | Display order |
| `tax_rate_id` | integer | No | Tax rate ID (from pex-settings) |
| `chart_of_account_id` | integer | No | GL code (from pex-settings) |
| `qbo_customer_id` | integer | No | QuickBooks customer |
| `quickbooks_class_id` | integer | No | QuickBooks class |
| `qbo_line_description` | string | No | QuickBooks line description override |
| `purchase_order_id` | integer | No | Link to a specific PO |
| `purchase_order_item_id` | integer | No | Link to a specific PO line item |
| `billable_status` | string | No | Billable status for QuickBooks |
| `_destroy` | boolean | No | Set true to delete (updates only) |
| `custom_field_values_attributes` | array | No | Line-item-level custom field values: `[{id?, value, custom_field_id}]` |

## Line Item Response Fields

Each `InvoiceLineItem` in the response contains:

- `id`, `sequence_no`, `description`, `unit_price`, `quantity`
- `vat`, `gross_amount`, `net_amount` — calculated amounts
- `tax_rate_id`, `tax_exception` — tax details
- `chart_of_account` — GL code details (id, name, display_name)
- `qbo_customer` — QuickBooks customer details
- `quickbooks_class` — QuickBooks class details
- `invoice_id`, `purchase_order_id`, `purchase_order_item_id` — relationships

## Linking to Purchase Orders

Invoice line items can be linked to PO line items for three-way matching:
- Set `purchase_order_id` to link to a PO
- Set `purchase_order_item_id` to link to a specific PO line item
- Also set `selected_purchase_order_ids` on the invoice itself

This enables matching invoice amounts against PO amounts for variance detection.

## Reference Data

For IDs used in line items, use pex-settings tools:
- `list_tax_rates` → `tax_rate_id`
- `list_chart_of_accounts` → `chart_of_account_id`
- `list_qbo_customers` → `qbo_customer_id`
- `list_qbo_classes` → `quickbooks_class_id`
- Custom field IDs from `get_company_details` (pex-companies) → `custom_fields[]`
