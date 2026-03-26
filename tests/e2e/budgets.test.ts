import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Budgets E2E", () => {
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

  it("should list budgets", async () => {
    const result = await apiClient.get<any[]>(apiClient.buildPath("/budgets"));
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Q1 Budget");
  });

  it("should get a specific budget", async () => {
    const budget = await apiClient.get<any>(apiClient.buildPath("/budgets/1"));
    expect(budget.id).toBe(1);
    expect(budget.remaining_amount).toBe(30000);
  });

  it("should create a budget", async () => {
    const budget = await apiClient.post<any>(apiClient.buildPath("/budgets"), {
      budget: { name: "New Budget", amount: 10000, currency_id: 1, creator_id: 1 },
    });
    expect(budget.id).toBe(3);
    expect(budget.name).toBe("New Budget");
  });

  describe("Zod schema validation", () => {
    it("budget creation requires name (string)", () => {
      const budgetSchema = z.object({
        name: z.string(),
        amount: z.number().optional(),
        currency_id: z.number().int().optional(),
      });
      const missingName = budgetSchema.safeParse({ amount: 10000 });
      expect(missingName.success).toBe(false);

      const wrongType = budgetSchema.safeParse({ name: 123 });
      expect(wrongType.success).toBe(false);
    });
  });
});
