import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import { jsonResponse, withErrorHandling, type Server } from "../tool-helpers.js";
import type {
  BulkCheckJobResponse,
  BulkComplianceScan,
  ComplianceCheckJobResponse,
  ComplianceMemo,
  ComplianceScanSummary,
  EvidencePack,
  PaginationMeta,
} from "../types.js";

export function registerComplianceTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "check_compliance",
    {
      description:
        "Trigger a compliance check on a purchase order or invoice. Returns 202 with job_id for async processing.",
      inputSchema: {
        purchase_order_id: z.number().int().optional().describe("Purchase order ID (optional)"),
        budget_id: z.number().int().optional().describe("Budget ID"),
        budget_name: z.string().optional().describe("Budget name"),
        total_amount: z.number().optional().describe("Total amount"),
        supplier: z.string().optional().describe("Supplier name"),
        items: z
          .array(
            z.object({
              description: z.string(),
              quantity: z.number(),
              unit_price: z.number(),
            }),
          )
          .optional()
          .describe("Line items"),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              type: z.string(),
              size: z.number(),
            }),
          )
          .optional()
          .describe("Attachments metadata"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<ComplianceCheckJobResponse>(
        apiClient.buildPath("/compliance/check"),
        { compliance_check: args },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "bulk_check_compliance",
    {
      description:
        "Trigger bulk compliance checks for multiple purchase orders. Returns 202 with bulk_scan_id.",
      inputSchema: {
        purchase_order_ids: z
          .array(z.number().int())
          .min(1)
          .describe("Array of purchase order IDs to check"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<BulkCheckJobResponse>(
        apiClient.buildPath("/compliance/bulk_check"),
        { purchase_order_ids: args.purchase_order_ids },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_bulk_check_status",
    {
      description: "Get the status of the most recent bulk compliance check for the current user",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const result = await apiClient.get<BulkComplianceScan>(
        apiClient.buildPath("/compliance/bulk_check_status"),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "justify_compliance_violation",
    {
      description: "Justify a compliance violation with a reason (minimum 10 characters)",
      inputSchema: {
        violation_id: z.number().int().describe("Violation ID"),
        justification_reason: z
          .string()
          .min(10)
          .describe("Justification reason (minimum 10 characters)"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<unknown>(apiClient.buildPath("/compliance/justify"), {
        violation_id: args.violation_id,
        justification_reason: args.justification_reason,
      });
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "generate_compliance_memo",
    {
      description: "Generate an AI-powered compliance memo for a violation",
      inputSchema: {
        violation_id: z.number().int().optional().describe("Violation ID"),
        item_description: z.string().optional().describe("Item description"),
        selected_vendor: z.string().optional().describe("Selected vendor"),
        selected_price: z.number().optional().describe("Selected price"),
        selection_rationale: z.string().optional().describe("Selection rationale"),
        market_basis: z.string().optional().describe("Market basis"),
        alternatives_considered: z
          .array(
            z.object({
              vendor: z.string(),
              price: z.number(),
              notes: z.string().optional(),
            }),
          )
          .optional()
          .describe("Alternatives considered"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<ComplianceMemo>(
        apiClient.buildPath("/compliance/generate_memo"),
        { memo_request: args },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "list_compliance_scan_history",
    {
      description: "List compliance scan history with pagination",
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      const query = params.toString();
      const path = `${apiClient.buildPath("/compliance/scan_history")}${query ? `?${query}` : ""}`;
      const result = await apiClient.get<{ scans: ComplianceScanSummary[]; meta: PaginationMeta }>(
        path,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_compliance_scan_detail",
    {
      description: "Get detailed compliance scan results by scan ID",
      inputSchema: {
        id: z.number().int().positive().describe("Bulk scan ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<BulkComplianceScan>(
        apiClient.buildPath("/compliance/scan_history/" + args.id),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "create_evidence_pack",
    {
      description: "Create an evidence pack for a compliance check",
      inputSchema: {
        compliance_check_id: z.number().int().describe("Compliance check ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.post<{ message: string; evidence_pack: EvidencePack }>(
        apiClient.buildPath("/compliance/evidence_packs"),
        { compliance_check_id: args.compliance_check_id },
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_evidence_pack",
    {
      description: "Get an evidence pack by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Evidence pack ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{ evidence_pack: EvidencePack }>(
        apiClient.buildPath("/compliance/evidence_packs/" + args.id),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "download_evidence_pack",
    {
      description:
        "Get the download URL for an evidence pack. Returns URL and file metadata, not the binary file.",
      inputSchema: {
        id: z.number().int().positive().describe("Evidence pack ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<{
        download_url: string;
        file_name: string;
        file_size: number;
      }>(apiClient.buildPath("/compliance/evidence_packs/" + args.id + "/download"));
      return jsonResponse(result);
    }),
  );
}
