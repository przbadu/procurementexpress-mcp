---
name: pex:departments
description: >
  ProcurementExpress department management. Use when listing, viewing, creating, or updating
  departments (organizational units). Routes to MCP tools: list_departments, get_department,
  create_department, update_department. Triggers on: department, division, organizational unit,
  department users, department budgets.
---

# ProcurementExpress Departments

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.

## Tools Reference

### list_departments
List departments. By default returns only departments the current user has access to.
- **Params:**
  - `archived` (optional, boolean, default: false)
  - `company_specific` (optional, boolean) — true to list ALL company departments regardless of user access
- **Returns:** `Department[]`

### get_department
Get a specific department by ID.
- **Params:** `id` (required, integer)
- **Returns:** `Department`

### create_department
Create a new department.
- **Params:**
  - `name` (required, string)
  - `contact_person` (optional, string)
  - `phone_number` (optional, string)
  - `email` (optional, string)
  - `address` (optional, string)
  - `tax_number` (optional, string)
  - `budget_ids` (optional, integer array) — budgets to associate
  - `user_ids` (optional, integer array) — users to assign
- **Returns:** `Department`

### update_department
Update an existing department.
- **Params:** `id` (required) + any create_department params + `archived` (optional, boolean)
- **Returns:** `Department`

## Department Response Fields

- `id`, `name`, `company_id`, `archived`
- `contact_person`, `tax_number`, `phone_number`, `address`, `email`
- `supplier_ids[]` — associated supplier IDs
- `budget_ids[]` — associated budget IDs
- `created_at`, `updated_at`

## Relationships

- Departments contain users and budgets
- Departments can restrict which suppliers are available
- POs and invoices can be filtered by department
- Approvers can be filtered by department (pex-companies `list_approvers`)
