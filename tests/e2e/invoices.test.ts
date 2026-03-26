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
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list invoices", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/invoices"));
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoice_number).toBe("INV-001");
  });

  it("should get invoice details", async () => {
    const invoice = await apiClient.get<any>(apiClient.buildPath("/invoices/1"));
    expect(invoice.id).toBe(1);
    expect(invoice.can_approve).toBe(true);
  });

  it("should create an invoice", async () => {
    const invoice = await apiClient.post<any>(apiClient.buildPath("/invoices"), {
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
    const result = await apiClient.put<any>(apiClient.buildPath("/invoices/1/approve"));
    expect(result.status).toBe("Approved");
  });

  it("should list purchase orders available for invoice linking", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/invoices/purchase_order_list"));
    expect(result.purchase_orders).toHaveLength(2);
    expect(result.purchase_orders[0].supplier_name).toBe("Acme Corp");
  });

  it("should list purchase order items for invoice linking", async () => {
    const result = await apiClient.get<any[]>(
      `${apiClient.buildPath("/invoices/purchase_order_item_list")}?purchase_order_ids[]=1`
    );
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Widget");
  });

  it("should rerun invoice approval flow", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/invoices/1/rerun_approval_flow"));
    expect(result.id).toBe(1);
    expect(result.status).toBe("Pending");
  });
});
