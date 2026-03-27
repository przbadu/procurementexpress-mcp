import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Comments E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);

    // Register invoice comments mock route
    mock.registerRoute({
      method: "POST",
      path: /^\/api\/v[13]\/invoices\/\d+\/comments$/,
      handler: (_req, body) => {
        const parsed = JSON.parse(body);
        if (!parsed.invoice_comments?.comment) {
          return { status: 422, body: { error: "Comment text is required" } };
        }
        return {
          status: 201,
          body: { id: 2, comment: parsed.invoice_comments.comment, creator_name: "Test User" },
        };
      },
    });

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

  it("should add a comment to an invoice", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/invoices/1/comments"), {
      invoice_comments: { comment: "Invoice note" },
    });
    expect(result.id).toBe(2);
    expect(result.comment).toBe("Invoice note");
    expect(result.creator_name).toBe("Test User");
  });

  describe("Zod schema validation", () => {
    it("PO comment requires non-empty text", () => {
      const commentSchema = z.object({ text: z.string().min(1) });
      const emptyText = commentSchema.safeParse({ text: "" });
      expect(emptyText.success).toBe(false);
    });
  });
});
