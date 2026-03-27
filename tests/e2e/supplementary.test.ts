import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
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
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list chart of accounts", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/chart_of_accounts"));
    expect(result.chart_of_accounts).toHaveLength(1);
    expect(result.chart_of_accounts[0].name).toBe("Advertising");
  });

  it("should list tax rates", async () => {
    const taxRates = await apiClient.get<any[]>(apiClient.buildPath("/tax_rates"));
    expect(taxRates).toHaveLength(1);
    expect(taxRates[0].name).toBe("Standard VAT");
  });

  it("should list webhooks", async () => {
    const webhooks = await apiClient.get<any[]>(apiClient.buildPath("/webhooks"));
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0].name).toBe("My Webhook");
  });

  it("should list approval flows", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/approval_flows"));
    expect(result.approval_flows).toHaveLength(1);
    expect(result.approval_flows[0].name).toBe("Default Flow");
  });

  describe("Zod schema validation", () => {
    it("chart_of_accounts page must be a positive integer", () => {
      const schema = z.number().int().positive();
      const result = schema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it("forward_purchase_order requires emails as a string", () => {
      const schema = z.object({
        purchase_order_id: z.number().int().positive(),
        emails: z.string(),
      });
      const result = schema.safeParse({ purchase_order_id: 1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("emails"))).toBe(true);
      }
    });
  });
});
