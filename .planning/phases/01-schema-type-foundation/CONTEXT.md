# Phase 1: Schema & Type Foundation — Context

## Goal
Every existing tool accurately represents its Rails API contract with no invented params, no missing params, and no mismatched response types.

## Requirements
SCHEMA-01..12, TYPE-01..07, INFRA-01..04 (23 requirements)

## Grey Area Decisions

### Schema Alignment Approach
- **Order**: PO → Invoice → Company → rest (highest complexity first)
- **Verification**: Read Rails controller `_params` + serializer `attributes` directly — Rails is authoritative
- **Unlisted params**: Add any params Rails accepts that the issue missed
- **Widening**: New optional params are non-breaking — add as `.optional()`

### Type System Split
- **Naming**: `FooSummary` (list) / `Foo` (detail) — matches existing `PurchaseOrderSummary` pattern
- **Location**: All in `src/types.ts` — single source of truth
- **Conditional fields**: Mark as optional (`field?: Type`)

### Shared Schema Extraction
- **What**: `customFieldValuesSchema`, `lineItemBaseSchema`, `nestedDestroySchema`
- **When**: Phase 1 before tool alignment (prevents fixing same schema in multiple files)
- **How**: Individual named exports from `src/schemas.ts`

## Key Findings from Research
- Error handler only reads `errorBody.message` — misses V3 `error`/`errors` format
- `PurchaseOrderSummary` already exists in types.ts but isn't wired to list tools
- Tests validate routing only, not request body shape (fix in Phase 5)
- `inputSchema` must be flat `ZodRawShape`, not `z.object()`
- Stay on Zod v3 (v4 has MCP SDK bugs)

## Rails Source
Cross-reference at `/Users/przbadu/projects/pex/po-app/`:
- Controllers: `app/controllers/api/v1/*.rb` and `app/controllers/api/v3/*.rb`
- Serializers: `app/serializers/*.rb`
