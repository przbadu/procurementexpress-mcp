import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { BulkSaveResult, PaginationMeta, PurchaseOrder, PurchaseOrderApproverGroup, PurchaseOrderSummary } from "../types.js";
import { customFieldValueSchema, lineItemSchema } from "../schemas.js";

export function registerPurchaseOrderTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_purchase_orders",
    {
      description:
        "List purchase orders with pagination, search, and filters. Returns paginated results with meta info (current_page, next_page, prev_page, total_pages, total_count).",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number (default: 1). Use 'orders_page' as alias."),
        search: z.string().optional().describe("Search term — matches PO number, supplier name, notes, line item descriptions"),
        status: z
          .enum(["draft", "pending", "approved", "rejected", "cancelled", "paid"])
          .optional()
          .describe("Filter by PO status"),
        delivery_status: z
          .enum(["not_delivered", "partially_delivered", "complete_delivered"])
          .optional()
          .describe("Filter by delivery status"),
        payment_status: z
          .enum(["unpaid", "partially_paid", "paid", "invoice_received"])
          .optional()
          .describe("Filter by payment status"),
        supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
        requester_id: z.number().int().optional().describe("Filter by creator/requester user ID"),
        budget_id: z.number().int().optional().describe("Filter by budget ID"),
        filter_dept_id: z.number().int().optional().describe("Filter by department ID"),
        approver_id: z.number().int().optional().describe("Filter by approver user ID"),
        archived: z.boolean().optional().describe("Filter archived POs (default: false)"),
        date_filter: z
          .enum(["current_month", "current_year", "last_month", "last_year"])
          .optional()
          .describe("Predefined date range filter"),
        from: z.string().optional().describe("Custom date range start (format depends on company date_format setting)"),
        to: z.string().optional().describe("Custom date range end"),
        updated_after: z.string().optional().describe("ISO datetime — only return POs updated after this timestamp (includes line item and custom field changes)"),
        sort: z.string().optional().describe("Sort column (e.g. 'submitted_on', 'total_gross_amount', 'suppliers.name')"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: desc)"),
        requests: z.boolean().optional().describe("Set true to include pending approval requests"),
        bell: z.boolean().optional().describe("Set true with requests=true to show only bell notification items"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("orders_page", String(args.page));
      if (args.search) params.set("search", args.search);
      if (args.status) params.set("status", args.status);
      if (args.delivery_status) params.set("delivery_status", args.delivery_status);
      if (args.payment_status) params.set("payment_status", args.payment_status);
      if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
      if (args.requester_id) params.set("requester_id", String(args.requester_id));
      if (args.budget_id) params.set("budget_id", String(args.budget_id));
      if (args.filter_dept_id) params.set("filter_dept_id", String(args.filter_dept_id));
      if (args.approver_id) params.set("approver_id", String(args.approver_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.date_filter) params.set("date_filter", args.date_filter);
      if (args.from) params.set("from", args.from);
      if (args.to) params.set("to", args.to);
      if (args.updated_after) params.set("updated_after", args.updated_after);
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      if (args.requests) params.set("requests", "true");
      if (args.bell) params.set("bell", "true");
      const query = params.toString();
      const path = `${apiClient.buildPath("/purchase_orders")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        purchase_orders: PurchaseOrderSummary[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_purchase_order",
    {
      description:
        "Get purchase order details including line items, comments, approvals, and status flags. The ID parameter accepts a numeric ID, approval-key, or slug.",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
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
      description:
        "Create a new purchase order. Use commit='Send' to submit for approval or 'Draft' to save as draft. At least one line item is required.",
      inputSchema: {
        commit: z.enum(["Send", "Draft"]).describe("'Send' to submit for approval, 'Draft' to save as draft"),
        department_id: z.number().int().optional().describe("Department ID"),
        creator_id: z.number().int().describe("Creator user ID"),
        supplier_id: z.number().int().optional().describe("Existing supplier ID"),
        supplier_name: z.string().optional().describe("Supplier name (used when supplier_id is not provided)"),
        new_supplier_name: z.string().optional().describe("Create a new supplier with this name"),
        currency_id: z.number().int().optional().describe("Currency ID (defaults to company/user currency)"),
        iso_code: z.string().optional().describe("Currency ISO code (e.g. 'USD') — alternative to currency_id"),
        notes: z.string().optional().describe("PO notes/description"),
        submitted_on: z.string().optional().describe("Submission date (format depends on company date_format)"),
        on_behalf_of: z.number().int().optional().describe("Create PO on behalf of this user ID (companyadmin only, user must be active employee)"),
        line_items: z.array(lineItemSchema).min(1).describe("Line items (at least one required)"),
        approver_list: z.array(z.number().int()).optional().describe("Approver user IDs"),
        custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("PO-level custom field values"),
      },
    },
    withErrorHandling(async (args) => {
      const { commit, line_items, approver_list, iso_code, on_behalf_of, custom_field_values_attributes, ...poData } = args;
      const body: Record<string, unknown> = {
        commit,
        purchase_order: {
          ...poData,
          ...(iso_code ? { iso_code } : {}),
          ...(on_behalf_of ? { on_behalf_of } : {}),
          purchase_order_items_attributes: line_items,
          ...(approver_list ? { approver_list } : {}),
          ...(custom_field_values_attributes ? { custom_field_values_attributes } : {}),
        },
      };
      const po = await apiClient.post<PurchaseOrder>(apiClient.buildPath("/purchase_orders"), body);
      return jsonResponse(po);
    }),
  );

  server.registerTool(
    "update_purchase_order",
    {
      description:
        "Update an existing purchase order. Use commit='Send' to submit a draft for approval. The ID accepts numeric ID, approval-key, or slug.",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
        commit: z.enum(["Send", "Draft"]).optional().describe("'Send' to submit draft for approval"),
        department_id: z.number().int().optional().describe("Department ID"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        supplier_name: z.string().optional().describe("Supplier name"),
        new_supplier_name: z.string().optional().describe("Create a new supplier with this name"),
        currency_id: z.number().int().optional().describe("Currency ID"),
        notes: z.string().optional().describe("PO notes"),
        submitted_on: z.string().optional().describe("Submission date"),
        line_items: z.array(lineItemSchema).optional().describe("Line items (include id to update existing, _destroy to remove)"),
        approver_list: z.array(z.number().int()).optional().describe("Approver user IDs"),
        custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("PO-level custom field values"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, commit, line_items, approver_list, custom_field_values_attributes, ...poData } = args;
      const body: Record<string, unknown> = {
        ...(commit ? { commit } : {}),
        purchase_order: {
          ...poData,
          ...(line_items ? { purchase_order_items_attributes: line_items } : {}),
          ...(approver_list ? { approver_list } : {}),
          ...(custom_field_values_attributes ? { custom_field_values_attributes } : {}),
        },
      };
      const po = await apiClient.put<PurchaseOrder>(apiClient.buildPath(`/purchase_orders/${id}`), body);
      return jsonResponse(po);
    }),
  );

  server.registerTool(
    "approve_purchase_order",
    {
      description: "Approve a purchase order using the accept token from the approver request",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
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
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
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
      description: "Override and approve a purchase order (finance role required, no token needed)",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
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
      description: "Cancel a purchase order (requires cancel permission)",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
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
      description: "Toggle archive status of a purchase order (finance role required). Calling again will dearchive.",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/archive`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "delete_purchase_order",
    {
      description: "Permanently delete a purchase order (requires destroy permission)",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.delete(apiClient.buildPath(`/purchase_orders/${args.id}/delete`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "generate_purchase_order_pdf",
    {
      description: "Generate a PDF for a purchase order and return a download link",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{ pdf_link: string }>(
        apiClient.buildPath(`/purchase_orders/${args.id}/generate_pdf`),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_pending_request_count",
    {
      description: "Get the count of pending approval requests for the current user",
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
      description: "Mark line items as received (partial or full delivery) for a purchase order",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
        items: z
          .array(
            z.object({
              id: z.number().int().describe("PO line item ID"),
              quantity: z.number().describe("Quantity received"),
            }),
          )
          .describe("Items with received quantities"),
        delivered_on: z.string().describe("Delivery date (format depends on company date_format)"),
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

  server.registerTool(
    "cancel_receiving_items",
    {
      description: "Cancel all received deliveries for a purchase order, reverting to not delivered status",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/cancel_receiving_items`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "complete_purchase_order_delivery",
    {
      description: "Mark a purchase order as fully delivered",
      inputSchema: {
        id: z.string().describe("Purchase Order ID, approval-key, or slug"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/purchase_orders/${args.id}/complete_delivery`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "bulk_save_purchase_orders",
    {
      description: "Bulk create or update multiple purchase orders in a single request. Each item in the data array can include a _id field for response correlation.",
      inputSchema: {
        data: z.array(z.object({
          _id: z.string().optional().describe("Client-side temporary ID for response correlation"),
          supplier_name: z.string().optional().describe("Supplier name"),
          supplier_id: z.number().int().optional().describe("Supplier ID"),
          new_supplier_name: z.string().optional().describe("Name for creating a new supplier"),
          department_id: z.number().int().optional().describe("Department ID"),
          creator_id: z.number().int().optional().describe("Creator user ID"),
          on_behalf_of: z.number().int().optional().describe("User ID if creating on behalf of"),
          submitted_on: z.string().optional().describe("Submission date"),
          notes: z.string().optional().describe("PO notes"),
          currency_id: z.number().int().optional().describe("Currency ID"),
          commit: z.string().optional().describe("Set to 'send' to submit for approval"),
          approver_list: z.array(z.number().int()).optional().describe("Approver user IDs"),
          purchase_order_items_attributes: z.array(z.object({
            description: z.string(),
            quantity: z.number(),
            unit_price: z.number(),
            net_amount: z.number().optional(),
            budget_id: z.number().int().optional(),
            vat: z.number().optional(),
            tax_rate_id: z.number().int().optional(),
          })).optional().describe("Line items"),
          custom_field_values_attributes: z.array(z.object({
            id: z.number().int().optional(),
            value: z.string(),
            custom_field_id: z.number().int(),
          })).optional().describe("Custom field values"),
        })).describe("Array of purchase order objects"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<BulkSaveResult>(apiClient.buildPath("/purchase_orders/bulk_save"), {
        purchase_order: { data: args.data },
      });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_po_auto_approvers",
    {
      description: "Get the list of auto-assigned approvers based on PO total amount and budgets",
      inputSchema: {
        gross_total: z.number().optional().describe("PO gross total amount"),
        budget_ids: z.array(z.number().int()).optional().describe("Array of budget IDs"),
        show_last_approver_on_edit: z.boolean().optional().describe("Show last approver on edit"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.gross_total !== undefined) params.set("gross_total", String(args.gross_total));
      if (args.budget_ids) args.budget_ids.forEach((id) => params.append("budget_ids[]", String(id)));
      if (args.show_last_approver_on_edit !== undefined) params.set("show_last_approver_on_edit", String(args.show_last_approver_on_edit));
      const query = params.toString();
      const path = `${apiClient.buildPath("/purchase_orders/auto_approvers_list")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_po_available_approvers",
    {
      description: "Preview which approvers will be assigned to a PO based on its attributes (department, amounts, line items). Call before submitting to know who will approve.",
      inputSchema: {
        purchase_order_id: z.number().int().optional().describe("Existing PO ID (for edit preview)"),
        department_id: z.number().int().optional().describe("Department ID"),
        total_gross_amount: z.number().optional().describe("Total gross amount"),
        total_net_amount: z.number().optional().describe("Total net amount"),
        purchase_order_items_attributes: z.array(z.object({
          description: z.string().optional(),
          quantity: z.number().optional(),
          unit_price: z.number().optional(),
          budget_id: z.number().int().optional(),
        })).optional().describe("Line items for approval flow evaluation"),
      },
    },
    withErrorHandling(async (args) => {
      const poData: Record<string, unknown> = {};
      if (args.purchase_order_id !== undefined) poData.purchase_order_id = args.purchase_order_id;
      if (args.department_id !== undefined) poData.department_id = args.department_id;
      if (args.total_gross_amount !== undefined) poData.total_gross_amount = args.total_gross_amount;
      if (args.total_net_amount !== undefined) poData.total_net_amount = args.total_net_amount;
      if (args.purchase_order_items_attributes) poData.purchase_order_items_attributes = args.purchase_order_items_attributes;
      const result = await apiClient.post<PurchaseOrderApproverGroup[]>(apiClient.buildPath("/purchase_orders/approver_list"), {
        purchase_order: poData,
      });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_po_approval_flow_link",
    {
      description: "Get the approval flow link for a purchase order. This link can be shared with the supplier.",
      inputSchema: {
        id: z.string().describe("Purchase order ID, slug, or approval key"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{ aff_link: string }>(apiClient.buildPath(`/purchase_orders/${args.id}/aff_link`));
      return jsonResponse(result);
    }),
  );
}
