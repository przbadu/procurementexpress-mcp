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
      description: "List chart of accounts (GL codes) with pagination and optional search",
      inputSchema: {
        search: z.string().optional().describe("Search by account name or code"),
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        per_page: z.number().int().positive().optional().describe("Results per page (default: company setting)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/chart_of_accounts")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        chart_of_accounts: ChartOfAccount[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_chart_of_account",
    {
      description: "Get a specific chart of account by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Chart of Account ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<ChartOfAccount>(apiClient.buildPath(`/chart_of_accounts/${args.id}`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_qbo_customers",
    {
      description: "List QuickBooks customers with pagination and optional search",
      inputSchema: {
        search: z.string().optional().describe("Search by customer name"),
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        per_page: z.number().int().positive().optional().describe("Results per page"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/qbo_customers")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        qbo_customers: QboCustomer[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_qbo_customer",
    {
      description: "Get a specific QuickBooks customer by ID",
      inputSchema: {
        id: z.number().int().positive().describe("QBO Customer ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<QboCustomer>(apiClient.buildPath(`/qbo_customers/${args.id}`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_qbo_classes",
    {
      description: "List QuickBooks classes with pagination and optional search",
      inputSchema: {
        search: z.string().optional().describe("Search by class name"),
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        per_page: z.number().int().positive().optional().describe("Results per page"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/qbo_classes")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        quickbooks_classes: QboClass[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_qbo_class",
    {
      description: "Get a specific QuickBooks class by ID",
      inputSchema: {
        id: z.number().int().positive().describe("QuickBooks Class ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<QboClass>(apiClient.buildPath(`/qbo_classes/${args.id}`));
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
        apiClient.buildPath("/send_to_supplier_templates"),
      );
      return jsonResponse(templates);
    }),
  );

  server.registerTool(
    "forward_purchase_order",
    {
      description:
        "Forward a purchase order to supplier(s) via email. The PO PDF is attached automatically.",
      inputSchema: {
        purchase_order_id: z.number().int().positive().describe("Purchase Order ID"),
        emails: z.string().describe("Comma-separated recipient email addresses"),
        cc: z.string().optional().describe("CC email address (defaults to PO creator's email)"),
        note: z.string().optional().describe("Email body / note text"),
        email_subject: z.string().optional().describe("Email subject line"),
        uploads: z.array(z.number().int()).optional().describe("Upload IDs to attach (must belong to this PO)"),
      },
    },
    withErrorHandling(async (args) => {
      const { purchase_order_id, ...data } = args;
      const result = await apiClient.post(
        apiClient.buildPath(`/purchase_orders/${purchase_order_id}/forward`),
        data,
      );
      return jsonResponse(result);
    }),
  );
}
