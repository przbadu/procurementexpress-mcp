import { z } from "zod";

/**
 * Shared Zod schema for custom field values.
 * Used by POs, invoices, budgets, and their line items.
 * Pattern: custom_field_values_attributes: [{ id?, value, custom_field_id }]
 */
export const customFieldValueSchema = z.object({
  id: z.number().int().optional().describe("Custom field value ID (for updates)"),
  value: z.string().describe("Custom field value"),
  custom_field_id: z.number().int().describe("Custom field ID"),
});

/**
 * Reusable _destroy mixin for nested Rails attributes.
 * Rails convention: id + _destroy: true removes the nested record on update.
 * Note: _destroy without id is rejected by Zod validation before reaching Rails.
 */
export const nestedDestroyMixin = {
  _destroy: z.boolean().optional().describe("Set true to remove this item on update"),
};

/**
 * Shared Zod schema for purchase order line items.
 * Extracted from src/tools/purchase-orders.ts for cross-tool reuse.
 * Includes net_amount which Rails permits but was previously missing (SCHEMA-01 fix).
 */
export const lineItemSchema = z.object({
  id: z.number().int().optional().describe("Line item ID (for updates)"),
  description: z.string().describe("Item description"),
  quantity: z.number().describe("Quantity"),
  unit_price: z.number().describe("Unit price"),
  net_amount: z.number().optional().describe("Net amount"),
  budget_id: z.number().int().optional().describe("Budget ID"),
  vat: z.number().optional().describe("VAT/tax percentage"),
  tax_rate_id: z.number().int().optional().describe("Tax rate ID"),
  item_number: z.string().optional().describe("Item number"),
  sequence_no: z.number().int().optional().describe("Sequence number for ordering"),
  department_id: z.number().int().optional().describe("Department ID for the line item"),
  product_id: z.number().int().optional().describe("Product ID"),
  chart_of_account_id: z.number().int().optional().describe("Chart of account ID (GL code)"),
  qbo_customer_id: z.number().int().optional().describe("QuickBooks customer ID"),
  quickbooks_class_id: z.number().int().optional().describe("QuickBooks class ID"),
  qbo_line_description: z.string().optional().describe("QuickBooks line description override"),
  archived: z.boolean().optional().describe("Whether the line item is archived"),
  _destroy: z.boolean().optional().describe("Set true to remove this line item on update"),
  custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("Custom field values for this line item"),
});

/**
 * Shared Zod schema for invoice line items.
 * Extracted from src/tools/invoices.ts for cross-tool reuse.
 */
export const invoiceLineItemSchema = z.object({
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
  custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("Custom field values for this line item"),
});
