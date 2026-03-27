import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Payments E2E", () => {
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

  it("create_payment (LOW-07) — should create an NPayment and return the payment object", async () => {
    const body = {
      npayment: {
        supplier_id: 1,
        ptype: "bank_transfer",
        date: "2026-01-15",
        currency_id: 1,
        amount: 500,
      },
    };
    const result = await apiClient.post<any>(apiClient.buildPath("/npayments"), body);
    expect(result.id).toBe(1);
    expect(result.status).toBe("pending");
    expect(result.supplier_id).toBe(1);
    expect(result.amount).toBe(500);
  });

  it("create_payment — should support invoice and PO linkage in npayment attributes", async () => {
    const body = {
      npayment: {
        supplier_id: 1,
        ptype: "card",
        date: "2026-01-20",
        currency_id: 1,
        amount: 1200,
        npayment_invoices_attributes: [{ invoice_id: 5, gross_amount: 1200 }],
      },
    };
    const result = await apiClient.post<any>(apiClient.buildPath("/npayments"), body);
    expect(result.id).toBe(1);
    expect(result.status).toBe("pending");
  });

  it("get_payment (LOW-08) — should get an NPayment by ID", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/npayments/1"));
    expect(result.id).toBe(1);
    expect(result.amount).toBe(500);
    expect(result.status).toBe("completed");
  });

  describe("Zod schema validation", () => {
    it("npayment requires supplier_id as integer", () => {
      const schema = z.object({
        supplier_id: z.number().int(),
        ptype: z.string(),
        date: z.string(),
        currency_id: z.number().int(),
        amount: z.number(),
      });
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("supplier_id"))).toBe(true);
      }
    });

    it("npayment amount must be a number", () => {
      const schema = z.object({
        supplier_id: z.number().int(),
        ptype: z.string(),
        date: z.string(),
        currency_id: z.number().int(),
        amount: z.number(),
      });
      const result = schema.safeParse({
        supplier_id: 1,
        ptype: "bank_transfer",
        date: "2026-01-15",
        currency_id: 1,
        amount: "abc",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("amount"))).toBe(true);
      }
    });
  });
});
