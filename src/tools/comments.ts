import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { PurchaseOrderComment } from "../types.js";

export function registerCommentTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "add_purchase_order_comment",
    {
      description: "Add a comment to a purchase order",
      inputSchema: {
        purchase_order_id: z.number().int().positive().describe("Purchase Order ID"),
        comment: z.string().describe("Comment text"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<PurchaseOrderComment>(
        apiClient.buildPath(`/purchase_order/${args.purchase_order_id}/comments`),
        { comment: args.comment },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "add_invoice_comment",
    {
      description: "Add a comment to an invoice",
      inputSchema: {
        invoice_id: z.number().int().positive().describe("Invoice ID"),
        comment: z.string().describe("Comment text"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(
        apiClient.buildPath(`/invoices/${args.invoice_id}/create_comment`),
        { comment: args.comment },
      );
      return jsonResponse(result);
    }),
  );
}
