import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { ApprovalFlow, ApprovalFlowSummary, ApprovalFlowVersion, PaginationMeta } from "../types.js";

const approvalConditionSchema = z.object({
  id: z.number().int().optional().describe("Condition ID (for updates)"),
  property: z.string().describe("Condition property: budget, department, supplier, requester, gross_amount, net_amount, or custom_field_<id>"),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "is_any_of", "is_none_of", "exists", "not_exists", "contains", "not_contains"]).describe("Condition operator"),
  value: z.string().describe("Condition value (single ID or comma-separated IDs for contains/not_contains)"),
  custom_field_id: z.number().int().optional().describe("Custom field ID (when property is custom_field_<id>)"),
  approval_step_id: z.number().int().optional().describe("Approval step ID (set automatically for step-level conditions)"),
  _destroy: z.boolean().optional().describe("Set true to remove this condition on update"),
});

const approvalStepSchema = z.object({
  id: z.number().int().optional().describe("Step ID (for updates)"),
  step_no: z.number().int().describe("Step number (execution order)"),
  all_should_approve: z.boolean().describe("True = all approvers in step must approve; false = any one approver suffices"),
  approver_user_ids: z.array(z.number().int()).describe("User IDs of approvers for this step"),
  conditions: z.array(approvalConditionSchema).optional().describe("Step-level conditions (all must match for step to activate)"),
  _destroy: z.boolean().optional().describe("Set true to remove this step on update"),
});

export function registerApprovalFlowTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_approval_flows",
    {
      description:
        "List active approval flows with search and pagination. Returns paginated results with meta. Requires approval flows feature to be enabled.",
      inputSchema: {
        search: z.string().optional().describe("Search by flow name (case-insensitive)"),
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
        per_page: z.number().int().positive().optional().describe("Results per page (allowed: 10, 20, 50, 100)"),
        sort: z.string().optional().describe("Sort column (e.g. 'id', 'name', 'created_at')"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: desc)"),
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
      const path = `${apiClient.buildPath("/approval_flows")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{
        approval_flows: ApprovalFlowSummary[];
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
      const flow = await apiClient.get<ApprovalFlow>(apiClient.buildPath(`/approval_flows/${args.id}`));
      return jsonResponse(flow);
    }),
  );

  server.registerTool(
    "create_approval_flow",
    {
      description:
        "Create an approval flow with steps, approvers, and conditions. document_type: 0=purchase_order, 1=invoice. Flow-level conditions determine which documents match this flow. Step-level conditions determine which steps activate.",
      inputSchema: {
        name: z.string().describe("Flow name"),
        document_type: z.number().int().min(0).max(1).describe("0=purchase_order, 1=invoice"),
        self_approval_allowed: z.boolean().optional().describe("Allow PO creator to self-approve if they are an approver"),
        steps: z.array(approvalStepSchema).describe("Approval steps with approvers (executed in step_no order)"),
        conditions: z.array(approvalConditionSchema).optional().describe("Flow-level conditions (all must match for flow to apply)"),
      },
    },
    withErrorHandling(async (args) => {
      const body = {
        approval_flow: {
          name: args.name,
          document_type: args.document_type,
          self_approval_allowed: args.self_approval_allowed,
          approval_steps_attributes: args.steps.map((step) => ({
            ...(step.id ? { id: step.id } : {}),
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
      const flow = await apiClient.post<ApprovalFlow>(apiClient.buildPath("/approval_flows"), body);
      return jsonResponse(flow);
    }),
  );

  server.registerTool(
    "update_approval_flow",
    {
      description:
        "Update an existing approval flow. Include step/condition IDs to update existing items, omit ID for new items, use _destroy to remove.",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
        name: z.string().optional().describe("Flow name"),
        document_type: z.number().int().min(0).max(1).optional().describe("0=purchase_order, 1=invoice"),
        self_approval_allowed: z.boolean().optional().describe("Allow self-approval"),
        steps: z.array(approvalStepSchema).optional().describe("Approval steps"),
        conditions: z.array(approvalConditionSchema).optional().describe("Flow-level conditions"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, steps, conditions, ...flowData } = args;
      const body: Record<string, unknown> = {
        approval_flow: {
          ...flowData,
          ...(steps
            ? {
                approval_steps_attributes: steps.map((step) => ({
                  ...(step.id ? { id: step.id } : {}),
                  step_no: step.step_no,
                  all_should_approve: step.all_should_approve,
                  ...(step._destroy ? { _destroy: true } : {}),
                  approval_step_approvers_attributes: step.approver_user_ids.map((uid) => ({
                    user_id: uid,
                  })),
                  ...(step.conditions
                    ? { approval_conditions_attributes: step.conditions }
                    : {}),
                })),
              }
            : {}),
          ...(conditions
            ? { approval_conditions_attributes: conditions }
            : {}),
        },
      };
      const flow = await apiClient.put<ApprovalFlow>(apiClient.buildPath(`/approval_flows/${id}`), body);
      return jsonResponse(flow);
    }),
  );

  server.registerTool(
    "delete_approval_flow",
    {
      description: "Delete an approval flow permanently",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.delete(apiClient.buildPath(`/approval_flows/${args.id}`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "archive_approval_flow",
    {
      description: "Archive an approval flow (soft delete — can be restored)",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.put(apiClient.buildPath(`/approval_flows/${args.id}/archive`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "publish_approval_flow",
    {
      description: "Publish an approval flow to make it active",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.patch(apiClient.buildPath(`/approval_flows/${args.id}/publish`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "unpublish_approval_flow",
    {
      description: "Unpublish an approval flow to deactivate it",
      inputSchema: { id: z.number().int().positive().describe("Approval Flow ID") },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.patch(apiClient.buildPath(`/approval_flows/${args.id}/unpublish`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_approval_flow_runs",
    {
      description: "List approval flow runs (entities that went through this flow) with status and date filters",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
        status: z.enum(["in_progress", "completed", "rejected"]).optional().describe("Filter by run status"),
        keyword: z.string().optional().describe("Search keyword"),
        date_range: z.enum(["24h", "7d", "30d", "60d", "custom"]).optional().describe("Predefined date range filter"),
        date_from: z.string().optional().describe("Start date for custom range"),
        date_to: z.string().optional().describe("End date for custom range"),
        page: z.number().int().positive().optional().describe("Page number"),
        per_page: z.number().int().positive().optional().describe("Results per page"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...filters } = args;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const query = params.toString();
      const path = `${apiClient.buildPath(`/approval_flows/${id}/runs`)}${query ? `?${query}` : ""}`;
      const result = await apiClient.get(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_approval_flow_entity",
    {
      description: "Get details about a specific entity (purchase order or invoice) that went through an approval flow",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
        entity_id: z.number().int().positive().describe("Entity ID (purchase order or invoice ID)"),
      },
    },
    withErrorHandling(async (args) => {
      const path = `${apiClient.buildPath(`/approval_flows/${args.id}/show_entity`)}?entity_id=${args.entity_id}`;
      const result = await apiClient.get(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_approval_flow_versions",
    {
      description: "List all version history of an approval flow",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{ versions: ApprovalFlowVersion[]; meta: PaginationMeta }>(apiClient.buildPath(`/approval_flows/${args.id}/versions`));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_approval_flow_version_details",
    {
      description: "Get full details of a specific version of an approval flow",
      inputSchema: {
        id: z.number().int().positive().describe("Approval Flow ID"),
        version_id: z.number().int().positive().describe("Version ID"),
      },
    },
    withErrorHandling(async (args) => {
      const path = `${apiClient.buildPath(`/approval_flows/${args.id}/version_details`)}?version_id=${args.version_id}`;
      const result = await apiClient.get(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "rerun_approval_flows",
    {
      description: "Rerun approval flows for specific purchase orders and/or invoices. Useful when approval flow rules have changed and need to be reapplied.",
      inputSchema: {
        order_ids: z.array(z.number().int()).optional().describe("Purchase order IDs to rerun approval flows for"),
        invoice_ids: z.array(z.number().int()).optional().describe("Invoice IDs to rerun approval flows for"),
      },
    },
    withErrorHandling(async (args) => {
      const body: Record<string, unknown> = {};
      if (args.order_ids) body.order_ids = args.order_ids;
      if (args.invoice_ids) body.invoice_ids = args.invoice_ids;
      const result = await apiClient.post(apiClient.buildPath("/approval_flows/rerun_approval_flows"), body);
      return jsonResponse(result);
    }),
  );
}
