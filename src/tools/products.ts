import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { PaginationMeta, Product } from "../types.js";

export function registerProductTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_products",
    {
      description:
        "List products. When page param is provided, returns paginated response with meta. Without page param, returns all products as an array. Can filter by supplier and archived status.",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number — enables pagination"),
        per_page: z.number().int().positive().optional().describe("Results per page (default: 20)"),
        supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
        archived: z.boolean().optional().describe("Filter by archived status (default: false)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.per_page) params.set("per_page", String(args.per_page));
      if (args.supplier_id) params.set("supplier_id", String(args.supplier_id));
      if (args.archived !== undefined) params.set("archived", String(args.archived));
      const query = params.toString();
      const path = `${apiClient.buildPath("/products")}${query ? `?${query}` : ""}`;
      const products = await apiClient.get<Product[] | { products: Product[]; meta: PaginationMeta }>(path);
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
      description: "Create a new product and associate it with a supplier",
      inputSchema: {
        description: z.string().describe("Product description (required)"),
        supplier_id: z.number().int().describe("Supplier ID (required — product is associated with this supplier)"),
        sku: z.string().optional().describe("SKU code"),
        unit_price: z.number().optional().describe("Unit price"),
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
        archived: z.boolean().optional().describe("Whether the product is archived"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...data } = args;
      const product = await apiClient.put<Product>(apiClient.buildPath(`/products/${id}`), { product: data });
      return jsonResponse(product);
    }),
  );
}
