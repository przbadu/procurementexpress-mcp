import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { ChatMessage, ChatMessagesResponse } from "../types.js";

const documentTypeSchema = z
  .enum(["purchase_order", "invoice", "rfq"])
  .describe("Document type (purchase_order, invoice, or rfq)");

export function registerChatMessageTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_chat_messages",
    {
      description:
        "List chat messages for a document (PO, invoice, or RFQ). V3 only — requires OAuth2 authentication.",
      inputSchema: {
        document_type: documentTypeSchema,
        document_id: z.number().int().positive().describe("ID of the document"),
        supplier_id: z.number().int().positive().describe("Supplier ID associated with the document"),
        before_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Cursor for pagination — returns messages before this message ID"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams({
        document_type: args.document_type,
        document_id: String(args.document_id),
        supplier_id: String(args.supplier_id),
      });
      if (args.before_id !== undefined) {
        params.set("before_id", String(args.before_id));
      }
      const result = await apiClient.get<ChatMessagesResponse>(
        `${apiClient.buildPath("/chat_messages")}?${params.toString()}`,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "create_chat_message",
    {
      description:
        "Create a chat message on a document (PO, invoice, or RFQ). V3 only — requires OAuth2 authentication.",
      inputSchema: {
        document_type: documentTypeSchema,
        document_id: z.number().int().positive().describe("ID of the document"),
        supplier_id: z.number().int().positive().describe("Supplier ID associated with the document"),
        body: z.string().min(1).describe("Message body text"),
      },
    },
    withErrorHandling(async (args) => {
      // Body params are NOT nested under a root key — Rails reads params[:document_type] directly
      const body = {
        document_type: args.document_type,
        document_id: args.document_id,
        supplier_id: args.supplier_id,
        body: args.body,
      };
      const message = await apiClient.post<ChatMessage>(apiClient.buildPath("/chat_messages"), body);
      return jsonResponse(message);
    }),
  );

  server.registerTool(
    "delete_chat_message",
    {
      description:
        "Delete a chat message by ID. Context params (document_type, document_id, supplier_id) are required. V3 only — requires OAuth2 authentication.",
      inputSchema: {
        id: z.number().int().positive().describe("Chat message ID to delete"),
        document_type: documentTypeSchema,
        document_id: z.number().int().positive().describe("ID of the document the message belongs to"),
        supplier_id: z.number().int().positive().describe("Supplier ID associated with the document"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams({
        document_type: args.document_type,
        document_id: String(args.document_id),
        supplier_id: String(args.supplier_id),
      });
      await apiClient.delete(
        `${apiClient.buildPath(`/chat_messages/${args.id}`)}?${params.toString()}`,
      );
      return textResponse("Chat message deleted successfully.");
    }),
  );
}
