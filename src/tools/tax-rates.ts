import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { TaxRate } from "../types.js";

export function registerTaxRateTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_tax_rates",
    {
      description: "List tax rates for the current company, filtered by archived status",
      inputSchema: {
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `${apiClient.buildPath("/tax_rates")}${query ? `?${query}` : ""}`;
      const taxRates = await apiClient.get<TaxRate[]>(path);
      return jsonResponse(taxRates);
    }),
  );

  server.registerTool(
    "get_tax_rate",
    {
      description: "Get a specific tax rate by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Tax Rate ID"),
      },
    },
    withErrorHandling(async (args) => {
      const taxRate = await apiClient.get<TaxRate>(apiClient.buildPath(`/tax_rates/${args.id}`));
      return jsonResponse(taxRate);
    }),
  );

  server.registerTool(
    "create_tax_rate",
    {
      description: "Create a new tax rate for the current company",
      inputSchema: {
        name: z.string().describe("Tax rate name (e.g. 'VAT 20%')"),
        value: z.number().describe("Tax rate percentage value (e.g. 20 for 20%)"),
      },
    },
    withErrorHandling(async (args) => {
      const taxRate = await apiClient.post<TaxRate>(apiClient.buildPath("/tax_rates"), { tax_rate: args });
      return jsonResponse(taxRate);
    }),
  );

  server.registerTool(
    "update_tax_rate",
    {
      description: "Update an existing tax rate",
      inputSchema: {
        id: z.number().int().positive().describe("Tax Rate ID"),
        name: z.string().optional().describe("Tax rate name"),
        value: z.number().optional().describe("Tax rate percentage value"),
        archived: z.boolean().optional().describe("Archive status"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const taxRate = await apiClient.put<TaxRate>(apiClient.buildPath(`/tax_rates/${id}`), { tax_rate: data });
      return jsonResponse(taxRate);
    }),
  );
}
