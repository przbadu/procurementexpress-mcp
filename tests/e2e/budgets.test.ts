import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    apiClient = new ApiClient(`http://localhost:${port}`);
    const auth = new AuthManager(apiClient, "test_client_id", "test_client_secret");
    await auth.authenticate("test@example.com", "password123");
    apiClient.setCompanyId("100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list budgets", async () => {
    const result = await apiClient.get<any>("/api/v3/budgets");
    expect(result.budgets).toHaveLength(2);
    expect(result.meta.total_count).toBe(2);
    expect(result.budgets[0].name).toBe("Q1 Budget");
  });

  it("should get a specific budget", async () => {
    const budget = await apiClient.get<any>("/api/v3/budgets/1");
    expect(budget.id).toBe(1);
    expect(budget.remaining_amount).toBe(30000);
  });

  it("should create a budget", async () => {
    const budget = await apiClient.post<any>("/api/v3/budgets", {
      budget: { name: "New Budget", amount: 10000, currency_id: 1, creator_id: 1 },
    });
    expect(budget.id).toBe(3);
    expect(budget.name).toBe("New Budget");
  });
});
