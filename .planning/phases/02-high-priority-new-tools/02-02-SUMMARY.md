---
phase: 02-high-priority-new-tools
plan: 02
subsystem: compliance
tags: [compliance, async-jobs, evidence-packs, mcp-tools, typescript]
dependency_graph:
  requires: [src/api-client.ts, src/tool-helpers.ts, src/types.ts]
  provides: [src/tools/compliance.ts, compliance types in src/types.ts]
  affects: [src/index.ts, tests/e2e/setup.ts]
tech_stack:
  added: []
  patterns: [async-202-job-pattern, evidence-pack-lifecycle, nested-resource-paths]
key_files:
  created:
    - src/tools/compliance.ts
    - tests/e2e/compliance.test.ts
  modified:
    - src/types.ts
    - src/index.ts
    - tests/e2e/setup.ts
decisions:
  - "Download route registered before get-by-id route in setup.ts to prevent regex prefix conflict with /evidence_packs/:id vs /evidence_packs/:id/download"
  - "202 async responses passed through directly — no internal polling per user constraint"
  - "justify_compliance_violation returns unknown type since response shape is inline (not a shared serializer)"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_modified: 5
requirements: [COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, COMP-09, COMP-10]
---

# Phase 02 Plan 02: Compliance Module Summary

**One-liner:** Compliance module with 10 MCP tools covering async check jobs, bulk scans, violation justification, AI memos, scan history, and evidence pack lifecycle.

## What Was Built

10 MCP tools in `src/tools/compliance.ts` implementing the full compliance workflow:

| Tool | Method | Path | Pattern |
|------|--------|------|---------|
| `check_compliance` | POST | `/compliance/check` | 202 async |
| `bulk_check_compliance` | POST | `/compliance/bulk_check` | 202 async |
| `get_bulk_check_status` | GET | `/compliance/bulk_check_status` | sync |
| `justify_compliance_violation` | POST | `/compliance/justify` | sync |
| `generate_compliance_memo` | POST | `/compliance/generate_memo` | sync |
| `list_compliance_scan_history` | GET | `/compliance/scan_history` | paginated |
| `get_compliance_scan_detail` | GET | `/compliance/scan_history/:id` | sync |
| `create_evidence_pack` | POST | `/compliance/evidence_packs` | sync |
| `get_evidence_pack` | GET | `/compliance/evidence_packs/:id` | sync |
| `download_evidence_pack` | GET | `/compliance/evidence_packs/:id/download` | returns URL JSON |

## Types Added to src/types.ts

- `ComplianceViolation` extended with 5 missing fields: `justified_by_id`, `justified_by_name`, `justification_reason`, `sam_gov_check_id`, `sam_gov_exclusion_details`
- `ComplianceCheckJobResponse` — 202 response for `check_compliance`
- `BulkCheckJobResponse` — 202 response for `bulk_check_compliance`
- `BulkComplianceScan` — response for bulk status and scan detail endpoints
- `ComplianceScanSummary` — list item for scan history
- `EvidencePack` — full evidence pack object
- `ComplianceMemo` — memo generation response

## Test Coverage

10 E2E tests in `tests/e2e/compliance.test.ts`, all passing. Mock routes added to `tests/e2e/setup.ts` for all 10 endpoints. Full test suite: 229 tests, 0 regressions.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 8e0364a | feat(02-02): add compliance types to types.ts and create compliance.ts with 10 tools |
| Task 2 | 6dd21fc | test(02-02): add compliance mock routes and E2E tests |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all 10 tools call real API endpoints via `apiClient.buildPath()` and return actual API responses.

## Self-Check: PASSED
