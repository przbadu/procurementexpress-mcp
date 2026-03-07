import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Invoice, PaginationMeta } from "../types.js";

const invoiceLineItemSchema = z.object({
  id: z.number().int().optional().describe("Line item ID (for updates)"),
  description: z.string().optional().describe("Line item description"),
  unit_price: z.number().optional().describe("Unit price"),
  quantity: z.number().optional().describe("Quantity"),
  vat: z.number().optional().describe("VAT/tax percentage"),
  net_amount: z.number().optional().describe("Net amount"),
  sequence_no: z.number().int().optional().describe("Sequence number for ordering"),
  tax_rate_id: z.number().int().optional().describe("Tax rate ID"),
  chart_of_account_id: z.number().int().optional().describe("Chart of account ID (GL code)"),
  qbo_customer_id: z.number().int().optional().describe("QuickBooks customer ID"),
  quickbooks_class_id: z.number().int().optional().describe("QuickBooks class ID"),
  qbo_line_description: z.string().optional().describe("QuickBooks line description override"),
  purchase_order_id: z.number().int().optional().describe("Related purchase order ID"),
  purchase_order_item_id: z.number().int().optional().describe("Related PO line item ID"),
  billable_status: z.string().optional().describe("Billable status for QuickBooks"),
  _destroy: z.boolean().optional().describe("Set true to remove this line item on update"),
});

export function registerInvoiceTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_invoices",
    {
      description:
        "List invoices with pagination and filters. Returns paginated results with meta info (current_page, next_page, prev_page, total_pages, total_count). Per-page count is controlled by company settings (default 10, allowed: 10, 20, 50, 100).",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        per_page: z.number().int().optional().describe("Results per page (allowed: 10, 20, 50, 100)"),
        search: z.string().optional().describe("Search term — matches invoice number, supplier name"),
        invoice_statuses_filter: z
          .enum(["awaiting_review", "outstanding", "ready_to_pay", "settled", "cancelled"])
          .optional()
          .describe("Filter by invoice status"),
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
        supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
        requester_id: z.number().int().optional().describe("Filter by requester/creator user ID"),
        approver_id: z.number().int().optional().describe("Filter by approver user ID"),
        department_id: z.number().int().optional().describe("Filter by department ID (via linked POs)"),
        invoice_date_filter: z.string().optional().describe("Date filter (e.g. 'last 7days', 'last 30days', 'current_month', 'last_month')"),
        sage_exported: z.boolean().optional().describe("Filter by Sage export status"),
        sort: z.string().optional().describe("Sort column (e.g. 'invoices.created_at', 'invoices.issue_date')"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: desc)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      if (args.search) params.set("search[query]", args.search);
      if (args.invoice_statuses_filter) params.set("invoice_statuses_filter", args.invoice_statuses_filter);
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
      if (args.requester_id) params.set("requester_id", String(args.requester_id));
      if (args.approver_id) params.set("approver_id", String(args.approver_id));
      if (args.department_id) params.set("department_id", String(args.department_id));
      if (args.invoice_date_filter) params.set("invoice_date_filter", args.invoice_date_filter);
      if (args.sage_exported !== undefined) params.set("sage_exported", String(args.sage_exported));
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      const query = params.toString();
      const path = `${apiClient.buildPath("/invoices")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ invoices: Invoice[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_invoice",
    {
      description: "Get invoice details by ID, including line items, linked POs, and comments",
      inputSchema: {
        id: z.number().int().positive().describe("Invoice ID"),
      },
    },
    withErrorHandling(async (args) => {
      const invoice = await apiClient.get<Invoice>(apiClient.buildPath(`/invoices/${args.id}`));
      return jsonResponse(invoice);
    }),
  );

  server.registerTool(
    "create_invoice",
    {
      description:
        "Create a new invoice. If the company has 'create invoice in awaiting review' enabled, the invoice starts in awaiting_review status.",
      inputSchema: {
        invoice_number: z.string().optional().describe("Invoice number/reference"),
        issue_date: z.string().optional().describe("Issue date (format depends on company date_format)"),
        uploaded_date: z.string().optional().describe("Upload date"),
        received_date: z.string().optional().describe("Received date"),
        due_date: z.string().optional().describe("Due date"),
        gross_amount: z.number().optional().describe("Gross amount"),
        currency_id: z.number().int().optional().describe("Currency ID"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        standalone_invoice: z.boolean().optional().describe("True if invoice is not linked to any PO"),
        payment_term_id: z.number().int().optional().describe("Payment term ID"),
        selected_purchase_order_ids: z.array(z.number().int()).optional().describe("PO IDs to link this invoice to"),
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
      const invoice = await apiClient.post<Invoice>(apiClient.buildPath("/invoices"), body);
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
        uploaded_date: z.string().optional().describe("Upload date"),
        received_date: z.string().optional().describe("Received date"),
        due_date: z.string().optional().describe("Due date"),
        gross_amount: z.number().optional().describe("Gross amount"),
        currency_id: z.number().int().optional().describe("Currency ID"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        standalone_invoice: z.boolean().optional().describe("Standalone invoice flag"),
        payment_term_id: z.number().int().optional().describe("Payment term ID"),
        selected_purchase_order_ids: z.array(z.number().int()).optional().describe("PO IDs to link"),
        line_items: z.array(invoiceLineItemSchema).optional().describe("Invoice line items (include id to update, _destroy to remove)"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, line_items, ...data } = args;
      const body: Record<string, unknown> = {
        invoice: {
          ...data,
          ...(line_items ? { invoice_line_items_attributes: line_items } : {}),
        },
      };
      const invoice = await apiClient.put<Invoice>(apiClient.buildPath(`/invoices/${id}`), body);
      return jsonResponse(invoice);
    }),
  );

  server.registerTool(
    "accept_invoice",
    {
      description: "Accept an invoice that is in awaiting_review status",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/accept`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "approve_invoice",
    {
      description: "Approve an invoice (requires invoice approval permission)",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/approve`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "reject_invoice",
    {
      description: "Reject an invoice (requires invoice approval permission)",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/reject`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "cancel_invoice",
    {
      description: "Cancel an invoice (requires cancel permission)",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/cancel`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "archive_invoice",
    {
      description: "Archive an invoice (requires archive permission)",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/archive`));
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
      const result = await apiClient.put(apiClient.buildPath(`/invoices/${args.id}/dearchive`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "rerun_invoice_approval_flow",
    {
      description: "Rerun the approval flow for an invoice. Useful when approval flow rules have changed.",
      inputSchema: { id: z.number().int().positive().describe("Invoice ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath(`/invoices/${args.id}/rerun_approval_flow`));
      return jsonResponse(result);
    }),
  );
}
