#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ApiClient } from "./api-client.js";
import { AuthManager } from "./auth.js";
import { jsonResponse, textResponse, withErrorHandling } from "./tool-helpers.js";
import { registerApprovalFlowTools } from "./tools/approval-flows.js";
import { registerBudgetTools } from "./tools/budgets.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDepartmentTools } from "./tools/departments.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerProductTools } from "./tools/products.js";
import { registerPurchaseOrderTools } from "./tools/purchase-orders.js";
import { registerSupplementaryTools } from "./tools/supplementary.js";
import { registerSupplierTools } from "./tools/suppliers.js";
import { registerTaxRateTools } from "./tools/tax-rates.js";
import { registerUserTools } from "./tools/users.js";
import { registerWebhookTools } from "./tools/webhooks.js";

// Create API client and auth manager
const apiClient = new ApiClient();
const authManager = new AuthManager(apiClient);

// Create MCP server
const server = new McpServer({
  name: "procurementexpress",
  version: "1.0.0",
  description: "MCP server for ProcurementExpress API - manage purchase orders, invoices, budgets, suppliers, and procurement workflows",
});

// Register authentication tools directly (they need access to authManager)
server.registerTool(
  "authenticate",
  {
    description:
      "Sign in to ProcurementExpress via OAuth2. Returns a bearer token for subsequent API calls. Requires PE_CLIENT_ID and PE_CLIENT_SECRET environment variables.",
    inputSchema: {
      email: z.string().email().describe("User email address"),
      password: z.string().describe("User password"),
    },
  },
  withErrorHandling(async (args) => {
    const response = await authManager.authenticate(args.email, args.password);
    return textResponse(
      `Authenticated successfully. Token expires in ${response.expires_in} seconds. Use set_active_company to select a company before making API calls.`,
    );
  }),
);

server.registerTool(
  "validate_token",
  {
    description: "Check if the current authentication token is valid",
    inputSchema: {},
  },
  withErrorHandling(async () => {
    const info = await authManager.validateToken();
    return jsonResponse(info);
  }),
);

server.registerTool(
  "revoke_token",
  {
    description: "Sign out and revoke the current authentication token",
    inputSchema: {},
  },
  withErrorHandling(async () => {
    await authManager.revokeToken();
    return textResponse("Token revoked successfully. You are now signed out.");
  }),
);

// Register all tool groups
registerUserTools(server, apiClient);
registerBudgetTools(server, apiClient);
registerCompanyTools(server, apiClient);
registerDepartmentTools(server, apiClient);
registerSupplierTools(server, apiClient);
registerProductTools(server, apiClient);
registerPurchaseOrderTools(server, apiClient);
registerInvoiceTools(server, apiClient);
registerApprovalFlowTools(server, apiClient);
registerCommentTools(server, apiClient);
registerPaymentTools(server, apiClient);
registerTaxRateTools(server, apiClient);
registerWebhookTools(server, apiClient);
registerSupplementaryTools(server, apiClient);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ProcurementExpress MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
