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
    apiClient = new ApiClient(`http://localhost:${port}`);
    const auth = new AuthManager(apiClient, "test_client_id", "test_client_secret");
    await auth.authenticate("test@example.com", "password123");
    apiClient.setCompanyId("100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should add a comment to a purchase order", async () => {
    const result = await apiClient.post<any>("/api/v3/purchase_order/1/comments", {
      comment: "This looks good!",
    });
    expect(result.id).toBe(1);
    expect(result.comment).toBe("This looks good!");
    expect(result.creator_name).toBe("Test User");
  });
});
