import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Purchase Orders E2E", () => {
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

  it("should list purchase orders", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/purchase_orders"));
    expect(result.purchase_orders).toHaveLength(1);
    expect(result.purchase_orders[0].status).toBe("Pending");
  });

  it("should get purchase order details", async () => {
    const po = await apiClient.get<any>(apiClient.buildPath("/purchase_orders/1"));
    expect(po.id).toBe(1);
    expect(po.purchase_order_items).toHaveLength(1);
    expect(po.approver_requests).toHaveLength(1);
    expect(po.approver_requests[0].accept_token).toBe("accept_123");
    expect(po.can_cancel).toBe(true);
  });

  it("should create a purchase order", async () => {
    const po = await apiClient.post<any>(apiClient.buildPath("/purchase_orders"), {
      commit: "Send",
      purchase_order: {
        creator_id: 1,
        currency_id: 1,
        supplier_id: 1,
        purchase_order_items_attributes: [
          { description: "Widget", quantity: 5, unit_price: 9.99 },
        ],
      },
    });
    expect(po.id).toBe(2);
    expect(po.status).toBe("Pending");
  });

  it("should create a draft purchase order", async () => {
    const po = await apiClient.post<any>(apiClient.buildPath("/purchase_orders"), {
      commit: "Draft",
      purchase_order: {
        creator_id: 1,
        currency_id: 1,
        purchase_order_items_attributes: [
          { description: "Draft Item", quantity: 1, unit_price: 100 },
        ],
      },
    });
    expect(po.status).toBe("Draft");
  });

  it("should get pending request count", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/purchase_orders/pending_request_count"));
    expect(result.total_pending_request).toBe(3);
  });

  it("should cancel a purchase order", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/purchase_orders/1/cancel"));
    expect(result.status).toBe("Cancelled");
  });
});
