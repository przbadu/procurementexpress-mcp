import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Compliance E2E", () => {
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

  it("should trigger a compliance check", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/compliance/check"), {
      compliance_check: { purchase_order_id: 1 },
    });
    expect(result.status).toBe("processing");
    expect(result.job_id).toBe("job_abc123");
    expect(result.purchase_order_id).toBe(1);
    expect(result.message).toBe("Compliance check initiated");
  });

  it("should trigger bulk compliance check", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/compliance/bulk_check"), {
      purchase_order_ids: [1, 2],
    });
    expect(result.status).toBe("processing");
    expect(result.bulk_scan_id).toBe(42);
    expect(result.total_count).toBe(2);
    expect(result.skipped).toEqual({ already_passed: 0, already_scanning: 0 });
  });

  it("should get bulk check status", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/compliance/bulk_check_status"));
    expect(result.status).toBe("completed");
    expect(result.bulk_scan_id).toBe(42);
    expect(result.progress_percent).toBe(100);
    expect(result.passed_count).toBe(4);
    expect(result.failed_count).toBe(1);
  });

  it("should justify a violation", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/compliance/justify"), {
      violation_id: 1,
      justification_reason: "Approved by manager for emergency procurement",
    });
    expect(result.all_justified).toBe(true);
    expect(result.violation.resolved).toBe(true);
    expect(result.violation.id).toBe(1);
  });

  it("should generate compliance memo", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/compliance/generate_memo"), {
      memo_request: {
        violation_id: 1,
        item_description: "Server hardware",
        selected_vendor: "Acme Corp",
        selected_price: 5000,
        selection_rationale: "Only qualified vendor",
      },
    });
    expect(result.memo).toBeDefined();
    expect(result.memo.title).toBe("Sole Source Justification");
  });

  it("should list scan history", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/compliance/scan_history"));
    expect(result.scans).toHaveLength(1);
    expect(result.scans[0].id).toBe(1);
    expect(result.scans[0].status).toBe("completed");
    expect(result.meta.current_page).toBe(1);
  });

  it("should get scan detail", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/compliance/scan_history/1"));
    expect(result.bulk_scan_id).toBe(1);
    expect(result.status).toBe("completed");
    expect(result.progress_percent).toBe(100);
    expect(result.scanned_count).toBe(10);
  });

  it("should create evidence pack", async () => {
    const result = await apiClient.post<any>(apiClient.buildPath("/compliance/evidence_packs"), {
      compliance_check_id: 10,
    });
    expect(result.message).toBe("Evidence pack generation started");
    expect(result.evidence_pack.id).toBe(1);
    expect(result.evidence_pack.zip_status).toBe("pending");
  });

  it("should get evidence pack", async () => {
    const result = await apiClient.get<any>(apiClient.buildPath("/compliance/evidence_packs/1"));
    expect(result.evidence_pack.id).toBe(1);
    expect(result.evidence_pack.zip_status).toBe("completed");
    expect(result.evidence_pack.zip_file_name).toBe("evidence_pack_1.zip");
  });

  it("should get evidence pack download URL", async () => {
    const result = await apiClient.get<any>(
      apiClient.buildPath("/compliance/evidence_packs/1/download"),
    );
    expect(result.download_url).toBe("https://example.com/downloads/ep1.zip");
    expect(result.file_name).toBe("evidence_pack_1.zip");
    expect(result.file_size).toBe(12345);
  });

  describe("Zod schema validation", () => {
    it("compliance_check requires purchase_order_id or invoice_id", () => {
      const complianceCheckSchema = z
        .object({
          purchase_order_id: z.number().optional(),
          invoice_id: z.number().optional(),
        })
        .refine((d) => d.purchase_order_id !== undefined || d.invoice_id !== undefined, {
          message: "Either purchase_order_id or invoice_id is required",
        });
      const neither = complianceCheckSchema.safeParse({});
      expect(neither.success).toBe(false);
    });

    it("bulk_check requires non-empty purchase_order_ids array", () => {
      const bulkCheckSchema = z.object({
        purchase_order_ids: z.array(z.number()).min(1),
      });
      const emptyArray = bulkCheckSchema.safeParse({ purchase_order_ids: [] });
      expect(emptyArray.success).toBe(false);
    });
  });
});
