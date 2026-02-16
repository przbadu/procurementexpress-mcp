import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Payment } from "../types.js";

export function registerPaymentTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "create_payment",
    {
      description:
        "Create a payment (feature flagged). ptype values: bank_transfer, card, credit_card, check, cash, one_time_card, letter_of_credit, other",
      inputSchema: {
        user_id: z.number().int().describe("Payment creator user ID"),
        reference: z.string().optional().describe("Reference number"),
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
        date: z.string().describe("Payment date"),
        currency_id: z.number().int().describe("Currency ID"),
        amount: z.number().describe("Total amount (must match sum of invoice amounts)"),
        invoices: z
          .array(
            z.object({
              invoice_id: z.number().int().describe("Invoice ID"),
              gross_amount: z.number().describe("Amount for this invoice"),
            }),
          )
          .describe("Invoices to pay"),
      },
    },
    withErrorHandling(async (args) => {
      const { invoices, ...paymentData } = args;
      const body = {
        npayment: {
          ...paymentData,
          npayment_invoices_attributes: invoices,
        },
      };
      const payment = await apiClient.post<Payment>("/api/v3/npayments", body);
      return jsonResponse(payment);
    }),
  );

  server.registerTool(
    "create_po_payment",
    {
      description: "Create a payment for a purchase order",
      inputSchema: {
        purchase_order_id: z.number().int().positive().describe("Purchase Order ID"),
        note: z.string().optional().describe("Payment note"),
        item_payments: z
          .array(
            z.object({
              purchase_order_item_id: z.number().int().describe("PO item ID"),
              amount: z.number().describe("Payment amount for this item"),
            }),
          )
          .describe("Item-level payment amounts"),
      },
    },
    withErrorHandling(async (args) => {
      const body = {
        payment: {
          note: args.note,
          purchase_order_item_payments_attributes: args.item_payments,
        },
      };
      const result = await apiClient.post(
        `/api/v3/purchase_orders/${args.purchase_order_id}/payments`,
        body,
      );
      return jsonResponse(result);
    }),
  );
}
