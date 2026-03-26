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
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list suppliers", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/suppliers"));
    expect(result.suppliers).toHaveLength(1);
    expect(result.suppliers[0].name).toBe("Acme Corp");
  });

  it("should create a supplier", async () => {
    const supplier = await apiClient.post<any>(apiClient.buildPath("/suppliers"), {
      supplier: { name: "New Supplier", email: "new@supplier.com" },
    });
    expect(supplier.id).toBe(2);
    expect(supplier.name).toBe("New Supplier");
  });

  it("check_sam_gov - should check supplier against SAM.gov", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/sam_gov/check"), {
      supplier_id: 1,
    });
    expect(result.status).toBe("active");
    expect(result.supplier_name).toBe("Acme Corp");
    expect(result.uei).toBe("ABC123DEF456");
    expect(result.supplier_id).toBe(1);
    expect(result.has_active_exclusions).toBe(false);
  });

  it("list_supplier_approvals - should list pending supplier approval requests", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/supplier_approvals"));
    expect(result.supplier_approvals).toHaveLength(1);
    expect(result.supplier_approvals[0].name).toBe("New Vendor Co");
    expect(result.supplier_approvals[0].status).toBe("pending");
    expect(result.meta.total_count).toBe(1);
  });
});
