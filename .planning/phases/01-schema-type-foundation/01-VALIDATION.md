---
phase: 1
slug: schema-type-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm test` |
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
| 01-01-01 | 01 | 1 | INFRA-01 | unit | `npm run build` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | INFRA-02 | unit | `npm run build` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | TYPE-01..07 | build | `npm run build` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | SCHEMA-01 | build+test | `npm run build && npm test` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 2 | SCHEMA-02 | build+test | `npm run build && npm test` | ✅ | ⬜ pending |
| 01-03-03 | 03 | 2 | SCHEMA-03..12 | build+test | `npm run build && npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. MockApiServer and vitest are already configured.
- `src/schemas.ts` — new file needed for INFRA-02 (shared schema extraction)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Error messages are human-readable | INFRA-01 | Error format varies by Rails version | Inspect error handler output for both `{error}` and `{errors}` formats |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
