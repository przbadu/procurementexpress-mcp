import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { PaginationMeta, SamGovCheck, SamGovUnchecked, Supplier, SupplierApproval } from "../types.js";

export function registerSupplierTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_suppliers",
    {
      description:
        "List suppliers. When page param is provided, returns paginated response with meta (20 per page). Without page param, returns all suppliers as an array. Supports search by name and filtering by department/archived status.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number — enables pagination (20 per page)"),
        search: z.string().optional().describe("Search suppliers by name"),
        department_id: z.number().int().optional().describe("Filter by department ID (includes suppliers without departments)"),
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
        show_mappings: z.boolean().optional().describe("Include third-party ID mappings in response"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.search) params.set("search", args.search);
      if (args.department_id) params.set("department_id", String(args.department_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      if (args.show_mappings) params.set("show_mappings", "true");
      const query = params.toString();
      const path = `${apiClient.buildPath("/suppliers")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<Supplier[] | { suppliers: Supplier[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_top_suppliers",
    {
      description: "Get the user's most frequently used suppliers",
      inputSchema: {
        top: z.number().int().positive().optional().describe("Number of top suppliers to return (default: 5)"),
        archived: z.boolean().optional().describe("Include archived suppliers"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.top) params.set("top", String(args.top));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `${apiClient.buildPath("/suppliers/top")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<Supplier[]>(path);
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
      const supplier = await apiClient.get<Supplier>(apiClient.buildPath(`/suppliers/${args.id}`));
      return jsonResponse(supplier);
    }),
  );

  server.registerTool(
    "create_supplier",
    {
      description:
        "Create a new supplier (name must be unique within the company). If company has supplier approval enabled, creates a pending approval request instead.",
      inputSchema: {
        name: z.string().describe("Supplier name (must be unique)"),
        email: z.string().optional().describe("Supplier email"),
        address: z.string().optional().describe("Address"),
        notes: z.string().optional().describe("Notes"),
        payment_details: z.string().optional().describe("Payment details/bank info"),
        phone_number: z.string().optional().describe("Phone number"),
        tax_number: z.string().optional().describe("Tax number"),
        contact_person: z.string().optional().describe("Contact person name"),
        uei: z.string().optional().describe("Unique Entity Identifier (UEI) for SAM.gov"),
        cage_code: z.string().optional().describe("CAGE code for government contracting"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs to restrict supplier to"),
        xero_id: z.string().optional().describe("Xero integration ID"),
        zapier_id: z.string().optional().describe("Zapier integration ID"),
        quickbooks_id: z.string().optional().describe("QuickBooks integration ID"),
      },
    },
    withErrorHandling(async (args) => {
      const supplier = await apiClient.post<Supplier>(apiClient.buildPath("/suppliers"), { supplier: args });
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
        email: z.string().optional().describe("Email"),
        address: z.string().optional().describe("Address"),
        notes: z.string().optional().describe("Notes"),
        payment_details: z.string().optional().describe("Payment details"),
        phone_number: z.string().optional().describe("Phone number"),
        archived: z.boolean().optional().describe("Archive status"),
        tax_number: z.string().optional().describe("Tax number"),
        contact_person: z.string().optional().describe("Contact person"),
        uei: z.string().optional().describe("Unique Entity Identifier (UEI)"),
        cage_code: z.string().optional().describe("CAGE code"),
        department_ids: z.array(z.number().int()).optional().describe("Department IDs"),
        xero_id: z.string().optional().describe("Xero integration ID"),
        zapier_id: z.string().optional().describe("Zapier integration ID"),
        quickbooks_id: z.string().optional().describe("QuickBooks integration ID"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const supplier = await apiClient.put<Supplier>(apiClient.buildPath(`/suppliers/${id}`), {
        supplier: data,
      });
      return jsonResponse(supplier);
    }),
  );

  server.registerTool(
    "check_sam_gov",
    {
      description:
        "Check a supplier against the SAM.gov database for government contract eligibility. Returns cached results unless force=true.",
      inputSchema: {
        supplier_id: z.number().int().positive().describe("Supplier ID to check against SAM.gov"),
        force: z
          .boolean()
          .optional()
          .describe("Force a fresh check even if cached results exist (default: false)"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<SamGovCheck | SamGovUnchecked>(
        apiClient.buildPath("/sam_gov/check"),
        { supplier_id: args.supplier_id, force: args.force },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_supplier_approvals",
    {
      description:
        "List pending supplier approval requests. Feature-flagged — requires supplier approvals to be enabled.",
      inputSchema: {
        search: z.string().optional().describe("Search supplier approval requests by name"),
        page: z.number().int().positive().optional().describe("Page number for pagination"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      if (args.page) params.set("page", String(args.page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/supplier_approvals")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ supplier_approvals: SupplierApproval[]; meta: PaginationMeta }>(path);
      return jsonResponse(result);
    }),
  );
}
