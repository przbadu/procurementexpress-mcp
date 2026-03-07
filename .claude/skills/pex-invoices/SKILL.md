---
name: pex:invoices
description: >
  ProcurementExpress invoice management. Covers creating, updating, accepting, approving,
  rejecting, cancelling, archiving invoices, and adding comments. Handles the full invoice
  lifecycle from receipt through approval to settlement. Routes to MCP tools: list_invoices,
  get_invoice, create_invoice, update_invoice, accept_invoice, approve_invoice, reject_invoice,
  cancel_invoice, archive_invoice, dearchive_invoice, rerun_invoice_approval_flow,
  add_invoice_comment. Triggers on: invoice, bill, invoice approval, invoice status,
  awaiting review, outstanding invoice, ready to pay, invoice comment, invoice line items.
---

# ProcurementExpress Invoices

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.
Invoices must be enabled for the company (`company_setting.invoice_enabled`).

## Core Tools

### list_invoices
List invoices with pagination and filters.
- **Params:**
  - `page` (optional, integer, default: 1)
  - `per_page` (optional, integer) — allowed: 10, 20, 50, 100
  - `search` (optional) — matches invoice number, supplier name
  - `invoice_statuses_filter` (optional) — `"awaiting_review"`, `"outstanding"`, `"ready_to_pay"`, `"settled"`, `"cancelled"`
  - `supplier_id`, `requester_id`, `approver_id`, `department_id` (all optional, integer)
  - `archived` (optional, boolean, default: false)
  - `invoice_date_filter` (optional) — `"last 7days"`, `"last 30days"`, `"last 60days"`, `"last 90days"`, `"last 180days"`, `"last 1year"`, `"current_month"`, `"current_year"`, `"last_month"`, `"last_year"`
  - `sage_exported` (optional, boolean) — filter by Sage export status
  - `sort` (optional), `direction` (optional, `"asc"` or `"desc"`)
- **Returns:** `{ invoices: Invoice[], meta: PaginationMeta }`

### get_invoice
Get invoice details including line items, linked POs, comments, and payment history.
- **Params:** `id` (required, integer)
- **Returns:** `Invoice`

### create_invoice
Create a new invoice. If company has "create invoice in awaiting review" enabled, starts in awaiting_review status.
- **Params:**
  - `invoice_number` (optional, string)
  - `issue_date`, `uploaded_date`, `received_date`, `due_date` (optional, string — company date_format)
  - `gross_amount` (optional, number)
  - `currency_id` (optional, integer)
  - `supplier_id` (optional, integer)
  - `standalone_invoice` (optional, boolean) — true if not linked to any PO
  - `payment_term_id` (optional, integer) — payment terms from company settings
  - `selected_purchase_order_ids` (optional, integer array) — PO IDs to link
  - `line_items` (optional, array) — see [references/line-items.md](references/line-items.md)
  - `custom_field_values_attributes` (optional, array) — invoice-level custom field values:
    - `id` (optional, integer — for updates), `value` (required, string), `custom_field_id` (required, integer)
    - Get available custom fields from `get_company_details` (pex-companies) → `custom_fields[]`
- **Returns:** `Invoice`

### update_invoice
Update an existing invoice.
- **Params:** `id` (required) + any create params
- For line items: include `id` to update, `_destroy: true` to remove
- **Returns:** `Invoice`

## Approval Lifecycle Tools

### accept_invoice
Accept an invoice in awaiting_review status (moves to outstanding).
- **Params:** `id` (required, integer)

### approve_invoice
Approve an invoice (requires invoice approval permission).
- **Params:** `id` (required, integer)

### reject_invoice
Reject an invoice (requires invoice approval permission).
- **Params:** `id` (required, integer)

### cancel_invoice
Cancel an invoice (requires cancel permission).
- **Params:** `id` (required, integer)

### archive_invoice
Archive an invoice (requires archive permission).
- **Params:** `id` (required, integer)

### dearchive_invoice
Restore an archived invoice.
- **Params:** `id` (required, integer)

### rerun_invoice_approval_flow
Rerun the approval flow when rules have changed.
- **Params:** `id` (required, integer)

## Comment Tool

### add_invoice_comment
Add a comment to an invoice.
- **Params:** `invoice_id` (required, integer), `comment` (required, string)

## Invoice Status Flow

```
awaiting_review → (accept_invoice) → outstanding → (approve_invoice) → ready_to_pay → (payment) → settled
                                    → (reject_invoice) → rejected
                                    → (cancel_invoice) → cancelled
```

If `invoice_approval_flow_enabled`, the approval flow determines the approval path automatically.

## Invoice Response Fields

Key fields in `Invoice`:
- `id`, `invoice_number`, `status`, `gross_amount`, `net_amount`
- `issue_date`, `uploaded_date`, `received_date`, `due_date`, `validation_date`
- `supplier_id`, `supplier_name`, `currency`
- `standalone_invoice` — whether linked to POs
- `confidence_score`, `digital_invoice` — AI extraction confidence
- `invoice_line_items[]` — line items (see [references/line-items.md](references/line-items.md))
- `purchase_order_summaries[]` — linked PO summaries
- `supplier_invoice_uploads[]` — attached invoice files
- `invoice_histories[]` — status change history
- `invoice_comments[]` — comments with creator info
- `payments[]` — payment records
- Actions: `can_accept`, `can_approve`, `can_reject`, `can_cancel`, `can_archive`, `can_dearchive`
- `payment_terms_list[]` — available payment terms
