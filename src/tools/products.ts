import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Product } from "../types.js";

export function registerProductTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_products",
    {
      description: "List products with optional filters for supplier and archived status",
      inputSchema: {
        supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
        archived: z.boolean().optional().describe("Filter by archived status"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `${apiClient.buildPath("/products")}${query ? `?${query}` : ""}`;
      const products = await apiClient.get<Product[]>(path);
      return jsonResponse(products);
    }),
  );

  server.registerTool(
    "get_product",
    {
      description: "Get a specific product by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Product ID"),
      },
    },
    withErrorHandling(async (args) => {
      const product = await apiClient.get<Product>(apiClient.buildPath(`/products/${args.id}`));
      return jsonResponse(product);
    }),
  );

  server.registerTool(
    "create_product",
    {
      description: "Create a new product",
      inputSchema: {
        description: z.string().describe("Product description (required)"),
        sku: z.string().optional().describe("SKU code"),
        unit_price: z.number().optional().describe("Unit price"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
      },
    },
    withErrorHandling(async (args) => {
      const product = await apiClient.post<Product>(apiClient.buildPath("/products"), { product: args });
      return jsonResponse(product);
    }),
  );

  server.registerTool(
    "update_product",
    {
      description: "Update an existing product",
      inputSchema: {
        id: z.number().int().positive().describe("Product ID"),
        description: z.string().optional().describe("Product description"),
        sku: z.string().optional().describe("SKU code"),
        unit_price: z.number().optional().describe("Unit price"),
        supplier_id: z.number().int().optional().describe("Supplier ID"),
        archived: z.boolean().optional().describe("Archive status"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const product = await apiClient.put<Product>(apiClient.buildPath(`/products/${id}`), { product: data });
      return jsonResponse(product);
    }),
  );
}
