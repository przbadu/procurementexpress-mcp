---
phase: 01-schema-type-foundation
plan: 07
subsystem: schema-validation
tags: [zod, superRefine, _destroy, validation, nested-attributes]
dependency_graph:
  requires: [01-03-PLAN, 01-05-PLAN]
  provides: [_destroy+id cross-field validation on all 5 nested schemas]
  affects: [src/schemas.ts, src/tools/approval-flows.ts, src/tools/webhooks.ts]
tech_stack:
  added: []
  patterns: [superRefine cross-field validation, destroyRequiresId exported helper]
key_files:
  created:
    - tests/e2e/schemas.test.ts
  modified:
    - src/schemas.ts
    - src/tools/approval-flows.ts
    - src/tools/webhooks.ts
decisions:
  - destroyRequiresId exported from schemas.ts as a shared helper — approval-flows.ts and webhooks.ts import it
  - superRefine applied at schema definition level, not per-tool — validation fires on every parse
  - TDD approach: tests written and confirmed failing before implementation
metrics:
  duration: 2 minutes
  completed: 2026-03-26
  tasks_completed: 1
  files_modified: 4
---

# Phase 01 Plan 07: _destroy+id Cross-Field Validation Summary

## One-Liner

`destroyRequiresId` superRefine helper added to all 5 nested schemas with `_destroy` pattern, preventing silent Rails discard of destroy requests without id.

## What Was Built

Closed the final Phase 01 gap (Success Criterion 4): Zod now rejects `{ _destroy: true }` without an accompanying `id` before the request reaches Rails.

**Files modified:**

- `/Users/przbadu/projects/pex/procurementexpress-mcp/.claude/worktrees/agent-a5d30a24/src/schemas.ts` — Added `destroyRequiresId` helper function (exported), updated comment on `nestedDestroyMixin`, added `.superRefine(destroyRequiresId)` to `lineItemSchema` and `invoiceLineItemSchema`
- `/Users/przbadu/projects/pex/procurementexpress-mcp/.claude/worktrees/agent-a5d30a24/src/tools/approval-flows.ts` — Imported `destroyRequiresId`, added `.superRefine()` to `approvalConditionSchema` and `approvalStepSchema`
- `/Users/przbadu/projects/pex/procurementexpress-mcp/.claude/worktrees/agent-a5d30a24/src/tools/webhooks.ts` — Imported `destroyRequiresId`, added `.superRefine()` to `webhook_attributes` inline schema in `update_webhook`
- `/Users/przbadu/projects/pex/procurementexpress-mcp/.claude/worktrees/agent-a5d30a24/tests/e2e/schemas.test.ts` — Created 6 tests proving rejection and acceptance cases

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add _destroy+id cross-field validation to all schemas | 26fac50 | src/schemas.ts, src/tools/approval-flows.ts, src/tools/webhooks.ts, tests/e2e/schemas.test.ts |

## Verification Results

- `npm run build` — zero TypeScript errors
- `npm test` — 56 tests pass (50 existing + 6 new schema validation tests)
- `grep -c "superRefine" src/schemas.ts` → 4 (function body + 2 schema applications + export comment context)
- `grep -c "destroyRequiresId" src/schemas.ts` → 4 (function def + export + 2 usages)
- `grep -c "superRefine" src/tools/approval-flows.ts` → 2 (condition + step)
- `grep -c "superRefine" src/tools/webhooks.ts` → 1 (webhook_attributes)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Export `destroyRequiresId` from schemas.ts | Enables reuse across tool files without duplicating logic |
| Apply superRefine at schema definition time | Validation fires automatically on every `.parse()` / `.safeParse()` call |
| TDD approach (RED → GREEN) | Plan required tests written before implementation to prove the gap existed |

## Deviations from Plan

None — plan executed exactly as written. The merge of `mcp-update` into the worktree branch was required to get prior plan changes (schemas.ts) before implementing this plan; this is expected parallel-agent setup, not a deviation.

## Known Stubs

None — all schemas fully wired with validation.

## Self-Check: PASSED

- [x] `src/schemas.ts` exists with `destroyRequiresId`, `superRefine` on both schemas
- [x] `src/tools/approval-flows.ts` has 2 superRefine calls
- [x] `src/tools/webhooks.ts` has 1 superRefine call
- [x] `tests/e2e/schemas.test.ts` exists with 6 tests
- [x] Commit `26fac50` exists
