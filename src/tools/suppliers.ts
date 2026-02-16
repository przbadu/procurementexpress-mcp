import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { PaginationMeta, Supplier } from "../types.js";

export function registerSupplierTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_suppliers",
    {
      description: "List suppliers with pagination and filters",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number"),
        department_id: z.number().int().optional().describe("Filter by department ID"),
        archived: z.boolean().optional().describe("Filter by archived status"),
        top: z.number().int().positive().optional().describe("Limit to top N suppliers"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.department_id) params.set("department_id", String(args.department_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.top) params.set("top", String(args.top));
      const query = params.toString();
      const path = args.top
        ? `/api/v3/suppliers/top?${query}`
        : `/api/v3/suppliers${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ suppliers: Supplier[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_supplier",
    {
      description: "Get a specific supplier by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Supplier ID"),
      },
    },
    withErrorHandling(async (args) => {
      const supplier = await apiClient.get<Supplier>(`/api/v3/suppliers/${args.id}`);
      return jsonResponse(supplier);
    }),
  );

  server.registerTool(
    "create_supplier",
    {
      description: "Create a new supplier (name must be unique)",
      inputSchema: {
        name: z.string().describe("Supplier name (must be unique)"),
        email: z.string().email().optional().describe("Supplier email"),
        address: z.string().optional().describe("Address"),
        notes: z.string().optional().describe("Notes"),
        payment_details: z.string().optional().describe("Payment details"),
        phone_number: z.string().optional().describe("Phone number"),
        tax_number: z.string().optional().describe("Tax number"),
        contact_person: z.string().optional().describe("Contact person"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs"),
      },
    },
    withErrorHandling(async (args) => {
      const { department_ids, ...supplierData } = args;
      const body: Record<string, unknown> = { supplier: supplierData };
      if (department_ids) body.department_ids = department_ids;
      const supplier = await apiClient.post<Supplier>("/api/v3/suppliers", body);
      return jsonResponse(supplier);
    }),
  );

  server.registerTool(
    "update_supplier",
    {
      description: "Update an existing supplier",
      inputSchema: {
        id: z.number().int().positive().describe("Supplier ID"),
        name: z.string().optional().describe("Supplier name"),
        email: z.string().email().optional().describe("Email"),
        address: z.string().optional().describe("Address"),
        notes: z.string().optional().describe("Notes"),
        payment_details: z.string().optional().describe("Payment details"),
        phone_number: z.string().optional().describe("Phone number"),
        archived: z.boolean().optional().describe("Archive status"),
        tax_number: z.string().optional().describe("Tax number"),
        contact_person: z.string().optional().describe("Contact person"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const supplier = await apiClient.put<Supplier>(`/api/v3/suppliers/${id}`, {
        supplier: data,
      });
      return jsonResponse(supplier);
    }),
  );
}
