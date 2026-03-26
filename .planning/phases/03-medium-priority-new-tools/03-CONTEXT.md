# Phase 3: Medium-Priority New Tools - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Document management and batch procurement workflows are available — agents can attach files, create invoices from scanned documents, bulk-create POs, and manage product catalogs. Adds file upload tools, product bulk operations, and approval flow additions.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- Cross-reference Rails source during implementation — Rails controllers and serializers are authoritative
- Full E2E test coverage required for every new and modified tool using MockApiServer body validation
- Never remove, rename, or retype existing tool input params — backwards-compat frozen
- Stay on Zod v3.25.x — MCP SDK 1.27.1 has confirmed bugs with Zod v4
- All new type fields added as optional (?) per conditional/feature-flag serializer attributes
- src/schemas.ts is the single source of truth for shared Zod schemas
- 202 async responses passed through directly — no internal polling

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas.ts` — shared Zod schemas (customFieldValueSchema, lineItemSchema, destroyRequiresId)
- `src/tool-helpers.ts` — withErrorHandling, jsonResponse, textResponse
- `src/api-client.ts` — buildPath(), GET/POST/PUT/PATCH/DELETE methods
- `src/types.ts` — comprehensive TypeScript interfaces (~800+ lines)
- `tests/e2e/setup.ts` — MockApiServer with vPath, vPathWithId, vPathSuffix helpers

### Established Patterns
- Tool registration: `server.registerTool("name", {description, inputSchema}, withErrorHandling(async (args) => {...}))`
- API paths: always use `apiClient.buildPath("/resource")`
- Type splits: Summary for list, Detail for get-by-id
- Mock routes: version-agnostic regex `/^\/api\/v[13]\/resource$/`

### Integration Points
- `src/index.ts` — new tool files imported and registered here
- `tests/e2e/setup.ts` — mock routes added here for new endpoints

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

Blockers to resolve at phase start:
- Multipart upload encoding format (base64 vs raw multipart) — needs Rails UploadsController check
- Products bulk_create / list_skus existence — verify against Rails ProductsController

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
