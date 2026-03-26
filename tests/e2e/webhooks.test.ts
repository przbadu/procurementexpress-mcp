import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Webhooks E2E", () => {
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

  it("should list webhooks", async () => {
    const webhooks = await apiClient.get<any[]>(apiClient.buildPath("/webhooks"));
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0].name).toBe("My Webhook");
    expect(webhooks[0].url).toBe("https://example.com/hook");
  });

  it("should get a single webhook by ID", async () => {
    const webhook = await apiClient.get<any>(apiClient.buildPath("/webhooks/1"));
    expect(webhook.id).toBe(1);
    expect(webhook.url).toBe("https://example.com/hook");
    expect(webhook.event_type).toContain("new_po");
  });

  it("should create a webhook", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/webhooks"), {
      webhook: {
        name: "New Hook",
        url: "https://example.com/new-hook",
        event_type: ["new_po", "po_approved"],
      },
    });
    expect(result.id).toBe(2);
    expect(result.url).toBe("https://example.com/new-hook");
  });

  it("should return 422 when webhook url is missing", async () => {
    await expect(
      apiClient.post<any>(apiClient.buildPath("/webhooks"), {
        webhook: { name: "No URL Hook", event_type: ["new_po"] },
      }),
    ).rejects.toThrow();
  });

  it("should delete a webhook", async () => {
    const result = await apiClient.delete<any>(apiClient.buildPath("/webhooks/1"));
    expect(result).toBeDefined();
  });

  describe("Zod schema validation", () => {
    it("webhook creation requires url", () => {
      const urlSchema = z.object({ url: z.string().url() });
      const result = urlSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("url"))).toBe(true);
      }
    });

    it("event_type enum rejects invalid value", () => {
      const eventSchema = z.enum([
        "new_po",
        "po_approved",
        "po_delivered",
        "po_paid",
        "po_cancelled",
        "po_update",
      ]);
      const result = eventSchema.safeParse("invalid_event");
      expect(result.success).toBe(false);
    });
  });
});
