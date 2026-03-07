# Approval Flow Conditions

## Condition Schema

Each condition in the `conditions` array accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | For updates | Existing condition ID |
| `property` | string | Yes | What to evaluate (see Properties below) |
| `operator` | string | Yes | How to compare (see Operators below) |
| `value` | string | Yes | Value to compare against |
| `custom_field_id` | integer | Only for custom fields | Custom field ID |
| `_destroy` | boolean | No | Set true to remove (updates only) |

## Properties

| Property | Description | Value Format |
|----------|-------------|-------------|
| `budget` | Budget ID | Single budget ID |
| `department` | Department ID | Single department ID |
| `supplier` | Supplier ID | Single supplier ID |
| `requester` | Requester user ID | Single user ID |
| `gross_amount` | Gross total amount | Numeric string |
| `net_amount` | Net total amount | Numeric string |
| `custom_field_<id>` | Custom field value | Depends on field type |

## Operators

| Operator | Use With |
|----------|----------|
| `equals` | All properties |
| `not_equals` | All properties |
| `greater_than` | Amount properties |
| `less_than` | Amount properties |
| `is_any_of` | ID properties (comma-separated IDs) |
| `is_none_of` | ID properties (comma-separated IDs) |
| `exists` | Custom field properties (check if value exists) |
| `not_exists` | Custom field properties (check if value is empty) |
| `contains` | Text/ID properties (comma-separated IDs or substring) |
| `not_contains` | Text/ID properties (comma-separated IDs or substring) |

Operators are passed as string values (e.g. `"equals"`, `"greater_than"`).

## Examples

**Flow matches POs from Engineering department (ID: 5):**
```json
{ "property": "department", "operator": "0", "value": "5" }
```

**Step activates when gross amount > $10,000:**
```json
{ "property": "gross_amount", "operator": "2", "value": "10000" }
```

**Flow matches POs from suppliers 1, 2, or 3:**
```json
{ "property": "supplier", "operator": "4", "value": "1,2,3" }
```

**Condition on custom field (ID: 42) equals "urgent":**
```json
{ "property": "custom_field_42", "operator": "0", "value": "urgent", "custom_field_id": 42 }
```

## Approval Step Schema

Each step in the `steps` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | For updates | Existing step ID |
| `step_no` | integer | Yes | Execution order (1, 2, 3...) |
| `all_should_approve` | boolean | Yes | true = all approvers must approve, false = any one suffices |
| `approver_user_ids` | integer[] | Yes | User IDs of approvers for this step |
| `conditions` | array | No | Step-level conditions (same schema as above) |
| `_destroy` | boolean | No | Remove step (updates only) |

## Workflow: Create a Multi-Step Approval Flow

```
1. list_employees (pex-companies) → get approver user IDs
2. list_departments (pex-departments) → get department IDs for conditions
3. create_approval_flow with:
   - name, document_type (0=PO or 1=invoice)
   - steps with step_no ordering and approver assignments
   - conditions for flow-level matching
4. publish_approval_flow → make it active
```
