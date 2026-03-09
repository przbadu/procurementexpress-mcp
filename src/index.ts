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
const isV1 = authManager.isV1();

// Create MCP server
const server = new McpServer({
  name: "procurementexpress",
  version: "1.0.0",
  description: `MCP server for ProcurementExpress API (${apiClient.getApiVersion()}) - manage purchase orders, invoices, budgets, suppliers, and procurement workflows`,
});

// Register version-appropriate authentication tools
if (isV1) {
  // V1: Token-based authentication
  server.registerTool(
    "authenticate",
    {
      description:
        "Authenticate with ProcurementExpress V1 API using a static authentication token and company ID. " +
        "Reads from PROCUREMENTEXPRESS_AUTH_TOKEN and PROCUREMENTEXPRESS_COMPANY_ID environment variables if not provided.",
      inputSchema: {
        authentication_token: z
          .string()
          .optional()
          .describe("Authentication token (reads from PROCUREMENTEXPRESS_AUTH_TOKEN env var if omitted)"),
        company_id: z
          .string()
          .optional()
          .describe("Company ID (reads from PROCUREMENTEXPRESS_COMPANY_ID env var if omitted)"),
      },
    },
    withErrorHandling(async (args) => {
      const token =
        args.authentication_token || process.env.PROCUREMENTEXPRESS_AUTH_TOKEN || "";
      const companyId =
        args.company_id || process.env.PROCUREMENTEXPRESS_COMPANY_ID || "";

      if (!token) {
        return textResponse(
          "Error: No authentication token provided. Pass it as a parameter or set PROCUREMENTEXPRESS_AUTH_TOKEN environment variable.",
        );
      }
      if (!companyId) {
        return textResponse(
          "Error: No company ID provided. Pass it as a parameter or set PROCUREMENTEXPRESS_COMPANY_ID environment variable.",
        );
      }

      authManager.authenticateV1(token, companyId);
      return textResponse(
        `Authenticated with V1 API. Company ID set to ${companyId}. You can now make API calls.`,
      );
    }),
  );
} else {
  // V3: OAuth2 authentication
  server.registerTool(
    "authenticate",
    {
      description:
        "Sign in to ProcurementExpress via OAuth2. Returns a bearer token for subsequent API calls. " +
        "Requires PROCUREMENTEXPRESS_CLIENT_ID and PROCUREMENTEXPRESS_CLIENT_SECRET environment variables.",
      inputSchema: {
        email: z.string().email().describe("User email address"),
        password: z.string().describe("User password"),
      },
    },
    withErrorHandling(async (args) => {
      const response = await authManager.authenticateV3(args.email, args.password);
      return textResponse(
        `Authenticated successfully via OAuth2. Token expires in ${response.expires_in} seconds. Use set_active_company to select a company before making API calls.`,
      );
    }),
  );
}

server.registerTool(
  "validate_token",
  {
    description: isV1
      ? "Validate the current V1 authentication token by fetching the current user"
      : "Check if the current OAuth2 token is valid and get token metadata",
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
    description: isV1
      ? "Clear the current authentication token from the session"
      : "Sign out and revoke the current OAuth2 token",
    inputSchema: {},
  },
  withErrorHandling(async () => {
    await authManager.revokeToken();
    return textResponse(
      isV1
        ? "Token cleared. You are now signed out."
        : "Token revoked successfully. You are now signed out.",
    );
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

// Auto-authenticate from environment variables if available
if (isV1) {
  const envToken = process.env.PROCUREMENTEXPRESS_AUTH_TOKEN;
  const envCompanyId = process.env.PROCUREMENTEXPRESS_COMPANY_ID;
  if (envToken && envCompanyId) {
    authManager.authenticateV1(envToken, envCompanyId);
    console.error(`Auto-authenticated with V1 API (company ID: ${envCompanyId})`);
  }
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `ProcurementExpress MCP Server running on stdio (API version: ${apiClient.getApiVersion()})`,
  );
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
