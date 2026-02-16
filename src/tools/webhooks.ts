import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Webhook } from "../types.js";

export function registerWebhookTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_webhooks",
    {
      description: "List webhooks with optional archived filter",
      inputSchema: {
        archived: z.boolean().optional().describe("Filter by archived status"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `/api/v3/webhooks${query ? `?${query}` : ""}`;
      const webhooks = await apiClient.get<Webhook[]>(path);
      return jsonResponse(webhooks);
    }),
  );

  server.registerTool(
    "get_webhook",
    {
      description: "Get a specific webhook by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
      },
    },
    withErrorHandling(async (args) => {
      const webhook = await apiClient.get<Webhook>(`/api/v3/webhooks/${args.id}`);
      return jsonResponse(webhook);
    }),
  );

  server.registerTool(
    "create_webhook",
    {
      description:
        "Create a webhook. Events: new_po, po_approved, po_delivered, po_paid, po_cancelled, po_update",
      inputSchema: {
        name: z.string().describe("Webhook name"),
        url: z.string().url().describe("Handler URL"),
        event_type: z
          .array(z.enum(["new_po", "po_approved", "po_delivered", "po_paid", "po_cancelled", "po_update"]))
          .describe("Events to subscribe to"),
        json_wrapper: z.string().optional().describe("Root key for JSON data"),
        send_as_text: z.boolean().optional().describe("Send payload as text instead of JSON"),
        basic_auth_uname: z.string().optional().describe("Basic auth username"),
        basic_auth_pword: z.string().optional().describe("Basic auth password"),
      },
    },
    withErrorHandling(async (args) => {
      const webhook = await apiClient.post<Webhook>("/api/v3/webhooks", { webhook: args });
      return jsonResponse(webhook);
    }),
  );

  server.registerTool(
    "update_webhook",
    {
      description: "Update an existing webhook",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
        name: z.string().optional().describe("Webhook name"),
        url: z.string().url().optional().describe("Handler URL"),
        event_type: z
          .array(z.enum(["new_po", "po_approved", "po_delivered", "po_paid", "po_cancelled", "po_update"]))
          .optional()
          .describe("Events to subscribe to"),
        archived: z.boolean().optional().describe("Archive status"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const webhook = await apiClient.put<Webhook>(`/api/v3/webhooks/${id}`, { webhook: data });
      return jsonResponse(webhook);
    }),
  );
}
