---
phase: 04-low-priority-new-tools
plan: "04"
subsystem: api
tags: [mcp, tools, registration, v3-gating, chat-messages, policies, digital-invoices]

# Dependency graph
requires:
  - phase: 04-low-priority-new-tools plan 04-01
    provides: src/tools/policies.ts with 6 policy tools
  - phase: 04-low-priority-new-tools plan 04-02
    provides: src/tools/suppliers.ts extended with SAM.gov and supplier approval tools
  - phase: 04-low-priority-new-tools plan 04-03
    provides: src/tools/chat-messages.ts (3 tools), src/tools/digital-invoices.ts (1 tool)
provides:
  - src/index.ts with all Phase 4 tools wired: policies, digital-invoices (ungated), chat-messages (V3-gated)
  - registerChatMessageTools correctly inside else (V3) block — V1 users never see chat tools
affects: [phase-05-testing, npm-publish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "V3-only tools registered inside else block of if (isV1) branching — keeps V1 and V3 tool sets distinct"

key-files:
  created: []
  modified:
    - src/index.ts

key-decisions:
  - "registerChatMessageTools moved from ungated section into else (V3) block — it was incorrectly registered for both V1 and V3 despite being V3-only"
  - "registerPolicyTools and registerDigitalInvoiceTools remain in the ungated section — they work with both V1 and V3"

patterns-established:
  - "V3-only tools pattern: register inside else block alongside V3 authenticate tool"

requirements-completed:
  - POL-01
  - POL-02
  - POL-03
  - POL-04
  - POL-05
  - POL-06
  - LOW-01
  - LOW-02
  - LOW-03
  - LOW-04
  - LOW-05
  - LOW-06

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 4 Plan 04: Integration Wiring Summary

**All Phase 4 tool files wired into src/index.ts with registerChatMessageTools correctly V3-gated inside the else block, build and all 165 tests passing.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-26T13:31:00Z
- **Completed:** 2026-03-26T13:39:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Moved `registerChatMessageTools` from the ungated tool-registration section into the V3-only `else` block — it was previously registering chat tools even when using V1 auth
- Confirmed `registerPolicyTools` (6 tools) and `registerDigitalInvoiceTools` (1 tool) are correctly registered in the ungated section
- Full build passes with zero TypeScript errors
- All 165 tests pass across 32 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire new Phase 4 tools into index.ts with V3-gated chat messages** - `84646ed` (feat)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified

- `src/index.ts` - Moved `registerChatMessageTools` inside V3 else block; confirmed policy and digital-invoice registrations

## Decisions Made

- `registerChatMessageTools` was incorrectly in the ungated section (registering for V1 and V3 both). Moved it into the V3-only else block to match the "V3 only" contract stated in each tool's description. This is a correctness fix, not a feature change.
- All other Phase 4 tools (policies, digital-invoices, SAM.gov/supplier-approvals via suppliers.ts) are version-agnostic and stay in the ungated section.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] registerChatMessageTools was in ungated section, not V3-gated**

- **Found during:** Task 1 (verification of current index.ts state)
- **Issue:** `registerChatMessageTools` was at line 157 in the ungated tool registration block. This meant V1 users would see and be able to call `list_chat_messages`, `create_chat_message`, and `delete_chat_message` — tools that explicitly state "V3 only" in their descriptions. Calling them under V1 would fail at the API level.
- **Fix:** Removed call from ungated section; added `registerChatMessageTools(server, apiClient)` inside the `else` block after the V3 authenticate tool registration. The import at line 11 was already correct.
- **Files modified:** src/index.ts
- **Verification:** `grep "registerChatMessageTools" src/index.ts` shows the call with leading whitespace (inside the else block). Build succeeds. 165 tests pass.
- **Committed in:** `84646ed` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: incorrect tool registration scope)
**Impact on plan:** Fix required for correctness — V3-only tools must not be exposed to V1 users. No scope creep.

## Issues Encountered

None beyond the V3-gating fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 4 tools are live: 6 policy tools, 3 chat tools (V3-only), 1 digital invoice tool, SAM.gov + supplier approval tools (already in suppliers.ts)
- Phase 4 complete — 4/4 plans done
- Ready for Phase 5: Testing & Verification

---
*Phase: 04-low-priority-new-tools*
*Completed: 2026-03-26*
