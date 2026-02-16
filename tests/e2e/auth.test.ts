import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Authentication E2E - V3 (OAuth2)", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let authManager: AuthManager;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v3");
    authManager = new AuthManager(apiClient, "test_client_id", "test_client_secret");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should authenticate with valid credentials via OAuth2", async () => {
    const response = await authManager.authenticateV3("test@example.com", "password123");
    expect(response.access_token).toBe("mock_access_token_123");
    expect(response.token_type).toBe("Bearer");
    expect(response.expires_in).toBe(7200);
    expect(apiClient.getToken()).toBe("mock_access_token_123");
  });

  it("should fail authentication with invalid credentials", async () => {
    const badClient = new ApiClient(`http://localhost:${(mock as any).server.address().port}`, "v3");
    const badAuth = new AuthManager(badClient, "test_client_id", "test_client_secret");
    await expect(badAuth.authenticateV3("bad@example.com", "wrong")).rejects.toThrow();
  });

  it("should validate a V3 token", async () => {
    const info = await authManager.validateToken();
    expect((info as any).resource_owner_id).toBe(1);
    expect((info as any).scopes).toContain("public");
  });

  it("should revoke a V3 token", async () => {
    await authManager.revokeToken();
    expect(apiClient.getToken()).toBeNull();
  });

  it("should send Bearer authorization header for V3", async () => {
    mock.clearRequests();
    await authManager.authenticateV3("test@example.com", "password123");
    await authManager.validateToken();

    const requests = mock.getRequests();
    const validateReq = requests.find((r) => r.path === "/oauth/token/info");
    expect(validateReq?.headers.authorization).toBe("Bearer mock_access_token_123");
  });

  it("should report isV1 as false", () => {
    expect(authManager.isV1()).toBe(false);
  });
});

describe("Authentication E2E - V1 (Token)", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let authManager: AuthManager;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    authManager = new AuthManager(apiClient);
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should authenticate with V1 token and company ID", () => {
    authManager.authenticateV1("static_token_abc", "100");
    expect(apiClient.getToken()).toBe("static_token_abc");
    expect(apiClient.getCompanyId()).toBe("100");
  });

  it("should send authentication_token header for V1", async () => {
    mock.clearRequests();
    await authManager.validateToken();

    const requests = mock.getRequests();
    const req = requests[0];
    expect(req.headers.authentication_token).toBe("static_token_abc");
    expect(req.headers.app_company_id).toBe("100");
    expect(req.headers.authorization).toBeUndefined();
  });

  it("should validate V1 token by calling currentuser", async () => {
    const user = await authManager.validateToken();
    expect((user as any).id).toBe(1);
    expect((user as any).email).toBe("test@example.com");
  });

  it("should revoke V1 token by clearing locally", async () => {
    await authManager.revokeToken();
    expect(apiClient.getToken()).toBeNull();
  });

  it("should report isV1 as true", () => {
    expect(authManager.isV1()).toBe(true);
  });
});
