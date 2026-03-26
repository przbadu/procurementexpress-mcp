# Roadmap: ProcurementExpress MCP Server — Audit & Update

## Overview

This milestone closes the gap between the ProcurementExpress MCP server's 88 existing tools and the full Rails API surface. The work proceeds in dependency order: fix the existing type system and Zod schemas first (Phase 1) so new code inherits correct patterns, then add tools in the order that unblocks the most agent workflows (Phases 2-4), then formalize the test suite (Phase 5). Every change must preserve backwards compatibility for existing MCP clients.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Schema & Type Foundation** - Align all existing Zod schemas with Rails strong params and fix TypeScript response types
- [ ] **Phase 2: High-Priority New Tools** - Add 23 tools that complete core agent workflows (custom fields, compliance, PO/invoice gaps)
- [ ] **Phase 3: Medium-Priority New Tools** - Add file uploads, digital invoices, bulk operations, and approval flow additions
- [ ] **Phase 4: Low-Priority New Tools** - Add policies, SAM.gov, chat messages, supplier approvals, and payment terms
- [ ] **Phase 5: Test Coverage & Verification** - Full E2E test suite for all new and modified tools

## Phase Details

### Phase 1: Schema & Type Foundation
**Goal**: Every existing tool accurately represents its Rails API contract with no invented params, no missing params, and no mismatched response types
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08, SCHEMA-09, SCHEMA-10, SCHEMA-11, SCHEMA-12, TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07, INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. An MCP client calling any existing tool with the exact params Rails accepts gets a 200 with correct data — no "unknown param" rejections from Rails
  2. An MCP client calling any list tool gets a response typed as the Summary interface (no nested detail arrays), and any get-by-id tool gets the full Detail interface
  3. Any Rails error response (`{ error }`, `{ errors }`, `{ message }`) is surfaced to the MCP caller as a readable string, not an empty or undefined error
  4. Zod validation rejects nested `_destroy: true` without an accompanying `id` before the request reaches Rails
  5. Shared Zod schemas (custom_field_values_attributes, line items) live in `src/schemas.ts` and are imported by all tool files that use them
**Plans:** 7 plans (6 executed, 1 gap closure)
Plans:
- [x] 01-01-PLAN.md — Infrastructure: fix error handler + extract shared schemas
- [x] 01-02-PLAN.md — Types: Summary/Detail type splits + missing serializer fields
- [x] 01-03-PLAN.md — PO + Invoice schema alignment with Rails strong params
- [x] 01-04-PLAN.md — Company, Supplier, Budget, Department schema alignment
- [x] 01-05-PLAN.md — Webhook, ApprovalFlow, Payment, TaxRate, Product, Comment schema alignment
- [x] 01-06-PLAN.md — Integration verification + human review checkpoint
- [x] 01-07-PLAN.md — Gap closure: _destroy+id cross-field validation (Success Criterion 4)

### Phase 2: High-Priority New Tools
**Goal**: Core agent workflows are unblocked — agents can discover custom fields, preview approvers, link invoices to POs, check compliance, and communicate approval flow links
**Depends on**: Phase 1
**Requirements**: CF-01, CF-02, CF-03, CF-04, CF-05, CF-06, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10, PO-01, PO-02, PO-03, PO-04, INV-01, INV-02, INV-03
**Success Criteria** (what must be TRUE):
  1. An agent building a PO or invoice can call `list_custom_fields` to discover all field IDs and types before submitting `custom_field_values_attributes`
  2. An agent can trigger a compliance check on a PO/invoice, poll for status, justify a violation, and retrieve an evidence pack — all via MCP tools
  3. An agent can preview which approvers will be assigned to a PO before submitting it for approval
  4. An agent creating an invoice can call two tools to discover which POs and PO line items are available to link, then create the invoice with correct references
  5. An agent can retrieve the approval flow link for a PO to share with the supplier
**Plans:** 5 plans
Plans:
- [ ] 02-01-PLAN.md — Custom fields module: types + 6 tools + E2E tests
- [ ] 02-02-PLAN.md — Compliance module: types + 10 tools + E2E tests
- [ ] 02-03-PLAN.md — PO gap tools: 4 new tools + types + E2E tests
- [ ] 02-04-PLAN.md — Invoice gap tools: 2 new tools + INV-03 test coverage
- [ ] 02-05-PLAN.md — Wire new tool files into index.ts + integration verification

### Phase 3: Medium-Priority New Tools
**Goal**: Document management and batch procurement workflows are available — agents can attach files, create invoices from scanned documents, bulk-create POs, and manage product catalogs
**Depends on**: Phase 2
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03, PROD-01, PROD-02, LOW-10
**Success Criteria** (what must be TRUE):
  1. An agent can upload a file attachment to a purchase order and verify the upload completed via the status endpoint
  2. An agent can upload a file to a comment (e.g., supporting documentation on a PO discussion)
  3. An agent can bulk-create multiple products in a single call and retrieve the full SKU list
  4. An agent can call approval flow version details and unpublish/bulk-rerun flows via dedicated tools
**Plans**: TBD

### Phase 4: Low-Priority New Tools
**Goal**: Narrow-audience capabilities are available for government procurement, V3 deployments, and companies with specific feature flags — without affecting the default V1 workflow
**Depends on**: Phase 3
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, LOW-01, LOW-02, LOW-03, LOW-04, LOW-05, LOW-06, LOW-07, LOW-08, LOW-09
**Success Criteria** (what must be TRUE):
  1. An agent can perform full CRUD on company policies and list available policy templates
  2. An agent can check a supplier against the SAM.gov database to verify eligibility for government contracts
  3. A V3-authenticated agent can list, create, and delete chat messages on a PO (tool registration is gated on API version)
  4. An agent can list pending supplier approval requests and pending company invites
  5. An agent can create a digital invoice from a scanned document upload and create or retrieve an NPayment settlement
**Plans**: TBD

### Phase 5: Test Coverage & Verification
**Goal**: Every tool — new and modified — has E2E test coverage that validates request shape against MockApiServer, and the full suite passes with zero TypeScript errors
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. Every new tool file has a corresponding `tests/e2e/*.test.ts` file with at least one positive and one negative (invalid payload) test
  2. MockApiServer handlers for all new routes validate the request body, not just the route match
  3. `npm run build` completes with zero TypeScript errors
  4. `npm test` passes all existing tests (no regressions from Phase 1 schema changes)
  5. At least one Zod rejection test exists per tool group (invalid input returns error without reaching Rails)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Type Foundation | 7/7 | Complete |  |
| 2. High-Priority New Tools | 0/5 | Planned | - |
| 3. Medium-Priority New Tools | 0/0 | Not started | - |
| 4. Low-Priority New Tools | 0/0 | Not started | - |
| 5. Test Coverage & Verification | 0/0 | Not started | - |
