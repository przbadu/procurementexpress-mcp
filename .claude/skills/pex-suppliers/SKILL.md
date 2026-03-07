---
name: pex:suppliers
description: >
  ProcurementExpress supplier and product management. Use when listing, viewing, creating, or
  updating suppliers (vendors) and their products (catalog items). Routes to MCP tools:
  list_suppliers, get_top_suppliers, get_supplier, create_supplier, update_supplier,
  list_products, get_product, create_product, update_product. Triggers on: supplier, vendor,
  product, catalog, SKU, top suppliers, supplier search, product list.
---

# ProcurementExpress Suppliers & Products

## Prerequisites

Authenticate (pex-auth) and set active company (pex-companies) first.

## Supplier Tools

### list_suppliers
List suppliers with optional pagination, search, and filters.
- **Params:**
  - `page` (optional, integer) — enables pagination (20 per page). Without page, returns ALL suppliers
  - `search` (optional, string) — search by supplier name
  - `department_id` (optional, integer) — filter by department (also includes suppliers with no department)
  - `archived` (optional, boolean, default: false)
  - `show_mappings` (optional, boolean) — include third-party ID mappings
- **Returns:** `Supplier[]` (no pagination) or `{ suppliers: Supplier[], meta: PaginationMeta }` (with pagination)

### get_top_suppliers
Get the user's most frequently used suppliers.
- **Params:**
  - `top` (optional, integer, default: 5) — number of suppliers to return
  - `archived` (optional, boolean)
- **Returns:** `Supplier[]`

### get_supplier
Get a specific supplier by ID.
- **Params:** `id` (required, integer)
- **Returns:** `Supplier`

### create_supplier
Create a new supplier. Name must be unique within the company.
- **Params:**
  - `name` (required, string, must be unique)
  - `email` (optional, string)
  - `address` (optional, string)
  - `notes` (optional, string)
  - `payment_details` (optional, string) — bank/payment info
  - `phone_number` (optional, string)
  - `tax_number` (optional, string)
  - `contact_person` (optional, string)
  - `uei` (optional, string) — Unique Entity Identifier for SAM.gov
  - `cage_code` (optional, string) — CAGE code for government contracting
  - `department_ids` (optional, integer array) — restrict supplier to specific departments
- **Note:** If company has supplier approval enabled, creates a pending approval request instead
- **Returns:** `Supplier`

### update_supplier
Update an existing supplier.
- **Params:** `id` (required) + any create_supplier params + `archived` (optional, boolean)
- **Returns:** `Supplier`

## Product Tools

Products are catalog items associated with a supplier. When creating PO line items, use `product_id` to auto-fill description, SKU, and unit price.

### list_products
List products with optional pagination and filters.
- **Params:**
  - `page` (optional, integer) — enables pagination
  - `per_page` (optional, integer, default: 20)
  - `supplier_id` (optional, integer) — filter by supplier
  - `archived` (optional, boolean, default: false)
- **Returns:** `Product[]` (no pagination) or `{ products: Product[], meta: PaginationMeta }` (with pagination)

### get_product
Get a specific product by ID.
- **Params:** `id` (required, integer)
- **Returns:** `Product`

### create_product
Create a new product associated with a supplier.
- **Params:**
  - `description` (required, string)
  - `supplier_id` (required, integer) — must belong to an existing supplier
  - `sku` (optional, string)
  - `unit_price` (optional, number)
- **Returns:** `Product`

### update_product
Update an existing product.
- **Params:** `id` (required) + `description`, `sku`, `unit_price`, `supplier_id` (all optional)
- **Returns:** `Product`

## Supplier Response Fields

- `id`, `name`, `company_id`, `archived`
- `email`, `phone_number`, `address`, `contact_person`
- `notes`, `payment_details`, `tax_number`
- `payment_terms`, `currency_id`
- `department_ids[]` — restricted departments
- `external_vendor_id`, `third_party_id_mappings`
- `created_at`, `updated_at`

## Product Response Fields

- `id`, `supplier_id`, `sku`, `description`, `unit_price`
- `currency_id`, `archived`, `tax_rate_id`
- `created_at`, `updated_at`

## PaginationMeta Fields

- `current_page`, `next_page`, `prev_page`, `total_pages`, `total_count`
