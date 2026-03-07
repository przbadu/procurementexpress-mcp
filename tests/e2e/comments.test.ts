import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Comments E2E", () => {
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

  it("should add a comment to a purchase order", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/purchase_orders/1/comments"), {
      comment: "This looks good!",
    });
    expect(result.id).toBe(1);
    expect(result.comment).toBe("This looks good!");
    expect(result.creator_name).toBe("Test User");
  });
});
