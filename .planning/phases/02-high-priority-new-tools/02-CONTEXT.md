# Phase 2: High-Priority New Tools - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add 23 new MCP tools that complete core agent workflows: custom fields CRUD (6 tools), compliance module (10 tools), PO gaps (4 tools), and invoice gaps (3 tools). After this phase, agents can discover custom fields before building POs, check compliance, preview approvers, link invoices to POs, and share approval flow links.

Requirements: CF-01..06, COMP-01..10, PO-01..04, INV-01..03

</domain>

<decisions>
## Implementation Decisions

### Tool File Organization
- Custom field tools go in new `src/tools/custom-fields.ts` — follows existing pattern of one file per domain
- Compliance tools go in new `src/tools/compliance.ts` — 10 tools is enough for its own file
- PO gap tools (bulk save, auto-approvers, available approvers, approval link) go in existing `src/tools/purchase-orders.ts` — they are PO operations
- Invoice gap tools (list POs for link, list PO items for link, rerun approval) go in existing `src/tools/invoices.ts` — they are invoice operations

### Compliance Module Design
- Async compliance checks (202 response): Return the 202 status with job ID, let agent poll via `get_bulk_check_status` — do not block/poll internally
- Evidence pack download: Return download URL/metadata as JSON — MCP tools should not stream binary data
- Compliance memo (AI-generated): Simple POST that returns the generated memo text
- Scan history: Support pagination matching existing list tool pattern with optional `page` param

### Custom Fields Module Design
- `update_custom_field_positions`: Accept a full ordered array of custom field IDs — matches Rails `update_positions` action
- `field_type`: Use Zod enum with known types from Rails (`text`, `number`, `date`, `dropdown`, `checkbox`, `url`, `formula`) — prevents invalid types at validation
- `option_list` (for dropdown fields): Accept `string[]` array — cleaner API, serialize to Rails comma-separated format internally if needed

### Claude's Discretion
- Registration order within new files (tool ordering)
- Internal helper functions for shared patterns (e.g., compliance check formatting)
- Whether to add intermediate TypeScript types for new endpoints or use inline types
- Error message formatting for compliance-specific error scenarios

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/tool-helpers.ts` — `textResponse()`, `jsonResponse()`, `withErrorHandling()` used by all tools
- `src/schemas.ts` — Shared Zod schemas (customFieldValueSchema, lineItemSchema, etc.)
- `src/types.ts` — TypeScript interfaces based on Rails serializers
- `src/api-client.ts` — HTTP client with `buildPath()`, auth headers, error handling

### Established Patterns
- Each tool file exports `register*Tools(server, apiClient)` function
- Tool registration: `server.registerTool("name", { description, inputSchema }, withErrorHandling(async (args) => {...}))`
- `inputSchema` must be flat `ZodRawShape`, not `z.object()`
- All API paths use `apiClient.buildPath("/resource")` — never hardcode version prefix
- Pagination: optional `page` param, returns `{ items: T[], meta: PaginationMeta }` when paginated
- Non-paginated lists return plain arrays
- Summary types for list endpoints, Detail types for get endpoints

### Integration Points
- `src/index.ts` — Must import and call `register*Tools()` for new tool files (custom-fields, compliance)
- PO/invoice gap tools register inside existing `registerPurchaseOrderTools()` / `registerInvoiceTools()`
- New types added to `src/types.ts`

### Rails Source Cross-Reference
- Controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/custom_fields_controller.rb`
- Controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/compliance_controller.rb`
- Controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/compliance/evidence_packs_controller.rb`
- Controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/purchase_orders_controller.rb`
- Controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/invoices_controller.rb`
- Serializers: `/Users/przbadu/projects/pex/po-app/app/serializers/`

</code_context>

<specifics>
## Specific Ideas

- Rails is authoritative for all params — read controller `_params` and serializer `attributes` directly
- Follow Phase 1 pattern: widening only (new optional params), never remove existing params
- Stay on Zod v3 (v4 has MCP SDK bugs)
- Approval flows tool count discrepancy (13 vs 13+3) needs verification against live controller before adding approval flow link tool

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-high-priority-new-tools*
*Context gathered: 2026-03-26 via Smart Discuss (autonomous mode)*
