---
name: pex:approval-flows
description: >
  ProcurementExpress approval flow configuration. Use when creating, updating, publishing,
  or managing approval flows and their steps, conditions, and runs. Approval flows automate
  the routing of POs and invoices to the right approvers based on configurable conditions.
  Routes to MCP tools: list_approval_flows, get_approval_flow, create_approval_flow,
  update_approval_flow, delete_approval_flow, archive_approval_flow, publish_approval_flow,
  unpublish_approval_flow, list_approval_flow_runs, get_approval_flow_entity,
  list_approval_flow_versions, get_approval_flow_version_details, rerun_approval_flows.
  Triggers on: approval flow, approval workflow, approval steps, approval conditions,
  approval routing, publish flow, flow runs, flow version, flow history, rerun approval.
---

# ProcurementExpress Approval Flows

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.
The company must have `approval_flow_enabled` in company settings.

## Tools Reference

### list_approval_flows
List active approval flows with search and pagination.
- **Params:**
  - `search` (optional) — search by flow name
  - `page` (optional, integer), `per_page` (optional, integer — 10, 20, 50, 100)
  - `sort` (optional, e.g. "name", "created_at"), `direction` (optional, "asc"/"desc")
- **Returns:** `{ approval_flows: ApprovalFlow[], meta: PaginationMeta }`

### get_approval_flow
Get flow details including steps, approvers, and conditions.
- **Params:** `id` (required, integer)
- **Returns:** `ApprovalFlow`

### create_approval_flow
Create a flow with steps, approvers, and conditions. See [references/conditions.md](references/conditions.md).
- **Params:**
  - `name` (required, string)
  - `document_type` (required, integer) — `0` = purchase order, `1` = invoice
  - `self_approval_allowed` (optional, boolean) — allow PO creator to self-approve
  - `steps` (required, array) — approval steps executed in step_no order:
    - `step_no` (required, integer) — execution order
    - `all_should_approve` (required, boolean) — true=all approvers, false=any one
    - `approver_user_ids` (required, integer array) — approver user IDs
    - `conditions` (optional, array) — step-level conditions (see [references/conditions.md](references/conditions.md))
  - `conditions` (optional, array) — flow-level conditions that determine which documents match
- **Returns:** `ApprovalFlow`

### update_approval_flow
Update a flow. Include `id` on steps/conditions to update existing, omit for new, `_destroy: true` to remove.
- **Params:** `id` (required) + any create params
- **Returns:** `ApprovalFlow`

### delete_approval_flow
Permanently delete a flow.
- **Params:** `id` (required, integer)

### archive_approval_flow
Soft-delete (can be restored).
- **Params:** `id` (required, integer)

### publish_approval_flow
Make a flow active. New POs/invoices will use this flow.
- **Params:** `id` (required, integer)

### unpublish_approval_flow
Deactivate a flow. Existing runs continue but new documents won't use it.
- **Params:** `id` (required, integer)

### list_approval_flow_runs
List documents that went through this flow with status and date filters.
- **Params:**
  - `id` (required, integer) — flow ID
  - `status` (optional) — `"in_progress"`, `"completed"`, `"rejected"`
  - `keyword` (optional) — search keyword
  - `date_range` (optional) — `"24h"`, `"7d"`, `"30d"`, `"60d"`, `"custom"`
  - `date_from`, `date_to` (optional) — for custom range
  - `page`, `per_page` (optional)
- **Returns:** Paginated flow run results

## ApprovalFlow Response Fields

- `id`, `name`, `document_type` (0=PO, 1=invoice), `self_approval_allowed`
- `company_id`, `version_no`, `archived`, `status`
- Counts: `in_progress_count`, `completed_count`, `rejected_count`, `total_runs_count`
- `approval_steps[]` — each has: id, step_no, all_should_approve, approval_step_approvers[]
  - Each approver: id, user_id, user_name, user_email
- `approval_conditions[]` — flow-level conditions
- `created_at`, `updated_at`

## Version & Entity Tools

### get_approval_flow_entity
Get details about a specific PO or invoice that went through a flow.
- **Params:** `id` (required, integer — flow ID), `entity_id` (required, integer — PO or invoice ID)
- **Returns:** Entity details with approval status

### list_approval_flow_versions
List all version history of an approval flow.
- **Params:** `id` (required, integer — flow ID)
- **Returns:** Version history array

### get_approval_flow_version_details
Get full details of a specific flow version.
- **Params:** `id` (required, integer — flow ID), `version_id` (required, integer)
- **Returns:** Version details with steps and conditions

### rerun_approval_flows
Batch rerun approval flows for multiple POs and/or invoices. Use when flow rules have changed.
- **Params:**
  - `order_ids` (optional, integer array) — PO IDs to rerun flows for
  - `invoice_ids` (optional, integer array) — invoice IDs to rerun flows for
- At least one of `order_ids` or `invoice_ids` should be provided

## Flow-Level vs Step-Level Conditions

- **Flow-level conditions** determine WHICH documents match this flow (e.g., "only POs from Engineering department")
- **Step-level conditions** determine WHICH steps activate for a matching document (e.g., "step 2 only if amount > $10,000")

Both use the same condition schema. See [references/conditions.md](references/conditions.md).
