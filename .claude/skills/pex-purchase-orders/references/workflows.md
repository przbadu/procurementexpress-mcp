# PO Workflows

## Create and Submit a PO

```
1. get_current_user → get creator_id
2. list_departments → pick department_id
3. list_suppliers or get_top_suppliers → pick supplier_id
4. list_budgets (filter by department_id) → pick budget_id for line items
5. list_currencies → confirm currency_id (optional)
6. create_purchase_order with commit="Send", creator_id, supplier_id, line_items
```

## Create a Draft PO

Same as above but use `commit="Draft"`. Submit later with `update_purchase_order` using `commit="Send"`.

## Approve a PO

```
1. get_purchase_order → find approver_requests[]
2. Find request where approver matches current user
3. approve_purchase_order with id and token=request.accept_token
```

## Reject a PO

```
1. get_purchase_order → find approver_requests[]
2. reject_purchase_order with id and token=request.reject_token
```

## Track Delivery

```
1. get_purchase_order → see purchase_order_items with received_quantity
2. receive_purchase_order_items → record partial delivery
   - items: [{ id: itemId, quantity: receivedQty }]
   - delivered_on: delivery date
3. Repeat step 2 for additional deliveries
4. complete_purchase_order_delivery → mark as fully delivered
```

## Forward PO to Supplier

```
1. list_send_to_supplier_templates → get email template
2. get_supplier → get supplier email
3. forward_purchase_order → send with emails, note from template
```

## Generate PDF

```
1. generate_purchase_order_pdf → returns { pdf_link: "..." }
2. Share the pdf_link with the user
```

## Review Pending Approvals

```
1. get_pending_request_count → see how many POs need approval
2. list_purchase_orders with requests=true → get POs pending approval
3. For each PO: approve or reject using tokens
```

## Create PO on Behalf of Another User

Requires companyadmin role. The `on_behalf_of` user must be an active employee.

```
1. list_employees → find user ID
2. create_purchase_order with on_behalf_of=userId, creator_id=your own ID
```
