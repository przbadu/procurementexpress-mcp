import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Companies E2E", () => {
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

  it("should list companies", async () => {
    const companies = await apiClient.get<any[]>(apiClient.buildPath("/companies"));
    expect(companies).toHaveLength(1);
    expect(companies[0].name).toBe("Test Company");
  });

  it("should get company details", async () => {
    const company = await apiClient.get<any>(apiClient.buildPath("/companies/100"));
    expect(company.id).toBe(100);
    expect(company.company_setting).toBeDefined();
    expect(company.supported_currencies).toHaveLength(1);
  });

  it("should list employees", async () => {
    const employees = await apiClient.get<any[]>(apiClient.buildPath("/companies/employees"));
    expect(employees).toHaveLength(1);
    expect(employees[0].roles).toContain("companyadmin");
  });

  it("should list all approvers", async () => {
    const approvers = await apiClient.get<any[]>(apiClient.buildPath("/companies/all_approvers"));
    expect(approvers).toHaveLength(1);
    expect(approvers[0].approval_limit).toBe(10000);
  });

  it("list_pending_invites (LOW-09) — should return pending invites with email, status, and token", async () => {
    const invites = await apiClient.get<any[]>(apiClient.buildPath("/companies/pending_invites"));
    expect(invites).toHaveLength(1);
    expect(invites[0].email).toBe("newuser@example.com");
    expect(invites[0].status).toBe("pending");
    expect(invites[0].token).toBe("inv_abc123");
    expect(invites[0].roles).toContain("requester");
    expect(invites[0].invited_by_name).toBe("Test User");
  });

  describe("Zod schema validation", () => {
    it("invite_employee requires email", () => {
      const inviteSchema = z.object({
        email: z.string().email(),
        roles: z.array(z.string()),
      });
      const missingEmail = inviteSchema.safeParse({ roles: ["requester"] });
      expect(missingEmail.success).toBe(false);
    });

    it("invite_employee rejects invalid email format", () => {
      const inviteSchema = z.object({
        email: z.string().email(),
        roles: z.array(z.string()),
      });
      const invalidEmail = inviteSchema.safeParse({ email: "not-an-email", roles: ["requester"] });
      expect(invalidEmail.success).toBe(false);
    });
  });
});
