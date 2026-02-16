import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Users E2E", () => {
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

  it("should get current user", async () => {
    const user = await apiClient.get<any>("/api/v1/currentuser");
    expect(user.id).toBe(1);
    expect(user.email).toBe("test@example.com");
    expect(user.companies).toHaveLength(1);
    expect(user.companies[0].roles).toContain("companyadmin");
  });

  it("should list currencies", async () => {
    const currencies = await apiClient.get<any[]>("/api/v3/currencies");
    expect(currencies).toHaveLength(1);
    expect(currencies[0].iso_code).toBe("USD");
  });

  it("should send app_company_id header", async () => {
    mock.clearRequests();
    await apiClient.get("/api/v1/currentuser");
    const requests = mock.getRequests();
    expect(requests[0].headers.app_company_id).toBe("100");
  });
});
