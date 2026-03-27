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

/** Helper: version-agnostic path regex that matches both /api/v1/ and /api/v3/ */
function vPath(resource: string): RegExp {
  return new RegExp(`^/api/v[13]/${resource}$`);
}

function vPathWithId(resource: string): RegExp {
  return new RegExp(`^/api/v[13]/${resource}/\\d+$`);
}

function vPathSuffix(resource: string, suffix: string): RegExp {
  return new RegExp(`^/api/v[13]/${resource}/${suffix}$`);
}

function vPathIdSuffix(resource: string, suffix: string): RegExp {
  return new RegExp(`^/api/v[13]/${resource}/\\d+/${suffix}$`);
}

/**
 * Registers standard mock routes for common API endpoints.
 * All resource routes match both V1 and V3 paths.
 */
export function registerStandardRoutes(mock: MockApiServer): void {
  // OAuth2 authenticate (V3 only - always at /oauth/token)
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

  // Token validation (V3 only - always at /oauth/token/info)
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

  // Token revocation (V3 only - always at /oauth/revoke)
  mock.registerRoute({
    method: "POST",
    path: "/oauth/revoke",
    handler: () => ({ status: 200, body: {} }),
  });

  // Current user (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("currentuser"),
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

  // Budgets (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("budgets"),
    handler: () => ({
      status: 200,
      body: [
        { id: 1, name: "Q1 Budget", amount: 50000, currency_id: 1, remaining_amount: 30000 },
        { id: 2, name: "Q2 Budget", amount: 75000, currency_id: 1, remaining_amount: 75000 },
      ],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("budgets"),
    handler: () => ({
      status: 200,
      body: { id: 1, name: "Q1 Budget", amount: 50000, currency_id: 1, remaining_amount: 30000 },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("budgets"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 201,
        body: { id: 3, ...parsed.budget },
      };
    },
  });

  // Companies (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("companies"),
    handler: () => ({
      status: 200,
      body: [{ id: 100, name: "Test Company" }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("companies"),
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
    path: vPathSuffix("companies", "employees"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, email: "test@example.com", name: "Test User", roles: ["companyadmin"] }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathSuffix("companies", "all_approvers"),
    handler: () => ({
      status: 200,
      body: [{ id: 2, email: "approver@example.com", name: "Approver", approval_limit: 10000 }],
    }),
  });

  // Departments (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("departments"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "Engineering", archived: false }],
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("departments"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.department } };
    },
  });

  // Suppliers (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("suppliers"),
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
    path: vPath("suppliers"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.supplier } };
    },
  });

  // Products (V1/V3) — specific routes MUST be registered before the generic vPath("products") route
  // to prevent the generic route from intercepting /products/skus and /products/bulk_create

  // Product SKUs — GET /products/skus
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/products\/skus(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: ["WDG-001", "WDG-002", "GAD-001"],
    }),
  });

  // Product Bulk Create — POST /products/bulk_create
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/products\/bulk_create$/,
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.supplier_id || !parsed.product?.product_item_attributes?.length) {
        return { status: 422, body: { error: "Missing required fields" } };
      }
      return { status: 200, body: true };
    },
  });

  mock.registerRoute({
    method: "GET",
    path: vPath("products"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, description: "Widget", sku: "WDG-001", unit_price: 9.99 }],
    }),
  });

  // Purchase Orders (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("purchase_orders"),
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
    path: vPathWithId("purchase_orders"),
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
    path: vPath("purchase_orders"),
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
    path: vPathSuffix("purchase_orders", "pending_request_count"),
    handler: () => ({
      status: 200,
      body: { total_pending_request: 3 },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPathIdSuffix("purchase_orders", "cancel"),
    handler: () => ({ status: 200, body: { id: 1, status: "Cancelled" } }),
  });

  // Invoices (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("invoices"),
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
    path: vPathWithId("invoices"),
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
    path: vPath("invoices"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 2, ...parsed.invoice } };
    },
  });

  mock.registerRoute({
    method: "PUT",
    path: vPathIdSuffix("invoices", "approve"),
    handler: () => ({ status: 200, body: { id: 1, status: "Approved" } }),
  });

  // Invoice Purchase Order List (V1/V3) — for linking POs to invoice
  mock.registerRoute({
    method: "GET",
    path: vPathSuffix("invoices", "purchase_order_list"),
    handler: () => ({
      status: 200,
      body: {
        purchase_orders: [
          { id: 1, status: "Approved", supplier_name: "Acme Corp", total: 500 },
          { id: 2, status: "Approved", supplier_name: "Globex", total: 1200 },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 2 },
      },
    }),
  });

  // Invoice Purchase Order Item List (V1/V3) — for linking PO items to invoice
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/invoices\/purchase_order_item_list(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: [
        { id: 10, description: "Widget", quantity: 5, unit_price: 9.99, purchase_order_id: 1 },
        { id: 11, description: "Gadget", quantity: 3, unit_price: 19.99, purchase_order_id: 1 },
      ],
    }),
  });

  // Invoice Rerun Approval Flow (V1/V3) — for INV-03 test
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/invoices\/\d+\/rerun_approval_flow$/,
    handler: () => ({
      status: 200,
      body: { id: 1, status: "Pending", message: "Approval flow rerun initiated" },
    }),
  });

  // Tax Rates (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("tax_rates"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "Standard VAT", value: 20, archived: false }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("tax_rates"),
    handler: () => ({
      status: 200,
      body: { id: 1, name: "Standard VAT", value: 20, archived: false },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("tax_rates"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.tax_rate?.name) {
        return { status: 422, body: { error: "name is required" } };
      }
      return { status: 201, body: { id: 2, archived: false, ...parsed.tax_rate } };
    },
  });

  mock.registerRoute({
    method: "PUT",
    path: vPathWithId("tax_rates"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 200, body: { id: 1, name: "Standard VAT", value: 20, archived: false, ...parsed.tax_rate } };
    },
  });

  mock.registerRoute({
    method: "DELETE",
    path: vPathWithId("tax_rates"),
    handler: () => ({ status: 204, body: {} }),
  });

  // Webhooks (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("webhooks"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, name: "My Webhook", url: "https://example.com/hook", event_type: ["new_po"] }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("webhooks"),
    handler: () => ({
      status: 200,
      body: { id: 1, name: "My Webhook", url: "https://example.com/hook", event_type: ["new_po"] },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("webhooks"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.webhook?.url) {
        return { status: 422, body: { error: "url is required" } };
      }
      return { status: 201, body: { id: 2, ...parsed.webhook } };
    },
  });

  mock.registerRoute({
    method: "PUT",
    path: vPathWithId("webhooks"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 200, body: { id: 1, name: "My Webhook", url: "https://example.com/hook", event_type: ["new_po"], ...parsed.webhook } };
    },
  });

  mock.registerRoute({
    method: "DELETE",
    path: vPathWithId("webhooks"),
    handler: () => ({ status: 204, body: {} }),
  });

  // Payments — NPayments (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("npayments"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, amount: 500, status: "completed", supplier_id: 1 }],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("npayments"),
    handler: () => ({
      status: 200,
      body: { id: 1, amount: 500, status: "completed", supplier_id: 1 },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("npayments"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.npayment?.amount) {
        return { status: 422, body: { error: "amount is required" } };
      }
      return { status: 201, body: { id: 1, status: "pending", supplier_id: parsed.npayment.supplier_id, amount: parsed.npayment.amount } };
    },
  });

  // PO-level payments
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/purchase_orders\/\d+\/payments$/,
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.payment?.amount && !parsed.payment?.purchase_order_item_payments_attributes) {
        return { status: 422, body: { error: "amount or item payments are required" } };
      }
      return { status: 201, body: { id: 1, amount: parsed.payment?.amount, status: "completed" } };
    },
  });

  // Currencies (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("currencies"),
    handler: () => ({
      status: 200,
      body: [{ id: 1, iso_code: "USD", name: "US Dollar", symbol: "$" }],
    }),
  });

  // Approval Flows (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("approval_flows"),
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

  // Approval Flow Actions (V1/V3) — LOW-10 tools: unpublish, version_details, rerun

  // Unpublish Approval Flow — PATCH /approval_flows/:id/unpublish
  mock.registerRoute({
    method: "PATCH",
    path: /^\/api\/v[13]\/approval_flows\/\d+\/unpublish$/,
    handler: () => ({
      status: 200,
      body: { id: 1, name: "Default Flow", published: false },
    }),
  });

  // Approval Flow Version Details — GET /approval_flows/:id/version_details?version_id=N
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/approval_flows\/\d+\/version_details(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: {
        version_id: 1,
        approval_flow_id: 1,
        version_number: 1,
        approval_steps: [],
        created_at: "2026-01-01T00:00:00Z",
      },
    }),
  });

  // Rerun Approval Flows — POST /approval_flows/rerun_approval_flows
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/approval_flows\/rerun_approval_flows$/,
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 200,
        body: {
          message: "Approval flows rerun initiated",
          order_ids: parsed.order_ids || [],
          invoice_ids: parsed.invoice_ids || [],
        },
      };
    },
  });

  // Chart of Accounts (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("chart_of_accounts"),
    handler: () => ({
      status: 200,
      body: {
        chart_of_accounts: [{ id: 1, name: "Advertising", display_name: "Advertising" }],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  // Custom Fields (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: vPath("custom_fields"),
    handler: () => ({
      status: 200,
      body: [
        { id: 1, company_id: 100, name: "Project Code", field_type: "text", active: true, required: false, options: [], option_list: null, access_level: "all", position: 0, on_line_item: false, display_on_pdf: true, default_value: null, editable_after_approval: false, readonly: false, archived: false, formula_builder: null, precision_display: null, display_on_pdf_even_if_value_is_nil: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", webhook_enabled: false, response_populated: false, payload_included: false, is_auto_populated: false },
        { id: 2, company_id: 100, name: "Cost Center", field_type: "dropdown", active: true, required: true, options: ["CC1", "CC2"], option_list: "CC1,CC2", access_level: "all", position: 1, on_line_item: false, display_on_pdf: false, default_value: "CC1", editable_after_approval: true, readonly: false, archived: false, formula_builder: null, precision_display: null, display_on_pdf_even_if_value_is_nil: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", webhook_enabled: false, response_populated: false, payload_included: false, is_auto_populated: false },
      ],
    }),
  });

  mock.registerRoute({
    method: "GET",
    path: vPathWithId("custom_fields"),
    handler: () => ({
      status: 200,
      body: { id: 1, company_id: 100, name: "Project Code", field_type: "text", active: true, required: false, options: [], option_list: null, access_level: "all", position: 0, on_line_item: false, display_on_pdf: true, default_value: null, editable_after_approval: false, readonly: false, archived: false, formula_builder: null, precision_display: null, display_on_pdf_even_if_value_is_nil: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", webhook_enabled: false, response_populated: false, payload_included: false, is_auto_populated: false },
    }),
  });

  mock.registerRoute({
    method: "POST",
    path: vPath("custom_fields"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 201, body: { id: 3, company_id: 100, ...parsed.custom_field } };
    },
  });

  mock.registerRoute({
    method: "PATCH",
    path: vPathWithId("custom_fields"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 200, body: { id: 1, company_id: 100, ...parsed.custom_field } };
    },
  });

  mock.registerRoute({
    method: "DELETE",
    path: vPathWithId("custom_fields"),
    handler: () => ({ status: 200, body: { archived: true } }),
  });

  mock.registerRoute({
    method: "PATCH",
    path: vPathSuffix("custom_fields", "update_positions"),
    handler: () => ({ status: 200, body: { success: true } }),
  });

  // PO Bulk Save (V1/V3)
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("purchase_orders", "bulk_save"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      const data = parsed.purchase_order?.data || [];
      return {
        status: 200,
        body: {
          done: data.map((item: { _id?: string }, idx: number) => ({ _id: item._id || String(idx), id: 100 + idx })),
          failed: [],
        },
      };
    },
  });

  // Compliance (V1/V3)

  // Compliance Check — 202 async
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("compliance", "check"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 202,
        body: {
          status: "processing",
          job_id: "job_abc123",
          purchase_order_id: parsed.compliance_check?.purchase_order_id || null,
          message: "Compliance check initiated",
        },
      };
    },
  });

  // Bulk Check — 202 async
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("compliance", "bulk_check"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 202,
        body: {
          status: "processing",
          bulk_scan_id: 42,
          total_count: parsed.purchase_order_ids?.length || 0,
          skipped: { already_passed: 0, already_scanning: 0 },
        },
      };
    },
  });

  // Bulk Check Status
  mock.registerRoute({
    method: "GET",
    path: vPathSuffix("compliance", "bulk_check_status"),
    handler: () => ({
      status: 200,
      body: {
        bulk_scan_id: 42,
        status: "completed",
        total_count: 5,
        scanned_count: 5,
        passed_count: 4,
        failed_count: 1,
        error_count: 0,
        progress_percent: 100,
        results_data: null,
        started_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-01T00:01:00Z",
        initiated_by: "test@example.com",
      },
    }),
  });

  // Justify Violation
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("compliance", "justify"),
    handler: () => ({
      status: 200,
      body: {
        violation: {
          id: 1,
          policy_name: "Budget Policy",
          resolved: true,
          justification_reason: "Approved by manager",
        },
        all_justified: true,
      },
    }),
  });

  // Generate Memo
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("compliance", "generate_memo"),
    handler: () => ({
      status: 200,
      body: { memo: { title: "Sole Source Justification", content: "Generated memo content" } },
    }),
  });

  // Scan History (paginated)
  mock.registerRoute({
    method: "GET",
    path: vPathSuffix("compliance", "scan_history"),
    handler: () => ({
      status: 200,
      body: {
        scans: [
          {
            id: 1,
            status: "completed",
            total_count: 10,
            passed_count: 9,
            failed_count: 1,
            error_count: 0,
            completed_at: "2026-01-01T00:00:00Z",
            initiated_by: "test@example.com",
          },
        ],
        meta: { current_page: 1, total_pages: 1, total_count: 1, next_page: null },
      },
    }),
  });

  // Scan History Detail — /compliance/scan_history/:id
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/compliance\/scan_history\/\d+$/,
    handler: () => ({
      status: 200,
      body: {
        bulk_scan_id: 1,
        status: "completed",
        total_count: 10,
        scanned_count: 10,
        passed_count: 9,
        failed_count: 1,
        error_count: 0,
        progress_percent: 100,
        results_data: null,
        started_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-01T00:01:00Z",
        initiated_by: "test@example.com",
      },
    }),
  });

  // Evidence Pack Create
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("compliance", "evidence_packs"),
    handler: () => ({
      status: 201,
      body: {
        message: "Evidence pack generation started",
        evidence_pack: {
          id: 1,
          compliance_check_id: 10,
          purchase_order_id: 1,
          po_snapshot: {},
          attachments_metadata: [],
          audit_log: [],
          zip_status: "pending",
          zip_error: null,
          zip_file_name: null,
          zip_file_size: null,
          zip_updated_at: null,
          download_url: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      },
    }),
  });

  // Evidence Pack Download — /compliance/evidence_packs/:id/download (registered before :id to avoid prefix conflict)
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/compliance\/evidence_packs\/\d+\/download$/,
    handler: () => ({
      status: 200,
      body: {
        download_url: "https://example.com/downloads/ep1.zip",
        file_name: "evidence_pack_1.zip",
        file_size: 12345,
      },
    }),
  });

  // Evidence Pack Get — /compliance/evidence_packs/:id
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/compliance\/evidence_packs\/\d+$/,
    handler: () => ({
      status: 200,
      body: {
        evidence_pack: {
          id: 1,
          compliance_check_id: 10,
          purchase_order_id: 1,
          po_snapshot: {},
          attachments_metadata: [],
          audit_log: [],
          zip_status: "completed",
          zip_error: null,
          zip_file_name: "evidence_pack_1.zip",
          zip_file_size: 12345,
          zip_updated_at: "2026-01-01T00:01:00Z",
          download_url: "https://example.com/downloads/ep1.zip",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:01:00Z",
        },
      },
    }),
  });

  // PO Auto-Approvers List (V1/V3)
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/purchase_orders\/auto_approvers_list(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: [{ id: 2, email: "approver@example.com", name: "Auto Approver", approver_name: "Auto Approver" }],
    }),
  });

  // PO Approver List (V1/V3)
  mock.registerRoute({
    method: "POST",
    path: vPathSuffix("purchase_orders", "approver_list"),
    handler: () => ({
      status: 200,
      body: [{ approval_flow_name: "Default Flow", approval_flow_id: 1, approvers: [{ name: "Approver One", email: "approver@example.com", id: 2 }] }],
    }),
  });

  // PO Approval Flow Link (V1/V3) — matches /purchase_orders/:id/aff_link
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/purchase_orders\/[^/]+\/aff_link$/,
    handler: () => ({
      status: 200,
      body: { aff_link: "https://app.procurementexpress.com/approval/abc123" }
    }),
  });

  // Uploads (V1/V3)

  // Upload to PO — POST /uploads/po (multipart)
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/uploads\/po$/,
    handler: (_req, body) => {
      // Multipart body — verify key fields are present in raw string
      if (!body.includes("upload_token") || !body.includes("po_id")) {
        return { status: 422, body: { error: "Missing required upload fields" } };
      }
      return {
        status: 200,
        body: {
          id: 1,
          file_file_name: "test-file.pdf",
          file_content_type: "application/pdf",
          url: "https://example.com/uploads/test-file.pdf",
          upload_token: "abc1234567",
        },
      };
    },
  });

  // Upload to Comment — POST /uploads/poc (multipart)
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/uploads\/poc$/,
    handler: (_req, body) => {
      if (!body.includes("upload_token") || !body.includes("poc_id")) {
        return { status: 422, body: { error: "Missing required upload fields" } };
      }
      return {
        status: 200,
        body: {
          id: 2,
          file_file_name: "comment-doc.pdf",
          file_content_type: "application/pdf",
          url: "https://example.com/uploads/comment-doc.pdf",
          upload_token: "def7654321",
        },
      };
    },
  });

  // Upload Status — GET /uploads/status?upload_token=TOKEN
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/uploads\/status(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: {
        id: 1,
        file_file_name: "test-file.pdf",
        file_content_type: "application/pdf",
        url: "https://example.com/uploads/test-file.pdf",
        upload_token: "abc1234567",
      },
    }),
  });

  // Comments (V1/V3)
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/purchase_orders\/\d+\/comments$/,
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

  // Chat Messages (V3 only — mock routes are version-agnostic for test flexibility)

  // List chat messages — GET /chat_messages
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/chat_messages(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: {
        messages: [
          { id: 1, body: "Hello, can you confirm delivery?", created_at: "2026-01-01T00:00:00Z", creator: { id: 1, name: "Test User", type: "Employee", employer: { id: 100, name: "Test Company", type: "Company" } } },
          { id: 2, body: "Yes, delivery is on schedule.", created_at: "2026-01-01T01:00:00Z", creator: { id: 50, name: "Supplier Contact", type: "SupplierContact", employer: { id: 1, name: "Acme Corp", type: "Supplier" } } },
        ],
        next_cursor: null,
      },
    }),
  });

  // Create chat message — POST /chat_messages
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/chat_messages$/,
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.document_type || !parsed.document_id || !parsed.supplier_id || !parsed.body) {
        return { status: 422, body: { error: "Missing required params" } };
      }
      return {
        status: 201,
        body: { id: 3, body: parsed.body, created_at: "2026-01-02T00:00:00Z", creator: { id: 1, name: "Test User", type: "Employee", employer: { id: 100, name: "Test Company", type: "Company" } } },
      };
    },
  });

  // SAM.gov Check — POST /sam_gov/check
  mock.registerRoute({
    method: "POST",
    path: vPath("sam_gov/check"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.supplier_id) {
        return { status: 422, body: { error: "supplier_id is required" } };
      }
      return {
        status: 200,
        body: {
          id: 1,
          supplier_id: parsed.supplier_id,
          supplier_name: "Acme Corp",
          uei: "ABC123DEF456",
          status: "active",
          total_records: 1,
          has_active_exclusions: false,
          exclusions: [],
          search_params: { name: "Acme Corp" },
          checked_at: "2026-01-01T00:00:00Z",
          fresh: true,
          verification_pdf_url: "https://sam.gov/verify/abc123.pdf",
          sam_gov_search_url: "https://sam.gov/search?uei=ABC123DEF456",
        },
      };
    },
  });

  // Delete chat message — DELETE /chat_messages/:id
  mock.registerRoute({
    method: "DELETE",
    path: /^\/api\/v[13]\/chat_messages\/\d+(\?.*)?$/,
    handler: () => ({ status: 204, body: {} }),
  });

  // NPayments (V1/V3) — for LOW-07, LOW-08 test coverage

  // Create NPayment — POST /npayments
  mock.registerRoute({
    method: "POST",
    path: vPath("npayments"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return {
        status: 201,
        body: { id: 1, ...parsed.npayment, status: "pending", created_at: "2026-01-01T00:00:00Z" },
      };
    },
  });

  // Get NPayment — GET /npayments/:id
  mock.registerRoute({
    method: "GET",
    path: vPathWithId("npayments"),
    handler: () => ({
      status: 200,
      body: { id: 1, amount: 500, status: "completed", payment_method: "bank_transfer", created_at: "2026-01-01T00:00:00Z" },
    }),
  });

  // Pending Invites — GET /companies/pending_invites
  mock.registerRoute({
    method: "GET",
    path: vPathSuffix("companies", "pending_invites"),
    handler: () => ({
      status: 200,
      body: [
        { id: 1, email: "newuser@example.com", name: null, roles: ["requester"], department_ids: [1], approval_limit: null, status: "pending", created_at: 1704067200, token: "inv_abc123", invited_by_name: "Test User" },
      ],
    }),
  });

  // Supplier Approvals — GET /supplier_approvals
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/supplier_approvals(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: {
        supplier_approvals: [
          {
            id: 1,
            name: "New Vendor Co",
            notes: "Pending review",
            phone_number: null,
            address: null,
            email: "vendor@example.com",
            status: "pending",
            requester: { id: 1, email: "test@example.com", name: "Test User", roles: ["companyadmin"] },
            approver: {},
            created_at: 1704067200,
            updated_at: 1704067200,
            uei: null,
            cage_code: null,
          },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  // Policies (V1/V3)

  // List policies — GET /policies (paginated)
  mock.registerRoute({
    method: "GET",
    path: /^\/api\/v[13]\/policies(\?.*)?$/,
    handler: () => ({
      status: 200,
      body: {
        policies: [
          { id: 1, name: "Budget Policy", description: "Enforce budget limits", status: "active", archived: false, category: "spending", scope: "company", budget_ids: [1], min_amount: null, max_amount: 10000, required_attachments: [], min_quotes_required: null, source_template_id: null, versions_count: 2, created_at: 1704067200, updated_at: 1704067200, budgets: [{ id: 1, name: "Q1 Budget" }] },
        ],
        meta: { current_page: 1, next_page: null, prev_page: null, total_pages: 1, total_count: 1 },
      },
    }),
  });

  // Get policy — GET /policies/:id
  mock.registerRoute({
    method: "GET",
    path: vPathWithId("policies"),
    handler: () => ({
      status: 200,
      body: {
        policy: { id: 1, name: "Budget Policy", description: "Enforce budget limits", status: "active", archived: false, category: "spending", scope: "company", budget_ids: [1], min_amount: null, max_amount: 10000, required_attachments: [], min_quotes_required: null, source_template_id: null, versions_count: 2, created_at: 1704067200, updated_at: 1704067200, budgets: [{ id: 1, name: "Q1 Budget" }], content: "All purchases over $10,000 require 3 quotes." },
        versions: [{ id: 1, item_type: "Policy", item_id: 1, event: "create", whodunnit: "1", whodunnit_name: "Test User", object: null, object_changes: {}, created_at: "2026-01-01T00:00:00Z" }],
      },
    }),
  });

  // Create policy — POST /policies
  mock.registerRoute({
    method: "POST",
    path: vPath("policies"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      if (!parsed.policy?.name) {
        return { status: 422, body: { error: "Name is required" } };
      }
      return { status: 201, body: { id: 10, ...parsed.policy, archived: false, budget_ids: parsed.policy.budget_ids || [], required_attachments: parsed.policy.required_attachments || [], versions_count: 0, created_at: 1704067200, updated_at: 1704067200, budgets: [] } };
    },
  });

  // Update policy — PATCH /policies/:id
  mock.registerRoute({
    method: "PATCH",
    path: vPathWithId("policies"),
    handler: (_req, body) => {
      const parsed = JSON.parse(body);
      return { status: 200, body: { id: 1, name: "Updated Policy", ...parsed.policy } };
    },
  });

  // Delete policy — DELETE /policies/:id
  mock.registerRoute({
    method: "DELETE",
    path: vPathWithId("policies"),
    handler: () => ({ status: 204, body: {} }),
  });

  // Policy Templates — GET /policy_templates
  mock.registerRoute({
    method: "GET",
    path: vPath("policy_templates"),
    handler: () => ({
      status: 200,
      body: {
        templates: [
          { id: 1, name: "Sole Source Policy", description: "Template for sole source justification", category: "sourcing", content: "When a single supplier..." },
          { id: 2, name: "Travel Policy", description: "Template for travel expenses", category: "travel", content: "Travel expenses must..." },
        ],
      },
    }),
  });

  // Digital Invoices — POST /digital_invoices (multipart)
  mock.registerRoute({
    method: "POST",
    path: /^\/api\/v[13]\/digital_invoices$/,
    handler: (_req, body) => {
      if (!body.includes("file")) {
        return { status: 422, body: { error: "File is required" } };
      }
      return {
        status: 201,
        body: { id: 100, invoice_number: "DIG-001", gross_amount: 500, currency_id: 1, status: "Draft" },
      };
    },
  });
}
