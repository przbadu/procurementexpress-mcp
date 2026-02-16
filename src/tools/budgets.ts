import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Budget, PaginationMeta } from "../types.js";

export function registerBudgetTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_budgets",
    {
      description: "List budgets with pagination. Filter by department, archived status, or active only",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        archived: z.boolean().optional().describe("Filter by archived status"),
        only_active: z.boolean().optional().describe("Show only active budgets"),
        department_id: z.number().int().optional().describe("Filter by department ID"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.only_active) params.set("only_active", "true");
      if (args.department_id) params.set("department_id", String(args.department_id));
      const query = params.toString();
      const path = `${apiClient.buildPath("/budgets")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ budgets: Budget[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_budget",
    {
      description: "Get a specific budget by ID, including remaining amount",
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
      description: "Create a new budget",
      inputSchema: {
        name: z.string().describe("Budget name"),
        amount: z.number().describe("Budget amount"),
        currency_id: z.number().int().describe("Currency ID"),
        creator_id: z.number().int().describe("Creator user ID"),
        cost_code: z.string().optional().describe("Cost code"),
        cost_type: z.string().optional().describe("Cost type"),
        start_date: z.string().optional().describe("Start date (must match company date format)"),
        end_date: z.string().optional().describe("End date"),
        allow_anyone_to_approve_a_po: z.boolean().optional().describe("Allow anyone to approve"),
        approver_ids: z.array(z.number().int()).optional().describe("Approver user IDs"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs"),
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
        cost_code: z.string().optional().describe("Cost code"),
        cost_type: z.string().optional().describe("Cost type"),
        start_date: z.string().optional().describe("Start date"),
        end_date: z.string().optional().describe("End date"),
        approver_ids: z.array(z.number().int()).optional().describe("Approver user IDs"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const budget = await apiClient.put<Budget>(apiClient.buildPath(`/budgets/${id}`), { budget: data });
      return jsonResponse(budget);
    }),
  );
}
