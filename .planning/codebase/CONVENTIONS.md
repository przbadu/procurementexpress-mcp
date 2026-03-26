# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- Use kebab-case for all TypeScript files: `purchase-orders.ts`, `api-client.ts`, `tool-helpers.ts`
- Tool files map 1:1 to API resource domains: `src/tools/budgets.ts`, `src/tools/invoices.ts`
- Test files mirror source naming with `.test.ts` suffix: `tests/e2e/budgets.test.ts`

**Functions:**
- Use camelCase for all functions: `registerBudgetTools()`, `buildPath()`, `withErrorHandling()`
- Tool registration functions follow `register{Resource}Tools(server, apiClient)` pattern
- Response helpers: `textResponse()`, `jsonResponse()`

**Variables:**
- Use camelCase for local variables and parameters: `apiClient`, `authManager`, `companyId`
- Use snake_case for API field names matching Rails backend: `custom_field_values_attributes`, `purchase_order_items_attributes`, `app_company_id`

**Types/Interfaces:**
- Use PascalCase for all interfaces: `PurchaseOrder`, `ApiClient`, `MockApiServer`
- Interfaces model Rails serializer output: `PurchaseOrderSummary` (list), `PurchaseOrder` (detail)
- Distinguish list vs detail types: `InvoiceSummary` vs `Invoice`, `PurchaseOrderSummary` vs `PurchaseOrder`
- Type alias for MCP server: `export type Server = McpServer` in `src/tool-helpers.ts`

**Tool Names:**
- Use snake_case for MCP tool names: `list_purchase_orders`, `get_budget`, `create_supplier`
- Follow CRUD verb prefix: `list_`, `get_`, `create_`, `update_`, `delete_`
- Action tools use descriptive names: `approve_purchase_order`, `cancel_invoice`, `rerun_invoice_approval_flow`

## Code Style

**Formatting:**
- No ESLint, Prettier, or Biome configured. Formatting is manual/editor-based.
- 2-space indentation throughout
- Double quotes for strings
- Trailing commas in multiline structures
- Line length varies; no enforced max

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- No separate linter configured

## Import Organization

**Order:**
1. Node.js built-in modules: `import { createServer } from "node:http"`
2. External packages: `import { z } from "zod"`, `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"`
3. Internal modules with type-only imports first: `import type { ApiClient } from "../api-client.js"`
4. Internal value imports: `import { jsonResponse, withErrorHandling } from "../tool-helpers.js"`

**Path Aliases:**
- None configured. All imports use relative paths with `.js` extension (ES module requirement).

**Critical Rule:** All `.ts` imports must use `.js` extension due to `"type": "module"` in `package.json` and `"module": "Node16"` in `tsconfig.json`.

```typescript
// CORRECT
import { ApiClient } from "./api-client.js";
import type { Budget } from "../types.js";

// WRONG - will fail at runtime
import { ApiClient } from "./api-client";
import type { Budget } from "../types";
```

**Type-only imports:** Use `import type` for interfaces and types that are erased at compile time:

```typescript
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import type { Budget, PaginationMeta } from "../types.js";
```

## Tool Registration Pattern

Every tool file exports a single `register*Tools(server, apiClient)` function. The canonical pattern:

```typescript
// src/tools/{resource}.ts
import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { ResourceType } from "../types.js";

export function registerResourceTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "tool_name",
    {
      description: "Tool description",
      inputSchema: {
        param: z.string().describe("Parameter description"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<ResourceType>(apiClient.buildPath("/resource"));
      return jsonResponse(result);
    }),
  );
}
```

**Key rules:**
- Always wrap handler with `withErrorHandling()`
- Always use `apiClient.buildPath("/resource")` for API paths -- never hardcode `/api/v1/` or `/api/v3/`
- Use `jsonResponse()` for data responses, `textResponse()` for message responses
- Use Zod schemas with `.describe()` on every field for MCP client introspection
- Use `z.number().int().positive()` for ID parameters
- Use `z.enum([...])` for fixed value sets

## Error Handling

**Patterns:**
- `withErrorHandling()` in `src/tool-helpers.ts` catches all errors from tool handlers and returns them as `textResponse("Error: {message}")` -- errors never throw to the MCP transport
- `ApiClientError` in `src/api-client.ts` includes HTTP status code: `throw new ApiClientError(response.status, message)`
- HTTP error responses attempt to parse JSON body for `message` field, falling back to `statusText`

```typescript
// Error handling wrapper - every tool handler uses this
export function withErrorHandling<T>(
  handler: (args: T) => Promise<{ content: { type: "text"; text: string }[] }>,
) {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return textResponse(`Error: ${message}`);
    }
  };
}
```

## API Request Patterns

**Query parameter construction:**
Use `URLSearchParams` to build query strings. Check each param individually before adding:

```typescript
const params = new URLSearchParams();
if (args.page) params.set("page", String(args.page));
if (args.search) params.set("search", args.search);
if (args.archived !== undefined) params.set("archived", String(args.archived));
const query = params.toString();
const path = `${apiClient.buildPath("/resource")}${query ? `?${query}` : ""}`;
```

Note: boolean filters use `!== undefined` check to include `false` values. Numeric/string filters use truthy check.

**Request body construction for create/update:**
Wrap resource data in a named key matching the Rails controller expectation:

```typescript
// Create
const body = { purchase_order: { ...poData, purchase_order_items_attributes: line_items } };
await apiClient.post<PurchaseOrder>(apiClient.buildPath("/purchase_orders"), body);

// Update: destructure id, send remaining fields
const { id, ...data } = args;
await apiClient.put<Budget>(apiClient.buildPath(`/budgets/${id}`), { budget: data });
```

**Nested attributes naming convention:**
- Line items: `purchase_order_items_attributes` (POs), `invoice_line_items_attributes` (invoices)
- Custom fields: `custom_field_values_attributes` (at entity and line item level)
- Webhook attributes: `webhook_attributes_attributes`
- The `_attributes` suffix signals Rails `accepts_nested_attributes_for`

## Zod Schema Patterns

**Reusable schemas:** Define shared schemas at module scope for reuse across tools in the same file:

```typescript
const customFieldValueSchema = z.object({
  id: z.number().int().optional().describe("Custom field value ID (for updates)"),
  value: z.string().describe("Custom field value"),
  custom_field_id: z.number().int().describe("Custom field ID"),
});

const lineItemSchema = z.object({
  id: z.number().int().optional().describe("Line item ID (for updates)"),
  description: z.string().describe("Item description"),
  // ... more fields
  _destroy: z.boolean().optional().describe("Set true to remove this line item on update"),
  custom_field_values_attributes: z.array(customFieldValueSchema).optional(),
});
```

**`_destroy` pattern:** Update schemas include `_destroy: z.boolean().optional()` for Rails nested attribute removal.

## TypeScript Patterns

**Generics:**
- `ApiClient` methods use generics for response typing: `apiClient.get<Budget>(path)`
- `withErrorHandling<T>()` is generic over handler argument type

**Interfaces vs Types:**
- Use `interface` for all data shapes (API responses, config objects): `src/types.ts`
- Use `type` only for aliases: `export type Server = McpServer`, `export type ApiVersion = "v1" | "v3"`
- No union types or discriminated unions -- API responses use string literal fields for status

**Type casting:**
- `as T` used for API response parsing: `return (await response.json()) as T`
- `as const` used for literal types in response helpers: `{ type: "text" as const }`
- `{} as T` used for 204 No Content responses (empty body)

## Module Design

**Exports:**
- Each tool file exports exactly one function: `export function register*Tools()`
- Core modules export classes: `ApiClient`, `AuthManager`
- Helper module exports utility functions and a type alias
- `src/types.ts` exports all interfaces (no barrel file pattern elsewhere)

**No barrel files.** Each import targets a specific module file.

## Comments

**When to comment:**
- JSDoc `/** */` on public class methods in `src/api-client.ts` and `src/auth.ts`
- Inline comments for non-obvious logic (e.g., `// Handle 204 No Content`)
- Tool descriptions serve as the primary documentation for each tool

**No TSDoc/JSDoc on:**
- Tool handler functions (the `description` field in `registerTool` serves this purpose)
- Type/interface fields (field names are self-documenting, matching Rails serializer names)

## Logging

**Framework:** `console.error` (not `console.log`) for server-side messages because MCP uses stdio for transport.

```typescript
console.error(`Auto-authenticated with V1 API (company ID: ${envCompanyId})`);
console.error("Fatal error in main():", error);
```

Never use `console.log` -- it would corrupt the MCP stdio transport.

---

*Convention analysis: 2026-03-25*
