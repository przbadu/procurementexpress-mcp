import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Budget } from "../types.js";

const customFieldValueSchema = z.object({
  id: z.number().int().optional().describe("Custom field value ID (for updates)"),
  value: z.string().describe("Custom field value"),
  custom_field_id: z.number().int().describe("Custom field ID"),
});

export function registerBudgetTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_budgets",
    {
      description:
        "List budgets for the current company. Filter by department and/or archived status. Returns all matching budgets (no pagination).",
      inputSchema: {
        department_id: z.number().int().optional().describe("Filter by department ID"),
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
        show_mappings: z.boolean().optional().describe("Include third-party ID mappings in response"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.department_id) params.set("department_id", String(args.department_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.show_mappings) params.set("show_mappings", "true");
      const query = params.toString();
      const path = `${apiClient.buildPath("/budgets")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<Budget[]>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_budget",
    {
      description: "Get a specific budget by ID, including remaining amount and associated departments/approvers",
      inputSchema: {
        id: z.number().int().positive().describe("Budget ID"),
      },
    },
    withErrorHandling(async (args) => {
      const budget = await apiClient.get<Budget>(apiClient.buildPath(`/budgets/${args.id}`));
      return jsonResponse(budget);
    }),
  );

  server.registerTool(
    "create_budget",
    {
      description:
        "Create a new budget. Dates must match the company's date_format setting.",
      inputSchema: {
        name: z.string().describe("Budget name"),
        amount: z.number().describe("Budget amount"),
        currency_id: z.number().int().optional().describe("Currency ID (defaults to company currency)"),
        creator_id: z.number().int().optional().describe("Creator user ID"),
        cost_code: z.string().optional().describe("Cost code"),
        cost_type: z.string().optional().describe("Cost type"),
        start_date: z.string().optional().describe("Start date (must match company date_format setting)"),
        end_date: z.string().optional().describe("End date (must match company date_format setting)"),
        allow_anyone_to_approve_a_po: z.boolean().optional().describe("Allow anyone to approve POs against this budget"),
        chart_of_account_id: z.number().int().optional().describe("Chart of account ID (GL code)"),
        qbo_class: z.string().optional().describe("QuickBooks class"),
        approver_ids: z.array(z.number().int()).optional().describe("Approver user IDs"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs to associate"),
        custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("Budget-level custom field values"),
      },
    },
    withErrorHandling(async (args) => {
      const budget = await apiClient.post<Budget>(apiClient.buildPath("/budgets"), { budget: args });
      return jsonResponse(budget);
    }),
  );

  server.registerTool(
    "update_budget",
    {
      description: "Update an existing budget",
      inputSchema: {
        id: z.number().int().positive().describe("Budget ID"),
        name: z.string().optional().describe("Budget name"),
        amount: z.number().optional().describe("Budget amount"),
        currency_id: z.number().int().optional().describe("Currency ID"),
        cost_code: z.string().optional().describe("Cost code"),
        cost_type: z.string().optional().describe("Cost type"),
        start_date: z.string().optional().describe("Start date (must match company date_format setting)"),
        end_date: z.string().optional().describe("End date (must match company date_format setting)"),
        allow_anyone_to_approve_a_po: z.boolean().optional().describe("Allow anyone to approve"),
        chart_of_account_id: z.number().int().optional().describe("Chart of account ID"),
        qbo_class: z.string().optional().describe("QuickBooks class"),
        approver_ids: z.array(z.number().int()).optional().describe("Approver user IDs"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs"),
        custom_field_values_attributes: z.array(customFieldValueSchema).optional().describe("Budget-level custom field values"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const budget = await apiClient.put<Budget>(apiClient.buildPath(`/budgets/${id}`), { budget: data });
      return jsonResponse(budget);
    }),
  );
}
