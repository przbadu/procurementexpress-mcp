import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Upload } from "../types.js";

export function registerUploadTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "upload_file_to_purchase_order",
    {
      description:
        "Upload a file to a purchase order. Reads the file from the local filesystem and sends it as multipart/form-data to the ProcurementExpress API. Returns the Upload object with file metadata and URL.",
      inputSchema: {
        po_id: z.number().int().positive().describe("Purchase order ID"),
        file_path: z.string().describe("Absolute path to the file to upload"),
        upload_token: z
          .string()
          .min(7)
          .describe("Unique upload token (minimum 7 characters) to track the upload"),
        file_name: z
          .string()
          .optional()
          .describe("Optional display name for the file (defaults to the file's basename)"),
      },
    },
    withErrorHandling(async (args) => {
      const fileBuffer = await readFile(args.file_path);
      const fileName = args.file_name || basename(args.file_path);
      const blob = new Blob([fileBuffer]);
      const form = new FormData();
      form.append("po_id", String(args.po_id));
      form.append("uploads_attributes[file]", blob, fileName);
      form.append("uploads_attributes[upload_token]", args.upload_token);
      const result = await apiClient.postMultipart<Upload>(
        apiClient.buildPath("/uploads/po"),
        form,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "upload_file_to_comment",
    {
      description:
        "Upload a file to a purchase order comment. Reads the file from the local filesystem and sends it as multipart/form-data. Returns the Upload object with file metadata and URL.",
      inputSchema: {
        poc_id: z.number().int().positive().describe("Purchase order comment ID"),
        file_path: z.string().describe("Absolute path to the file to upload"),
        upload_token: z
          .string()
          .min(7)
          .describe("Unique upload token (minimum 7 characters) to track the upload"),
        file_name: z
          .string()
          .optional()
          .describe("Optional display name for the file (defaults to the file's basename)"),
      },
    },
    withErrorHandling(async (args) => {
      const fileBuffer = await readFile(args.file_path);
      const fileName = args.file_name || basename(args.file_path);
      const blob = new Blob([fileBuffer]);
      const form = new FormData();
      form.append("poc_id", String(args.poc_id));
      form.append("uploads_attributes[file]", blob, fileName);
      form.append("uploads_attributes[upload_token]", args.upload_token);
      const result = await apiClient.postMultipart<Upload>(
        apiClient.buildPath("/uploads/poc"),
        form,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_upload_status",
    {
      description:
        "Check the status and retrieve metadata for an uploaded file by its upload token. Returns the Upload object with file name, content type, URL, and token.",
      inputSchema: {
        upload_token: z.string().describe("The upload token returned when the file was uploaded"),
      },
    },
    withErrorHandling(async (args) => {
      const path = `${apiClient.buildPath("/uploads/status")}?upload_token=${encodeURIComponent(args.upload_token)}`;
      const result = await apiClient.get<Upload>(path);
      return jsonResponse(result);
    }),
  );
}
