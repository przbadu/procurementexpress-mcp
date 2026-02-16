import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Suppliers E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`);
    const auth = new AuthManager(apiClient, "test_client_id", "test_client_secret");
    await auth.authenticate("test@example.com", "password123");
    apiClient.setCompanyId("100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list suppliers", async () => {
    const result = await apiClient.get<any>("/api/v3/suppliers");
    expect(result.suppliers).toHaveLength(1);
    expect(result.suppliers[0].name).toBe("Acme Corp");
  });

  it("should create a supplier", async () => {
    const supplier = await apiClient.post<any>("/api/v3/suppliers", {
      supplier: { name: "New Supplier", email: "new@supplier.com" },
    });
    expect(supplier.id).toBe(2);
    expect(supplier.name).toBe("New Supplier");
  });
});
