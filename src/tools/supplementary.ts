import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type {
  ChartOfAccount,
  PaginationMeta,
  QboClass,
  QboCustomer,
  SendToSupplierTemplate,
} from "../types.js";

export function registerSupplementaryTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_chart_of_accounts",
    {
      description: "List chart of accounts with optional search",
      inputSchema: {
        search: z.string().optional().describe("Search term"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      const query = params.toString();
      const path = `/api/v3/chart_of_accounts${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        chart_of_accounts: ChartOfAccount[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_qbo_customers",
    {
      description: "List QuickBooks customers with optional search",
      inputSchema: {
        search: z.string().optional().describe("Search term"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      const query = params.toString();
      const path = `/api/v3/qbo_customers${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        qbo_customers: QboCustomer[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_qbo_classes",
    {
      description: "List QuickBooks classes with optional search",
      inputSchema: {
        search: z.string().optional().describe("Search term"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      const query = params.toString();
      const path = `/api/v3/qbo_classes${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        quickbooks_classes: QboClass[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_send_to_supplier_templates",
    {
      description: "List email templates for sending POs to suppliers",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const templates = await apiClient.get<SendToSupplierTemplate[]>(
        "/api/v3/send_to_supplier_templates",
      );
      return jsonResponse(templates);
    }),
  );

  server.registerTool(
    "forward_purchase_order",
    {
      description: "Forward a purchase order to supplier(s) via email",
      inputSchema: {
        purchase_order_id: z.number().int().positive().describe("Purchase Order ID"),
        emails: z.array(z.string().email()).describe("Recipient email addresses"),
        cc: z.string().email().optional().describe("CC email address"),
        notes: z.string().optional().describe("Email body / template text"),
        email_subject: z.string().optional().describe("Email subject"),
        template_label: z.string().optional().describe("Template label"),
        save_template: z.boolean().optional().describe("Save as new template"),
        is_default: z.boolean().optional().describe("Mark as default template"),
      },
    },
    withErrorHandling(async (args) => {
      const { purchase_order_id, ...data } = args;
      const result = await apiClient.post(
        `/api/v3/purchase_orders/${purchase_order_id}/forward`,
        data,
      );
      return jsonResponse(result);
    }),
  );
}
