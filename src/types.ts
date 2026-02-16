// Shared TypeScript interfaces for ProcurementExpress API responses

export interface PaginationMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_pages: number;
  total_count: number;
}

export interface ApiError {
  status: number;
  message: string;
}

// Auth
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export interface TokenInfo {
  resource_owner_id: number;
  scopes: string[];
  expires_in_seconds: number;
  application: { uid: string };
  created_at: number;
}

// Users
export interface Company {
  id: number;
  name: string;
  external_user_id: string | null;
  membership_archived: boolean;
  is_locked: boolean;
  is_removed: boolean;
  approval_limit: number | null;
  in_trial: boolean;
  trial_expired: boolean;
  remaining_trial_days: number;
  roles: string[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone_number: string | null;
  setup_incomplete: boolean;
  employer_id: number | null;
  authentication_token: string;
  approval_limit: number | null;
  companies: Company[];
}

// Currencies
export interface Currency {
  id: number;
  iso_code: string;
  iso_numeric: string;
  name: string;
  symbol: string;
}

// Budgets
export interface Budget {
  id: number;
  name: string;
  amount: number;
  cost_code: string | null;
  cost_type: string | null;
  currency_id: number;
  creator_id: number;
  allow_anyone_to_approve_a_po: boolean;
  start_date: string | null;
  end_date: string | null;
  remaining_amount?: number;
  approver_ids: number[];
  department_ids: number[];
}

// Departments
export interface Department {
  id: number;
  name: string;
  archived: boolean;
  contact_person: string | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  budget_ids: number[];
  user_ids: number[];
}

// Suppliers
export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  payment_details: string | null;
  phone_number: string | null;
  archived: boolean;
  tax_number: string | null;
  contact_person: string | null;
  external_vendor_id: string | null;
}

// Products
export interface Product {
  id: number;
  description: string;
  sku: string | null;
  unit_price: number | null;
  supplier_id: number | null;
}

// Custom Fields
export interface CustomField {
  id: number;
  company_id: number;
  name: string;
  field_type: string;
  active: boolean;
  required: boolean;
  options: string[];
  access_level: string;
  position: number;
  on_line_item: boolean;
  display_on_pdf: boolean;
  on_budget: boolean;
  editable_after_approval: boolean;
}

export interface CustomFieldValue {
  id: number;
  value: string;
  custom_field_id: number;
}

// Company Settings
export interface CompanySetting {
  currency_id: number;
  pdf_font_size: string | null;
  date_format: string;
  departments_alias: string | null;
  tax_label: string | null;
  approvals_require_login: boolean;
  show_po_item_number: boolean;
  fixed_supplier_list: boolean;
  display_remaining_budget_amount: boolean;
  display_budget_on_pdf: boolean;
  fixed_product_list: boolean;
  show_tax_column: boolean;
  show_company_name: boolean;
  show_approver_name: boolean;
  user_can_add_supplier: boolean;
  allow_budget_overruns: boolean;
  allocations_enabled: boolean;
  budgets_alias: string | null;
}

export interface CompanyDetail {
  id: number;
  name: string;
  company_setting: CompanySetting;
  custom_fields: CustomField[];
  supported_currencies: Currency[];
}

// Purchase Orders
export interface PurchaseOrderItem {
  id: number;
  description: string;
  quantity: number;
  net_amount: number;
  unit_price: number;
  budget_id: number | null;
  vat: number;
  item_number: string | null;
  sequence_no: number;
  custom_field_values: CustomFieldValue[];
}

export interface ApproverRequest {
  id: number;
  approver_id: number;
  accept_token: string;
  reject_token: string;
  status: string;
}

export interface PurchaseOrderComment {
  id: number;
  comment: string;
  creator_id: number;
  creator_name: string;
  purchase_order_id: number;
  status: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  supplier_name: string | null;
  department_id: number | null;
  creator_id: number;
  supplier_id: number | null;
  currency_id: number;
  notes: string | null;
  status: string;
  company_id: number;
  can_cancel: boolean;
  can_archive: boolean;
  can_receive_item: boolean;
  can_cancel_receiving_items: boolean;
  can_mark_as_paid: boolean;
  purchase_order_items: PurchaseOrderItem[];
  purchase_order_comments: PurchaseOrderComment[];
  approver_requests: ApproverRequest[];
  custom_field_values: CustomFieldValue[];
}

// Invoices
export interface InvoiceLineItem {
  id: number;
  description: string;
  unit_price: number;
  quantity: number;
  vat: number;
  net_amount: number;
  purchase_order_id: number | null;
  purchase_order_item_id: number | null;
}

export interface Invoice {
  id: number;
  invoice_number: string | null;
  issue_date: string | null;
  supplier_id: number | null;
  received_date: string | null;
  due_date: string | null;
  gross_amount: number;
  currency_id: number;
  company_id: number;
  can_accept: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  can_archive: boolean;
  can_dearchive: boolean;
  invoice_line_items: InvoiceLineItem[];
}

// Approval Flows
export interface ApprovalCondition {
  property: string;
  operator: string;
  value: string;
  custom_field_id: number | null;
}

export interface ApprovalStepApprover {
  user_id: number;
}

export interface ApprovalStep {
  step_no: number;
  all_should_approve: boolean;
  approval_step_approvers: ApprovalStepApprover[];
  approval_conditions: ApprovalCondition[];
}

export interface ApprovalFlow {
  id: number;
  name: string;
  document_type: number;
  self_approval_allowed: boolean;
  approval_steps: ApprovalStep[];
  approval_conditions: ApprovalCondition[];
}

// Tax Rates
export interface TaxRate {
  id: number;
  name: string;
  value: number;
  archived: boolean;
  company_id: number;
  tax_rate_items?: TaxRateItem[];
}

export interface TaxRateItem {
  id: number;
  combined_tax_rate: TaxRate;
}

// Webhooks
export interface Webhook {
  id: number;
  name: string;
  url: string;
  archived: boolean;
  event_type: string[];
  json_wrapper: string | null;
  send_as_text: boolean;
  tested: boolean;
  response_code: number | null;
}

// Payments
export interface Payment {
  id: number;
  user_id: number;
  reference: string | null;
  supplier_id: number;
  ptype: string;
  date: string;
  currency_id: number;
  amount: number;
  status: string;
}

// Chart of Accounts
export interface ChartOfAccount {
  id: number;
  name: string;
  classification: string | null;
  account_type: string | null;
  currency_code: string | null;
  account_number: string | null;
  display_name: string;
  archived: boolean;
  company_id: number;
}

// QuickBooks
export interface QboCustomer {
  id: number;
  fully_qualified_name: string;
  archived: boolean;
  company_id: number;
}

export interface QboClass {
  id: number;
  fully_qualified_name: string;
  archived: boolean;
  company_id: number;
}

// Send to Supplier Templates
export interface SendToSupplierTemplate {
  id: number;
  company_id: number;
  label: string;
  text: string;
  is_default: boolean;
}

// Uploads
export interface Upload {
  id: number;
  file_file_name: string;
  file_content_type: string;
  url: string;
  upload_token: string;
}

// Employee (from companies/employees)
export interface Employee {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

// Approver (from companies/approvers)
export interface Approver {
  id: number;
  email: string;
  name: string;
  approval_limit: number | null;
}
