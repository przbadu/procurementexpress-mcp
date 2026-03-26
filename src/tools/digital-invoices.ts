import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";

export function registerDigitalInvoiceTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "create_digital_invoice",
    {
      description:
        "Create an invoice or purchase order from a scanned document. Upload a file (base64-encoded) and the system will process it. upload_type='invoice' (default) creates an invoice, upload_type='request' creates a purchase order.",
      inputSchema: {
        file_content: z
          .string()
          .describe("Base64-encoded file content"),
        filename: z
          .string()
          .describe("Original filename (e.g., 'invoice.pdf')"),
        content_type: z
          .string()
          .optional()
          .describe("MIME type of the file (default: 'application/pdf')"),
        upload_type: z
          .enum(["invoice", "request"])
          .optional()
          .describe("'invoice' creates an invoice (default), 'request' creates a purchase order"),
      },
    },
    withErrorHandling(async (args) => {
      const fileBuffer = Buffer.from(args.file_content, "base64");
      const blob = new Blob([fileBuffer], { type: args.content_type || "application/pdf" });
      const form = new FormData();
      form.append("file", blob, args.filename);
      if (args.upload_type) form.append("upload_type", args.upload_type);
      const result = await apiClient.postMultipart(apiClient.buildPath("/digital_invoices"), form);
      return jsonResponse(result);
    }),
  );
}
