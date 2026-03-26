---
phase: 04
slug: low-priority-new-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | POL-01..POL-06 | e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | POL-01..POL-06 | e2e | `npx vitest run tests/e2e/policies.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | LOW-01, LOW-05, LOW-06 | e2e | `npx vitest run tests/e2e/suppliers.test.ts tests/e2e/digital-invoices.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | LOW-01, LOW-05, LOW-06 | e2e | `npx vitest run tests/e2e/suppliers.test.ts tests/e2e/digital-invoices.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | LOW-02..LOW-04 | e2e | `npx vitest run tests/e2e/chat-messages.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 1 | LOW-07..LOW-09 | e2e | `npx vitest run tests/e2e/payments.test.ts tests/e2e/companies.test.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | ALL | e2e | `npm run build && npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/policies.test.ts` — covers POL-01 through POL-06
- [ ] `tests/e2e/chat-messages.test.ts` — covers LOW-02 through LOW-04
- [ ] `tests/e2e/digital-invoices.test.ts` — covers LOW-06
- [ ] `tests/e2e/payments.test.ts` — covers LOW-07 and LOW-08

*Existing infrastructure covers suppliers and companies requirements (extend existing test files).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SAM.gov actual check | LOW-01 | Requires external SAM.gov API | Invoke check_sam_gov tool against staging with a known supplier |
| V3-only gating | LOW-02..04 | Requires running with V3 auth config | Start MCP server with V3 env vars, verify chat tools are registered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
