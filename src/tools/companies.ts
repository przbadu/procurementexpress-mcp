import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, textResponse, withErrorHandling } from "../tool-helpers.js";
import type { Approver, CompanyDetail, Employee } from "../types.js";

export function registerCompanyTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_companies",
    {
      description: "List all companies the current user belongs to",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const companies = await apiClient.get<CompanyDetail[]>(apiClient.buildPath("/companies"));
      return jsonResponse(companies);
    }),
  );

  server.registerTool(
    "get_company",
    {
      description: "Get company details by ID including settings, custom fields, and supported currencies",
      inputSchema: {
        id: z.number().int().positive().describe("Company ID"),
      },
    },
    withErrorHandling(async (args) => {
      const company = await apiClient.get<CompanyDetail>(apiClient.buildPath(`/companies/${args.id}`));
      return jsonResponse(company);
    }),
  );

  server.registerTool(
    "get_company_details",
    {
      description: "Get details for the currently active company (set via set_active_company or PROCUREMENTEXPRESS_COMPANY_ID)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const company = await apiClient.get<CompanyDetail>(apiClient.buildPath("/companies/details"));
      return jsonResponse(company);
    }),
  );

  server.registerTool(
    "set_active_company",
    {
      description: "Set the active company ID for subsequent API calls. Required before most operations.",
      inputSchema: {
        company_id: z.string().describe("Company ID to use for subsequent requests"),
      },
    },
    withErrorHandling(async (args) => {
      apiClient.setCompanyId(args.company_id);
      return textResponse(`Active company set to ${args.company_id}`);
    }),
  );

  server.registerTool(
    "list_approvers",
    {
      description:
        "List approvers for the current company. Optionally filter by department. Returns empty if company uses approval flows or has no unassigned budgets.",
      inputSchema: {
        department_id: z.number().int().optional().describe("Filter approvers by department ID"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.department_id) params.set("department_id", String(args.department_id));
      const query = params.toString();
      const path = `${apiClient.buildPath("/companies/approvers")}${query ? `?${query}` : ""}`;
      const approvers = await apiClient.get<Approver[]>(path);
      return jsonResponse(approvers);
    }),
  );

  server.registerTool(
    "list_all_approvers",
    {
      description: "List all approvers for the current company regardless of auto-approval routing",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const approvers = await apiClient.get<Approver[]>(apiClient.buildPath("/companies/all_approvers"));
      return jsonResponse(approvers);
    }),
  );

  server.registerTool(
    "list_employees",
    {
      description: "List all active employees of the current company with their roles (companyadmin role required)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const employees = await apiClient.get<Employee[]>(apiClient.buildPath("/companies/employees"));
      return jsonResponse(employees);
    }),
  );

  server.registerTool(
    "invite_user",
    {
      description:
        "Invite a user to the company. Roles: companyadmin, approver, finance, teammember. Requires available invite slots on the company plan.",
      inputSchema: {
        email: z.string().email().describe("Email address to invite"),
        name: z.string().describe("Name of the user"),
        roles: z
          .array(z.enum(["companyadmin", "approver", "finance", "teammember"]))
          .describe("Roles to assign"),
        approval_limit: z.number().optional().describe("Approval limit amount (default: 0)"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs to assign the user to"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath("/companies/send_user_invite"), {
        invite_user: args,
      });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_invite_limit",
    {
      description: "Get the remaining invite slots for the current company",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const result = await apiClient.get<{ invite_limit_left: number; active_users: number; allowed_users: number }>(
        apiClient.buildPath("/companies/invite_limit_left"),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_pending_invites",
    {
      description: "List pending user invitations for the current company (companyadmin role required)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const result = await apiClient.get(apiClient.buildPath("/companies/pending_invites"));
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "cancel_invite",
    {
      description: "Cancel a pending user invitation (companyadmin role required)",
      inputSchema: {
        token: z.string().describe("Invite token from the pending invite"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath("/companies/cancel_invite"), {
        token: args.token,
      });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "resend_invite",
    {
      description: "Resend a pending user invitation email (companyadmin role required)",
      inputSchema: {
        token: z.string().describe("Invite token from the pending invite"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath("/companies/resend_invite"), {
        token: args.token,
      });
      return jsonResponse(result);
    }),
  );
}
