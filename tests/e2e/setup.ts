import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/**
 * A simple mock HTTP server that simulates the ProcurementExpress API.
 * Routes are registered with handlers that return JSON responses.
 */
export interface MockRoute {
  method: string;
  path: string | RegExp;
  handler: (req: IncomingMessage, body: string) => { status: number; body: unknown };
}

export class MockApiServer {
  private server: Server | null = null;
  private routes: MockRoute[] = [];
  private requests: { method: string; path: string; headers: Record<string, string>; body: string }[] = [];

  registerRoute(route: MockRoute): void {
    this.routes.push(route);
  }

  getRequests() {
    return this.requests;
  }

  clearRequests(): void {
    this.requests = [];
  }

  private findRoute(method: string, path: string): MockRoute | undefined {
    return this.routes.find((r) => {
      if (r.method !== method) return false;
      if (typeof r.path === "string") return r.path === path || path.startsWith(r.path + "?");
      return r.path.test(path);
    });
  }

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          const method = req.method || "GET";
          const url = req.url || "/";

          this.requests.push({
            method,
            path: url,
            headers: req.headers as Record<string, string>,
            body,
          });

          const route = this.findRoute(method, url);
          if (route) {
            const result = route.handler(req, body);
            res.writeHead(result.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.body));
          } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found", path: url, method }));
          }
        });
      });

      this.server.listen(0, () => {
        const address = this.server!.address();
        const port = typeof address === "object" && address ? address.port : 0;
        resolve(port);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Registers standard mock routes for common API endpoints.
 */
export function registerStandardRoutes(mock: MockApiServer): void {
  // OAuth2 authenticate
  mock.registerRoute({
    method: "POST",
    path: "/oauth/token",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (parsed.email === "test@example.com" && parsed.password === "password123") {
        return {
          status: 200,
          body: {
            access_token: "mock_access_token_123",
            token_type: "Bearer",
            expires_in: 7200,
            refresh_token: "mock_refresh_token_456",
            scope: "public",
            created_at: Math.floor(Date.now() / 1000),
          },
        };
      }
      return { status: 401, body: { error: "invalid_grant" } };
    },
  });

  // Token validation
  mock.registerRoute({
    method: "GET",
    path: "/oauth/token/info",
    handler: () => ({
      status: 200,
      body: {
        resource_owner_id: 1,
        scopes: ["public"],
        expires_in_seconds: 7000,
        application: { uid: "app123" },
        created_at: Math.floor(Date.now() / 1000),
      },
    }),
  });

  // Token revocation
  mock.registerRoute({
    method: "POST",
    path: "/oauth/revoke",
    handler: () => ({ status: 200, body: {} }),
  });

  // Current user
  mock.registerRoute({
    method: "GET",
    path: "/api/v1/currentuser",
    handler: () => ({
      status: 200,
      body: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone_number: null,
        setup_incomplete: false,
        employer_id: null,
        authentication_token: "token123",
        approval_limit: null,
        companies: [
          {
            id: 100,
            name: "Test Company",
            external_user_id: null,
            membership_archived: false,
            is_locked: false,
            is_removed: false,
            approval_limit: null,
            in_trial: false,
            trial_expired: false,
            remaining_trial_days: 0,
            roles: ["companyadmin"],
          },
        ],
      },
    }),
  });

  // Budgets
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/budgets",
    handler: () => ({
      status: 200,
      body: {
        budgets: [
          { id: 1, name: "Q1 Budget", amount: 50000, currency_id: 1, remaining_amount: 30000 },
          { id: 2, name: "Q2 Budget", amount: 75000, currency_id: 1, remaining_amount: 75000 },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 2 },
      },
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v3\/budgets\/\d+$/,
    handler: (_req) => ({
      status: 200,
      body: { id: 1, name: "Q1 Budget", amount: 50000, currency_id: 1, remaining_amount: 30000 },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: "/api/v3/budgets",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 201,
        body: { id: 3, ...parsed.budget },
      };
    },
  });

  // Companies
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/companies",
    handler: () => ({
      status: 200,
      body: [{ id: 100, name: "Test Company" }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v3\/companies\/\d+$/,
    handler: () => ({
      status: 200,
      body: {
        id: 100,
        name: "Test Company",
        company_setting: { currency_id: 1, date_format: "MM/DD/YYYY" },
        custom_fields: [],
        supported_currencies: [{ id: 1, iso_code: "USD", name: "US Dollar", symbol: "$" }],
      },
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: "/api/v3/companies/employees",
    handler: () => ({
      status: 200,
      body: [{ id: 1, email: "test@example.com", name: "Test User", roles: ["companyadmin"] }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: "/api/v3/companies/all_approvers",
    handler: () => ({
      status: 200,
      body: [{ id: 2, email: "approver@example.com", name: "Approver", approval_limit: 10000 }],
    }),
  });

  // Departments
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/departments",
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "Engineering", archived: false }],
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: "/api/v3/departments",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.department } };
    },
  });

  // Suppliers
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/suppliers",
    handler: () => ({
      status: 200,
      body: {
        suppliers: [{ id: 1, name: "Acme Corp", email: "sales@acme.com", archived: false }],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: "/api/v3/suppliers",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.supplier } };
    },
  });

  // Products
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/products",
    handler: () => ({
      status: 200,
      body: [{ id: 1, description: "Widget", sku: "WDG-001", unit_price: 9.99 }],
    }),
  });

  // Purchase Orders
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/purchase_orders",
    handler: () => ({
      status: 200,
      body: {
        purchase_orders: [
          {
            id: 1,
            status: "Pending",
            supplier_name: "Acme Corp",
            creator_id: 1,
            currency_id: 1,
            purchase_order_items: [],
            approver_requests: [],
          },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v3\/purchase_orders\/\d+$/,
    handler: () => ({
      status: 200,
      body: {
        id: 1,
        status: "Pending",
        supplier_name: "Acme Corp",
        creator_id: 1,
        currency_id: 1,
        can_cancel: true,
        can_archive: false,
        purchase_order_items: [
          { id: 1, description: "Widget", quantity: 10, unit_price: 9.99, net_amount: 99.9 },
        ],
        approver_requests: [
          { id: 1, approver_id: 2, accept_token: "accept_123", reject_token: "reject_456" },
        ],
        purchase_order_comments: [],
        custom_field_values: [],
      },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: "/api/v3/purchase_orders",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 201,
        body: { id: 2, status: parsed.commit === "Draft" ? "Draft" : "Pending", ...parsed.purchase_order },
      };
    },
  });

  mock.registerRoute({
    method: "GET",
    path: "/api/v3/purchase_orders/pending_request_count",
    handler: () => ({
      status: 200,
      body: { total_pending_request: 3 },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v3\/purchase_orders\/\d+\/cancel$/,
    handler: () => ({ status: 200, body: { id: 1, status: "Cancelled" } }),
  });

  // Invoices
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/invoices",
    handler: () => ({
      status: 200,
      body: {
        invoices: [
          { id: 1, invoice_number: "INV-001", gross_amount: 1000, currency_id: 1, can_approve: true },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v3\/invoices\/\d+$/,
    handler: () => ({
      status: 200,
      body: {
        id: 1,
        invoice_number: "INV-001",
        gross_amount: 1000,
        currency_id: 1,
        can_approve: true,
        can_reject: true,
        invoice_line_items: [],
      },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: "/api/v3/invoices",
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.invoice } };
    },
  });

  mock.registerRoute({
    method: "PUT",
    path: /^\/api\/v3\/invoices\/\d+\/approve$/,
    handler: () => ({ status: 200, body: { id: 1, status: "Approved" } }),
  });

  // Tax Rates
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/tax_rates",
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "Standard VAT", value: 20, archived: false }],
    }),
  });

  // Webhooks
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/webhooks",
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "My Webhook", url: "https://example.com/hook", event_type: ["new_po"] }],
    }),
  });

  // Currencies
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/currencies",
    handler: () => ({
      status: 200,
      body: [{ id: 1, iso_code: "USD", name: "US Dollar", symbol: "$" }],
    }),
  });

  // Approval Flows
  mock.registerRoute({
    method: "GET",
    path: "/api/v1/approval_flows",
    handler: () => ({
      status: 200,
      body: {
        approval_flows: [
          { id: 1, name: "Default Flow", document_type: 0, approval_steps: [] },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  // Chart of Accounts
  mock.registerRoute({
    method: "GET",
    path: "/api/v3/chart_of_accounts",
    handler: () => ({
      status: 200,
      body: {
        chart_of_accounts: [{ id: 1, name: "Advertising", display_name: "Advertising" }],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  // Comments
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v3\/purchase_order\/\d+\/comments$/,
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 201,
        body: {
          id: 1,
          comment: parsed.comment,
          creator_id: 1,
          creator_name: "Test User",
          purchase_order_id: 1,
          status: "created",
          created_at: new Date().toISOString(),
        },
      };
    },
  });
}
