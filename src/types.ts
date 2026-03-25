// Shared TypeScript interfaces for ProcurementExpress API responses
// Based on actual Rails serializers in po-app/app/serializers/

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

// Auth (V3 OAuth2)
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

// Users (UserSerializer)
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
  has_unassigned_budgets: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  approver_name: string | null;
  phone_number: string | null;
  setup_incomplete: boolean;
  employer_id: number | null;
  authentication_token?: string;
  approval_limit: number | null;
  companies: Company[];
  roles?: string[];
  external_user_id?: string | null;
  network_id?: string | null;
}

// Currencies (CurrencySerializer)
export interface Currency {
  id: number;
  iso_code: string;
  iso_numeric: string;
  name: string;
  symbol: string;
  created_at?: string;
  updated_at?: string;
}

// Budgets (BudgetSerializer)
export interface Budget {
  id: number;
  company_id: number;
  name: string;
  amount: number;
  cost_code: string | null;
  cost_type: string | null;
  archived: boolean;
  currency_id: number;
  base_amount: number | null;
  base_rate: number | null;
  allow_anyone_to_approve_a_po: boolean;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  remaining_amount: number;
  creator_id: number;
  qbo_class: unknown | null;
  department_ids: number[];
  approver_ids: number[];
  created_at: string;
  updated_at: string;
  chart_of_account_id: number | null;
  chart_of_account_name: string | null;
  approved_this_month?: number;
  third_party_id_mappings?: Record<string, unknown>;
}

// Departments (DepartmentSerializer)
export interface Department {
  id: number;
  name: string;
  company_id: number;
  archived: boolean;
  contact_person: string | null;
  tax_number: string | null;
  phone_number: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  supplier_ids: number[];
  budget_ids: number[];
}

// Suppliers (SupplierSerializer)
export interface Supplier {
  id: number;
  name: string;
  company_id: number;
  notes: string | null;
  phone_number: string | null;
  address: string | null;
  email: string | null;
  payment_details: string | null;
  archived: boolean;
  contact_person: string | null;
  tax_number: string | null;
  payment_terms: string | null;
  created_at: string;
  updated_at: string;
  currency_id: number | null;
  department_ids: number[];
  external_vendor_id: string | null;
  third_party_id_mappings?: Record<string, unknown>;
}

// Products (ProductSerializer)
export interface Product {
  id: number;
  supplier_id: number | null;
  sku: string | null;
  description: string;
  unit_price: number | null;
  currency_id: number | null;
  archived: boolean;
  tax_rate_id: number | null;
  created_at: string;
  updated_at: string;
}

// Custom Fields (CustomFieldSerializer)
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
  on_budget: boolean;
  on_invoice_item: boolean;
  on_invoice: boolean;
  on_supplier: boolean;
  on_rfq: boolean;
  on_product: boolean;
  display_on_pdf: boolean;
  default_value: string | null;
  created_at: string;
  updated_at: string;
  editable_after_approval: boolean;
  readonly: boolean;
}

// Custom Field Values (CustomFieldValueSerializer)
export interface CustomFieldValue {
  id: number;
  purchase_order_id: number | null;
  value: string;
  custom_field_id: number;
  purchase_order_item_id: number | null;
  date_format: string | null;
  budget_id: number | null;
  value_str?: string;
}

// Company Settings (CompanySettingSerializer)
export interface CompanySetting {
  id: number;
  show_po_item_number: boolean;
  gross_or_net: string;
  company_id: number;
  fixed_supplier_list: boolean;
  currency_id: number;
  javascript: string | null;
  departments_alias: string | null;
  display_remaining_budget_amount: boolean;
  date_format: string;
  tax_label: string | null;
  approvals_require_login: boolean;
  fixed_product_list: boolean;
  fixed_product_price: boolean;
  show_tax_column: boolean;
  show_company_name: boolean;
  allow_budget_overruns: boolean;
  budgets_alias: string | null;
  enable_detailed_allocations_for_purchase_order_line_items: boolean;
  allocations_enabled: boolean;
  report_name: string | null;
  user_can_add_supplier: boolean;
  user_can_add_product: boolean;
  po_fields: string[];
  reserve_po_number: boolean;
  default_template_id: number | null;
  default_tax_rate_id: number | null;
  can_invite_user: boolean;
  show_remaining_budget_to_teammember: boolean;
  allow_open_draft_access: boolean;
  link_budgets_to_qbo_accounts: boolean;
  link_budgets_to_qbo_class: boolean;
  enable_offline_mode: boolean;
  is_quickbooks_connected: boolean;
  is_sage_connected: boolean;
  show_currency_symbol: boolean;
  enable_approval_override: boolean;
  can_upload_invoice: boolean;
  invoice_reference_mandatory: boolean;
  manually_approve_by_lowest_available_approvers: boolean;
  default_payment_term_id: number | null;
  qbo_customer_required: boolean;
  qbo_customer_active: boolean;
  qbo_class_required: boolean;
  qbo_class_active: boolean;
  qbo_class_alias: string | null;
  qbo_customer_alias: string | null;
  show_qbo_chart_of_account_number: boolean;
}

// Company Detail (CompanyDetailSerializer)
export interface CompanyDetail {
  id: number;
  name: string;
  employees_count: number;
  default_tax_rate: number | null;
  prepaid_subscription: boolean;
  multicompany_pack: boolean;
  payment_term_ff_enabled: boolean;
  scan_and_match_ff_enabled: boolean;
  approval_flow_ff_enabled: boolean;
  policy_ff_enabled: boolean;
  sam_gov_enabled?: boolean;
  company_setting: CompanySetting;
  custom_fields: CustomField[];
  supported_currencies: Currency[];
  default_payment_term?: PaymentTerm | null;
  payment_terms?: PaymentTerm[];
}

// Payment Terms (PaymentTermSerializer)
export interface PaymentTerm {
  id: number;
  name: string;
  due_days: number | null;
  day_of_month: number | null;
  term_type: string;
  archived: boolean;
}

// Purchase Order Items (PurchaseOrderItemSerializer)
export interface PurchaseOrderItem {
  id: number;
  description: string;
  purchase_order_id: number;
  budget_id: number | null;
  budget_summary: string | null;
  gross_amount: number;
  vat: number;
  tax_rate: number;
  net_amount: number;
  status: string;
  quantity: number;
  unit_price: number;
  item_number: string | null;
  base_net_amount: number;
  base_gross_amount: number;
  gross_usd_amount: number | null;
  product_id: number | null;
  received_quantity: number;
  custom_field_values: CustomFieldValue[];
  sequence_no: number;
  third_party_id_mappings?: Record<string, unknown>;
  chart_of_account?: ChartOfAccount | null;
  qbo_customer?: QboCustomer | null;
  quickbooks_class?: QboClass | null;
}

// Approver Requests (RequestSerializer)
export interface ApproverRequest {
  id: number;
  status: string;
  approver_name: string;
  approver_id: number;
  accept_token: string;
  reject_token: string;
  delegate_id: number | null;
}

// PO Comments (PurchaseOrderCommentSerializer)
export interface PurchaseOrderComment {
  id: number;
  comment: string;
  creator_id: number;
  creator_name: string;
  purchase_order_id: number;
  status: string;
  created_at: number;
  uploads: Upload[];
  comment_formatted_time: string;
  comment_formatted_date: string;
  comment_display_name: string;
  formatted_comment: string;
}

// Uploads (UploadSerializer)
export interface Upload {
  id: number;
  file_file_name: string;
  file_content_type: string;
  url: string;
  upload_token: string;
}

// Purchase Order List (PurchaseOrderSerializer)
export interface PurchaseOrderSummary {
  id: number;
  approval_key: string | null;
  creator_name: string;
  amount: number;
  status: string;
  supplier_name: string | null;
  keywords: string | null;
  created_at: number;
  currency_id: number;
  currency_symbol: string;
  currency_iso_code: string;
  total_gross_amount: number;
  total_net_amount: number;
  base_gross_amount: number;
  submitted_on: number | null;
  share_key: string | null;
  department_id: number | null;
  department_name: string | null;
  approver_requests?: ApproverRequest[];
  compliance_status?: string;
  delivered_on?: number | null;
  delivery_status?: string | null;
  payment_status?: string | null;
  xero_export_status?: string | null;
  synced_with_xero?: boolean;
  xero_is_changed?: boolean;
}

// Purchase Order Detail (PurchaseOrderDetailsSerializer)
export interface PurchaseOrder {
  id: number;
  company_id: number;
  approval_key: string | null;
  department_id: number | null;
  department_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  external_vendor_id: string | null;
  status: string;
  submitted_on: number | null;
  currency_id: number;
  currency_iso_code: string;
  creator_id: number;
  creator_name: string;
  creator_email: string;
  creator_network_id: string | null;
  amount: number;
  created_at: number;
  updated_at: number;
  notes: string | null;
  total_net_amount: number;
  total_gross_amount: number;
  base_gross_amount: number;
  delivery_status: string | null;
  payment_status: string | null;
  delivered_on: number | null;
  custom_fields: CustomField[];
  share_key: string | null;
  archived: boolean;
  conversion_rate: number;
  keywords: string | null;
  self_approved: boolean;
  xero_id: string | null;
  synced_with_xero: boolean;
  can_cancel: boolean;
  can_archive: boolean;
  can_mark_as_paid: boolean;
  can_override: boolean;
  can_receive_item: boolean;
  can_cancel_receiving_items: boolean;
  can_edit: boolean;
  completely_delivered: boolean;
  aff_link: string | null;
  statuses: string[];
  budgets: Budget[];
  tax_rates: TaxRate[];
  can_complete_delivery: boolean;
  can_copy: boolean;
  approvers_with_flow: ApproverWithFlow[];
  latest_compliance_check: ComplianceCheck | null;
  slug: string | null;
  purchase_order_items: PurchaseOrderItem[];
  purchase_order_comments: PurchaseOrderComment[];
  custom_field_values: CustomFieldValue[];
  payments: unknown[];
  purchase_order_item_payments: unknown[];
  uploads: Upload[];
  invoices: unknown[];
  compliance_checks: ComplianceCheck[];
  approver_requests: ApproverRequest[];
  supplier: Supplier | null;
  xero_export_status?: string | null;
  xero_export_error_message?: string | null;
  xero_last_export_at?: string | null;
  xero_is_changed?: boolean;
  can_justify?: boolean;
  has_global_policies?: boolean;
}

// Approvers with flow
export interface ApproverWithFlow {
  status: string;
  name: string;
  approval_flow_id: number | null;
  next_request_id: number | null;
  last_approval_date: string | null;
  up_to_date: boolean;
  requests: {
    id: number;
    status: string;
    approver_id: number;
    delegate_id: number | null;
    created_at: number;
    updated_at: number;
    approver_name: string;
    was_approval_override: boolean;
  }[];
}

// Compliance Check (ComplianceCheckSerializer)
export interface ComplianceCheck {
  id: number;
  status: string;
  checked_at: string;
  passed_policies: number;
  evidence_pack_id: number | null;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  id: number;
  policy_id: number;
  policy_name: string;
  policy_reference: string;
  violation_type: string;
  risk_level: string;
  impact: string;
  details: string;
  remediation_options: string[];
  resolved: boolean;
  resolved_at: string | null;
  resolution_method: string | null;
}

// Invoice List (InvoiceSerializer)
export interface InvoiceSummary {
  id: number;
  invoice_number: string | null;
  status: string;
  issue_date: number | null;
  validation_date: number | null;
  uploaded_date: number | null;
  due_date: number | null;
  tax_amount: number;
  net_amount: number;
  gross_amount: number;
  balance_amount: number;
  supplier_id: number | null;
  supplier_name: string | null;
  purchase_order_references: string[];
  can_accept: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  can_archive: boolean;
  can_dearchive: boolean;
  standalone_invoice: boolean;
  confidence_score: number | null;
  digital_invoice: boolean;
  payment_term_id: number | null;
  payment_terms_list: PaymentTerm[];
  currency: Currency;
  xero_export_status?: string | null;
  xero_is_changed?: boolean;
}

// Invoice Detail (InvoiceDetailSerializer)
export interface Invoice {
  id: number;
  invoice_number: string | null;
  status: string;
  issue_date: number | null;
  validation_date: number | null;
  uploaded_date: number | null;
  due_date: number | null;
  tax_amount: number;
  net_amount: number;
  gross_amount: number;
  balance_amount: number;
  created_at: number;
  updated_at: number;
  standalone_invoice: boolean;
  can_accept: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  can_archive: boolean;
  can_dearchive: boolean;
  sage_exported: boolean;
  confidence_score: number | null;
  digital_invoice: boolean;
  selected_purchase_order_ids: number[];
  payment_term_id: number | null;
  payment_terms_list: PaymentTerm[];
  currency: Currency;
  supplier: Supplier | null;
  invoice_line_items: InvoiceLineItem[];
  purchase_orders: unknown[];
  supplier_invoice_uploads: SupplierInvoiceUpload[];
  histories: InvoiceComment[];
  comments: InvoiceComment[];
  npayments: NpaymentSummary[];
  xero_export_status?: string | null;
  xero_export_error_message?: string | null;
  xero_last_export_at?: string | null;
  xero_is_changed?: boolean;
}

// Invoice Line Items (InvoiceLineItemSerializer)
export interface InvoiceLineItem {
  id: number;
  sequence_no: number;
  description: string;
  unit_price: number;
  quantity: number;
  vat: number;
  net_amount: number;
  base_net_amount: number;
  deleted_at: string | null;
  billable_status: string | null;
  tax_rate_id: number | null;
  chart_of_account_id: number | null;
  qbo_customer_id: number | null;
  quickbooks_class_id: number | null;
  invoice_id: number;
  purchase_order_id: number | null;
  purchase_order_item_id: number | null;
  markup_info: unknown | null;
  created_at: number;
  updated_at: number;
  tax_amount: number;
  calculated_gross_amount: number;
  tax_exception: boolean;
  chart_of_account?: ChartOfAccount | null;
  qbo_customer?: QboCustomer | null;
  quickbooks_class?: QboClass | null;
}

// Invoice Comments (InvoiceCommentSerializer)
export interface InvoiceComment {
  id: number;
  comment: string;
  invoice_id: number;
  creator_id: number;
  creator_name: string;
  created_at: number;
  updated_at: number;
  comment_formatted_time: string;
  comment_formatted_date: string;
  formatted_comment: string;
}

// Supplier Invoice Uploads (SupplierInvoiceUploadSerializer)
export interface SupplierInvoiceUpload {
  id: number;
  file_file_name: string;
  file_content_type: string;
  file_file_size: number;
  url: string;
}

// Npayment Summary (NpaymentSerializer)
export interface NpaymentSummary {
  id: number;
  reference: string | null;
  status: string;
  ptype: string;
  date: number;
  amount: number;
}

// Npayment Detail (NpaymentDetailSerializer)
export interface Payment {
  id: number;
  reference: string | null;
  status: string;
  ptype: string;
  date: number;
  amount: number;
  created_at: number;
  updated_at: number;
  payment_mode: string;
  archived: boolean;
  conversion_rate: number;
  currency: { id: number; iso_code: string; symbol: string };
  supplier: { id: number; name: string };
  user: { id: number; name: string; email: string };
  invoices: unknown[];
  npayment_comments: NpaymentComment[];
}

export interface NpaymentComment {
  id: number;
  comment: string;
  creator_id: number;
  system_generated: boolean;
  created_at: number;
  updated_at: number;
}

// Approval Flows (ApprovalFlowSerializer / ApprovalFlowDetailSerializer)
export interface ApprovalFlow {
  id: number;
  name: string;
  document_type: number;
  self_approval_allowed: boolean;
  company_id: number;
  version_no: number;
  archived: boolean;
  status: string;
  in_progress_entities_count: number;
  completed_entities_count: number;
  rejected_entities_count: number;
  total_entities_count: number;
  created_at: number;
  updated_at: number;
  approval_steps?: ApprovalStep[];
  approval_conditions?: ApprovalCondition[];
}

// Approval Steps (ApprovalStepSerializer)
export interface ApprovalStep {
  id: number;
  step_no: number;
  all_should_approve: boolean;
  approval_flow_id: number;
  created_at: number;
  updated_at: number;
  approval_step_approvers: ApprovalStepApprover[];
  approval_conditions: ApprovalCondition[];
}

// Approval Step Approvers (ApprovalStepApproverSerializer)
export interface ApprovalStepApprover {
  id: number;
  approval_step_id: number;
  user_id: number;
  user: { id: number; name: string; email: string };
  created_at: number;
  updated_at: number;
}

// Approval Conditions (ApprovalConditionSerializer)
export interface ApprovalCondition {
  id: number;
  property: string;
  operator: string;
  value: string;
  custom_field_id: number | null;
  approval_flow_id: number | null;
  approval_step_id: number | null;
  created_at: number;
  updated_at: number;
  human_readable_description: string;
  property_label: string;
  value_label: string;
}

// Approval Entity (ApprovalEntitySerializer)
export interface ApprovalEntity {
  id: number;
  approval_flow_id: number;
  entity_id: number;
  entity_type: string;
  status: string;
  created_at: number;
  updated_at: number;
}

// Tax Rates (TaxRateSerializer)
export interface TaxRate {
  id: number;
  name: string;
  value: number;
  archived: boolean;
  company_id: number;
  tax_type: string;
  tax_rate_items: TaxRateItem[];
  created_at: string;
  updated_at: string;
}

export interface TaxRateItem {
  id: number;
  combined_tax_rate: CombinedTaxRate;
}

export interface CombinedTaxRate {
  id: number;
  name: string;
  value: number;
  tax_amount?: number;
}

// Webhooks (WebhookSerializer / WebhookDetailSerializer)
export interface Webhook {
  id: number;
  name: string;
  url: string;
  archived: boolean;
  event_type: string[];
  tested: boolean;
  response_code: number | null;
  json_wrapper: string | null;
  send_as_text?: boolean;
  basic_auth_uname?: string;
  basic_auth_pword?: string;
  webhook_attributes?: WebhookAttribute[];
}

export interface WebhookAttribute {
  id: number;
  attrib_type: string;
  key: string;
  value: string;
}

// Chart of Accounts (ChartOfAccountSerializer)
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

// QuickBooks Customers (QboCustomerSerializer)
export interface QboCustomer {
  id: number;
  fully_qualified_name: string;
  archived: boolean;
  company_id: number;
}

// QuickBooks Classes (QuickbooksClassSerializer)
export interface QboClass {
  id: number;
  fully_qualified_name: string;
  archived: boolean;
  company_id: number;
}

// Send to Supplier Templates (SendToSupplierTemplateSerializer)
export interface SendToSupplierTemplate {
  id: number;
  company_id: number;
  label: string;
  text: string;
  is_default: boolean;
  template_name: string;
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
