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
      description: "Get company details including settings, custom fields, and supported currencies",
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
      description: "List approvers filtered by department (respects auto-approval settings)",
      inputSchema: {
        department_id: z.number().int().positive().describe("Department ID to filter approvers"),
      },
    },
    withErrorHandling(async (args) => {
      const approvers = await apiClient.get<Approver[]>(
        `${apiClient.buildPath("/companies/approvers")}?department_id=${args.department_id}`,
      );
      return jsonResponse(approvers);
    }),
  );

  server.registerTool(
    "list_all_approvers",
    {
      description: "List all approvers regardless of auto-approval routing",
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
      description: "List all employees of the current company with their roles",
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
        "Invite a user to the company. Roles: companyadmin, approver, finance, teammember",
      inputSchema: {
        email: z.string().email().describe("Email address to invite"),
        name: z.string().describe("Name of the user"),
        roles: z
          .array(z.enum(["companyadmin", "approver", "finance", "teammember"]))
          .describe("Roles to assign"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post(apiClient.buildPath("/companies/send_user_invite"), {
        invite_user: args,
      });
      return jsonResponse(result);
    }),
  );
}
