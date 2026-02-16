import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Authentication E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let authManager: AuthManager;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`);
    authManager = new AuthManager(apiClient, "test_client_id", "test_client_secret");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should authenticate with valid credentials", async () => {
    const response = await authManager.authenticate("test@example.com", "password123");
    expect(response.access_token).toBe("mock_access_token_123");
    expect(response.token_type).toBe("Bearer");
    expect(response.expires_in).toBe(7200);
    expect(apiClient.getToken()).toBe("mock_access_token_123");
  });

  it("should fail authentication with invalid credentials", async () => {
    const badClient = new ApiClient(`http://localhost:${mock.getRequests().length > 0 ? (mock as any).server.address().port : 0}`);
    const badAuth = new AuthManager(badClient, "test_client_id", "test_client_secret");
    await expect(badAuth.authenticate("bad@example.com", "wrong")).rejects.toThrow();
  });

  it("should validate a token", async () => {
    const info = await authManager.validateToken();
    expect(info.resource_owner_id).toBe(1);
    expect(info.scopes).toContain("public");
  });

  it("should revoke a token", async () => {
    await authManager.revokeToken();
    expect(apiClient.getToken()).toBeNull();
  });

  it("should send correct authorization headers", async () => {
    mock.clearRequests();
    await authManager.authenticate("test@example.com", "password123");
    await authManager.validateToken();

    const requests = mock.getRequests();
    const validateReq = requests.find((r) => r.path === "/oauth/token/info");
    expect(validateReq?.headers.authorization).toBe("Bearer mock_access_token_123");
  });
});
