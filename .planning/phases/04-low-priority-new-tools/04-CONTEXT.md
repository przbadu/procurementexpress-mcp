# Phase 4: Low-Priority New Tools - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Narrow-audience capabilities are available for government procurement, V3 deployments, and companies with specific feature flags — without affecting the default V1 workflow. Adds policies CRUD, SAM.gov checks, V3-only chat messages, supplier approvals, pending invites, digital invoices, and NPayment settlements.

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
- V3-only tools: registration gated on API version check in index.ts
- Chat messages are V3 only — register conditionally like auth tools

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas.ts` — shared Zod schemas (customFieldValueSchema, lineItemSchema, destroyRequiresId)
- `src/tool-helpers.ts` — withErrorHandling, jsonResponse, textResponse
- `src/api-client.ts` — buildPath(), GET/POST/PUT/PATCH/DELETE, postMultipart()
- `src/types.ts` — comprehensive TypeScript interfaces
- `tests/e2e/setup.ts` — MockApiServer with vPath, vPathWithId, vPathSuffix helpers
- `src/index.ts` — version-conditional registration pattern (V1 vs V3 branching for auth tools)

### Established Patterns
- Tool registration: `server.registerTool("name", {description, inputSchema}, withErrorHandling(async (args) => {...}))`
- API paths: always use `apiClient.buildPath("/resource")`
- Version-gated registration: check apiVersion in index.ts before registering V3-only tools
- Type splits: Summary for list, Detail for get-by-id

### Integration Points
- `src/index.ts` — new tool files imported and registered; V3-only tools registered inside version check block
- `tests/e2e/setup.ts` — mock routes for new endpoints

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

Key implementation notes:
- Chat messages are V3-only — gated on API version in index.ts
- Policies and policy templates are separate resources
- SAM.gov is an external check endpoint on the suppliers controller
- NPayments use the { npayment: {...} } body shape (already established in payments.ts)
- Digital invoices likely use the postMultipart() method added in Phase 3

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
