import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiClient } from "../../src/api-client.js";
import { AuthManager } from "../../src/auth.js";
import { MockApiServer, registerStandardRoutes } from "./setup.js";

describe("Departments E2E", () => {
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

  it("should list departments", async () => {
    const departments = await apiClient.get<any[]>(apiClient.buildPath("/departments"));
    expect(departments).toHaveLength(1);
    expect(departments[0].name).toBe("Engineering");
  });

  it("should create a department", async () => {
    const department = await apiClient.post<any>(apiClient.buildPath("/departments"), {
      department: { name: "Marketing" },
    });
    expect(department.id).toBe(2);
    expect(department.name).toBe("Marketing");
  });
});
