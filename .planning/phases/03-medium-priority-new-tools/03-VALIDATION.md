---
phase: 03
slug: medium-priority-new-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/e2e/uploads.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | UPLOAD-01 | e2e | `npx vitest run tests/e2e/uploads.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | UPLOAD-02 | e2e | `npx vitest run tests/e2e/uploads.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | UPLOAD-03 | e2e | `npx vitest run tests/e2e/uploads.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PROD-01 | e2e | `npx vitest run tests/e2e/products.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PROD-02 | e2e | `npx vitest run tests/e2e/products.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | LOW-10 | e2e | `npx vitest run tests/e2e/approval-flows.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/uploads.test.ts` — stubs for UPLOAD-01, UPLOAD-02, UPLOAD-03
- [ ] `tests/e2e/setup.ts` — mock routes for upload endpoints

*Existing infrastructure covers products and approval flow requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual file upload to Rails | UPLOAD-01 | Requires live Rails server with Paperclip | Upload a file via MCP tool against staging, verify file appears in PO attachments |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
