import { z } from "zod";
import type { ApiClient } from "../api-client.js";
import type { Server } from "../tool-helpers.js";
import { jsonResponse, withErrorHandling } from "../tool-helpers.js";
import type { Currency, User } from "../types.js";

export function registerUserTools(server: Server, apiClient: ApiClient): void {
  server.registerTool(
    "get_current_user",
    {
      description: "Get the currently authenticated user's profile, including company memberships and roles",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const user = await apiClient.get<User>(apiClient.buildPath("/currentuser"));
      return jsonResponse(user);
    }),
  );

  server.registerTool(
    "update_current_user",
    {
      description: "Update the current user's profile. Include password_confirmation when changing password.",
      inputSchema: {
        email: z.string().email().optional().describe("New email address"),
        name: z.string().optional().describe("Full name"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
        phone_number: z.string().optional().describe("Phone number"),
        password: z.string().optional().describe("New password"),
        password_confirmation: z.string().optional().describe("Password confirmation (required when changing password)"),
      },
    },
    withErrorHandling(async (args) => {
      const user = await apiClient.put<User>(apiClient.buildPath("/currentuser"), args);
      return jsonResponse(user);
    }),
  );

  server.registerTool(
    "list_currencies",
    {
      description: "List currencies enabled for the current company (company default currency listed first)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const currencies = await apiClient.get<Currency[]>(apiClient.buildPath("/currencies"));
      return jsonResponse(currencies);
    }),
  );

  server.registerTool(
    "list_all_currencies",
    {
      description: "List all available currencies globally, sorted by name (or by most popular if company ID is set)",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const currencies = await apiClient.get<Currency[]>(apiClient.buildPath("/all_currencies"));
      return jsonResponse(currencies);
    }),
  );
}
