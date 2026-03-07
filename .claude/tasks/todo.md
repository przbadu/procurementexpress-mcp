# MCP Tools Update — Align with Rails API Implementation

## Modules to Update

- [ ] **1. Purchase Orders** — ID as string (supports id/slug/approval-key), missing filters (status, delivery_status, supplier_id, requester_id, budget_id, department, approver_id, date_filter, from/to, archived, payment_status, updated_after), missing actions (delete, generate_pdf, complete_delivery, cancel_receiving_items), create/update missing fields (on_behalf_of, submitted_on, new_supplier_name, iso_code, line item fields: department_id, chart_of_account_id, qbo_customer_id, quickbooks_class_id, product_id, qbo_line_description)
- [ ] **2. Invoices** — Missing filters (per_page, search query, invoice_statuses_filter, department_id, sort, direction, sage_exported), create has wrong company_id param, missing fields (uploaded_date, received_date, standalone_invoice, payment_term_id, selected_purchase_order_ids, line item fields), update missing many fields, add rerun_approval_flow, fix comment param nesting
- [ ] **3. Budgets** — No pagination in controller (remove page param), remove only_active, add show_mappings, create/update missing fields (chart_of_account_id, qbo_class, custom_field_values_attributes)
- [ ] **4. Suppliers** — Add search param, show_mappings, pagination is optional (only when page present), create/update missing uei/cage_code, fix department_ids nesting
- [ ] **5. Products** — Add page/per_page for pagination, supplier_id required on create
- [ ] **6. Departments** — Mostly correct, minor description improvements
- [ ] **7. Companies** — list_approvers department_id should be optional, invite_user missing approval_limit/department_ids, add pending_invites/cancel_invite/resend_invite/invite_limit_left
- [ ] **8. Tax Rates** — Add archived filter to list, remove company_id from create (set from current_company)
- [ ] **9. Webhooks** — Add authentication_header, webhook_attributes_attributes
- [ ] **10. Payments** — npayments: add payment_mode/status/po-linked payments/comments. PO payment: add amount field
- [ ] **11. Comments** — Fix PO comment path (purchase_orders not purchase_order), fix invoice comment param nesting
- [ ] **12. Supplementary** — Add page/per_page to chart_of_accounts/qbo_customers/qbo_classes, fix forward emails type
- [ ] **13. Approval Flows** — Add update_approval_flow, publish, unpublish actions
- [ ] **14. Users** — Add first_name/last_name, password_confirmation
- [ ] **15. Update README** — Reflect all changes
- [ ] **16. Run tests & build** — Ensure everything passes
