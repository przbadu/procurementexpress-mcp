import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    apiClient = new ApiClient(`http://localhost:${port}`);
    const auth = new AuthManager(apiClient, "test_client_id", "test_client_secret");
    await auth.authenticate("test@example.com", "password123");
    apiClient.setCompanyId("100");
  });

  afterAll(async () => {
    await mock.stop();
  });

  it("should list companies", async () => {
    const companies = await apiClient.get<any[]>("/api/v3/companies");
    expect(companies).toHaveLength(1);
    expect(companies[0].name).toBe("Test Company");
  });

  it("should get company details", async () => {
    const company = await apiClient.get<any>("/api/v3/companies/100");
    expect(company.id).toBe(100);
    expect(company.company_setting).toBeDefined();
    expect(company.supported_currencies).toHaveLength(1);
  });

  it("should list employees", async () => {
    const employees = await apiClient.get<any[]>("/api/v3/companies/employees");
    expect(employees).toHaveLength(1);
    expect(employees[0].roles).toContain("companyadmin");
  });

  it("should list all approvers", async () => {
    const approvers = await apiClient.get<any[]>("/api/v3/companies/all_approvers");
    expect(approvers).toHaveLength(1);
    expect(approvers[0].approval_limit).toBe(10000);
  });
});
