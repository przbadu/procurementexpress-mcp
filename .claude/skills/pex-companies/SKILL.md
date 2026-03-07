---
name: pex:companies
description: >
  ProcurementExpress company management, employee listing, user invitations, and approver
  queries. Use when listing companies, switching the active company, viewing company details
  and settings, managing employees and user invitations, or querying approvers. Routes to MCP
  tools: list_companies, get_company, get_company_details, set_active_company, list_approvers,
  list_all_approvers, list_employees, invite_user, get_invite_limit, list_pending_invites,
  cancel_invite, resend_invite. Triggers on: company, switch company, employees, invite user,
  approvers, company settings, custom fields, payment terms.
---

# ProcurementExpress Companies

## Prerequisites

Authenticate first (pex-auth skill). Most tools require an active company set via `set_active_company`.

## Tools Reference

### set_active_company
Set the working company for all subsequent API calls. **Must be called before most operations.**
- **Params:** `company_id` (required, string)
- **Returns:** Confirmation text
- This is a client-side operation (no API call)

### list_companies
List all companies the authenticated user belongs to.
- **Params:** None
- **Returns:** `CompanyDetail[]`

### get_company
Get company details by ID including settings, custom fields, and supported currencies.
- **Params:** `id` (required, integer)
- **Returns:** `CompanyDetail`

### get_company_details
Get details for the currently active company.
- **Params:** None
- **Returns:** `CompanyDetail`

### list_employees
List all active employees of the current company with their roles.
- **Params:** None
- **Requires:** companyadmin role
- **Returns:** `Employee[]` — each has: id, email, name, roles[]

### list_approvers
List approvers for the current company. Returns empty if company uses approval flows.
- **Params:** `department_id` (optional, integer) — filter by department
- **Returns:** `Approver[]` — each has: id, email, name, approval_limit

### list_all_approvers
List all approvers regardless of auto-approval routing.
- **Params:** None
- **Returns:** `Approver[]`

### invite_user
Invite a user to the company.
- **Params:**
  - `email` (required, email format)
  - `name` (required, string)
  - `roles` (required, array) — valid values: `"companyadmin"`, `"approver"`, `"finance"`, `"teammember"`
  - `approval_limit` (optional, number, default: 0)
  - `department_ids` (optional, integer array)
- **Requires:** Available invite slots (check with `get_invite_limit`)
- **Returns:** Invitation result

### get_invite_limit
Check remaining invite slots for the company plan.
- **Params:** None
- **Returns:** `{ invite_limit_left, active_users, allowed_users }`

### list_pending_invites
List pending user invitations.
- **Params:** None
- **Requires:** companyadmin role
- **Returns:** Array of pending invites (each has a `token` for cancel/resend)

### cancel_invite
Cancel a pending invitation.
- **Params:** `token` (required, string) — from pending invite
- **Requires:** companyadmin role

### resend_invite
Resend a pending invitation email.
- **Params:** `token` (required, string) — from pending invite
- **Requires:** companyadmin role

## CompanyDetail Response Fields

Key fields in `CompanyDetail`:
- `id`, `name`, `is_locked`, `in_trial`, `trial_expired`, `remaining_trial_days`
- `company_setting` — 40+ config fields including:
  - `currency_id` — default currency
  - `date_format` — date format used across all date fields in the API
  - `gross_or_net` — whether amounts are gross or net
  - `show_po_item_number`, `show_delivery_status`, `show_payment_status`
  - `po_number_prefix`, `next_po_number`
  - `invoice_enabled`, `invoice_approval_flow_enabled`
  - `approval_flow_enabled` — whether approval flows are active
- `custom_fields[]` — company custom fields with type, options, placement flags
- `supported_currencies[]` — currencies enabled for this company
- `payment_terms[]` — payment terms with due_days, day_of_month, term_type

## User Roles

| Role | Permissions |
|------|------------|
| `companyadmin` | Full admin access, manage users, settings |
| `approver` | Approve/reject POs and invoices |
| `finance` | Financial operations, override approvals, archive |
| `teammember` | Create and view POs |
