import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { PaginationMeta, PolicyDetail, PolicySummary, PolicyTemplate, PolicyVersion } from "../types.js";

export function registerPolicyTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_policies",
    {
      description:
        "List policies for the current company with optional filters. Requires policies feature to be enabled for the company.",
      inputSchema: {
        status: z.string().optional().describe("Filter by status (e.g. 'active', 'inactive')"),
        archived: z.boolean().optional().describe("Filter by archived status"),
        scope: z.string().optional().describe("Filter by scope (e.g. 'company', 'department')"),
        category: z.string().optional().describe("Filter by category"),
        budget_id: z.number().int().optional().describe("Filter by budget ID"),
        search: z.string().optional().describe("Search by policy name"),
        page: z.number().int().optional().describe("Page number for pagination"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.status !== undefined) params.set("status", args.status);
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.scope !== undefined) params.set("scope", args.scope);
      if (args.category !== undefined) params.set("category", args.category);
      if (args.budget_id !== undefined) params.set("budget_id", String(args.budget_id));
      if (args.search !== undefined) params.set("search", args.search);
      if (args.page !== undefined) params.set("page", String(args.page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/policies")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ policies: PolicySummary[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_policy",
    {
      description:
        "Get a specific policy by ID, including full content and version history. Requires policies feature to be enabled for the company.",
      inputSchema: {
        id: z.number().int().positive().describe("Policy ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{ policy: PolicyDetail; versions: PolicyVersion[] }>(
        apiClient.buildPath(`/policies/${args.id}`),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "create_policy",
    {
      description:
        "Create a new procurement policy. Requires policies feature to be enabled for the company.",
      inputSchema: {
        name: z.string().describe("Policy name (required)"),
        description: z.string().optional().describe("Policy description"),
        status: z.string().optional().describe("Policy status (e.g. 'active', 'inactive')"),
        scope: z.string().optional().describe("Policy scope (e.g. 'company', 'department')"),
        category: z.string().optional().describe("Policy category"),
        content: z.string().optional().describe("Policy content/body text"),
        min_amount: z.number().optional().describe("Minimum purchase amount threshold"),
        max_amount: z.number().optional().describe("Maximum purchase amount threshold"),
        min_quotes_required: z.number().int().optional().describe("Minimum number of quotes required"),
        archived: z.boolean().optional().describe("Whether the policy is archived"),
        budget_ids: z.array(z.number().int()).optional().describe("Budget IDs to associate with this policy"),
        required_attachments: z.array(z.string()).optional().describe("List of required attachment types"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<PolicyDetail>(apiClient.buildPath("/policies"), { policy: args });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "update_policy",
    {
      description:
        "Update an existing procurement policy. Requires policies feature to be enabled for the company.",
      inputSchema: {
        id: z.number().int().positive().describe("Policy ID"),
        name: z.string().optional().describe("Policy name"),
        description: z.string().optional().describe("Policy description"),
        status: z.string().optional().describe("Policy status (e.g. 'active', 'inactive')"),
        scope: z.string().optional().describe("Policy scope (e.g. 'company', 'department')"),
        category: z.string().optional().describe("Policy category"),
        content: z.string().optional().describe("Policy content/body text"),
        min_amount: z.number().optional().describe("Minimum purchase amount threshold"),
        max_amount: z.number().optional().describe("Maximum purchase amount threshold"),
        min_quotes_required: z.number().int().optional().describe("Minimum number of quotes required"),
        archived: z.boolean().optional().describe("Whether the policy is archived"),
        budget_ids: z.array(z.number().int()).optional().describe("Budget IDs to associate with this policy"),
        required_attachments: z.array(z.string()).optional().describe("List of required attachment types"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const result = await apiClient.patch<PolicyDetail>(apiClient.buildPath(`/policies/${id}`), { policy: data });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "delete_policy",
    {
      description:
        "Delete (soft delete) a procurement policy. Returns 204 on success. Requires policies feature to be enabled for the company.",
      inputSchema: {
        id: z.number().int().positive().describe("Policy ID"),
      },
    },
    withErrorHandling(async (args) => {
      await apiClient.delete(apiClient.buildPath(`/policies/${args.id}`));
      return textResponse(`Policy ${args.id} deleted successfully.`);
    }),
  );

  server.registerTool(
    "list_policy_templates",
    {
      description:
        "List available policy templates that can be used as starting points when creating new policies. Requires policies feature to be enabled for the company.",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const result = await apiClient.get<{ templates: PolicyTemplate[] }>(
        apiClient.buildPath("/policy_templates"),
      );
      return jsonResponse(result);
    }),
  );
}
