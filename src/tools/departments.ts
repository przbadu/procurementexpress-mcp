import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Department } from "../types.js";

export function registerDepartmentTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_departments",
    {
      description: "List departments with optional filters for archived status and company-specific",
      inputSchema: {
        archived: z.boolean().optional().describe("Filter by archived status"),
        company_specific: z.boolean().optional().describe("Show only company-specific departments"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.company_specific !== undefined) params.set("company_specific", String(args.company_specific));
      const query = params.toString();
      const path = `/api/v3/departments${query ? `?${query}` : ""}`;
      const departments = await apiClient.get<Department[]>(path);
      return jsonResponse(departments);
    }),
  );

  server.registerTool(
    "get_department",
    {
      description: "Get a specific department by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Department ID"),
      },
    },
    withErrorHandling(async (args) => {
      const department = await apiClient.get<Department>(`/api/v3/departments/${args.id}`);
      return jsonResponse(department);
    }),
  );

  server.registerTool(
    "create_department",
    {
      description: "Create a new department",
      inputSchema: {
        name: z.string().describe("Department name"),
        contact_person: z.string().optional().describe("Contact person"),
        phone_number: z.string().optional().describe("Phone number"),
        email: z.string().email().optional().describe("Email"),
        address: z.string().optional().describe("Address"),
        tax_number: z.string().optional().describe("Tax number"),
        budget_ids: z.array(z.number().int()).optional().describe("Budget IDs to associate"),
        user_ids: z.array(z.number().int()).optional().describe("User IDs to associate"),
      },
    },
    withErrorHandling(async (args) => {
      const department = await apiClient.post<Department>("/api/v3/departments", {
        department: args,
      });
      return jsonResponse(department);
    }),
  );

  server.registerTool(
    "update_department",
    {
      description: "Update an existing department",
      inputSchema: {
        id: z.number().int().positive().describe("Department ID"),
        name: z.string().optional().describe("Department name"),
        archived: z.boolean().optional().describe("Archive status"),
        contact_person: z.string().optional().describe("Contact person"),
        phone_number: z.string().optional().describe("Phone number"),
        email: z.string().email().optional().describe("Email"),
        address: z.string().optional().describe("Address"),
        tax_number: z.string().optional().describe("Tax number"),
        budget_ids: z.array(z.number().int()).optional().describe("Budget IDs"),
        user_ids: z.array(z.number().int()).optional().describe("User IDs"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const department = await apiClient.put<Department>(`/api/v3/departments/${id}`, {
        department: data,
      });
      return jsonResponse(department);
    }),
  );
}
