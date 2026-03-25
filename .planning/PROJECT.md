# ProcurementExpress MCP Server — Comprehensive Audit & Update

## What This Is

A comprehensive update to the ProcurementExpress MCP server (`@procurementexpress.com/mcp`) to close gaps between what the Rails backend actually supports and what the MCP exposes. Tool input schemas must match Rails controller strong params exactly, response types must match ActiveModelSerializer output exactly, and missing API capabilities must be added as new tools. This is a brownfield enhancement of an existing 88-tool MCP server.

## Core Value

Every MCP tool must be a faithful, complete representation of the corresponding Rails API endpoint — zero invented params, zero missing params, zero mismatched response types.

## Requirements

### Validated

- ✓ MCP server runs via stdio transport — existing
- ✓ Dual API versioning (V1 static token, V3 OAuth2) — existing
- ✓ 88 tools across 14 tool files — existing
- ✓ E2E test suite with MockApiServer — existing
- ✓ `buildPath()` for version-agnostic API paths — existing
- ✓ `withErrorHandling()` wraps every tool handler — existing
- ✓ Published to npm as `@procurementexpress.com/mcp` — existing

### Active

#### Phase 1 — Fix Existing Tools
- [ ] Update all input Zod schemas to match Rails controller strong params exactly
- [ ] Update all TypeScript response types to match serializer output exactly
- [ ] Add list vs detail type distinction (PO, Invoice, Company, Webhook, ApprovalFlow)
- [ ] Fix pagination handling for non-paginated endpoints
- [ ] Update error response handling for both error formats

#### Phase 2 — Add High-Priority Missing Tools
- [ ] Custom Fields CRUD (6 tools: list, get, create, update, delete, update_positions)
- [ ] Compliance module (10 tools: check, bulk_check, status, justify, memo, scan_history, details, evidence_packs CRUD)
- [ ] Missing PO tools (bulk_save, auto_approvers_list, approver_list, aff_link)
- [ ] Missing Invoice tools (purchase_order_list, purchase_order_item_list, rerun_approval_flow)

#### Phase 3 — Add Medium-Priority Missing Tools
- [ ] File uploads (upload_po_file, upload_comment_file, get_upload_status)
- [ ] Digital invoices (create_digital_invoice)
- [ ] NPayments / settlement payments (create_npayment, get_npayment)
- [ ] Missing approval flow tools (unpublish, version_details, bulk rerun)
- [ ] Product bulk operations (bulk_create, list_skus)

#### Phase 4 — Add Low-Priority Missing Tools
- [ ] Policies & policy templates CRUD
- [ ] SAM.gov checks
- [ ] Chat messages (V3 only)
- [ ] Supplier approvals
- [ ] Payment terms management

#### Phase 5 — Testing & Verification
- [ ] E2E tests for all modified tools
- [ ] E2E tests for all new tools
- [ ] Build verification — zero TypeScript errors
- [ ] Test against staging environment

### Out of Scope

- V1 sign-in/register API tools — users must use pre-provisioned tokens; existing auth tools left as-is
- UI/frontend changes — this is a CLI MCP server
- Rails backend modifications — MCP must conform to the backend, not the other way around
- Breaking changes to existing tool names/IDs — preserve backwards compatibility for MCP clients

## Context

- **Rails backend source:** `/Users/przbadu/projects/pex/po-app/` — controllers define strong params, serializers define response shape
- **Skills references:** `/Users/przbadu/projects/pex/procurementexpress-skills/pex-api-skills/references/` — curl-based, up-to-date API documentation
- **Official docs:** `docs.procurementexpress.com`
- **Critical pattern:** Rails uses different serializers for list (summary) vs detail endpoints. MCP must reflect this with separate TypeScript types.
- **Nested attributes:** Rails convention — create without `id`, update with `id`, delete with `id` + `_destroy: true`
- **The `commit` param:** On POs, `commit: "Send"` submits for approval (top-level, NOT nested)
- **Conditional response fields:** Some serializer fields are conditional on company settings, user role, or integrations
- **GitHub issue:** #20 contains the full module-by-module audit

## Constraints

- **Tech stack**: TypeScript, MCP SDK, Zod schemas, vitest — no changes to stack
- **Compatibility**: Must maintain backwards compatibility with existing MCP clients
- **Source of truth**: Rails controllers and serializers are authoritative — not docs, not assumptions
- **Auth**: Leave existing auth tools as-is. Do not add sign-in/register endpoints.
- **Testing**: Full E2E coverage for every new and modified tool using MockApiServer

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cross-reference Rails source during implementation | Issue audit may have gaps or inaccuracies — Rails code is authoritative | — Pending |
| Leave existing auth tools as-is | Already exposed, no breaking changes | — Pending |
| Full scope (all 5 phases) in single milestone | User wants complete alignment with backend | — Pending |
| Full E2E test coverage | Every tool must be verified against mock server | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after initialization*
