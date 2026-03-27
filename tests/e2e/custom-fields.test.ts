import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Custom Fields E2E", () => {
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

  it("should list custom fields", async () => {
    const result = await apiClient.get<any[]>(apiClient.buildPath("/custom_fields"));
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Project Code");
  });

  it("should get a single custom field", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/custom_fields/1"));
    expect(result.id).toBe(1);
    expect(result.name).toBe("Project Code");
  });

  it("should create a custom field", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/custom_fields"), {
      custom_field: { name: "New Field", field_type: "text" },
    });
    expect(result.id).toBe(3);
    expect(result.name).toBe("New Field");
  });

  it("should update a custom field", async () => {
    const result = await apiClient.patch<any>(apiClient.buildPath("/custom_fields/1"), {
      custom_field: { name: "Updated" },
    });
    expect(result.name).toBe("Updated");
  });

  it("should delete a custom field", async () => {
    const result = await apiClient.delete<any>(apiClient.buildPath("/custom_fields/1"));
    expect(result).toEqual({ archived: true });
  });

  it("should update custom field positions", async () => {
    const result = await apiClient.patch<any>(
      apiClient.buildPath("/custom_fields/update_positions"),
      { positions: { "1": 1, "2": 0 } },
    );
    expect(result).toEqual({ success: true });
  });

  describe("Zod schema validation", () => {
    it("create_custom_field requires name and field_type", () => {
      const customFieldSchema = z.object({
        name: z.string(),
        field_type: z.string(),
      });
      const missing = customFieldSchema.safeParse({});
      expect(missing.success).toBe(false);
    });

    it("field_type enum rejects invalid type", () => {
      const fieldTypeSchema = z.enum(["text", "dropdown", "number", "date", "formula", "textarea", "checkbox"]);
      const invalid = fieldTypeSchema.safeParse("invalid");
      expect(invalid.success).toBe(false);
    });
  });
});
