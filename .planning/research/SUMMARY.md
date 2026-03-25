# Project Research Summary

**Project:** ProcurementExpress MCP Server — Rails API Schema Synchronization
**Domain:** TypeScript MCP server update — brownfield schema alignment with a Rails REST API
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

This project is a targeted update to an existing 88-tool MCP server: align every Zod input schema with the Rails controller `permit()` lists, align every TypeScript response interface with the Rails serializer output, and add approximately 39 missing tools for endpoints that the server does not yet expose. The stack is locked (TypeScript, MCP SDK 1.27.1, Zod 3.25.x, Vitest 4.x) and no new runtime dependencies are warranted. The recommended approach is a disciplined, phase-ordered manual audit: fix existing tools first so new tools inherit correct patterns, then add tools in priority order determined by which gaps block core agent workflows most.

The single most important architectural decision is already made and correct: the existing pattern of flat ZodRawShape inputSchema, `buildPath()` for version-agnostic routing, and one-tool-per-endpoint discipline must be maintained exactly. Deviations from any of these three patterns will cause silent failures that are difficult to detect in tests. The recommended addition is a shared `src/schemas.ts` module to eliminate cross-file Zod schema duplication, and a consistent `FooSummary` / `Foo` convention in `types.ts` for list versus detail response types.

The primary risk is the schema correction phase: any renamed, retyped, or removed parameter in an existing tool is a backwards-incompatible change that breaks MCP clients silently. The second major risk is using the GitHub issue audit (#20) as the source of truth rather than live Rails source. Both risks are mitigated by the same discipline: open the Rails controller and serializer for every tool group before touching it, and treat the issue audit as a checklist to cross-check, not a specification to trust.

---

## Key Findings

### Recommended Stack

The stack is fully locked by project constraints and currently at correct versions. No new runtime dependencies are needed. The key decision is to stay on Zod v3.25.x: the MCP SDK 1.27.1 has confirmed bugs with Zod v4 schemas in `registerTool()` — field descriptions are silently dropped and `z.discriminatedUnion()` schemas are silently discarded. The current import from `"zod"` (v3 surface) is correct.

**Core technologies:**

- `@modelcontextprotocol/sdk@1.27.1` — MCP server runtime, tool registration — current, no update needed
- `zod@3.25.76` — input schema validation — stay on v3; do NOT upgrade to v4 imports (SDK bugs)
- `typescript@5.9.3` — strict mode compilation — current, no update needed
- `vitest@4.0.18` — E2E test suite via MockApiServer — current, no update needed
- Node.js >=18 — runtime — no change, matches CI matrix

The effective "stack decision" for this milestone is workflow: Rails controller `permit()` blocks are the authoritative source for Zod inputSchema; Rails serializer `attributes` are the authoritative source for TypeScript interfaces. When the skills references and Rails source disagree, Rails source wins.

### Expected Features

**Must have (table stakes — core agent workflows blocked without these):**

- Custom Fields CRUD (6 tools) — agents cannot know field IDs before constructing POs/invoices
- PO approver preview: `preview_purchase_order_approvers` — agents submit approval-blind without this
- Invoice PO linking: `list_linkable_purchase_orders` + `list_purchase_order_items_for_invoice` — completes create_invoice workflow
- File uploads: `upload_purchase_order_file`, `upload_comment_file`, `get_upload_status` — real procurement requires document attachments
- `get_purchase_order_aff_link` — simple, frequently useful for supplier communication

**Should have (key differentiators for sophisticated use cases):**

- Compliance module (11 tools: check, bulk check, status polling, justify, memo, evidence packs) — AI-driven compliance checking is a core differentiator
- Digital invoice scanning: `create_digital_invoice` — eliminates manual invoice data entry via Mindee OCR
- Bulk PO creation: `bulk_create_purchase_orders` — enables batch procurement from ERP/CSV workflows

**Phase 4 / narrow audience:**

- Policies CRUD (6 tools) — requires policy feature flag
- SAM.gov supplier verification (2 tools) — government procurement only
- Chat Messages V3 (3 tools) — V3 API only, collaborative procurement
- Supplier Approvals (1 tool) — narrow company-setting gate
- Auto-approvers legacy (1 tool) — companies not using approval flows

**Defer indefinitely (anti-features):** Admin/billing/subscription tools, report generation, punchout/B2B catalog, bulk data import, exchange token endpoints, V1 sign-in/register. These are not procurement agent workflow operations.

### Architecture Approach

The existing architecture is correct and must be preserved as-is. The update is purely additive. The component boundaries (index.ts → tool files → api-client.ts → Rails API) and data flow are well-designed for the scale. Two structural changes are needed: extract shared Zod schemas to `src/schemas.ts` to prevent duplication across the 4+ files that use `custom_field_values_attributes`; and fix the error response parsing in `api-client.ts` to handle both `errorBody.error` and `errorBody.message` formats.

**Major components:**

1. `index.ts` — entry point, creates instances, registers all tool groups, version branches auth
2. `api-client.ts` — stateful HTTP client with `buildPath()`, auth headers, GET/POST/PUT/PATCH/DELETE
3. `src/tools/*.ts` — 14 domain tool files (projected: ~20 files, ~126 tools after update)
4. `types.ts` — TypeScript interfaces matching Rails serializers (~800 lines, will grow to ~1200)
5. `src/schemas.ts` (new) — shared Zod schemas imported by multiple tool files

**New tool files to create:**

| File | Tools | Phase |
|------|-------|-------|
| `custom-fields.ts` | 6 | Phase 2 |
| `compliance.ts` | 10 | Phase 2 |
| `uploads.ts` | 3 | Phase 3 |
| `digital-invoices.ts` | 1 | Phase 3 |
| `policies.ts` | ~6 | Phase 4 |
| `chat-messages.ts` | ~3 | Phase 4 |

### Critical Pitfalls

1. **Issue audit (#20) treated as source of truth** — Cross-check every tool group against live Rails controller `permit()` and serializer `attributes` before touching it. Rails source always wins when audit and code disagree. (Phase 1)

2. **Breaking existing tool signatures** — Never remove, rename, or retype existing input schema parameters. Widening (adding optional params) is safe. Narrowing is a breaking change. Tool name strings are permanently frozen once published to npm. (Phase 1)

3. **List type vs detail type conflation** — Several list tools are wrongly typed as the detail type. A `FooSummary` interface (no nested arrays) vs `Foo` interface (full detail) split must be established consistently in `types.ts` for ApprovalFlow and Webhook, and the wrong type annotations on existing list tools must be fixed before new code inherits the wrong pattern. (Phase 1)

4. **Nested `_destroy` without `id` silently ignored** — Rails `accepts_nested_attributes_for` requires `id` alongside `_destroy: true`. Without it, Rails silently ignores the delete — no error, 200 response, item remains. Add Zod `superRefine` validation: if `_destroy === true`, then `id` must be present. (Phase 1)

5. **Mock tests verify routing, not schema correctness** — Current MockApiServer handlers ignore request bodies and always return 200. Tests pass even when the Zod schema accepts params Rails would reject. Mock handlers for new tools must parse and validate request bodies, and at least one negative test (deliberate invalid payload) must exist per tool group. (Phase 5, pattern established in Phase 1)

6. **Error response format mismatch** — `api-client.ts` only reads `errorBody.message` but Rails returns `{ error: "..." }` for auth errors and `{ errors: [...] }` for V3 validation errors. Fix to try `error`, `errors`, `message` in sequence before falling back to status text. (Phase 1)

---

## Implications for Roadmap

Based on research, the suggested phase structure follows architectural dependencies: fix the foundation before adding new features, then add features in the order that unblocks the most agent workflows.

### Phase 1: Fix Existing Tools (Schema Audit and Corrections)

**Rationale:** Existing type interfaces and Zod schemas have documented errors (wrong list types, missing params, incorrect error handling). New tools added to a broken foundation will inherit and propagate the same errors. Fixing first eliminates the debt before it multiplies.

**Delivers:** A correct baseline — all 88 existing tools accurately reflect Rails API contracts. Zero breaking changes to external callers.

**Addresses:** Schema gaps in purchase-orders, invoices, budgets, suppliers, approval-flows, companies; `ApprovalFlowSummary`/`ApprovalFlow` type split; `WebhookSummary`/`Webhook` type split; error response parsing.

**Key tasks:**
- `types.ts`: add missing fields, fix `ApprovalFlow` and `Webhook` list vs detail split
- `api-client.ts`: fix error format parsing (`error` | `errors` | `message`)
- All 14 existing tool files: update Zod `inputSchema` to match `permit()` exactly
- `src/schemas.ts` (new): extract `customFieldValueSchema` and nested item schemas
- Add Zod `superRefine` for `_destroy` + `id` requirement on all nested attribute arrays
- Establish MockApiServer body-validation pattern for Phase 5

**Avoids:** Breaking tool signatures (backwards-compat review required on every schema change); list/detail type conflation propagating to new code.

**Research flag:** No additional research needed. Rails source is available locally; patterns are well-established.

### Phase 2: High-Priority New Tools

**Rationale:** These tools complete core agent workflows. Without custom fields CRUD, agents building POs/invoices are blind to what fields are required. Without approver preview, PO submission is blind. Without invoice PO linking tools, the create_invoice workflow is incomplete.

**Delivers:** ~23 new tools covering the gaps that most frequently block agent workflows. Tool count reaches ~111.

**Addresses:** Custom Fields (6 tools), Compliance module (10 tools — run check, bulk check, status, justify, memo, evidence packs), PO approver preview (1 tool), invoice PO linking (2 tools), `get_purchase_order_aff_link` (1 tool), plus 3 additional tools in purchase-orders.ts and invoices.ts.

**New files:** `src/tools/custom-fields.ts`, `src/tools/compliance.ts`

**Avoids:** Feature-flag-gated compliance fields being typed as required (must be nullable); async compliance check polling must be documented in tool descriptions.

**Research flag:** No additional research needed. Rails controllers and compliance references inspected directly.

### Phase 3: Medium-Priority New Tools

**Rationale:** File uploads and digital invoice scanning complete the document management side of procurement. Bulk PO creation enables batch workflows. These are high value but depend on correct base types from Phases 1-2.

**Delivers:** ~8 new tools. Tool count reaches ~119.

**Addresses:** File uploads: `upload_purchase_order_file`, `upload_comment_file`, `get_upload_status` (3 tools); Digital invoice: `create_digital_invoice` (1 tool, feature-flag gated); Bulk PO creation: `bulk_create_purchase_orders` (1 tool); Product bulk create + SKU listing (2 tools); Approval flow version details (1 tool).

**New files:** `src/tools/uploads.ts`, `src/tools/digital-invoices.ts`

**Key complexity:** File uploads require multipart Content-Type handling — different from all existing JSON tools. Implement and test this before digital invoice since they share the pattern.

**Research flag:** Multipart upload handling in the MCP tool pattern may benefit from a brief research pass if the team has not implemented multipart in this codebase before. The standard approach is base64 encoding in the Zod schema; confirm this matches the Rails `UploadsController` expectation.

### Phase 4: Low-Priority / Narrow-Audience Tools

**Rationale:** These tools serve important but narrower use cases (government procurement, V3-only deployments, companies with specific feature flags). They do not block the core workflow and carry lower implementation risk.

**Delivers:** ~13 new tools. Total reaches ~132 tools.

**Addresses:** Policies CRUD (~6 tools, feature-flag gated), SAM.gov check/status (2 tools), Chat Messages V3 (3 tools — V3 API only, must be gated by version check in index.ts), Supplier Approvals (1 tool), Auto-approvers legacy (1 tool).

**New files:** `src/tools/policies.ts`, `src/tools/chat-messages.ts`

**Avoids:** Chat messages registered unconditionally — must be gated on `PROCUREMENTEXPRESS_API_VERSION=v3` in index.ts (same branching pattern as V3 auth tools).

**Research flag:** No additional research needed. Standard CRUD patterns.

### Phase 5: Tests

**Rationale:** Tests are written alongside each phase in practice, but the full test suite should be audited and completed as its own phase to ensure all new and modified tools have coverage. Mock server body validation must be retrofitted to the new standard.

**Delivers:** Comprehensive E2E coverage for all new tools; negative tests (invalid payload assertions) for each tool group; mock handlers that validate request bodies rather than ignoring them.

**Addresses:** Every new tool file gets a corresponding `tests/e2e/*.test.ts`; existing tests updated for schema changes; MockApiServer route count increases from 49 tests to ~80 tests.

**Avoids:** Tests that only verify HTTP routing (the current weakness); `as any` assertions that mask type mismatches.

**Research flag:** Standard Vitest patterns. No research needed.

### Phase Ordering Rationale

- Phase 1 before Phase 2: wrong types in types.ts would propagate into new interfaces; wrong error handling would affect all new tools; backwards-compat risk must be reviewed before the codebase expands.
- Phase 2 before Phase 3: compliance and custom fields are referenced by PO/invoice creation; they should exist before uploads/digital-invoices that build on top.
- Phase 3 before Phase 4: file upload pattern must be proven before the digital invoice tool (which also uses multipart); ensuring the multipart pattern works before adding more tools.
- Phase 5 last in sequence but tests written alongside each phase in practice: the formal test audit phase catches anything missed during implementation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against installed node_modules; MCP SDK Zod v4 bugs confirmed via GitHub issues |
| Features | HIGH | All findings based on direct Rails controller and serializer inspection — not documentation |
| Architecture | HIGH | Existing architecture inspected directly; patterns verified against working tools; build order dependencies confirmed |
| Pitfalls | HIGH | Based on direct codebase inspection of tool files, types.ts, api-client.ts, and test suite; Rails conventions are well-documented |

**Overall confidence:** HIGH

### Gaps to Address

- **NPayments alignment:** The existing `payments.ts` may already cover `NpaymentsController` — needs a quick cross-check of params and response types against the live controller before Phase 2. Low effort, could surface a gap or confirm no work needed.

- **Multipart upload encoding:** The Rails `UploadsController` upload format (multipart vs base64-in-JSON) needs confirmation before implementing `uploads.ts` in Phase 3. This is the one area where the research identified complexity without a confirmed approach. Recommend a brief research pass at the start of Phase 3.

- **Products bulk_create / list_skus:** The architecture research lists these as Phase 3 additions but FEATURES.md does not detail them. Confirm these actions exist in `Api::V1::ProductsController` before adding to Phase 3 scope.

- **Approval flows tool count discrepancy:** Architecture research notes `approval-flows.ts` stays at 13 tools (unchanged) but also lists `unpublish`, `version_details`, and `bulk rerun` as additions. Clarify the final count against the live controller before Phase 2 implementation.

---

## Sources

### Primary (HIGH confidence)

- Rails controllers: `/Users/przbadu/projects/pex/po-app/app/controllers/api/v1/` and `/v3/` — inspected directly for all tool groups
- Rails serializers: `/Users/przbadu/projects/pex/po-app/app/serializers/` — inspected directly for list vs detail field split
- Installed node_modules: `node_modules/@modelcontextprotocol/sdk/package.json`, `node_modules/zod/package.json` — versions verified directly
- MCP SDK source: `node_modules/@modelcontextprotocol/sdk/` — `registerTool()` and `normalizeObjectSchema` behavior verified
- Existing codebase: `src/index.ts`, `src/api-client.ts`, `src/types.ts`, `src/tools/*.ts`, `tests/e2e/` — all read directly

### Secondary (MEDIUM confidence)

- `procurementexpress-skills/pex-api-skills/references/` — curl-based API documentation; useful for orientation but may lag Rails source
- GitHub issue #20 — module-by-module audit; useful checklist but must be cross-checked against live Rails code before use

### Tertiary (LOW confidence)

- MCP SDK GitHub issues #925, #1143, #1643 — Zod v4 incompatibility bugs; referenced but not directly reproducible in this environment. Confidence HIGH on the existence of the issues, MEDIUM on whether they are resolved in future SDK versions.

---

*Research completed: 2026-03-25*
*Ready for roadmap: yes*
