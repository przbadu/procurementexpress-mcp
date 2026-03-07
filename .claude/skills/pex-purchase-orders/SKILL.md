---
name: pex:purchase-orders
description: >
  ProcurementExpress purchase order (PO) management — the core procurement workflow. Covers
  creating, updating, approving, rejecting, cancelling, archiving, and deleting POs. Also
  handles delivery tracking, PDF generation, forwarding POs to suppliers, and adding comments.
  Routes to MCP tools: list_purchase_orders, get_purchase_order, create_purchase_order,
  update_purchase_order, approve_purchase_order, reject_purchase_order,
  override_and_approve_purchase_order, cancel_purchase_order, archive_purchase_order,
  delete_purchase_order, generate_purchase_order_pdf, get_pending_request_count,
  receive_purchase_order_items, cancel_receiving_items, complete_purchase_order_delivery,
  add_purchase_order_comment, forward_purchase_order, list_send_to_supplier_templates.
  Triggers on: purchase order, PO, create PO, approve PO, reject PO, PO delivery, PO PDF,
  forward PO, PO comment, pending approvals, line items, PO status.
---

# ProcurementExpress Purchase Orders

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.

## Core Tools

### list_purchase_orders
List POs with pagination, search, and filters. Always returns paginated results.
- **Params:**
  - `page` (optional, integer, default: 1)
  - `search` (optional) — matches PO number, supplier name, notes, line item descriptions
  - `status` (optional) — `"draft"`, `"pending"`, `"approved"`, `"rejected"`, `"cancelled"`, `"paid"`
  - `delivery_status` (optional) — `"not_delivered"`, `"partially_delivered"`, `"complete_delivered"`
  - `payment_status` (optional) — `"unpaid"`, `"partially_paid"`, `"paid"`, `"invoice_received"`
  - `supplier_id`, `requester_id`, `budget_id`, `filter_dept_id`, `approver_id` (all optional, integer)
  - `archived` (optional, boolean, default: false)
  - `date_filter` (optional) — `"current_month"`, `"current_year"`, `"last_month"`, `"last_year"`
  - `from`, `to` (optional) — custom date range (company date_format)
  - `updated_after` (optional) — ISO datetime for incremental sync
  - `sort` (optional), `direction` (optional, `"asc"` or `"desc"`)
  - `requests` (optional, boolean) — include pending approval requests
  - `bell` (optional, boolean) — with requests=true, show only bell notification items
- **Returns:** `{ purchase_orders: PurchaseOrder[], meta: PaginationMeta }`

### get_purchase_order
Get PO details including line items, comments, approvals, and status flags.
- **Params:** `id` (required, string) — accepts numeric ID, approval-key, or slug
- **Returns:** `PurchaseOrder`

### create_purchase_order
Create a new PO. At least one line item is required. See [references/line-items.md](references/line-items.md).
- **Params:**
  - `commit` (required) — `"Send"` (submit for approval) or `"Draft"` (save as draft)
  - `creator_id` (required, integer) — get from `get_current_user`
  - `line_items` (required, array, min 1) — see [references/line-items.md](references/line-items.md)
  - `department_id` (optional, integer)
  - `supplier_id` (optional, integer) — existing supplier
  - `supplier_name` (optional) — display name for existing supplier
  - `new_supplier_name` (optional) — create a new supplier inline
  - `currency_id` (optional, integer) — defaults to company/user currency
  - `iso_code` (optional) — alternative to currency_id (e.g. "USD")
  - `notes` (optional)
  - `submitted_on` (optional) — date in company date_format
  - `on_behalf_of` (optional, integer) — create on behalf of another user (companyadmin only)
  - `approver_list` (optional, integer array) — override default approvers
  - `custom_field_values_attributes` (optional, array) — PO-level custom field values:
    - `id` (optional, integer — for updates), `value` (required, string), `custom_field_id` (required, integer)
    - Get available custom fields from `get_company_details` (pex-companies) → `custom_fields[]`
- **Returns:** `PurchaseOrder`

### update_purchase_order
Update an existing PO. Use `commit: "Send"` to submit a draft for approval.
- **Params:** `id` (required, string) + any create params (all optional)
- For line items: include `id` to update existing, `_destroy: true` to remove
- **Returns:** `PurchaseOrder`

## Approval Tools

### approve_purchase_order
- **Params:** `id` (required, string), `token` (required, string — accept token from approver_requests)
- Get the token from `get_purchase_order` response → `approver_requests[].accept_token`

### reject_purchase_order
- **Params:** `id` (required, string), `token` (required, string — reject token from approver_requests)
- Get the token from `get_purchase_order` response → `approver_requests[].reject_token`

### override_and_approve_purchase_order
Override and approve without a token. Requires finance role.
- **Params:** `id` (required, string)

### get_pending_request_count
Get count of pending approval requests for the current user.
- **Params:** None
- **Returns:** Text with pending count

## Lifecycle Tools

### cancel_purchase_order
- **Params:** `id` (required, string). Requires cancel permission.

### archive_purchase_order
Toggle archive status. Requires finance role. Call again to dearchive.
- **Params:** `id` (required, string)

### delete_purchase_order
Permanently delete. Requires destroy permission.
- **Params:** `id` (required, string)

## Delivery Tools

### receive_purchase_order_items
Mark line items as received (partial or full delivery).
- **Params:**
  - `id` (required, string) — PO ID
  - `items` (required, array) — `[{ id: lineItemId, quantity: receivedQty }, ...]`
  - `delivered_on` (required, string) — delivery date in company date_format
  - `notes` (optional)

### cancel_receiving_items
Cancel all received deliveries, reverting to not_delivered status.
- **Params:** `id` (required, string)

### complete_purchase_order_delivery
Mark PO as fully delivered.
- **Params:** `id` (required, string)

## Communication Tools

### add_purchase_order_comment
- **Params:** `purchase_order_id` (required, integer), `comment` (required, string)
- **Returns:** `PurchaseOrderComment` with formatted dates and creator info

### forward_purchase_order
Forward PO to supplier(s) via email with PDF attached.
- **Params:**
  - `purchase_order_id` (required, integer)
  - `emails` (required, string) — comma-separated recipient emails
  - `cc` (optional) — CC email (defaults to PO creator's email)
  - `note` (optional) — email body text
  - `email_subject` (optional)
  - `uploads` (optional, integer array) — upload IDs to attach

### list_send_to_supplier_templates
List email templates for forwarding POs.
- **Returns:** `SendToSupplierTemplate[]` — id, label, text, is_default, template_name

### generate_purchase_order_pdf
Generate a PDF and get download link.
- **Params:** `id` (required, string)
- **Returns:** `{ pdf_link: string }`

## PO Response Fields

Key fields in `PurchaseOrder`:
- `id`, `po_number`, `slug`, `status`, `notes`, `total_gross_amount`, `total_net_amount`
- `supplier_name`, `supplier_id`, `department_name`, `department_id`
- `currency_id`, `creator_id`, `submitted_on`, `archived`
- `delivery_status`, `payment_status`
- `purchase_order_items[]` — line items (see [references/line-items.md](references/line-items.md))
- `purchase_order_comments[]` — comments with creator info
- `approver_requests[]` — approval status with accept/reject tokens
- `approvers_with_flows[]` — approval flow step details
- `compliance_checks[]` — compliance status with violations
- `custom_field_values[]` — custom field data
- `uploads[]` — attached files

## Common Workflows

See [references/workflows.md](references/workflows.md) for step-by-step guides.
