# Backend: Business Logic, Validations & Edge Cases

This document details the core domain rules, security guards, data validation logic, and edge-case handling implemented throughout the backend codebase.

---

## 1. Multi-Tenant Row-Level Isolation

- **Default Isolation Rule**: No user (except Super Admins) can query, view, update, or delete any record where `company_id != current_user.company_id`.
- **404 Not Found Masking**: If a user attempts to access a resource belonging to another company (e.g. `GET /api/leads/99`), the server returns `HTTP 404 Not Found` rather than `403 Forbidden` to prevent resource enumeration attacks.
- **Automatic Company ID Stamping**: During entity creation, `company_id` is automatically injected from `current_user.company_id` rather than trusting values in the client request body.

---

## 2. Subscription Status & Feature Gating

In [`backend/app/routers/auth.py`](file:///d:/Projects/CRM/backend/app/routers/auth.py#L155), the `require_feature(code)` guard enforces strict subscription status:

1. **Hard Account Suspension**:
   If `company.status` is `SUSPENDED` or `CANCELLED`, all API calls return:
   ```json
   { "detail": "SUBSCRIPTION_SUSPENDED: Organization account is Suspended." }
   ```
2. **Expired / Unpaid Accounts**:
   If `company.status` is `EXPIRED` or `UNPAID`, calls return:
   ```json
   { "detail": "SUBSCRIPTION_EXPIRED: Organization subscription has expired or is unpaid." }
   ```
3. **Disabled Modules**:
   If `check_feature_enabled(db, company_id, feature_code)` evaluates to `False`, the request is rejected with `HTTP 403`:
   ```json
   { "detail": "FEATURE_NOT_ENABLED: Feature module 'leads' is not enabled for your organization." }
   ```

---

## 3. Atomic Lead Conversion Workflow

In [`backend/app/crud.py`](file:///d:/Projects/CRM/backend/app/crud.py#L82), `convert_lead_to_customer` enforces transactional integrity:
- **Idempotency**: If `lead.status == "Converted"`, returns error `"Lead not found or already converted"`.
- **Account Lookup**: Checks if a customer record with `lead_id == lead.id` already exists to prevent duplicate account creation.
- **Account Naming Fallback**: Sets `Customer.name = lead.company_name or lead.contact_name`.
- **Initial Deal Creation**: If `lead.value > 0`, automatically inserts an `Opportunity` record with stage `Proposal` and title `"Deal for [Customer Name]"`.

---

## 4. Dynamic Product Attribute Validation

In [`backend/app/routers/products.py`](file:///d:/Projects/CRM/backend/app/routers/products.py#L76), `_save_field_values` maps arbitrary client values into structured columns:

```python
if field.field_type in ("NUMBER", "CURRENCY"):
    val_number = Decimal(str(raw_val))
elif field.field_type == "BOOLEAN":
    val_boolean = str(raw_val).lower() in ("true", "1", "yes")
elif field.field_type == "MULTI_SELECT":
    val_json = json.dumps(raw_val)
    val_text = ", ".join(raw_val)
else:
    val_text = str(raw_val)
```

- **Validation Defense**: If non-numeric text is provided for a `NUMBER` field, the value gracefully falls back to `val_text` to prevent unhandled database exceptions.
- **Field Ownership Verification**: Validates that every `field_id` submitted belongs strictly to the tenant's company before saving values.

---

## 5. User Management & Hierarchy Boundaries

In [`backend/app/routers/users.py`](file:///d:/Projects/CRM/backend/app/routers/users.py):
- **Role Escalation Protection**: An Admin cannot create or elevate anyone to `super_admin`. A Manager cannot create Admins or fellow Managers.
- **Subordinate Enforcement**: When a Manager creates an Employee, the employee's `manager_id` is automatically locked to `current_user.id`.
- **Self-Modification Restrictions**: Employees modifying their own profile via `PATCH /api/users/{id}` can only change their `name` and `password`. Attempts to alter `role`, `company_id`, or `is_active` are rejected with `HTTP 403 Forbidden`.

---

## 6. CSV File Parsing & Encoding Auto-Detection

In [`backend/app/routers/imports.py`](file:///d:/Projects/CRM/backend/app/routers/imports.py#L47), `_parse_csv` handles international and legacy character sets:
- Sequentially tests encodings: `utf-8-sig` &rarr; `utf-8` &rarr; `cp1252` &rarr; `iso-8859-1` &rarr; `latin1` &rarr; `utf-16`.
- Strips Byte Order Marks (`\ufeff`).
- Normalizes all header keys to lowercase.
- Trims currency formatting characters (`$`, `,`) when converting string amounts to numeric values.
- Enforces an upload cap of 5,000 rows per file to prevent memory exhaustion.

---

## 7. Meeting & Reminder Attendee Isolation

In [`backend/app/routers/reminders.py`](file:///d:/Projects/CRM/backend/app/routers/reminders.py#L298):
- When `attendee_ids` are submitted, the backend verifies every user ID against `models.User.company_id == tenant.organization_id`.
- Any external user IDs submitted by malicious clients are silently stripped from the attendee list, preventing cross-tenant invitation leaks.
- Rescheduling a reminder into the future resets `is_dismissed = False` on all attendees so they receive fresh popup alerts.
