import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";
import { registerApprovalFlowTools } from "../../src/tools/approval-flows.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Approval Flow Tools E2E — LOW-10", () => {
  let mock: MockApiServer;
  let apiClient: ApiClient;
  let server: McpServer;

  beforeAll(async () => {
    mock = new MockApiServer();
    registerStandardRoutes(mock);
    const port = await mock.start();
    apiClient = new ApiClient(`http://localhost:${port}`, "v1");
    const auth = new AuthManager(apiClient);
    auth.authenticateV1("mock_token", "100");

    server = new McpServer({ name: "test", version: "1.0.0" });
    registerApprovalFlowTools(server, apiClient);
  });

  afterAll(async () => {
    await mock.stop();
  });

  describe("unpublish_approval_flow", () => {
    it("sends PATCH to /approval_flows/:id/unpublish and returns unpublished flow", async () => {
      mock.clearRequests();

      const result = await apiClient.patch<{ id: number; name: string; published: boolean }>(
        apiClient.buildPath("/approval_flows/1/unpublish"),
      );

      expect(result.id).toBe(1);
      expect(result.published).toBe(false);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "PATCH" && r.path === "/api/v1/approval_flows/1/unpublish",
      );
      expect(req).toBeDefined();
    });
  });

  describe("get_approval_flow_version_details", () => {
    it("sends GET to /approval_flows/:id/version_details?version_id=N and returns version", async () => {
      mock.clearRequests();

      const path = `${apiClient.buildPath("/approval_flows/1/version_details")}?version_id=1`;
      const result = await apiClient.get<{
        version_id: number;
        approval_flow_id: number;
        version_number: number;
        approval_steps: unknown[];
        created_at: string;
      }>(path);

      expect(result.version_id).toBe(1);
      expect(result.approval_flow_id).toBe(1);
      expect(result.version_number).toBe(1);
      expect(Array.isArray(result.approval_steps)).toBe(true);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "GET" && r.path.startsWith("/api/v1/approval_flows/1/version_details"),
      );
      expect(req).toBeDefined();
      expect(req!.path).toContain("version_id=1");
    });
  });

  describe("rerun_approval_flows", () => {
    it("sends POST to /approval_flows/rerun_approval_flows with order_ids", async () => {
      mock.clearRequests();

      const body = { order_ids: [1, 2] };
      const result = await apiClient.post<{
        message: string;
        order_ids: number[];
        invoice_ids: number[];
      }>(apiClient.buildPath("/approval_flows/rerun_approval_flows"), body);

      expect(result.message).toBe("Approval flows rerun initiated");
      expect(result.order_ids).toEqual([1, 2]);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "POST" && r.path === "/api/v1/approval_flows/rerun_approval_flows",
      );
      expect(req).toBeDefined();
      const parsed = JSON.parse(req!.body);
      expect(parsed.order_ids).toEqual([1, 2]);
    });

    it("sends POST to /approval_flows/rerun_approval_flows with invoice_ids", async () => {
      mock.clearRequests();

      const body = { invoice_ids: [5, 6] };
      const result = await apiClient.post<{
        message: string;
        order_ids: number[];
        invoice_ids: number[];
      }>(apiClient.buildPath("/approval_flows/rerun_approval_flows"), body);

      expect(result.invoice_ids).toEqual([5, 6]);

      const requests = mock.getRequests();
      const req = requests.find(
        (r) => r.method === "POST" && r.path === "/api/v1/approval_flows/rerun_approval_flows",
      );
      expect(req).toBeDefined();
      const parsed = JSON.parse(req!.body);
      expect(parsed.invoice_ids).toEqual([5, 6]);
    });
  });
});
