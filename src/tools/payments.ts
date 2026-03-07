import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Payment } from "../types.js";

export function registerPaymentTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "get_payment",
    {
      description: "Get payment details by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Payment ID"),
      },
    },
    withErrorHandling(async (args) => {
      const payment = await apiClient.get<Payment>(apiClient.buildPath(`/npayments/${args.id}`));
      return jsonResponse(payment);
    }),
  );

  server.registerTool(
    "create_payment",
    {
      description:
        "Create a payment to settle invoices and/or purchase orders (feature flagged — contact sales to enable). The payment date must match the company's date_format setting.",
      inputSchema: {
        reference: z.string().optional().describe("Payment reference number"),
        supplier_id: z.number().int().describe("Supplier ID"),
        ptype: z
          .enum([
            "bank_transfer",
            "card",
            "credit_card",
            "check",
            "cash",
            "one_time_card",
            "letter_of_credit",
            "other",
          ])
          .describe("Payment type"),
        payment_mode: z.string().optional().describe("Payment mode"),
        status: z.string().optional().describe("Payment status"),
        date: z.string().describe("Payment date (must match company date_format setting)"),
        currency_id: z.number().int().describe("Currency ID"),
        amount: z.number().describe("Total payment amount"),
        invoices: z
          .array(
            z.object({
              invoice_id: z.number().int().describe("Invoice ID"),
              gross_amount: z.number().describe("Amount to apply to this invoice"),
            }),
          )
          .optional()
          .describe("Invoices to pay with amounts"),
        purchase_orders: z
          .array(
            z.object({
              purchase_order_id: z.number().int().describe("Purchase Order ID"),
              budget_id: z.number().int().optional().describe("Budget ID"),
              gross_amount: z.number().describe("Amount to apply to this PO"),
            }),
          )
          .optional()
          .describe("Purchase orders to pay with amounts"),
        comments: z
          .array(
            z.object({
              comment: z.string().describe("Comment text"),
            }),
          )
          .optional()
          .describe("Payment comments"),
      },
    },
    withErrorHandling(async (args) => {
      const { invoices, purchase_orders, comments, ...paymentData } = args;
      const body: Record<string, unknown> = {
        npayment: {
          ...paymentData,
          ...(invoices ? { npayment_invoices_attributes: invoices } : {}),
          ...(purchase_orders ? { npayment_link_orders_attributes: purchase_orders } : {}),
          ...(comments ? { npayment_comments_attributes: comments } : {}),
        },
      };
      const payment = await apiClient.post<Payment>(apiClient.buildPath("/npayments"), body);
      return jsonResponse(payment);
    }),
  );

  server.registerTool(
    "create_po_payment",
    {
      description:
        "Create a payment for a specific purchase order with optional item-level breakdown. Marks PO items as paid.",
      inputSchema: {
        purchase_order_id: z.number().int().positive().describe("Purchase Order ID"),
        amount: z.number().optional().describe("Total payment amount (if not using item-level payments)"),
        note: z.string().optional().describe("Payment note"),
        item_payments: z
          .array(
            z.object({
              purchase_order_item_id: z.number().int().describe("PO line item ID"),
              amount: z.number().describe("Payment amount for this item"),
            }),
          )
          .optional()
          .describe("Item-level payment amounts"),
      },
    },
    withErrorHandling(async (args) => {
      const body: Record<string, unknown> = {
        payment: {
          ...(args.amount !== undefined ? { amount: args.amount } : {}),
          ...(args.note ? { note: args.note } : {}),
          ...(args.item_payments
            ? { purchase_order_item_payments_attributes: args.item_payments }
            : {}),
        },
      };
      const result = await apiClient.post(
        apiClient.buildPath(`/purchase_orders/${args.purchase_order_id}/payments`),
        body,
      );
      return jsonResponse(result);
    }),
  );
}
