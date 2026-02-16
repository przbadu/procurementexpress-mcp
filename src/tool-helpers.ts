import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Returns a text content response for MCP tools.
 */
export function textResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/**
 * Returns a JSON-formatted text content response for MCP tools.
 */
export function jsonResponse(data: unknown) {
  return textResponse(JSON.stringify(data, null, 2));
}

/**
 * Wraps a tool handler with standard error handling.
 */
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

export type Server = McpServer;
