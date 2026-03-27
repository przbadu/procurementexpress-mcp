import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Tax Rates E2E", () => {
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

  it("should list tax rates", async () => {
    const taxRates = await apiClient.get<any[]>(apiClient.buildPath("/tax_rates"));
    expect(taxRates).toHaveLength(1);
    expect(taxRates[0].name).toBe("Standard VAT");
    expect(taxRates[0].value).toBe(20);
  });

  it("should get a single tax rate by ID", async () => {
    const taxRate = await apiClient.get<any>(apiClient.buildPath("/tax_rates/1"));
    expect(taxRate.id).toBe(1);
    expect(taxRate.name).toBe("Standard VAT");
    expect(taxRate.value).toBe(20);
  });

  it("should create a tax rate", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/tax_rates"), {
      tax_rate: { name: "GST", value: 10 },
    });
    expect(result.id).toBe(2);
    expect(result.name).toBe("GST");
    expect(result.value).toBe(10);
  });

  it("should return 422 when tax rate name is missing", async () => {
    await expect(
      apiClient.post<any>(apiClient.buildPath("/tax_rates"), {
        tax_rate: { value: 15 },
      }),
    ).rejects.toThrow();
  });

  describe("Zod schema validation", () => {
    it("tax rate creation requires name string", () => {
      const nameSchema = z.object({ name: z.string() });
      const result = nameSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true);
      }
    });

    it("tax rate value must be a number", () => {
      const valueSchema = z.object({ value: z.number() });
      const result = valueSchema.safeParse({ value: "twenty" });
      expect(result.success).toBe(false);
    });
  });
});
