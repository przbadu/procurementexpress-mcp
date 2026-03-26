import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";
import { registerProductTools } from "../../src/tools/products.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Product Tools E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let server: McpServer;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");

    server = new McpServer({ name: "test", version: "1.0.0" });
    registerProductTools(server, apiClient);
  });

  afterAll(async () => {
    await mock.stop();
  });

  describe("bulk_create_products", () => {
    it("sends POST to /products/bulk_create with correct body shape", async () => {
      mock.clearRequests();

      const body = {
        supplier_id: 1,
        product: {
          product_item_attributes: [
            { description: "Widget A", sku: "WDG-001", unit_price: 9.99 },
            { description: "Widget B", sku: "WDG-002", unit_price: 14.99 },
          ],
        },
      };

      const result = await apiClient.post<boolean>(
        apiClient.buildPath("/products/bulk_create"),
        body,
      );

      expect(result).toBe(true);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "POST" && r.path === "/api/v1/products/bulk_create",
      );
      expect(req).toBeDefined();
      const parsed = JSON.parse(req!.body);
      expect(parsed.supplier_id).toBe(1);
      expect(parsed.product.product_item_attributes).toHaveLength(2);
      expect(parsed.product.product_item_attributes[0].description).toBe("Widget A");
    });

    it("returns 422 when supplier_id is missing", async () => {
      mock.clearRequests();

      // Missing supplier_id — mock returns 422
      await expect(
        apiClient.post(apiClient.buildPath("/products/bulk_create"), {
          product: { product_item_attributes: [{ description: "Widget" }] },
        }),
      ).rejects.toThrow();
    });
  });

  describe("list_product_skus", () => {
    it("sends GET to /products/skus and returns string array", async () => {
      mock.clearRequests();

      const skus = await apiClient.get<string[]>(apiClient.buildPath("/products/skus"));

      expect(Array.isArray(skus)).toBe(true);
      expect(skus).toContain("WDG-001");
      expect(skus).toContain("WDG-002");
      expect(skus).toContain("GAD-001");

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "GET" && r.path === "/api/v1/products/skus",
      );
      expect(req).toBeDefined();
    });

    it("sends GET to /products/skus with query params", async () => {
      mock.clearRequests();

      const params = new URLSearchParams();
      params.set("query", "WDG");
      params.set("supplier_id", "1");
      const path = `${apiClient.buildPath("/products/skus")}?${params.toString()}`;
      const skus = await apiClient.get<string[]>(path);

      expect(Array.isArray(skus)).toBe(true);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "GET" && r.path.startsWith("/api/v1/products/skus"),
      );
      expect(req).toBeDefined();
      expect(req!.path).toContain("query=WDG");
      expect(req!.path).toContain("supplier_id=1");
    });
  });
});
