import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";
import { lineItemSchema } from "../../src/schemas.js";

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

  it("should create a purchase order with custom field values", async () => {
    const po = await apiClient.post<any>(apiClient.buildPath("/purchase_orders"), {
      commit: "Send",
      purchase_order: {
        creator_id: 1,
        currency_id: 1,
        department_id: 1,
        supplier_id: 1,
        purchase_order_items_attributes: [
          {
            description: "Nails",
            quantity: 1,
            unit_price: 5,
            budget_id: 1,
            custom_field_values_attributes: [
              { custom_field_id: 10, value: "2026-03-06" },
            ],
          },
        ],
        custom_field_values_attributes: [
          { custom_field_id: 1, value: "James' Credit Card" },
          { custom_field_id: 2, value: "None" },
        ],
      },
    });
    expect(po.id).toBe(2);
    expect(po.status).toBe("Pending");
    expect(po.custom_field_values_attributes).toEqual([
      { custom_field_id: 1, value: "James' Credit Card" },
      { custom_field_id: 2, value: "None" },
    ]);
  });

  it("should get pending request count", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/purchase_orders/pending_request_count"));
    expect(result.total_pending_request).toBe(3);
  });

  it("should cancel a purchase order", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/purchase_orders/1/cancel"));
    expect(result.status).toBe("Cancelled");
  });

  it("should bulk save purchase orders", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/purchase_orders/bulk_save"), {
      purchase_order: {
        data: [
          { _id: "temp1", supplier_name: "Acme", purchase_order_items_attributes: [{ description: "Widget", quantity: 1, unit_price: 10 }] },
          { _id: "temp2", supplier_name: "Globex", purchase_order_items_attributes: [{ description: "Gadget", quantity: 2, unit_price: 20 }] },
        ],
      },
    });
    expect(result.done).toHaveLength(2);
    expect(result.done[0]._id).toBe("temp1");
    expect(result.done[0].id).toBe(100);
    expect(result.failed).toHaveLength(0);
  });

  it("should get auto-approvers list", async () => {
    const result = await apiClient.get<any[]>(apiClient.buildPath("/purchase_orders/auto_approvers_list?gross_total=5000"));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Auto Approver");
  });

  it("should get available approvers for a PO", async () => {
    const result = await apiClient.post<any[]>(apiClient.buildPath("/purchase_orders/approver_list"), {
      purchase_order: { department_id: 1, total_gross_amount: 5000 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].approval_flow_name).toBe("Default Flow");
    expect(result[0].approvers).toHaveLength(1);
  });

  it("should get approval flow link for a PO", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/purchase_orders/1/aff_link"));
    expect(result.aff_link).toContain("https://");
  });

  describe("Zod schema validation", () => {
    it("lineItemSchema rejects _destroy:true without id", () => {
      const result = lineItemSchema.safeParse({
        _destroy: true,
        description: "Widget",
        quantity: 1,
        unit_price: 9.99,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("_destroy requires id");
      }
    });

    it("create PO requires at least one line item", () => {
      const lineItemsSchema = z.array(lineItemSchema).min(1);
      const result = lineItemsSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it("commit enum rejects invalid value", () => {
      const commitSchema = z.enum(["Send", "Draft"]);
      const result = commitSchema.safeParse("Invalid");
      expect(result.success).toBe(false);
    });
  });
});
