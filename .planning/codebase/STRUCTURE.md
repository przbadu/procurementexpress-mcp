# Codebase Structure

**Analysis Date:** 2026-03-25

## Directory Layout

```
procurementexpress-mcp/
├── src/                        # TypeScript source code
│   ├── index.ts                # Entry point — server setup and tool registration
│   ├── api-client.ts           # HTTP client for ProcurementExpress API
│   ├── auth.ts                 # Authentication manager (V1/V3)
│   ├── tool-helpers.ts         # Shared MCP response helpers
│   ├── types.ts                # TypeScript interfaces for API responses
│   └── tools/                  # MCP tool registration modules (14 files)
│       ├── approval-flows.ts   # 13 tools — approval flow CRUD, publish, runs
│       ├── budgets.ts          # 4 tools — budget CRUD
│       ├── comments.ts         # 2 tools — PO and invoice comments
│       ├── companies.ts        # 12 tools — company details, employees, invitations
│       ├── departments.ts      # 4 tools — department CRUD
│       ├── invoices.ts         # 11 tools — invoice CRUD, approve/reject/cancel
│       ├── payments.ts         # 3 tools — payment creation and retrieval
│       ├── products.ts         # 4 tools — product CRUD
│       ├── purchase-orders.ts  # 15 tools — PO lifecycle, delivery, PDF
│       ├── supplementary.ts    # 8 tools — chart of accounts, QBO, email forwarding
│       ├── suppliers.ts        # 5 tools — supplier CRUD + top suppliers
│       ├── tax-rates.ts        # 4 tools — tax rate CRUD
│       ├── users.ts            # 4 tools — current user, currencies
│       └── webhooks.ts         # 5 tools — webhook CRUD + delete
├── tests/                      # Test files
│   └── e2e/                    # E2E tests against mock API server
│       ├── setup.ts            # MockApiServer + standard route registration
│       ├── auth.test.ts        # Auth tests (V1 + V3)
│       ├── api-client.test.ts  # ApiClient unit tests
│       ├── budgets.test.ts     # Budget tool tests
│       ├── comments.test.ts    # Comment tool tests
│       ├── companies.test.ts   # Company tool tests
│       ├── departments.test.ts # Department tool tests
│       ├── invoices.test.ts    # Invoice tool tests
│       ├── purchase-orders.test.ts  # PO tool tests
│       ├── suppliers.test.ts   # Supplier tool tests
│       ├── supplementary.test.ts    # Supplementary tool tests
│       └── users.test.ts       # User tool tests
├── dist/                       # Compiled JavaScript output (generated, git-ignored)
├── .claude/                    # Claude Code configuration
│   ├── skills/                 # 12 skill definitions for AI agent routing
│   │   ├── pex-approval-flows/ # Approval flow skill + references/conditions.md
│   │   ├── pex-auth/           # Auth skill
│   │   ├── pex-budgets/        # Budget skill
│   │   ├── pex-companies/      # Company skill
│   │   ├── pex-departments/    # Department skill
│   │   ├── pex-invoices/       # Invoice skill + references/line-items.md
│   │   ├── pex-payments/       # Payment skill
│   │   ├── pex-purchase-orders/ # PO skill + references/workflows.md, line-items.md
│   │   ├── pex-settings/       # Settings skill (tax, webhooks, currencies, QBO)
│   │   ├── pex-suppliers/      # Supplier skill
│   │   ├── bump-version/       # Version bump skill
│   │   ├── commit/             # Commit skill
│   │   └── npm-publish/        # npm publish skill
│   ├── tasks/                  # Task tracking
│   │   └── todo.md
│   └── settings.local.json     # Local Claude settings
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI (Node 18/20/22 matrix)
├── .planning/                  # Planning documents
│   └── codebase/               # Codebase analysis docs
├── .taskmaster/                # Taskmaster task management
│   ├── tasks/tasks.json
│   ├── config.json
│   ├── state.json
│   ├── docs/                   # PRDs
│   ├── reports/                # Complexity reports
│   └── templates/              # Example PRD templates
├── package.json                # npm package manifest
├── package-lock.json           # Dependency lockfile
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Vitest test configuration
├── .env.example                # Environment variable template
├── .mcp.json                   # MCP client configuration
├── .gitignore                  # Git ignore rules
├── CLAUDE.md                   # Project-level Claude Code instructions
└── README.md                   # Project documentation
```

## Directory Purposes

**`src/`:**
- Purpose: All production TypeScript source code
- Contains: 5 core modules + 14 tool modules in `tools/` subdirectory
- Key files: `index.ts` (entry point), `api-client.ts` (HTTP client), `types.ts` (interfaces)

**`src/tools/`:**
- Purpose: MCP tool registration modules, one per API domain
- Contains: 14 TypeScript files, each exporting a single `register*Tools()` function
- Key files: `purchase-orders.ts` (largest, 369 lines, 15 tools), `approval-flows.ts` (294 lines, 13 tools)

**`tests/e2e/`:**
- Purpose: End-to-end tests using mock HTTP server
- Contains: `setup.ts` (shared test infrastructure) + 10 test files
- Key files: `setup.ts` defines `MockApiServer` class and `registerStandardRoutes()`

**`.claude/skills/`:**
- Purpose: AI agent routing instructions — guides MCP tool usage without reading source
- Contains: 12 skill directories, each with `SKILL.md` (some have `references/` subdirs)
- Published to npm alongside `dist/` via `package.json` `files` field

**`dist/`:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (by `tsc`)
- Committed: No (git-ignored)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Production entry point — server creation, tool registration, startup
- `dist/index.js`: Compiled entry point (has shebang `#!/usr/bin/env node`)

**Configuration:**
- `package.json`: npm manifest, scripts, dependencies
- `tsconfig.json`: TypeScript compiler options (ES2022 target, Node16 module)
- `vitest.config.ts`: Test runner configuration
- `.env.example`: Required environment variables template (existence noted, contents not read)
- `.mcp.json`: MCP client connection configuration

**Core Logic:**
- `src/api-client.ts`: HTTP client with auth header injection and `buildPath()`
- `src/auth.ts`: Dual authentication (V1 static token, V3 OAuth2 password grant)
- `src/tool-helpers.ts`: `textResponse()`, `jsonResponse()`, `withErrorHandling()`
- `src/types.ts`: All TypeScript interfaces (~40 interfaces, 806 lines)

**Tool Definitions:**
- `src/tools/purchase-orders.ts`: PO CRUD, approve/reject, delivery, PDF (15 tools, 369 lines)
- `src/tools/approval-flows.ts`: Approval flow configuration (13 tools, 294 lines)
- `src/tools/invoices.ts`: Invoice lifecycle (11 tools, 250 lines)
- `src/tools/companies.ts`: Company management (12 tools, 183 lines)
- `src/tools/supplementary.ts`: Chart of accounts, QBO integration (8 tools, 168 lines)

**Testing:**
- `tests/e2e/setup.ts`: `MockApiServer` class, `registerStandardRoutes()`, path helpers (`vPath`, `vPathWithId`, etc.)

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` (e.g., `purchase-orders.ts`, `api-client.ts`, `tool-helpers.ts`)
- Test files: `{module-name}.test.ts` co-located in `tests/e2e/` (e.g., `budgets.test.ts`)
- Single-word files: lowercase (e.g., `auth.ts`, `types.ts`)

**Directories:**
- Source: `src/`, `src/tools/`
- Tests: `tests/e2e/`
- Skills: `pex-{domain}/` with hyphens (e.g., `pex-purchase-orders/`)

**Exports:**
- Tool files: Single named export `register{Domain}Tools` in PascalCase (e.g., `registerBudgetTools`, `registerPurchaseOrderTools`)
- Classes: PascalCase (e.g., `ApiClient`, `AuthManager`, `ApiClientError`)
- Helper functions: camelCase (e.g., `textResponse`, `jsonResponse`, `withErrorHandling`)
- Types/Interfaces: PascalCase (e.g., `PurchaseOrder`, `PaginationMeta`, `ApiVersion`)

## Import Organization

**Order observed in tool files:**
1. External packages (`zod`)
2. Internal types (`../api-client.js`, `../tool-helpers.js`)
3. Response types (`../types.js`)

**Path conventions:**
- All imports use `.js` extension (ES modules requirement)
- Relative paths only — no path aliases configured
- Type imports use `import type` syntax

**Example from `src/tools/budgets.ts`:**
```typescript
import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Budget } from "../types.js";
```

## Where to Add New Code

**New MCP Tool Group (new API domain):**
1. Create `src/tools/{domain}.ts` with `export function register{Domain}Tools(server: Server, apiClient: ApiClient): void`
2. Add response types to `src/types.ts`
3. Import and call `register{Domain}Tools(server, apiClient)` in `src/index.ts`
4. Add test file `tests/e2e/{domain}.test.ts`
5. Add mock routes to `tests/e2e/setup.ts` using `vPath()` / `vPathWithId()` helpers
6. Create skill directory `.claude/skills/pex-{domain}/SKILL.md`

**New Tool in Existing Group:**
1. Add `server.registerTool(...)` call inside the existing `register*Tools()` function in `src/tools/{domain}.ts`
2. Add any new response types to `src/types.ts`
3. Add mock route to `tests/e2e/setup.ts`
4. Add test case to `tests/e2e/{domain}.test.ts`
5. Update corresponding skill in `.claude/skills/pex-{domain}/SKILL.md`

**New Type Interface:**
- Add to `src/types.ts` — all API response types live in this single file
- Follow existing naming: PascalCase, matching Rails serializer names

**New Shared Helper:**
- Add to `src/tool-helpers.ts` for response/handler utilities
- Add to `src/api-client.ts` for HTTP-level concerns

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/types.ts` | 806 | All TypeScript interfaces |
| `tests/e2e/setup.ts` | 520 | Mock server + standard routes |
| `src/tools/purchase-orders.ts` | 369 | PO tools (largest tool file) |
| `src/tools/approval-flows.ts` | 294 | Approval flow tools |
| `src/tools/invoices.ts` | 250 | Invoice tools |
| `src/tools/companies.ts` | 183 | Company tools |
| `src/index.ts` | 171 | Entry point |
| `src/tools/supplementary.ts` | 168 | Chart of accounts, QBO tools |
| `src/api-client.ts` | 158 | HTTP client |
| `src/tools/webhooks.ts` | 143 | Webhook tools |
| `src/tools/payments.ts` | 128 | Payment tools |
| `src/tools/suppliers.ts` | 122 | Supplier tools |
| `src/tools/budgets.ts` | 106 | Budget tools |
| `src/tools/departments.ts` | 91 | Department tools |
| `src/tools/products.ts` | 82 | Product tools |
| `src/tools/tax-rates.ts` | 72 | Tax rate tools |
| `src/auth.ts` | 71 | Auth manager |
| `src/tools/users.ts` | 63 | User tools |
| `src/tools/comments.ts` | 43 | Comment tools |
| `src/tool-helpers.ts` | 33 | Response helpers |
| **Total** | **3,353** | **All source files** |

## Special Directories

**`dist/`:**
- Purpose: Compiled JavaScript + declaration files
- Generated: Yes (by `tsc`)
- Committed: No
- Published: Yes (included in npm package via `package.json` `files` field)

**`.claude/skills/`:**
- Purpose: AI agent skill definitions for MCP tool routing
- Generated: No (manually authored)
- Committed: Yes
- Published: Yes (included in npm package)

**`.taskmaster/`:**
- Purpose: Task management and PRD documents
- Generated: Partially (reports are generated)
- Committed: Yes

**`.planning/`:**
- Purpose: Codebase analysis and planning documents
- Generated: Yes (by mapping tools)
- Committed: Yes

---

*Structure analysis: 2026-03-25*
