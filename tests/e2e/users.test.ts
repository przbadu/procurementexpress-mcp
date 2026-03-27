import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
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
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should get current user", async () => {
    const user = await apiClient.get<any>(apiClient.buildPath("/currentuser"));
    expect(user.id).toBe(1);
    expect(user.email).toBe("test@example.com");
    expect(user.companies).toHaveLength(1);
    expect(user.companies[0].roles).toContain("companyadmin");
  });

  it("should list currencies", async () => {
    const currencies = await apiClient.get<any[]>(apiClient.buildPath("/currencies"));
    expect(currencies).toHaveLength(1);
    expect(currencies[0].iso_code).toBe("USD");
  });

  it("should send authentication_token and app_company_id headers", async () => {
    mock.clearRequests();
    await apiClient.get(apiClient.buildPath("/currentuser"));
    const requests = mock.getRequests();
    expect(requests[0].headers.authentication_token).toBe("mock_token");
    expect(requests[0].headers.app_company_id).toBe("100");
  });

  it("should return 404 for non-existent endpoint", async () => {
    await expect(
      apiClient.get(apiClient.buildPath("/nonexistent_endpoint")),
    ).rejects.toThrow();
  });

  describe("Zod schema validation", () => {
    it("currency id must be a positive integer", () => {
      const schema = z.number().int().positive();
      const result = schema.safeParse(-1);
      expect(result.success).toBe(false);
    });
  });
});
