import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { ApprovalFlow, PaginationMeta } from "../types.js";

const approvalConditionSchema = z.object({
  property: z.string().describe("Condition property (budget, department, supplier, requester, gross_amount, net_amount, custom_field_xxx)"),
  operator: z.string().describe("Operator: equals(0), not_equals(1), greater_than(2), less_than(3), contains(4), not_contains(5)"),
  value: z.string().describe("Condition value (single ID or comma-separated IDs)"),
  custom_field_id: z.number().int().optional().describe("Custom field ID (for custom_field properties)"),
});

const approvalStepSchema = z.object({
  step_no: z.number().int().describe("Step number"),
  all_should_approve: z.boolean().describe("Whether all approvers in step must approve"),
  approver_user_ids: z.array(z.number().int()).describe("Approver user IDs"),
  conditions: z.array(approvalConditionSchema).optional().describe("Step-level conditions"),
});

export function registerApprovalFlowTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_approval_flows",
    {
      description: "List approval flows with search and pagination",
      inputSchema: {
        search: z.string().optional().describe("Search term"),
        page: z.number().int().positive().optional().describe("Page number"),
        per_page: z.number().int().positive().optional().describe("Results per page"),
        sort: z.string().optional().describe("Sort field"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      if (args.sort) params.set("sort", args.sort);
      if (args.direction) params.set("direction", args.direction);
      const query = params.toString();
      const path = `/api/v1/approval_flows${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        approval_flows: ApprovalFlow[];
        meta: PaginationMeta;
      }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_approval_flow",
    {
      description: "Get approval flow details including steps, approvers, and conditions",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
      },
    },
    withErrorHandling(async (args) => {
      const flow = await apiClient.get<ApprovalFlow>(`/api/v1/approval_flows/${args.id}`);
      return jsonResponse(flow);
    }),
  );

  server.registerTool(
    "create_approval_flow",
    {
      description: "Create an approval flow with steps, approvers, and conditions. document_type: 0=purchase_order, 1=invoice",
      inputSchema: {
        name: z.string().describe("Flow name"),
        document_type: z.number().int().min(0).max(1).describe("0=purchase_order, 1=invoice"),
        self_approval_allowed: z.boolean().optional().describe("Allow self-approval"),
        steps: z.array(approvalStepSchema).describe("Approval steps with approvers"),
        conditions: z.array(approvalConditionSchema).optional().describe("Flow-level conditions"),
      },
    },
    withErrorHandling(async (args) => {
      const body = {
        approval_flow: {
          name: args.name,
          document_type: args.document_type,
          self_approval_allowed: args.self_approval_allowed,
          approval_steps_attributes: args.steps.map((step) => ({
            step_no: step.step_no,
            all_should_approve: step.all_should_approve,
            approval_step_approvers_attributes: step.approver_user_ids.map((uid) => ({
              user_id: uid,
            })),
            ...(step.conditions
              ? { approval_conditions_attributes: step.conditions }
              : {}),
          })),
          ...(args.conditions
            ? { approval_conditions_attributes: args.conditions }
            : {}),
        },
      };
      const flow = await apiClient.post<ApprovalFlow>("/api/v1/approval_flows", body);
      return jsonResponse(flow);
    }),
  );

  server.registerTool(
    "delete_approval_flow",
    {
      description: "Delete an approval flow",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.delete(`/api/v1/approval_flows/${args.id}`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "archive_approval_flow",
    {
      description: "Archive an approval flow",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(`/api/v1/approval_flows/${args.id}/archive`);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_approval_flow_runs",
    {
      description: "List runs for an approval flow with status and date filters",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
        status: z.enum(["in_progress", "completed", "rejected"]).optional().describe("Filter by status"),
        keyword: z.string().optional().describe("Search keyword"),
        date_range: z.enum(["24h", "7d", "30d", "60d", "custom"]).optional().describe("Date range filter"),
        date_from: z.string().optional().describe("Start date (MM/DD/YYYY) for custom range"),
        date_to: z.string().optional().describe("End date (MM/DD/YYYY) for custom range"),
        page: z.number().int().positive().optional().describe("Page number"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...filters } = args;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const query = params.toString();
      const path = `/api/v1/approval_flows/${id}/runs${query ? `?${query}` : ""}`;
      const result = await apiClient.get(path);
      return jsonResponse(result);
    }),
  );
}
