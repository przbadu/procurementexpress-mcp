# MCP Tools Update — Align with Rails API Implementation

## Modules Updated (all committed)

- [x] **1. Purchase Orders** — String ID, 15+ filters, custom_field_values_attributes (PO + line item level)
- [x] **2. Invoices** — Enum filters (status, date), custom_field_values_attributes (invoice + line item level), rerun_approval_flow
- [x] **3. Budgets** — No pagination, custom_field_values_attributes, show_mappings
- [x] **4. Suppliers** — search, conditional pagination, uei/cage_code
- [x] **5. Products** — page/per_page, supplier_id required on create
- [x] **6. Departments** — Description improvements
- [x] **7. Companies** — 5 new tools (details, invite_limit, pending_invites, cancel/resend invite)
- [x] **8. Tax Rates** — Fixed archived filter bug
- [x] **9. Webhooks** — Fixed archived filter, added delete_webhook
- [x] **10. Payments** — Enhanced create, added get_payment
- [x] **11. Comments** — Fixed plural path, invoice comment nesting
- [x] **12. Supplementary** — Pagination, detail endpoints, forward emails type
- [x] **13. Approval Flows** — Update, publish/unpublish (PATCH), versions, show_entity, rerun_approval_flows, operator enum
- [x] **14. Users** — first_name/last_name, password_confirmation
- [x] **15. API Client** — Added patch() method
- [x] **16. Tests & Build** — All 49 tests passing, build clean

## Remaining
- [ ] **17. Update README** — Reflect all tool changes
- [ ] **18. Final review & commit** — Commit iteration 2 changes
