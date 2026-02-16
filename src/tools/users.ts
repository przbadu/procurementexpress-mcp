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
      const user = await apiClient.get<User>("/api/v1/currentuser");
      return jsonResponse(user);
    }),
  );

  server.registerTool(
    "update_current_user",
    {
      description: "Update the current user's profile (email, name, phone number, password)",
      inputSchema: {
        email: z.string().email().optional().describe("New email address"),
        name: z.string().optional().describe("New name"),
        phone_number: z.string().optional().describe("New phone number"),
        password: z.string().optional().describe("New password"),
      },
    },
    withErrorHandling(async (args) => {
      const user = await apiClient.put<User>("/api/v1/currentuser", args);
      return jsonResponse(user);
    }),
  );

  server.registerTool(
    "list_currencies",
    {
      description: "List enabled currencies for the current company",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const currencies = await apiClient.get<Currency[]>("/api/v3/currencies");
      return jsonResponse(currencies);
    }),
  );

  server.registerTool(
    "list_all_currencies",
    {
      description: "List all available currencies globally",
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const currencies = await apiClient.get<Currency[]>("/api/v3/all_currencies");
      return jsonResponse(currencies);
    }),
  );
}
