import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Invoice, PaginationMeta } from "../types.js";

const invoiceLineItemSchema = z.object({
  description: z.string().describe("Line item description"),
  unit_price: z.number().describe("Unit price"),
  quantity: z.number().describe("Quantity"),
  vat: z.number().optional().describe("VAT amount"),
  net_amount: z.number().optional().describe("Net amount"),
  purchase_order_id: z.number().int().optional().describe("Related PO ID"),
  purchase_order_item_id: z.number().int().optional().describe("Related PO item ID"),
});

export function registerInvoiceTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_invoices",
    {
      description: "List invoices with pagination and filters (100 per page)",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number"),
        archived: z.boolean().optional().describe("Filter by archived status"),
        requester_id: z.number().int().optional().describe("Filter by requester ID"),
        approver_id: z.number().int().optional().describe("Filter by approver ID"),
        supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
        invoice_date_filter: z.string().optional().describe("Date filter (e.g. 'last 7days')"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.requester_id) params.set("requester_id", String(args.requester_id));
      if (args.approver_id) params.set("approver_id", String(args.approver_id));
      if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
      if (args.invoice_date_filter) params.set("invoice_date_filter", args.invoice_date_filter);
      const query = params.toString();
      const path = `/api/v3/invoices${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ invoices: Invoice[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_invoice",
    {
      description: "Get invoice details by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Invoice ID"),
      },
    },
    withErrorHandling(async (args) => {
      const invoice = await apiClient.get<Invoice>(`/api/v3/invoices/${args.id}`);
      return jsonResponse(invoice);
    }),
  );

  server.registerTool(
    "create_invoice",
    {
      description: "Create a new invoice",
      inputSchema: {
        invoice_number: z.string().optional().describe("Invoice number"),
        issue_date: z.string().optional().describe("Issue date"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        received_date: z.string().optional().describe("Received date"),
        due_date: z.string().optional().describe("Due date"),
        gross_amount: z.number().describe("Gross amount"),
        currency_id: z.number().int().describe("Currency ID"),
        company_id: z.number().int().describe("Company ID"),
        line_items: z.array(invoiceLineItemSchema).optional().describe("Invoice line items"),
      },
    },
    withErrorHandling(async (args) => {
      const { line_items, ...invoiceData } = args;
      const body: Record<string, unknown> = {
        invoice: {
          ...invoiceData,
          ...(line_items ? { invoice_line_items_attributes: line_items } : {}),
        },
      };
      const invoice = await apiClient.post<Invoice>("/api/v3/invoices", body);
      return jsonResponse(invoice);
    }),
  );

  server.registerTool(
    "update_invoice",
    {
      description: "Update an existing invoice",
      inputSchema: {
        id: z.number().int().positive().describe("Invoice ID"),
        invoice_number: z.string().optional().describe("Invoice number"),
        issue_date: z.string().optional().describe("Issue date"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        due_date: z.string().optional().describe("Due date"),
        gross_amount: z.number().optional().describe("Gross amount"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const invoice = await apiClient.put<Invoice>(`/api/v3/invoices/${id}`, { invoice: data });
      return jsonResponse(invoice);
    }),
  );

  server.registerTool(
    "accept_invoice",
    {
      description: "Accept an invoice that is awaiting review",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/accept`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "approve_invoice",
    {
      description: "Approve an invoice",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/approve`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "reject_invoice",
    {
      description: "Reject an invoice",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/reject`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "cancel_invoice",
    {
      description: "Cancel an invoice",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/cancel`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "archive_invoice",
    {
      description: "Archive an invoice",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/archive`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "dearchive_invoice",
    {
      description: "Restore an archived invoice",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v3/invoices/${args.id}/dearchive`);
      return jsonResponse(result);
    }),
  );
}
