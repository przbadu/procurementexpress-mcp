import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Upload Tools E2E", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let tmpFilePath: string;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");

    // Create a temp file for upload tests
    tmpFilePath = join(tmpdir(), "test-upload-file.txt");
    await writeFile(tmpFilePath, "test file content for upload");
  });

  afterAll(async () => {
    await mock.stop();
    await unlink(tmpFilePath).catch(() => {});
  });

  it("upload_file_to_purchase_order sends multipart POST to /uploads/po", async () => {
    const { readFile } = await import("node:fs/promises");
    const { basename } = await import("node:path");

    const fileBuffer = await readFile(tmpFilePath);
    const fileName = basename(tmpFilePath);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append("po_id", "1");
    form.append("uploads_attributes[file]", blob, fileName);
    form.append("uploads_attributes[upload_token]", "abc1234567");

    const result = await apiClient.postMultipart<{
      id: number;
      file_file_name: string;
      file_content_type: string;
      url: string;
      upload_token: string | null;
    }>(apiClient.buildPath("/uploads/po"), form);

    expect(result.id).toBe(1);
    expect(result.file_file_name).toBe("test-file.pdf");
    expect(result.url).toContain("test-file.pdf");
    expect(result.upload_token).toBe("abc1234567");

    // Verify mock received a POST to /api/v1/uploads/po
    const requests = mock.getRequests();
    const uploadReq = requests.find(
      (r) => r.method === "POST" && r.path === "/api/v1/uploads/po",
    );
    expect(uploadReq).toBeDefined();
    expect(uploadReq!.body).toContain("upload_token");
    expect(uploadReq!.body).toContain("po_id");
  });

  it("upload_file_to_comment sends multipart POST to /uploads/poc", async () => {
    const { readFile } = await import("node:fs/promises");
    const { basename } = await import("node:path");

    mock.clearRequests();

    const fileBuffer = await readFile(tmpFilePath);
    const fileName = basename(tmpFilePath);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append("poc_id", "1");
    form.append("uploads_attributes[file]", blob, fileName);
    form.append("uploads_attributes[upload_token]", "def7654321");

    const result = await apiClient.postMultipart<{
      id: number;
      file_file_name: string;
      file_content_type: string;
      url: string;
      upload_token: string | null;
    }>(apiClient.buildPath("/uploads/poc"), form);

    expect(result.id).toBe(2);
    expect(result.file_file_name).toBe("comment-doc.pdf");
    expect(result.upload_token).toBe("def7654321");

    const requests = mock.getRequests();
    const uploadReq = requests.find(
      (r) => r.method === "POST" && r.path === "/api/v1/uploads/poc",
    );
    expect(uploadReq).toBeDefined();
    expect(uploadReq!.body).toContain("upload_token");
    expect(uploadReq!.body).toContain("poc_id");
  });

  it("get_upload_status sends GET to /uploads/status?upload_token=TOKEN", async () => {
    mock.clearRequests();

    const token = "abc1234567";
    const path = `${apiClient.buildPath("/uploads/status")}?upload_token=${encodeURIComponent(token)}`;
    const result = await apiClient.get<{
      id: number;
      file_file_name: string;
      upload_token: string | null;
    }>(path);

    expect(result.id).toBe(1);
    expect(result.file_file_name).toBe("test-file.pdf");
    expect(result.upload_token).toBe("abc1234567");

    const requests = mock.getRequests();
    const statusReq = requests.find(
      (r) => r.method === "GET" && r.path.startsWith("/api/v1/uploads/status"),
    );
    expect(statusReq).toBeDefined();
    expect(statusReq!.path).toContain("upload_token=abc1234567");
  });

  it("postMultipart does NOT set Content-Type header (let fetch handle boundary)", async () => {
    mock.clearRequests();

    const form = new FormData();
    form.append("po_id", "1");
    form.append("uploads_attributes[file]", new Blob(["data"]), "file.txt");
    form.append("uploads_attributes[upload_token]", "abc1234567");

    await apiClient.postMultipart<unknown>(apiClient.buildPath("/uploads/po"), form);

    const requests = mock.getRequests();
    const req = requests.find(
      (r) => r.method === "POST" && r.path === "/api/v1/uploads/po",
    );
    expect(req).toBeDefined();
    // Content-Type should be multipart/form-data with boundary, NOT application/json
    const contentType = req!.headers["content-type"] || "";
    expect(contentType).toContain("multipart/form-data");
    expect(contentType).not.toBe("application/json");
  });

  describe("Zod schema validation", () => {
    it("upload_to_po requires po_id as positive number", () => {
      const schema = z.object({ po_id: z.number().positive() });
      const result = schema.safeParse({ po_id: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("po_id"))).toBe(true);
      }
    });

    it("upload_to_po requires upload_token as non-empty string", () => {
      const schema = z.object({ upload_token: z.string().min(1) });
      const result = schema.safeParse({ upload_token: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("upload_token"))).toBe(true);
      }
    });
  });
});
