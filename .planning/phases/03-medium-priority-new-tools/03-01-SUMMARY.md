---
phase: 03-medium-priority-new-tools
plan: "01"
subsystem: uploads
tags: [file-upload, multipart, api-client, tdd]
dependency_graph:
  requires: []
  provides: [upload-tools, postMultipart-method]
  affects: [api-client, types, index]
tech_stack:
  added: []
  patterns: [multipart/form-data POST, FormData API, TDD red-green]
key_files:
  created:
    - src/tools/uploads.ts
    - tests/e2e/uploads.test.ts
  modified:
    - src/api-client.ts
    - src/types.ts
    - src/index.ts
    - tests/e2e/setup.ts
decisions:
  - "Upload interface already existed in types.ts at line 365 with upload_token: string — updated to string | null to match serializer (upload_token is null while uploading, set after completion)"
  - "TDD approach: failing tests committed first, implementation second, then mock routes committed together with passing tests"
metrics:
  duration: ~10 minutes
  completed: 2026-03-26
  tasks_completed: 2
  files_modified: 6
---

# Phase 03 Plan 01: File Upload Tools Summary

**One-liner:** Multipart file upload tools for POs and comments using FormData with postMultipart() ApiClient extension.

## What Was Built

Added 3 MCP upload tools backed by a new `ApiClient.postMultipart()` method that sends multipart/form-data requests without setting Content-Type (allowing fetch to set the boundary automatically).

### Tools Added

1. **`upload_file_to_purchase_order`** — Reads a local file, builds FormData with `po_id`, `uploads_attributes[file]`, and `uploads_attributes[upload_token]` fields, POSTs to `/uploads/po`.
2. **`upload_file_to_comment`** — Same pattern with `poc_id` field, POSTs to `/uploads/poc`.
3. **`get_upload_status`** — GETs `/uploads/status?upload_token=TOKEN` and returns Upload metadata.

### Key Technical Decisions

- `postMultipart()` does NOT set Content-Type — fetch automatically sets `multipart/form-data; boundary=...` when passed a FormData body
- `upload_token` uses `z.string().min(7)` validation in upload tools
- `Upload.upload_token` is `string | null` (null while in-progress, set after completion)

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | TDD RED: failing tests | fd2797d | tests/e2e/uploads.test.ts |
| 2 | GREEN: Upload type, postMultipart(), uploads.ts | dfdde13 | src/types.ts, src/api-client.ts, src/tools/uploads.ts, src/index.ts |
| 3 | Mock routes + passing tests | aadd533 | tests/e2e/setup.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upload interface already existed in types.ts**
- **Found during:** Task 1 implementation
- **Issue:** `Upload` interface already existed at line 365 with `upload_token: string`. Adding a second one with `string | null` caused TS2717 compilation error.
- **Fix:** Updated existing interface's `upload_token` to `string | null`, removed the duplicate appended at end of file.
- **Files modified:** src/types.ts
- **Commit:** dfdde13

## Verification Results

- `npm run build` — exits 0, TypeScript compiles cleanly
- `npx vitest run tests/e2e/uploads.test.ts` — 4/4 tests pass
- `npm test` — 137/137 tests pass, zero regressions
- `grep -c "registerTool" src/tools/uploads.ts` — returns 3

## Known Stubs

None. All 3 tools wire directly to real API endpoints via postMultipart() and get().

## Self-Check: PASSED
