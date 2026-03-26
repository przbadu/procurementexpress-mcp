import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Policies E2E", () => {
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

  it("list_policies: should return policies array with pagination meta", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/policies"));
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].id).toBe(1);
    expect(result.policies[0].name).toBe("Budget Policy");
    expect(result.policies[0].status).toBe("active");
    expect(result.policies[0].scope).toBe("company");
    expect(result.meta.total_count).toBe(1);
    expect(result.meta.current_page).toBe(1);
  });

  it("list_policies: should support query params filter", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/policies") + "?status=active");
    expect(result.policies).toBeDefined();
    expect(Array.isArray(result.policies)).toBe(true);
  });

  it("get_policy: should return policy detail with content and version history", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/policies/1"));
    expect(result.policy.id).toBe(1);
    expect(result.policy.name).toBe("Budget Policy");
    expect(result.policy.content).toBe("All purchases over $10,000 require 3 quotes.");
    expect(Array.isArray(result.versions)).toBe(true);
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].event).toBe("create");
    expect(result.versions[0].whodunnit_name).toBe("Test User");
  });

  it("create_policy: should create a policy and return the new record", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/policies"), {
      policy: {
        name: "New Procurement Policy",
        status: "active",
        scope: "company",
        category: "spending",
        max_amount: 5000,
      },
    });
    expect(result.id).toBe(10);
    expect(result.name).toBe("New Procurement Policy");
    expect(result.archived).toBe(false);
    expect(Array.isArray(result.budget_ids)).toBe(true);
  });

  it("create_policy: should require a name", async () => {
    await expect(
      apiClient.post<any>(apiClient.buildPath("/policies"), { policy: {} }),
    ).rejects.toThrow();
  });

  it("update_policy: should update a policy and return updated record", async () => {
    const result = await apiClient.patch<any>(apiClient.buildPath("/policies/1"), {
      policy: { name: "Updated Policy", status: "inactive" },
    });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Updated Policy");
  });

  it("delete_policy: should delete a policy (204 no content)", async () => {
    // delete returns empty body with 204 — apiClient wraps it
    await expect(apiClient.delete(apiClient.buildPath("/policies/1"))).resolves.toBeDefined();
  });

  it("list_policy_templates: should return available templates", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/policy_templates"));
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0].id).toBe(1);
    expect(result.templates[0].name).toBe("Sole Source Policy");
    expect(result.templates[0].category).toBe("sourcing");
    expect(result.templates[1].name).toBe("Travel Policy");
  });
});
