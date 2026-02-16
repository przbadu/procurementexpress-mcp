import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Supplementary E2E", () => {
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

  it("should list chart of accounts", async () => {
    const result = await apiClient.get<any>("/api/v3/chart_of_accounts");
    expect(result.chart_of_accounts).toHaveLength(1);
    expect(result.chart_of_accounts[0].name).toBe("Advertising");
  });

  it("should list tax rates", async () => {
    const taxRates = await apiClient.get<any[]>("/api/v3/tax_rates");
    expect(taxRates).toHaveLength(1);
    expect(taxRates[0].name).toBe("Standard VAT");
  });

  it("should list webhooks", async () => {
    const webhooks = await apiClient.get<any[]>("/api/v3/webhooks");
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0].name).toBe("My Webhook");
  });

  it("should list approval flows", async () => {
    const result = await apiClient.get<any>("/api/v1/approval_flows");
    expect(result.approval_flows).toHaveLength(1);
    expect(result.approval_flows[0].name).toBe("Default Flow");
  });
});
