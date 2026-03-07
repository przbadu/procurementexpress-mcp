import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Webhook } from "../types.js";

export function registerWebhookTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_webhooks",
    {
      description: "List webhooks for the current company, ordered by creation date",
      inputSchema: {
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `${apiClient.buildPath("/webhooks")}${query ? `?${query}` : ""}`;
      const webhooks = await apiClient.get<Webhook[]>(path);
      return jsonResponse(webhooks);
    }),
  );

  server.registerTool(
    "get_webhook",
    {
      description: "Get a specific webhook by ID including its custom attributes",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
      },
    },
    withErrorHandling(async (args) => {
      const webhook = await apiClient.get<Webhook>(apiClient.buildPath(`/webhooks/${args.id}`));
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
        url: z.string().describe("Handler URL"),
        event_type: z
          .array(z.enum(["new_po", "po_approved", "po_delivered", "po_paid", "po_cancelled", "po_update"]))
          .describe("Events to subscribe to"),
        authentication_header: z.string().optional().describe("Custom authentication header value"),
        json_wrapper: z.string().optional().describe("Root key for JSON payload wrapping"),
        send_as_text: z.boolean().optional().describe("Send payload as text instead of JSON"),
        basic_auth_uname: z.string().optional().describe("Basic auth username"),
        basic_auth_pword: z.string().optional().describe("Basic auth password"),
        webhook_attributes: z
          .array(
            z.object({
              attrib_type: z.string().describe("Attribute type"),
              key: z.string().describe("Attribute key"),
              value: z.string().describe("Attribute value"),
            }),
          )
          .optional()
          .describe("Custom webhook attributes (key-value pairs sent with each webhook)"),
      },
    },
    withErrorHandling(async (args) => {
      const { webhook_attributes, ...webhookData } = args;
      const body: Record<string, unknown> = {
        webhook: {
          ...webhookData,
          ...(webhook_attributes
            ? { webhook_attributes_attributes: webhook_attributes }
            : {}),
        },
      };
      const webhook = await apiClient.post<Webhook>(apiClient.buildPath("/webhooks"), body);
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
        url: z.string().optional().describe("Handler URL"),
        event_type: z
          .array(z.enum(["new_po", "po_approved", "po_delivered", "po_paid", "po_cancelled", "po_update"]))
          .optional()
          .describe("Events to subscribe to"),
        authentication_header: z.string().optional().describe("Custom authentication header value"),
        json_wrapper: z.string().optional().describe("Root key for JSON payload wrapping"),
        send_as_text: z.boolean().optional().describe("Send payload as text instead of JSON"),
        basic_auth_uname: z.string().optional().describe("Basic auth username"),
        basic_auth_pword: z.string().optional().describe("Basic auth password"),
        archived: z.boolean().optional().describe("Archive status"),
        webhook_attributes: z
          .array(
            z.object({
              id: z.number().int().optional().describe("Attribute ID (for updates)"),
              attrib_type: z.string().optional().describe("Attribute type"),
              key: z.string().optional().describe("Attribute key"),
              value: z.string().optional().describe("Attribute value"),
              _destroy: z.boolean().optional().describe("Set true to remove"),
            }),
          )
          .optional()
          .describe("Custom webhook attributes"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, webhook_attributes, ...data } = args;
      const body: Record<string, unknown> = {
        webhook: {
          ...data,
          ...(webhook_attributes
            ? { webhook_attributes_attributes: webhook_attributes }
            : {}),
        },
      };
      const webhook = await apiClient.put<Webhook>(apiClient.buildPath(`/webhooks/${id}`), body);
      return jsonResponse(webhook);
    }),
  );

  server.registerTool(
    "delete_webhook",
    {
      description: "Delete a webhook",
      inputSchema: {
        id: z.number().int().positive().describe("Webhook ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.delete(apiClient.buildPath(`/webhooks/${args.id}`));
      return jsonResponse(result);
    }),
  );
}
