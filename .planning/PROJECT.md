# ProcurementExpress MCP Server

## What This Is

A comprehensive MCP server (`@procurementexpress.com/mcp`) exposing 100+ tools for the ProcurementExpress Rails API. Supports dual auth (V1 static token, V3 OAuth2), file uploads via multipart, compliance checks, government procurement (SAM.gov, policies), and full CRUD across all major resources. Published to npm, runs via stdio transport.

## Core Value

Every MCP tool is a faithful, complete representation of the corresponding Rails API endpoint — zero invented params, zero missing params, zero mismatched response types.

## Current State (v1.0 shipped 2026-03-26)

- **Tool count:** 100+ tools across 19 tool files
- **Test suite:** 211 E2E tests, all passing, zero TypeScript errors
- **Source:** 4,814 LOC TypeScript
- **Modules:** Auth, POs, invoices, budgets, departments, suppliers, products, companies, comments, payments, tax rates, webhooks, approval flows, supplementary, custom fields, compliance, uploads, policies, chat messages, digital invoices
- **V3-only features:** Chat messages (gated in index.ts)
- **Multipart uploads:** ApiClient.postMultipart() for file uploads and digital invoices

## Requirements

### Validated

- ✓ All 12 Zod schemas match Rails strong params exactly — v1.0
- ✓ All 7 TypeScript type splits (Summary/Detail) match serializers — v1.0
- ✓ All 4 infrastructure improvements (error handling, shared schemas, pagination, array responses) — v1.0
- ✓ Custom Fields CRUD (6 tools) — v1.0
- ✓ Compliance module (10 tools) — v1.0
- ✓ Missing PO tools (4 tools: bulk_save, auto_approvers, available_approvers, aff_link) — v1.0
- ✓ Missing Invoice tools (3 tools: PO list, PO items, rerun approval) — v1.0
- ✓ File uploads (3 tools: PO upload, comment upload, status) — v1.0
- ✓ Product bulk operations (2 tools: bulk_create, list_skus) — v1.0
- ✓ Approval flow tools verified (unpublish, version_details, rerun) — v1.0
- ✓ Policies CRUD + templates (6 tools) — v1.0
- ✓ SAM.gov check + supplier approvals (2 tools) — v1.0
- ✓ V3-only chat messages (3 tools) — v1.0
- ✓ Digital invoices (1 tool) — v1.0
- ✓ NPayment + pending invites test coverage — v1.0
- ✓ Full E2E test coverage with Zod rejection tests — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- V1 sign-in/register API tools — users must use pre-provisioned tokens
- UI/frontend changes — this is a CLI MCP server
- Rails backend modifications — MCP must conform to the backend
- Breaking changes to existing tool names/IDs — backwards compatibility
- Zod v4 migration — MCP SDK has known bugs with Zod v4

## Context

- **Rails backend source:** `/Users/przbadu/projects/pex/po-app/`
- **Skills references:** `/Users/przbadu/projects/pex/procurementexpress-skills/pex-api-skills/references/`
- **Official docs:** `docs.procurementexpress.com`
- **npm package:** `@procurementexpress.com/mcp` (run via `npx -y @procurementexpress.com/mcp`)

## Constraints

- **Tech stack**: TypeScript, MCP SDK, Zod v3.25.x, vitest
- **Compatibility**: Backwards compatible with all existing MCP clients
- **Source of truth**: Rails controllers and serializers are authoritative
- **Auth**: Existing auth tools unchanged
- **Testing**: Full E2E coverage with MockApiServer

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cross-reference Rails source during implementation | Issue audit may have gaps — Rails code is authoritative | ✓ Good — caught multiple discrepancies |
| Leave existing auth tools as-is | Already exposed, no breaking changes | ✓ Good |
| Full scope (all 5 phases) in single milestone | User wants complete alignment with backend | ✓ Good — delivered 67 requirements |
| Full E2E test coverage | Every tool must be verified against mock server | ✓ Good — 211 tests |
| Summary/Detail type splits | Rails uses different serializers for list vs detail | ✓ Good — matches serializer output exactly |
| src/schemas.ts for shared Zod schemas | Avoid duplication across tool files | ✓ Good — 5 tool files import shared schemas |
| V3-only chat messages gated in index.ts | Chat API is V3 only — V1 users should not see these tools | ✓ Good |
| postMultipart() for file uploads | Rails uses raw multipart, not base64 | ✓ Good — reused for digital invoices |

---
*Last updated: 2026-03-26 after v1.0 milestone*
