import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import { jsonResponse, withErrorHandling, type Server } from "../tool-helpers.js";
import type { CustomFieldAdmin } from "../types.js";

export function registerCustomFieldTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "list_custom_fields",
    {
      description:
        "List all custom fields for the current company. Use context param to filter PO-level vs line-item-level fields.",
      inputSchema: {
        include_archived: z
          .boolean()
          .optional()
          .describe("Include archived fields (default: false)"),
        context: z
          .enum(["purchase_order", "line_item"])
          .optional()
          .describe("Filter by context: purchase_order (default) or line_item"),
      },
    },
    withErrorHandling(async (args) => {
      const params = new URLSearchParams();
      if (args.include_archived) params.set("include_archived", "true");
      if (args.context) params.set("context", args.context);
      const query = params.toString();
      const path = `${apiClient.buildPath("/custom_fields")}${query ? "?" + query : ""}`;
      const result = await apiClient.get<CustomFieldAdmin[]>(path);
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "get_custom_field",
    {
      description: "Get a single custom field by ID",
      inputSchema: {
        id: z.number().int().positive().describe("Custom field ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.get<CustomFieldAdmin>(
        apiClient.buildPath("/custom_fields/" + args.id),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "create_custom_field",
    {
      description: "Create a new custom field",
      inputSchema: {
        name: z.string().describe("Field name"),
        field_type: z
          .enum(["text", "number", "date", "dropdown", "checkbox", "url", "formula"])
          .describe("Field type"),
        default_value: z.string().optional().describe("Default value"),
        active: z.boolean().optional().describe("Whether field is active"),
        required: z.boolean().optional().describe("Whether field is required"),
        option_list: z
          .array(z.string())
          .optional()
          .describe("Options for dropdown fields (string array)"),
        access_level: z.string().optional().describe("Access level"),
        on_line_item: z.boolean().optional().describe("Show on line items"),
        display_on_pdf: z.boolean().optional().describe("Display on PDF"),
        editable_after_approval: z
          .boolean()
          .optional()
          .describe("Editable after approval"),
        formula_builder: z
          .string()
          .optional()
          .describe("Formula builder expression"),
        precision_display: z
          .number()
          .int()
          .optional()
          .describe("Decimal precision for number fields"),
        display_on_pdf_even_if_value_is_nil: z
          .boolean()
          .optional()
          .describe("Display on PDF even when empty"),
        archived: z.boolean().optional().describe("Whether field is archived"),
      },
    },
    withErrorHandling(async (args) => {
      const body = {
        custom_field: {
          ...args,
          option_list: args.option_list?.join(","),
        },
      };
      const result = await apiClient.post<CustomFieldAdmin>(
        apiClient.buildPath("/custom_fields"),
        body,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "update_custom_field",
    {
      description: "Update an existing custom field",
      inputSchema: {
        id: z.number().int().positive().describe("Custom field ID"),
        name: z.string().optional().describe("Field name"),
        field_type: z
          .enum(["text", "number", "date", "dropdown", "checkbox", "url", "formula"])
          .optional()
          .describe("Field type"),
        default_value: z.string().optional().describe("Default value"),
        active: z.boolean().optional().describe("Whether field is active"),
        required: z.boolean().optional().describe("Whether field is required"),
        option_list: z
          .array(z.string())
          .optional()
          .describe("Options for dropdown fields (string array)"),
        access_level: z.string().optional().describe("Access level"),
        on_line_item: z.boolean().optional().describe("Show on line items"),
        display_on_pdf: z.boolean().optional().describe("Display on PDF"),
        editable_after_approval: z
          .boolean()
          .optional()
          .describe("Editable after approval"),
        formula_builder: z
          .string()
          .optional()
          .describe("Formula builder expression"),
        precision_display: z
          .number()
          .int()
          .optional()
          .describe("Decimal precision for number fields"),
        display_on_pdf_even_if_value_is_nil: z
          .boolean()
          .optional()
          .describe("Display on PDF even when empty"),
        archived: z.boolean().optional().describe("Whether field is archived"),
      },
    },
    withErrorHandling(async (args) => {
      const { id, ...rest } = args;
      const body = {
        custom_field: {
          ...rest,
          option_list: rest.option_list?.join(","),
        },
      };
      const result = await apiClient.patch<CustomFieldAdmin>(
        apiClient.buildPath("/custom_fields/" + id),
        body,
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "delete_custom_field",
    {
      description: "Delete (archive) a custom field. Returns { archived: true } on success.",
      inputSchema: {
        id: z.number().int().positive().describe("Custom field ID"),
      },
    },
    withErrorHandling(async (args) => {
      const result = await apiClient.delete<{ archived: boolean }>(
        apiClient.buildPath("/custom_fields/" + args.id),
      );
      return jsonResponse(result);
    }),
  );

  server.registerTool(
    "update_custom_field_positions",
    {
      description:
        "Reorder custom fields by providing an ordered array of field IDs with positions",
      inputSchema: {
        positions: z
          .array(
            z.object({
              id: z.number().int().describe("Custom field ID"),
              position: z.number().int().describe("New position (0-based)"),
            }),
          )
          .describe("Array of field ID + position pairs"),
      },
    },
    withErrorHandling(async (args) => {
      const positions: Record<string, number> = {};
      args.positions.forEach(({ id, position }) => {
        positions[String(id)] = position;
      });
      const result = await apiClient.patch<{ success: boolean }>(
        apiClient.buildPath("/custom_fields/update_positions"),
        { positions },
      );
      return jsonResponse(result);
    }),
  );
}
