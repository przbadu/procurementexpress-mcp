# Pitfalls Research

**Domain:** MCP server update — aligning tool schemas with a Rails API backend
**Researched:** 2026-03-25
**Confidence:** HIGH (based on direct codebase inspection + known Rails/MCP patterns)

---

## Critical Pitfalls

### Pitfall 1: Trusting the Issue Audit as the Source of Truth

**What goes wrong:**
The GitHub issue (#20) module-by-module audit was produced by an AI agent reading Rails code at a point in time. If any controller or serializer changed after that audit was written, the MCP will be aligned to a stale snapshot rather than the live backend. Tools end up with wrong params or missing fields that only surface at runtime.

**Why it happens:**
It is tempting to use the issue audit as the sole specification and never check Rails source again. The audit is thorough-looking, which creates false confidence.

**How to avoid:**
Before implementing each tool group, open the corresponding Rails controller (`po-app/app/controllers/`) and serializer (`po-app/app/serializers/`) directly and diff them against the issue audit. The Rails code is always authoritative. The skills references at `procurementexpress-skills/pex-api-skills/references/` provide a second verification layer but are also generated and may lag.

**Warning signs:**
- An audit entry says "param X is required" but no Rails `require` or `permit` wraps it
- A serializer field in `types.ts` is not present in the actual serializer class
- A new column appears in the Rails model but is absent from both audit and current types

**Phase to address:** Phase 1 (Fix Existing Tools) — each tool group must be verified against live Rails source before changes are written.

---

### Pitfall 2: Breaking Existing Tool Signatures (Backwards Compatibility)

**What goes wrong:**
A tool parameter is renamed, retyped, or removed during the schema correction pass. MCP clients (Claude Desktop, Claude Code) that saved workflows or prompts referencing the old parameter name now receive Zod validation errors and stop working silently.

**Why it happens:**
The impulse to "clean up" a schema while updating it is natural. Renaming `line_items` to `purchase_order_items_attributes` (to match Rails naming) looks like an improvement but is a silent breaking change for any client that passes `line_items`.

**How to avoid:**
- Never remove or rename existing top-level input schema parameters.
- When Rails expects a different key, perform the translation inside the tool handler (as the current codebase already does: `line_items` in schema → `purchase_order_items_attributes` in body).
- Existing tool names (string IDs like `"list_purchase_orders"`) are permanently frozen.
- New params can always be added as optional — that is always safe.
- If a param must change type (e.g., `id` from `number` to `string`), widen the schema to accept both and coerce internally.

**Warning signs:**
- A diff shows a parameter removed from `inputSchema` in an existing tool
- A parameter is renamed to match Rails naming conventions
- An optional param becomes required

**Phase to address:** Phase 1 — every schema change needs a backwards-compat review before commit.

---

### Pitfall 3: List Type vs Detail Type Conflation

**What goes wrong:**
The current `list_purchase_orders` tool is typed as `PurchaseOrder[]` (detail type), but Rails returns `PurchaseOrderSummary[]` from the index serializer. The types differ significantly — the list response omits `purchase_order_items`, `purchase_order_comments`, `custom_field_values`, `uploads`, `payments`, and many `can_*` flags. TypeScript will not error because the type annotation is only a cast, but MCP clients relying on list-only fields like `keywords` will get undefined when they hit the detail endpoint.

**Why it happens:**
Developers write the list tool first and reuse the detail type because it is already defined. The mock server in `setup.ts` compounds this: the list mock returns a minimal object that satisfies neither type accurately, so tests pass even when the type annotation is wrong.

**How to avoid:**
- Keep separate TypeScript interfaces for list vs detail responses for PO, Invoice, Company, ApprovalFlow, and Webhook — already partially done in `types.ts` (`PurchaseOrderSummary` vs `PurchaseOrder`, `InvoiceSummary` vs `Invoice`).
- Fix the `list_purchase_orders` return type annotation from `PurchaseOrder[]` to `PurchaseOrderSummary[]`.
- Update mock server responses to accurately reflect the fields each serializer actually returns.

**Warning signs:**
- A list tool is typed with the same interface as its get tool
- Mock data for a list endpoint includes nested arrays like `purchase_order_items`
- TypeScript generic is `<{ resource: DetailType[] }>` on a list endpoint

**Phase to address:** Phase 1 — types fix must precede new tool additions to avoid propagating the pattern.

---

### Pitfall 4: Nested Attributes `_destroy` Without `id` Silently Ignored

**What goes wrong:**
Rails' `accepts_nested_attributes_for` requires `id` to be present alongside `_destroy: true` to delete a nested record. If an MCP client sends `{ _destroy: true }` without an `id`, Rails silently ignores the destruction — no error, no delete. The line item remains. The client receives a 200 response and believes it succeeded.

**Why it happens:**
The Zod schema marks `id` as optional and `_destroy` as optional independently. Nothing enforces that `_destroy: true` requires `id`. Documentation often omits this Rails-specific constraint.

**How to avoid:**
- Add a Zod `refine` or `.superRefine` on each nested array schema to validate: if `_destroy === true`, then `id` must be present.
- Document this constraint explicitly in the `_destroy` field description: "Set true to remove this line item on update — requires `id` to be set."
- Add a mock server route and test that verifies the `id` + `_destroy` combination actually removes the item.

**Warning signs:**
- Tests that exercise `_destroy` do not assert the item count decreased
- Mock handler ignores `_destroy` in the response body
- No Zod `refine` exists on any `_destroy` field

**Phase to address:** Phase 1 — fix the schema refinement; Phase 5 — add a dedicated test case.

---

### Pitfall 5: Mock Server Tests Verify HTTP Routing, Not Schema Correctness

**What goes wrong:**
Current E2E tests (e.g., `purchase-orders.test.ts`) test that the `ApiClient` sends requests to the right URL and gets back a mock response. They do not test that the Zod input schema correctly validates what the Rails controller actually accepts. A schema can pass all tests while still accepting params Rails rejects or blocking params Rails requires.

**Why it happens:**
The `MockApiServer` in `setup.ts` returns hardcoded JSON regardless of the request body shape. The tests pass `any` types, so TypeScript does not catch mismatches. The mock never validates the incoming body against Rails strong params.

**How to avoid:**
- Mock handlers should parse the request body and assert required keys are present, returning 422 when they are not — mirroring Rails strong params behavior.
- Add at least one negative test per modified tool: call the tool with a deliberately wrong payload and assert the error is surfaced correctly.
- For new complex tools (custom fields, compliance, approval flows), write the mock before the tool implementation so the test drives the schema.

**Warning signs:**
- All test handler functions ignore the `body` argument: `handler: () => ({ status: 200, body: ... })`
- Test files use `as any` on API call return values instead of the typed interface
- No test ever expects a non-200 status code from the mock

**Phase to address:** Phase 5 (Testing) — but the test patterns should be established in Phase 1 so new tools in Phases 2-4 follow the correct pattern.

---

### Pitfall 6: The `commit` Param Position Error

**What goes wrong:**
The `commit` param for POs must be top-level in the request body (`{ commit: "Send", purchase_order: {...} }`), not nested inside `purchase_order`. If it ends up nested, Rails either ignores it (PO saves as Draft when Send was intended) or raises a parameter error. This is already handled correctly in the current codebase but is a regression risk during refactoring.

**Why it happens:**
When refactoring the create/update body-building logic (e.g., extracting helpers, simplifying destructuring), it is easy to accidentally include `commit` in the spread into `purchase_order`.

**How to avoid:**
- Keep the destructuring pattern that explicitly extracts `commit`: `const { commit, line_items, ...poData } = args`.
- Add a test that verifies `commit` appears at the body top level and NOT inside `purchase_order` by inspecting `mock.getRequests()[0].body`.

**Warning signs:**
- A refactoring diff shows `commit` being spread into the nested `purchase_order` object
- No test asserts the position of `commit` in the serialized request body

**Phase to address:** Phase 1 — test should be added alongside any create/update PO changes.

---

### Pitfall 7: Conditional Response Fields Absent from TypeScript Types

**What goes wrong:**
Several serializer fields are conditional on company settings or user role (e.g., `CompanySetting.is_quickbooks_connected` controls whether QBO fields appear on line items; `policy_ff_enabled` gates `latest_compliance_check` on POs). If these are typed as required non-nullable, TypeScript callers will assume they are always present. At runtime, clients on companies without QBO connected get `undefined` where they expected an object and crash.

**Why it happens:**
When transcribing serializer output to TypeScript interfaces, developers observe the fields in their own test environment (which has the feature enabled) and type them as required. The conditional nature is only visible in the serializer source code with an `if` guard.

**How to avoid:**
- Any field guarded by a feature flag or company setting must be typed `| null` or `| undefined` in the TypeScript interface.
- Review `CompanyDetail.approval_flow_ff_enabled`, `policy_ff_enabled`, `scan_and_match_ff_enabled`, `payment_term_ff_enabled` and ensure any fields they gate are nullable in the types.
- The existing types already do this correctly for `ComplianceCheck` (`latest_compliance_check: ComplianceCheck | null`) but the pattern must be enforced for all new types added in Phases 2-4.

**Warning signs:**
- A TypeScript interface field is required (`fieldName: SomeType`) when the Rails serializer wraps it in `if company.feature_enabled?`
- A test environment has all features enabled, masking missing-field bugs for companies on limited plans

**Phase to address:** Phase 1 (types audit) and Phases 2-4 (new types must follow the pattern from day one).

---

### Pitfall 8: Error Response Format Mismatch

**What goes wrong:**
The Rails API returns errors in two different formats depending on version and endpoint: `{ message: "..." }` (V1 style) and `{ error: "...", errors: [...] }` (V3/validation style). The current `ApiClient.request()` only reads `errorBody.message`, so V3 validation errors (which have `errors` as an array, not `message`) are surfaced as the HTTP status text rather than the actual validation message. MCP clients see "422: Unprocessable Entity" instead of "name can't be blank."

**Why it happens:**
The ApiClient was implemented for V1 first. V3 error format was not accounted for.

**How to avoid:**
Update `ApiClient.request()` to handle both formats: try `errorBody.message`, then `errorBody.error`, then `errorBody.errors?.join(', ')`, then fall back to status text.

**Warning signs:**
- Tests never send invalid data and assert on the error message text
- Error messages from V3 endpoints always display as the HTTP status text

**Phase to address:** Phase 1 — fix before adding new tools so all tools benefit from correct error surfacing.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Typing list responses as detail type (`PurchaseOrder[]` instead of `PurchaseOrderSummary[]`) | Fewer interface files | Clients reference fields that may not exist; runtime undefined errors | Never |
| Copying mock responses from test to test without validating against Rails serializer | Tests run fast | Mocks diverge from reality; bugs reach production | Never for modified tools |
| Using `as any` in test assertions | Quiets TypeScript in tests | Hides type mismatches that would catch real bugs | Never for new tools |
| Skipping `_destroy` + `id` validation refinement | Simpler schema definition | Silent no-op deletes confuse MCP clients | Never |
| Implementing new tool before writing mock | Faster first implementation | Test is written to match the implementation, not the API contract | Never for new complex tools |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Rails nested attributes | Send `{ _destroy: true }` without `id` | Always include `id` when destroying a nested record |
| Rails nested attributes | Send new nested records with an `id` field set to a placeholder | Omit `id` entirely for new nested records; Rails uses id presence to determine create vs update |
| PO `commit` param | Nest inside `purchase_order` object | Keep at top-level of request body |
| V3 OAuth token | Treat as never-expiring like V1 tokens | V3 tokens expire in ~2 hours; clients must handle 401 and re-authenticate |
| Rails strong params | Add MCP-only convenience params directly to the body | Translate MCP convenience params to Rails-expected keys in the handler, not the schema |
| Custom field values | Use `custom_field_values` key | Always use `custom_field_values_attributes` for write operations |

---

## "Looks Done But Isn't" Checklist

- [ ] **List tool type annotation:** Uses the summary type (e.g., `PurchaseOrderSummary[]`), not the detail type — verify the TypeScript generic on the `apiClient.get<>()` call.
- [ ] **`_destroy` schema:** Every nested array with `_destroy` has a Zod `superRefine` that requires `id` when `_destroy` is true — verify by searching for `.superRefine` near `_destroy` schemas.
- [ ] **Mock server body validation:** At least one test per tool verifies the request body shape by calling `mock.getRequests()[0].body` and parsing it — not just checking the response.
- [ ] **Error format handling:** `ApiClient.request()` reads `error`, `errors`, and `message` fields from error responses — verify all three are handled.
- [ ] **Conditional fields nullable:** Any TypeScript interface field guarded by a feature flag is typed as `| null` — verify by grepping the corresponding Rails serializer for `if` guards.
- [ ] **Tool name freeze:** No existing tool name (string ID) was changed — verify by diffing tool registration calls against the last published npm version.
- [ ] **`commit` position test:** At least one test for PO create/update asserts `commit` appears at body top-level — verify by searching test files for `getRequests` on PO tests.
- [ ] **New tool E2E coverage:** Every tool added in Phases 2-4 has a corresponding E2E test file — verify by counting `registerRoute` calls vs test `it()` blocks.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Breaking change to existing tool param | HIGH | Publish a patch that re-adds the old param as a deprecated alias; announce deprecation; remove in next major version |
| Wrong response type causes runtime undefined | MEDIUM | Add null-checks in tool handler; update type to be nullable; no API change needed |
| `_destroy` without `id` silently ignored | LOW | Add the Zod `superRefine` refinement; no Rails change needed; clients must add `id` to their calls |
| Mock tests passing but Rails rejects body | MEDIUM | Add body validation to mock handlers; run against staging environment to confirm |
| Audit gap (field exists in Rails but not in MCP) | LOW | Add the field as optional to the Zod schema; add to TypeScript type; no breaking change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Issue audit as source of truth | Phase 1 — verify each tool group against live Rails source before implementation | Diff audit entries vs controller `permit` list and serializer attributes |
| Breaking tool signatures | Phase 1 — backwards-compat review on every schema change | `git diff` against last published npm tag for any removed/renamed params |
| List vs detail type conflation | Phase 1 — audit all list tool type annotations | Grep for list tools using non-summary types |
| `_destroy` without `id` | Phase 1 — add Zod refinements; Phase 5 — dedicated test | Test asserts item count changes on _destroy |
| Mock tests don't validate schemas | Phase 5 — rewrite mock handlers to validate body; add negative tests | Every tool has at least one test with invalid input |
| `commit` param position | Phase 1 — add body position test | Test parses `getRequests()[0].body` and asserts `commit` is top-level |
| Conditional fields not nullable | Phase 1 (types audit) + Phases 2-4 (new types) | Grep Rails serializers for `if` guards and cross-check TypeScript types |
| Error format mismatch | Phase 1 — fix ApiClient error handling | Test that sends invalid data and asserts on specific error message text |

---

## Sources

- Direct inspection: `src/tools/purchase-orders.ts`, `src/tools/invoices.ts`, `src/tools/approval-flows.ts`
- Direct inspection: `src/types.ts`, `src/api-client.ts`
- Direct inspection: `tests/e2e/setup.ts`, `tests/e2e/purchase-orders.test.ts`, `tests/e2e/invoices.test.ts`
- Direct inspection: `.planning/PROJECT.md` (confirmed Rails source of truth policy, backwards compat requirement, issue audit risk acknowledgment)
- Rails convention: `accepts_nested_attributes_for` `_destroy` behavior (well-documented Rails pattern, HIGH confidence)
- MCP SDK: tool name immutability once published to npm (HIGH confidence — tool IDs are the public API surface)

---
*Pitfalls research for: MCP server update — Rails API alignment (procurementexpress-mcp)*
*Researched: 2026-03-25*
