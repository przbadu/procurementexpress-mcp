---
name: pex:payments
description: >
  ProcurementExpress payment management. Use when creating or viewing payments to settle
  invoices and purchase orders. Routes to MCP tools: get_payment, create_payment,
  create_po_payment. Triggers on: payment, pay invoice, pay purchase order, settle,
  bank transfer, payment record, payment type.
---

# ProcurementExpress Payments

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.
The payments feature may be feature-flagged — contact sales if `create_payment` returns an error.

## Tools Reference

### get_payment
Get payment details by ID including linked invoices and POs.
- **Params:** `id` (required, integer)
- **Returns:** `Payment`

### create_payment
Create a payment to settle invoices and/or purchase orders.
- **Params:**
  - `supplier_id` (required, integer)
  - `ptype` (required, enum) — payment type, one of:
    - `"bank_transfer"`, `"card"`, `"credit_card"`, `"check"`, `"cash"`, `"one_time_card"`, `"letter_of_credit"`, `"other"`
  - `date` (required, string) — must match company `date_format` setting
  - `currency_id` (required, integer)
  - `amount` (required, number) — total payment amount
  - `reference` (optional, string) — payment reference number
  - `payment_mode` (optional, string)
  - `status` (optional, string)
  - `invoices` (optional, array) — invoices to settle:
    - `invoice_id` (required, integer)
    - `gross_amount` (required, number) — amount applied to this invoice
  - `purchase_orders` (optional, array) — POs to settle:
    - `purchase_order_id` (required, integer)
    - `budget_id` (optional, integer)
    - `gross_amount` (required, number) — amount applied to this PO
  - `comments` (optional, array) — payment comments:
    - `comment` (required, string)
- **Returns:** `Payment`

### create_po_payment
Create a payment for a specific purchase order with optional item-level breakdown.
- **Params:**
  - `purchase_order_id` (required, integer)
  - `amount` (optional, number) — total payment (if not using item-level)
  - `note` (optional, string)
  - `item_payments` (optional, array) — item-level payments:
    - `purchase_order_item_id` (required, integer) — PO line item ID
    - `amount` (required, number) — amount for this item
- **Returns:** Payment result

## Payment Response Fields

- `id`, `reference`, `status`, `ptype`, `date`, `amount`
- `currency` — currency details
- `supplier` — supplier summary
- `user` — creator details
- `invoices[]` — linked invoice summaries
- `npayment_comments[]` — payment comments (id, comment, creator_id, system_generated)

## Workflow: Settle an Invoice

```
1. get_invoice (pex-invoices) → get invoice details, supplier_id, gross_amount
2. create_payment → with supplier_id, amount, ptype, invoices array
```

## Workflow: Pay a Purchase Order

```
Option A: create_po_payment → simple PO payment with optional item breakdown
Option B: create_payment → with purchase_orders array (can combine with invoices)
```
