import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient, ApiClientError } from "../../src/api-client.js";
import { MockApiServer } from "./setup.js";

describe("ApiClient E2E", () => {
  let mock: MockApiServer;
  let port: number;

  beforeAll(async () => {
    mock = new MockApiServer();

    // Register a simple success route
    mock.registerRoute({
      method: "GET",
      path: "/api/test/success",
      handler: () => ({ status: 200, body: { message: "ok" } }),
    });

    // Register a 401 error route
    mock.registerRoute({
      method: "GET",
      path: "/api/test/unauthorized",
      handler: () => ({ status: 401, body: { message: "Unauthorized" } }),
    });

    // Register a 404 error route
    mock.registerRoute({
      method: "GET",
      path: "/api/test/not-found",
      handler: () => ({ status: 404, body: { message: "Not found" } }),
    });

    // POST route
    mock.registerRoute({
      method: "POST",
      path: "/api/test/create",
      handler: (_req, body) => {
        const parsed = JSON.parse(body);
        return { status: 201, body: { id: 1, ...parsed } };
      },
    });

    port = await mock.start();
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should make a successful GET request", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    const result = await client.get<{ message: string }>("/api/test/success");
    expect(result.message).toBe("ok");
  });

  it("should throw ApiClientError on 401", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    try {
      await client.get("/api/test/unauthorized");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(401);
    }
  });

  it("should throw ApiClientError on 404", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    try {
      await client.get("/api/test/not-found");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(404);
    }
  });

  it("should make a successful POST request with body", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    const result = await client.post<{ id: number; name: string }>("/api/test/create", {
      name: "Test",
    });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Test");
  });

  it("should send V1 authentication_token header by default", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    client.setToken("test_token");
    client.setCompanyId("42");

    mock.clearRequests();
    await client.get("/api/test/success");

    const requests = mock.getRequests();
    expect(requests[0].headers.authentication_token).toBe("test_token");
    expect(requests[0].headers.app_company_id).toBe("42");
    expect(requests[0].headers["content-type"]).toBe("application/json");
  });

  it("should send V3 Bearer authorization header", async () => {
    const client = new ApiClient(`http://localhost:${port}`, "v3");
    client.setToken("test_token");

    mock.clearRequests();
    await client.get("/api/test/success");

    const requests = mock.getRequests();
    expect(requests[0].headers.authorization).toBe("Bearer test_token");
  });

  it("should clear token", async () => {
    const client = new ApiClient(`http://localhost:${port}`);
    client.setToken("test_token");
    expect(client.getToken()).toBe("test_token");
    client.clearToken();
    expect(client.getToken()).toBeNull();
  });

  it("should build versioned paths correctly", () => {
    const v1Client = new ApiClient("http://example.com", "v1");
    expect(v1Client.buildPath("/budgets")).toBe("/api/v1/budgets");
    expect(v1Client.buildPath("/oauth/token")).toBe("/oauth/token");
    expect(v1Client.buildPath("/api/v3/test")).toBe("/api/v3/test");

    const v3Client = new ApiClient("http://example.com", "v3");
    expect(v3Client.buildPath("/budgets")).toBe("/api/v3/budgets");
  });

  it("should default to v1 API version", () => {
    const client = new ApiClient();
    expect(client.getApiVersion()).toBe("v1");
  });
});
