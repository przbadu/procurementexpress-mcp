import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { TaxRate } from "../types.js";

export function registerTaxRateTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_tax_rates",
    {
      description: "List all tax rates (single and combined types)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const taxRates = await apiClient.get<TaxRate[]>(apiClient.buildPath("/tax_rates"));
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
      description: "Create a new tax rate",
      inputSchema: {
        name: z.string().describe("Tax rate name"),
        value: z.number().describe("Tax rate value (percentage)"),
        company_id: z.number().int().describe("Company ID"),
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
        value: z.number().optional().describe("Tax rate value"),
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
