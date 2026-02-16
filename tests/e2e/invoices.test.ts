import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Invoices E2E", () => {
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

  it("should list invoices", async () => {
    const result = await apiClient.get<any>("/api/v3/invoices");
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoice_number).toBe("INV-001");
  });

  it("should get invoice details", async () => {
    const invoice = await apiClient.get<any>("/api/v3/invoices/1");
    expect(invoice.id).toBe(1);
    expect(invoice.can_approve).toBe(true);
  });

  it("should create an invoice", async () => {
    const invoice = await apiClient.post<any>("/api/v3/invoices", {
      invoice: {
        invoice_number: "INV-002",
        gross_amount: 2500,
        currency_id: 1,
        company_id: 100,
      },
    });
    expect(invoice.id).toBe(2);
    expect(invoice.invoice_number).toBe("INV-002");
  });

  it("should approve an invoice", async () => {
    const result = await apiClient.put<any>("/api/v3/invoices/1/approve");
    expect(result.status).toBe("Approved");
  });
});
