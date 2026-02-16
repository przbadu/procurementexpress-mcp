import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { PaginationMeta, PurchaseOrder } from "../types.js";

const lineItemSchema = z.object({
  description: z.string().describe("Item description"),
  quantity: z.number().describe("Quantity"),
  unit_price: z.number().describe("Unit price"),
  budget_id: z.number().int().optional().describe("Budget ID"),
  vat: z.number().optional().describe("VAT amount"),
  item_number: z.string().optional().describe("Item number"),
  sequence_no: z.number().int().optional().describe("Sequence number"),
  tax_rate_id: z.number().int().optional().describe("Tax rate ID"),
});

export function registerPurchaseOrderTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_purchase_orders",
    {
      description: "List purchase orders with pagination and search",
      inputSchema: {
        orders_page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        search: z.string().optional().describe("Search term"),
        requests: z.boolean().optional().describe("Set to true to list pending approval requests"),
        sort: z.string().optional().describe("Sort field"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.orders_page) params.set("orders_page", String(args.orders_page));
      if (args.search) params.set("search", args.search);
      if (args.requests) params.set("requests", "true");
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      const query = params.toString();
      const path = `${apiClient.buildPath("/purchase_orders")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        purchase_orders: PurchaseOrder[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_purchase_order",
    {
      description: "Get purchase order details including line items, comments, approvals, and status flags",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
      },
    },
    withErrorHandling(async (args) => {
      const po = await apiClient.get<PurchaseOrder>(apiClient.buildPath(`/purchase_orders/${args.id}`));
      return jsonResponse(po);
    }),
  );

  server.registerTool(
    "create_purchase_order",
    {
      description: "Create a new purchase order. Use commit='Send' to submit or 'Draft' to save as draft",
      inputSchema: {
        commit: z.enum(["Send", "Draft"]).describe("'Send' to submit for approval, 'Draft' to save as draft"),
        department_id: z.number().int().optional().describe("Department ID"),
        creator_id: z.number().int().describe("Creator user ID"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        supplier_name: z.string().optional().describe("Supplier name (for new suppliers)"),
        currency_id: z.number().int().describe("Currency ID"),
        notes: z.string().optional().describe("PO notes"),
        line_items: z.array(lineItemSchema).min(1).describe("Line items (at least one required)"),
        approver_list: z.array(z.number().int()).optional().describe("Approver IDs"),
      },
    },
    withErrorHandling(async (args) => {
      const { commit, line_items, approver_list, ...poData } = args;
      const body: Record<string, unknown> = {
        commit,
        purchase_order: {
          ...poData,
          purchase_order_items_attributes: line_items,
          ...(approver_list ? { approver_list } : {}),
        },
      };
      const po = await apiClient.post<PurchaseOrder>(apiClient.buildPath("/purchase_orders"), body);
      return jsonResponse(po);
    }),
  );

  server.registerTool(
    "approve_purchase_order",
    {
      description: "Approve a purchase order using the accept token from the approver request",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
        token: z.string().describe("Accept token from the approver request"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get(`${apiClient.buildPath(`/purchase_orders/${args.id}/approve`)}?token=${args.token}`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "reject_purchase_order",
    {
      description: "Reject a purchase order using the reject token from the approver request",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
        token: z.string().describe("Reject token from the approver request"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get(`${apiClient.buildPath(`/purchase_orders/${args.id}/reject`)}?token=${args.token}`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "override_and_approve_purchase_order",
    {
      description: "Override and approve a purchase order (finance users only, no token required)",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get(apiClient.buildPath(`/purchase_orders/${args.id}/override_and_approve`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "cancel_purchase_order",
    {
      description: "Cancel a purchase order",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/cancel`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "archive_purchase_order",
    {
      description: "Archive a purchase order",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/archive`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_pending_request_count",
    {
      description: "Get the count of pending approval requests",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const result = await apiClient.get<{ total_pending_request: number }>(
        apiClient.buildPath("/purchase_orders/pending_request_count"),
      );
      return textResponse(`Pending requests: ${result.total_pending_request}`);
    }),
  );

  server.registerTool(
    "receive_purchase_order_items",
    {
      description: "Mark items as received for a purchase order",
      inputSchema: {
        id: z.number().int().positive().describe("Purchase Order ID"),
        items: z
          .array(
            z.object({
              id: z.number().int().describe("PO item ID"),
              quantity: z.number().describe("Quantity received"),
            }),
          )
          .describe("Items with received quantities"),
        delivered_on: z.string().describe("Delivery date"),
        notes: z.string().optional().describe("Delivery notes"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/receiving_items`), {
        purchase_order: {
          items: args.items,
          delivered_on: args.delivered_on,
          notes: args.notes,
        },
      });
      return jsonResponse(result);
    }),
  );
}
