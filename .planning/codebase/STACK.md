# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code (`src/`), test files (`tests/`), and config (`vitest.config.ts`)

**Secondary:**
- JSON - Configuration files (`package.json`, `tsconfig.json`, `.mcp.json`)
- YAML - CI workflow (`.github/workflows/ci.yml`)

## Runtime

**Environment:**
- Node.js 18+ (tested against 18, 20, 22 in CI matrix)
- No `.nvmrc` or `.node-version` file present

**Package Manager:**
- npm (lockfileVersion 3)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- `@modelcontextprotocol/sdk` ^1.26.0 - MCP server framework (stdio transport)
  - `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
  - `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`

**Testing:**
- `vitest` ^4.0.18 - Test runner and assertion library
  - Config: `vitest.config.ts`
  - Globals enabled, 30s test timeout

**Build/Dev:**
- `tsc` (TypeScript compiler) - Direct compilation, no bundler
  - Config: `tsconfig.json`
  - Target: ES2022, Module: Node16, moduleResolution: Node16
  - Strict mode enabled
  - Outputs to `dist/` with declaration files

## Key Dependencies

**Production (2 packages):**
- `@modelcontextprotocol/sdk` ^1.26.0 - MCP protocol server implementation. Core framework for registering tools and handling stdio transport.
- `zod` ^3.25.76 - Runtime schema validation. Required by MCP SDK for tool input schemas.

**Development (3 packages):**
- `typescript` ^5.9.3 - TypeScript compiler
- `vitest` ^4.0.18 - Test framework
- `@types/node` ^25.2.3 - Node.js type definitions

## Module System

**Type:** ES Modules (`"type": "module"` in `package.json`)
- All imports use `.js` extension (required for ESM + Node16 module resolution)
- Example: `import { ApiClient } from "./api-client.js"`

## Configuration

**TypeScript (`tsconfig.json`):**
- `target`: ES2022
- `module`: Node16
- `moduleResolution`: Node16
- `strict`: true
- `declaration`: true (generates `.d.ts` files)
- `rootDir`: `./src`
- `outDir`: `./dist`

**Environment:**
- All env vars use `PROCUREMENTEXPRESS_` prefix
- See `.env.example` for required variables
- No dotenv package - env vars read directly via `process.env`

**Build:**
- `npm run build` runs `tsc` directly (no bundler, no build plugins)
- `npm run dev` runs `tsc --watch` for development
- `prepublishOnly` hook runs build before npm publish

## HTTP Client

- Uses native `fetch` API (no axios, node-fetch, or other HTTP library)
- Requires Node.js 18+ (native fetch support)
- Custom `ApiClient` class in `src/api-client.ts` wraps fetch with auth headers and error handling

## Platform Requirements

**Development:**
- Node.js 18+ (for native fetch and ES module support)
- npm (any recent version with lockfileVersion 3 support)

**Production:**
- Node.js 18+ runtime
- Runs as stdio subprocess (no HTTP server, no ports)
- Executable via: `npx -y @procurementexpress.com/mcp`
- Binary entry point: `dist/index.js` (shebang: `#!/usr/bin/env node`)

## npm Package

**Name:** `@procurementexpress.com/mcp`
**Version:** 2.0.1
**Access:** public (scoped package)
**Published files:** `dist/` and `.claude/skills/`

## CI/CD

**Platform:** GitHub Actions
**Workflow:** `.github/workflows/ci.yml`
**Triggers:** push and PR to `main`
**Matrix:** Node 18, 20, 22 on `ubuntu-latest`
**Steps:** `npm ci` -> `npm run build` -> `npm test`

## Formatting & Linting

- No ESLint, Prettier, or Biome configuration detected
- Code style is enforced informally (TypeScript strict mode provides type-level enforcement)

---

*Stack analysis: 2026-03-25*
