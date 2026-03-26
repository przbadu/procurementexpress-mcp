---
phase: 2
slug: high-priority-new-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run build && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm test`
- **After every plan wave:** Run `npm run build && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CF-01..06 | build+test | `npm run build && npm test` | ❌ W0 | pending |
| 02-02-01 | 02 | 1 | COMP-01..10 | build+test | `npm run build && npm test` | ❌ W0 | pending |
| 02-03-01 | 03 | 2 | PO-01..04 | build+test | `npm run build && npm test` | ✅ | pending |
| 02-04-01 | 04 | 2 | INV-01..03 | build+test | `npm run build && npm test` | ✅ | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/custom-fields.test.ts` — stub test file for CF tools
- [ ] `tests/e2e/compliance.test.ts` — stub test file for compliance tools

*Existing test files for POs and invoices can be extended.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compliance check returns 202 async | COMP-01 | Requires live Rails with background jobs | Trigger check, verify 202 status and job_id in response |
| Evidence pack download URL is valid | COMP-10 | Requires live Rails with S3 storage | Download evidence pack, verify file content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
