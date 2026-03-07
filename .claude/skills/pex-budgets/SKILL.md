---
name: pex:budgets
description: >
  ProcurementExpress budget management. Use when listing, viewing, creating, or updating
  budgets (cost centers). Routes to MCP tools: list_budgets, get_budget, create_budget,
  update_budget. Triggers on: budget, cost center, spending limit, budget allocation,
  remaining budget, budget approvers.
---

# ProcurementExpress Budgets

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.

## Tools Reference

### list_budgets
List budgets for the current company.
- **Params:**
  - `department_id` (optional, integer) — filter by department
  - `archived` (optional, boolean, default: false)
  - `show_mappings` (optional, boolean) — include third-party ID mappings
- **Returns:** `Budget[]`

### get_budget
Get a specific budget with remaining amount and associations.
- **Params:** `id` (required, integer)
- **Returns:** `Budget`

### create_budget
Create a new budget.
- **Params:**
  - `name` (required, string)
  - `amount` (required, number)
  - `currency_id` (optional, integer) — defaults to company currency
  - `creator_id` (optional, integer)
  - `cost_code` (optional, string)
  - `cost_type` (optional, string)
  - `start_date` (optional, string) — must match company `date_format` setting
  - `end_date` (optional, string) — must match company `date_format` setting
  - `allow_anyone_to_approve_a_po` (optional, boolean)
  - `chart_of_account_id` (optional, integer) — GL code
  - `qbo_class` (optional, string) — QuickBooks class
  - `approver_ids` (optional, integer array)
  - `department_ids` (optional, integer array)
  - `custom_field_values_attributes` (optional, array) — budget-level custom field values:
    - `id` (optional, integer — for updates), `value` (required, string), `custom_field_id` (required, integer)
    - Get available custom fields from `get_company_details` (pex-companies) → `custom_fields[]`
- **Returns:** `Budget`

### update_budget
Update an existing budget. Same params as create except `id` is required, all others optional.
- **Params:** `id` (required) + any create_budget params
- **Returns:** `Budget`

## Budget Response Fields

- `id`, `name`, `amount`, `currency_id`, `cost_code`, `cost_type`, `archived`
- `base_amount`, `base_rate` — converted to company base currency
- `remaining_amount` — budget minus approved/paid POs
- `summary` — spending summary
- `approved_this_month` — amount approved in current month
- `allow_anyone_to_approve_a_po` — bypass approver restrictions
- `start_date`, `end_date` — budget period
- `creator_id`, `approver_ids[]`, `department_ids[]`
- `chart_of_account_id`, `chart_of_account_name`
- `third_party_id_mappings` — external system IDs
- `created_at`, `updated_at`

## Date Format

All date fields must match the company's `date_format` setting. Get it via `get_company_details` (pex-companies skill) from `company_setting.date_format`.
