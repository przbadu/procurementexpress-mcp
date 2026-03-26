import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Chat Messages E2E (V3 only tools)", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    // Chat messages are V3-only, but the mock routes use version-agnostic regex
    // so we can test the HTTP layer with either version
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("list_chat_messages — should return messages array for a purchase order", async () => {
    const params = new URLSearchParams({
      document_type: "purchase_order",
      document_id: "1",
      supplier_id: "1",
    });
    const result = await apiClient.get<any>(
      `${apiClient.buildPath("/chat_messages")}?${params.toString()}`,
    );
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].body).toBe("Hello, can you confirm delivery?");
    expect(result.messages[0].creator.name).toBe("Test User");
    expect(result.next_cursor).toBeNull();
  });

  it("list_chat_messages — should support optional before_id cursor for pagination", async () => {
    const params = new URLSearchParams({
      document_type: "invoice",
      document_id: "5",
      supplier_id: "1",
      before_id: "10",
    });
    const result = await apiClient.get<any>(
      `${apiClient.buildPath("/chat_messages")}?${params.toString()}`,
    );
    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it("create_chat_message — should create a message and return the new message object", async () => {
    mock.clearRequests();
    const body = {
      document_type: "purchase_order",
      document_id: 1,
      supplier_id: 1,
      body: "Test message",
    };
    const result = await apiClient.post<any>(apiClient.buildPath("/chat_messages"), body);
    expect(result.id).toBe(3);
    expect(result.body).toBe("Test message");
    expect(result.creator.name).toBe("Test User");

    // Verify params are NOT nested under a root key
    const requests = mock.getRequests();
    const createRequest = requests.find(
      (r) => r.method === "POST" && r.path.includes("/chat_messages"),
    );
    expect(createRequest).toBeDefined();
    const parsedBody = JSON.parse(createRequest!.body);
    // Should have document_type at top level, not nested under a root key
    expect(parsedBody.document_type).toBe("purchase_order");
    expect(parsedBody.document_id).toBe(1);
    expect(parsedBody.supplier_id).toBe(1);
    expect(parsedBody.body).toBe("Test message");
    // Should NOT be nested
    expect(parsedBody.chat_message).toBeUndefined();
    expect(parsedBody.message).toBeUndefined();
  });

  it("delete_chat_message — should delete a message and return success", async () => {
    mock.clearRequests();
    const params = new URLSearchParams({
      document_type: "purchase_order",
      document_id: "1",
      supplier_id: "1",
    });
    // apiClient.delete returns parsed JSON; 204 body will be {}
    const result = await apiClient.delete<any>(
      `${apiClient.buildPath("/chat_messages/1")}?${params.toString()}`,
    );
    expect(result).toBeDefined();

    // Verify delete request included query params
    const requests = mock.getRequests();
    const deleteRequest = requests.find((r) => r.method === "DELETE");
    expect(deleteRequest).toBeDefined();
    expect(deleteRequest!.path).toContain("document_type=purchase_order");
    expect(deleteRequest!.path).toContain("document_id=1");
    expect(deleteRequest!.path).toContain("supplier_id=1");
  });
});
