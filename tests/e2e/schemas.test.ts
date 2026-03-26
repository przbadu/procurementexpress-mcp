import { describe, it, expect } from "vitest";
import { z } from "zod";
import { lineItemSchema, invoiceLineItemSchema, destroyRequiresId } from "../../src/schemas.js";

describe("_destroy requires id validation", () => {
  describe("lineItemSchema", () => {
    it("rejects _destroy: true without id", () => {
      const result = lineItemSchema.safeParse({
        _destroy: true,
        description: "test",
        quantity: 1,
        unit_price: 10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("_destroy requires id");
      }
    });

    it("accepts _destroy: true with id", () => {
      const result = lineItemSchema.safeParse({
        _destroy: true,
        id: 1,
        description: "test",
        quantity: 1,
        unit_price: 10,
      });
      expect(result.success).toBe(true);
    });

    it("accepts new item without id or _destroy", () => {
      const result = lineItemSchema.safeParse({
        description: "test",
        quantity: 1,
        unit_price: 10,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invoiceLineItemSchema", () => {
    it("rejects _destroy: true without id", () => {
      const result = invoiceLineItemSchema.safeParse({ _destroy: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("_destroy requires id");
      }
    });

    it("accepts _destroy: true with id", () => {
      const result = invoiceLineItemSchema.safeParse({ _destroy: true, id: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe("destroyRequiresId helper", () => {
    it("can be applied to any schema with id and _destroy", () => {
      const testSchema = z.object({
        id: z.number().optional(),
        _destroy: z.boolean().optional(),
        name: z.string(),
      }).superRefine(destroyRequiresId);

      expect(testSchema.safeParse({ _destroy: true, name: "x" }).success).toBe(false);
      expect(testSchema.safeParse({ _destroy: true, id: 1, name: "x" }).success).toBe(true);
      expect(testSchema.safeParse({ name: "x" }).success).toBe(true);
    });
  });
});
