# Stack Research

**Domain:** TypeScript MCP server — Rails API schema synchronization
**Researched:** 2026-03-25
**Confidence:** HIGH (all versions verified against installed node_modules and official sources)

## Context

This is a brownfield update to an existing 88-tool MCP server. The stack is locked by project constraints:
> "Tech stack: TypeScript, MCP SDK, Zod schemas, vitest — no changes to stack"

Research focus: verify current versions are correct, identify any library-level constraints affecting schema sync work, and prescribe supporting tools that help close the Rails-to-MCP gap WITHOUT changing the stack.

---

## Recommended Stack

### Core Technologies (Existing — Do Not Change)

| Technology | Installed Version | Latest Version | Purpose | Status |
|------------|-------------------|----------------|---------|--------|
| `@modelcontextprotocol/sdk` | 1.27.1 | 1.27.1 | MCP server runtime, tool registration | Current — no update needed |
| `zod` | 3.25.76 | 3.25.76 (v3 line) | Input schema validation + type inference | Current — HOLD at v3, see note below |
| `typescript` | 5.9.3 | 5.9.3 | Type system, compilation | Current — no update needed |
| `vitest` | 4.0.18 | 4.x | E2E testing via MockApiServer | Current — no update needed |
| Node.js | >=18 (CI matrix) | LTS | Runtime | No change needed |

**CRITICAL: Zod v3 vs v4 decision**

Zod v4 was released in 2025 with subpath imports (`import { z } from "zod/v4"`). The MCP SDK peer dependency is `zod: "^3.25 || ^4.0"`, and the SDK internally imports from `zod/v4`. However:

- Multiple confirmed bugs exist in the MCP SDK with Zod v4 schemas: schema descriptions silently dropped, `z.discriminatedUnion()` schemas silently discarded (issue #1143, #1643 on the SDK repo).
- The SDK's `registerTool()` normalises only `z.object()` — passing Zod v4 schemas through `registerTool()` triggers the bugs above.
- The current codebase imports `from "zod"` (v3 surface), which the SDK handles correctly.

**Decision: Stay on Zod v3.25.x.** Do not upgrade to Zod v4 imports until the MCP SDK resolves `registerTool()` Zod v4 schema normalisation. The current `zod: "^3.25.76"` pin is correct.

### Supporting Libraries (No New Runtime Dependencies Required)

The core principle for this milestone: **all work is manual schema alignment using existing tools**. No new runtime dependencies are needed or desirable — adding them risks breaking the published npm package and complicates the dependency graph.

| Library | Purpose | Decision | Rationale |
|---------|---------|----------|-----------|
| `zod-to-json-schema` | Convert Zod schemas to JSON Schema | SKIP — already a transitive dep via MCP SDK | Do not add as direct dep; use via SDK |
| `typelizer` (Ruby gem) | Generate TypeScript types from Rails serializers | SKIP for this project | Requires Rails-side changes; out of scope per PROJECT.md constraint "no Rails backend modifications" |
| `types_from_serializers` (Ruby gem) | Auto-generate TS interfaces from oj_serializers | SKIP | Same reason — requires Rails backend gem addition |
| `schema2type` | Generate TS types from Rails schema.rb | SKIP | DB-level only; doesn't capture serializer output shape or strong params |

### Development Workflow (Existing — No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsc` (TypeScript compiler) | Compile `src/` → `dist/`, strict mode | `tsconfig.json` already correctly configured: `"strict": true`, `"module": "Node16"`, ES2022 target |
| `vitest run` | E2E tests via `MockApiServer` | Version 4.0.18 — stable. Node http.createServer mock; no browser mode needed for this project |
| `tsc --watch` (`npm run dev`) | Incremental compilation during development | Use this while editing tool files |
| `npm run build` | Full compilation check | Run before committing; CI gate |

---

## The Real "Stack" for This Milestone: Workflow Approach

Since no new libraries are appropriate, the stack decision for this milestone is about **workflow** — how to manually align MCP Zod schemas with Rails source.

### Source of Truth Hierarchy

```
Rails controller strong params  →  Zod inputSchema (what goes IN)
Rails serializer attributes     →  TypeScript interface in types.ts (what comes OUT)
```

### Verification Sources Available in This Repo

1. **Rails source:** `/Users/przbadu/projects/pex/po-app/` — authoritative. Controllers define `_params` methods with `.permit()`. Serializers define `attributes :field1, :field2` and associations.

2. **Skills references:** `/Users/przbadu/projects/pex/procurementexpress-skills/pex-api-skills/references/` — curl-based, up-to-date API documentation. Secondary — may have gaps, but useful for quick orientation.

3. **GitHub Issue #20** — module-by-module audit. Tertiary — may have inaccuracies; always cross-check against Rails source.

**Rule:** When skills references and Rails source disagree, Rails source wins. When issue #20 and Rails source disagree, Rails source wins.

---

## Key Patterns for Schema Alignment Work

### Pattern 1: Rails Strong Params → Zod inputSchema

Rails controller:
```ruby
def purchase_order_params
  params.require(:purchase_order).permit(
    :supplier_id, :department_id, :currency_id, :notes, :commit,
    purchase_order_items_attributes: [
      :id, :description, :quantity, :unit_price, :budget_id,
      :vat, :tax_rate_id, :_destroy, ...
    ]
  )
end
```

MCP Zod schema — correct mapping:
```typescript
server.registerTool("create_purchase_order", {
  inputSchema: {
    supplier_id: z.number().int().optional(),
    // NEVER wrap in z.object() at top level — registerTool() provides the object wrapper
    purchase_order_items_attributes: z.array(lineItemSchema).optional(),
  }
})
```

The `inputSchema` in `registerTool()` is a **flat object of Zod schemas** (a ZodRawShape), NOT a `z.object({...})`. Passing a `z.object()` as `inputSchema` causes the SDK's internal `normalizeObjectSchema` to strip unknown shapes.

### Pattern 2: Rails Serializer → TypeScript Interface

```ruby
class PurchaseOrderSerializer < ActiveModel::Serializer
  attributes :id, :status, :amount, :notes
  has_many :purchase_order_items
  belongs_to :supplier
end
```

Maps to:
```typescript
export interface PurchaseOrder {
  id: number;
  status: string;
  amount: number;
  notes: string | null;
  purchase_order_items: PurchaseOrderItem[];
  supplier: Supplier | null;
}
```

### Pattern 3: List vs Detail Type Distinction

Rails uses different serializers for index (list) and show (detail). Confirmed pattern already in `types.ts`:
- `PurchaseOrderSummary` (list) vs `PurchaseOrder` (detail)
- `InvoiceSummary` (list) vs `Invoice` (detail)

Must be applied consistently to missing types: `CompanyDetail` exists; `ApprovalFlow` needs list vs detail split; `Webhook` needs list vs detail split.

### Pattern 4: Nested Attributes Convention

Rails nested attributes: create without `id`, update with `id`, delete with `id` + `_destroy: true`. Already correct in existing line item schemas. Apply consistently everywhere nested attributes appear.

### Pattern 5: The `commit` Param

On POs, `commit: "Send"` is a top-level string param that triggers approval submission. It is NOT a nested attribute. Already correctly implemented — document for awareness when adding new PO-related tools.

---

## Alternatives Considered

| Recommended Approach | Alternative | Why Not |
|----------------------|-------------|---------|
| Manual Rails source cross-reference | Typelizer / types_from_serializers gem | Requires backend changes — out of scope; adds Rails-side maintenance burden |
| Stay on Zod v3.25.x | Upgrade to Zod v4 imports | MCP SDK `registerTool()` has confirmed bugs with Zod v4 schemas (descriptions dropped, discriminated unions silently discarded) |
| Flat ZodRawShape in `inputSchema` | `z.object({...})` as inputSchema | SDK `normalizeObjectSchema` only handles `z.object()` but registerTool() expects ZodRawShape; wrapping in z.object() is incorrect usage |
| vitest MockApiServer E2E tests | Jest | Vitest 4.x is already installed, stable, ESM-native; no reason to change |
| TypeScript strict mode (existing) | Looser TypeScript config | strict mode is what catches type mismatches early — critical for this milestone's goal |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Zod v4 imports (`from "zod/v4"`) | MCP SDK `registerTool()` has confirmed schema normalisation bugs with v4 schemas (GitHub issues #1143, #1643) | Stay on `from "zod"` (v3 surface) until SDK fixes land |
| `z.object()` as the `inputSchema` value | SDK expects a ZodRawShape (flat object of Zod schemas), not a ZodObject; passing ZodObject triggers normaliseObjectSchema which silently drops non-object shapes | Pass flat `{ field: z.string(), ... }` directly |
| `z.discriminatedUnion()` in tool `inputSchema` | SDK `normalizeObjectSchema` silently discards discriminated unions and emits empty `{}` (issue #1643 — confirmed unfixed as of SDK 1.27.1) | Model as separate tools or use `z.union()` with explicit handling |
| Rails gem-based type generators (Typelizer, types_from_serializers) | Requires modifying Rails backend — explicitly out of scope | Manual cross-reference of Rails source |
| `@types/node` above `^25.x` | Already at `^25.2.3` which matches Node 18–22 CI matrix | No upgrade needed |

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@modelcontextprotocol/sdk@1.27.1` | `zod@^3.25 \|\| ^4.0` | Verified: peer dep allows both | Stick to v3 surface due to v4 bugs in registerTool() |
| `zod@3.25.76` | `@modelcontextprotocol/sdk@^1.27` | Confirmed working in production | MCP SDK uses zod-to-json-schema@^3.25.1 internally |
| `vitest@4.0.18` | TypeScript 5.9.3 | No known issues | ESM-native, no vite config needed for Node-only tests |
| `typescript@5.9.3` | `"module": "Node16"` | Matches ES module imports with `.js` extension | Do not change module/moduleResolution settings |

---

## No New Installation Required

All required tools are already installed. The milestone is 100% manual schema alignment work:

```bash
# Verify build still compiles cleanly after changes
npm run build

# Run E2E tests (add new MockApiServer routes for each new/modified tool)
npm test

# Watch mode during development
npm run dev
```

---

## Sources

- Official MCP TypeScript SDK releases: https://github.com/modelcontextprotocol/typescript-sdk/releases — confirmed v1.27.1 is latest (HIGH confidence)
- MCP SDK peer dependency on zod: verified from installed `node_modules/@modelcontextprotocol/sdk/package.json` — `"zod": "^3.25 || ^4.0"` (HIGH confidence)
- Zod v4 release notes and subpath versioning: https://zod.dev/v4/changelog — confirmed v4 released 2025, subpath `zod/v4` pattern (HIGH confidence)
- MCP SDK Zod v4 incompatibility issues: https://github.com/modelcontextprotocol/typescript-sdk/issues/925 and https://github.com/modelcontextprotocol/typescript-sdk/issues/1143 — confirmed bugs in registerTool() with Zod v4 schemas (HIGH confidence — GitHub issues)
- registerTool() discriminated union silent drop: https://github.com/modelcontextprotocol/typescript-sdk/issues/1643 (HIGH confidence — confirmed open issue)
- Vitest v4.0 release: https://vitest.dev/blog/vitest-4 — confirmed October 2025 (HIGH confidence)
- Typelizer Rails TypeScript generator: https://github.com/skryukov/typelizer — supports AMS, Alba, Oj, Panko; requires Rails gem installation (MEDIUM confidence)
- types_from_serializers: https://github.com/ElMassimo/types_from_serializers — targets oj_serializers; requires Rails gem installation (MEDIUM confidence)
- zod-to-json-schema: https://github.com/StefanTerdell/zod-to-json-schema — confirmed v3.25.1 is transitive dep via MCP SDK; v4 natively supports `z.toJSONSchema()` but not relevant for our v3 usage (HIGH confidence)
- Installed versions verified directly: `node_modules/` inspection via `node -e` commands (HIGH confidence)

---

*Stack research for: ProcurementExpress MCP server — Rails API schema sync milestone*
*Researched: 2026-03-25*
