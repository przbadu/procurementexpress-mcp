---
phase: 04-low-priority-new-tools
plan: "03"
subsystem: chat-messages
tags: [chat-messages, v3-only, payments, pending-invites, e2e-tests]
dependency_graph:
  requires: []
  provides: [registerChatMessageTools, ChatMessage, ChatMessagesResponse, InviteUser]
  affects: [src/index.ts, src/types.ts, tests/e2e/setup.ts]
tech_stack:
  added: []
  patterns: [URLSearchParams-query-params, non-nested-body-params, version-agnostic-mock-regex]
key_files:
  created:
    - src/tools/chat-messages.ts
    - tests/e2e/chat-messages.test.ts
    - tests/e2e/payments.test.ts
  modified:
    - src/types.ts
    - src/index.ts
    - tests/e2e/setup.ts
    - tests/e2e/companies.test.ts
decisions:
  - "Chat message body params NOT nested under root key (Rails reads params[:document_type] directly)"
  - "Delete chat message sends context params (document_type, document_id, supplier_id) as query string"
  - "list_chat_messages uses URLSearchParams for all query params including optional before_id cursor"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 6
requirements_satisfied: [LOW-02, LOW-03, LOW-04, LOW-07, LOW-08, LOW-09]
---

# Phase 04 Plan 03: Chat Messages Module and Missing E2E Tests Summary

V3-only chat message module (3 tools) with E2E tests plus test coverage for existing NPayment and pending invite tools.

## What Was Built

### New: `src/tools/chat-messages.ts`

Three V3-only tools:

1. **`list_chat_messages`** (LOW-02) — `GET /chat_messages` with document_type, document_id, supplier_id, optional before_id cursor. Returns `ChatMessagesResponse`.
2. **`create_chat_message`** (LOW-03) — `POST /chat_messages`. Body params sent flat (not nested) per Rails controller expectation.
3. **`delete_chat_message`** (LOW-04) — `DELETE /chat_messages/:id` with context params sent as query string.

### New Types in `src/types.ts`

- `ChatMessage` — matches `chat_service.rb#message_json` with creator.employer nesting
- `ChatMessagesResponse` — `{ messages: ChatMessage[], next_cursor: number | null }`
- `InviteUser` — matches `InviteUserSerializer` for pending invites

### New E2E Tests

- `tests/e2e/chat-messages.test.ts` — 4 tests: list (with params), list (with cursor), create (verifies non-nested body), delete (verifies query string params)
- `tests/e2e/payments.test.ts` — 3 tests: create_payment (LOW-07), create with invoice linkage, get_payment (LOW-08)
- `tests/e2e/companies.test.ts` — 1 test added: list_pending_invites (LOW-09)

### Mock Routes Added to `tests/e2e/setup.ts`

- `GET /chat_messages` with query string tolerance
- `POST /chat_messages` with param validation
- `DELETE /chat_messages/:id` with query string tolerance
- `POST /npayments`
- `GET /npayments/:id`
- `GET /companies/pending_invites`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all tools are fully wired.

## Verification

- `npx tsc --noEmit` — zero errors
- `npx vitest run tests/e2e/chat-messages.test.ts tests/e2e/payments.test.ts tests/e2e/companies.test.ts` — 12 tests passed
- `npm test` — 356 tests passed (no regressions)

## Self-Check: PASSED

Files verified:
- src/tools/chat-messages.ts — FOUND
- tests/e2e/chat-messages.test.ts — FOUND
- tests/e2e/payments.test.ts — FOUND

Commits verified:
- f0cfd64 — feat(04-03): add chat message tools
- e986a10 — test(04-03): add E2E tests
