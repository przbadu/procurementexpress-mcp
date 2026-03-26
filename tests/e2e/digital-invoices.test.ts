import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Digital Invoices E2E", () => {
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

  it("create_digital_invoice - should create invoice from uploaded file", async () => {
    // Create a FormData with a test file (base64 of "test")
    const fileContent = Buffer.from("test", "utf8");
    const blob = new Blob([fileContent], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, "test.pdf");
    form.append("upload_type", "invoice");

    const result = await apiClient.postMultipart<any>(
      apiClient.buildPath("/digital_invoices"),
      form,
    );

    expect(result.id).toBe(100);
    expect(result.invoice_number).toBe("DIG-001");
    expect(result.status).toBe("Draft");
  });

  it("create_digital_invoice - should create purchase order from uploaded file with request type", async () => {
    const fileContent = Buffer.from("test document", "utf8");
    const blob = new Blob([fileContent], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, "po-scan.pdf");
    form.append("upload_type", "request");

    const result = await apiClient.postMultipart<any>(
      apiClient.buildPath("/digital_invoices"),
      form,
    );

    expect(result.id).toBe(100);
    expect(result.invoice_number).toBe("DIG-001");
  });
});
