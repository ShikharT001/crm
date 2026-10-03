# Database: Schema Catalog & Tables

The CRM database engine uses **SQLAlchemy 2.0 ORM** connected to a SQLite database (`crm.db`). All tenant-specific data is row-level partitioned using `company_id`.

---

## 1. Multi-Tenant Infrastructure & Organizations

### `companies` (Alias: `Organization`)
Represents an organization/tenant on the platform.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Unique organization identifier |
| `name` | `VARCHAR` | `NOT NULL, INDEX` | Organization legal or brand name |
| `domain` | `VARCHAR` | `UNIQUE, INDEX, NULLABLE` | Registered email/web domain |
| `industry` | `VARCHAR` | `NULLABLE` | Assigned industry classification |
| `status` | `ENUM` | `NOT NULL, DEFAULT 'ACTIVE'` | `TRIAL`, `ACTIVE`, `PAID`, `UNPAID`, `EXPIRED`, `SUSPENDED`, `CANCELLED` |
| `owner_id` | `INTEGER` | `FOREIGN KEY(users.id), NULLABLE` | User ID of company administrator |
| `max_users` | `INTEGER` | `DEFAULT 25` | Maximum team user seats |
| `created_at`| `DATETIME`| `DEFAULT UTC_NOW` | Creation timestamp |
| `updated_at`| `DATETIME`| `DEFAULT UTC_NOW, ON_UPDATE` | Last modification timestamp |

### `subscription_plans`
Global subscription tiers configured by Super Admin.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Unique plan ID |
| `name` | `VARCHAR` | `UNIQUE, NOT NULL` | Plan name (Trial, Basic, Professional, Enterprise) |
| `description` | `TEXT` | `NULLABLE` | Plan features overview |
| `price` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Monthly price in USD |
| `billing_cycle` | `VARCHAR` | `DEFAULT 'monthly'` | Billing interval |
| `max_users` | `INTEGER` | `DEFAULT 25` | Seat capacity |
| `max_storage_mb` | `INTEGER` | `DEFAULT 5000` | Storage allocation |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Availability flag |

### `organization_subscriptions`
Links a company to an active subscription tier.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Subscription record ID |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), NOT NULL` | Target organization |
| `plan_id` | `INTEGER` | `FOREIGN KEY(subscription_plans.id)` | Assigned plan |
| `status` | `ENUM` | `NOT NULL, DEFAULT 'ACTIVE'` | Subscription status |
| `start_date` | `DATETIME` | `DEFAULT UTC_NOW` | Period start |
| `expires_at` | `DATETIME` | `NULLABLE` | Expiration date |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Active indicator |

### `features` & `organization_features`
Platform modular features and their per-tenant enabled state.
- **`features`**: `id`, `code` (`UNIQUE, INDEX`), `name`, `description`, `is_active`.
- **`organization_features`**: `id`, `company_id` (FK), `feature_id` (FK), `is_enabled` (`DEFAULT TRUE`).
  - Constraint: `UniqueConstraint('company_id', 'feature_id', name='uq_org_feature')`.

---

## 2. Identity, RBAC & Audit Trails

### `users`
System user accounts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Unique user ID |
| `name` | `VARCHAR` | `NOT NULL` | Full display name |
| `email` | `VARCHAR` | `UNIQUE, INDEX, NOT NULL` | Case-insensitive login email |
| `password_hash` | `VARCHAR` | `NOT NULL` | Bcrypt hashed password |
| `role` | `ENUM` | `NOT NULL, DEFAULT 'employee'` | `super_admin`, `admin`, `manager`, `employee` |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), NULLABLE` | Tenant company (NULL for Super Admin) |
| `manager_id` | `INTEGER` | `FOREIGN KEY(users.id), NULLABLE` | Reporting manager |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Active/deactivated flag |

### `user_permissions`
Granular permission overrides assigned by Organization Admins.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Record ID |
| `user_id` | `INTEGER` | `FOREIGN KEY(users.id, CASCADE)` | Recipient user |
| `permission` | `VARCHAR` | `NOT NULL` | Permission key (e.g. `leads.create`) |
| `granted_by` | `INTEGER` | `FOREIGN KEY(users.id)` | Admin who granted permission |
- Constraint: `UniqueConstraint('user_id', 'permission', name='uq_user_permission')`.

### `user_activity_logs`
Authentication and session audit trail.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Log event ID |
| `user_id` | `INTEGER` | `FOREIGN KEY(users.id, CASCADE)` | Acting user |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), NULLABLE` | Organization context |
| `action` | `VARCHAR` | `NOT NULL` | Event action (`login`, `logout`) |
| `ip_address` | `VARCHAR` | `NULLABLE` | Client IP address |
| `user_agent` | `VARCHAR` | `NULLABLE` | Browser User-Agent header |
| `details` | `TEXT` | `NULLABLE` | Metadata notes |
| `created_at` | `DATETIME` | `DEFAULT UTC_NOW, INDEX` | Event timestamp |

---

## 3. CRM Core Sales Pipeline

### `leads`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Lead ID |
| `title` | `VARCHAR` | `NOT NULL` | Lead title / opportunity summary |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `company_name` | `VARCHAR` | `NULLABLE` | Prospect company name |
| `contact_name` | `VARCHAR` | `NOT NULL` | Primary prospect name |
| `contact_email` | `VARCHAR` | `NOT NULL, INDEX` | Prospect email |
| `phone` | `VARCHAR` | `NULLABLE` | Phone number |
| `status` | `ENUM` | `DEFAULT 'New', INDEX` | `New`, `Contacted`, `Qualified`, `Converted`, `Lost` |
| `value` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Estimated deal value |
| `assigned_user_id` | `INTEGER` | `FOREIGN KEY(users.id), NULLABLE` | Assigned team member |
| `notes` | `TEXT` | `NULLABLE` | Background notes and tags |

### `customers`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Customer ID |
| `name` | `VARCHAR` | `NOT NULL, INDEX` | Customer company name |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `lead_id` | `INTEGER` | `FOREIGN KEY(leads.id), NULLABLE` | Source converted lead |
| `industry` | `VARCHAR` | `NULLABLE` | Industry category |
| `status` | `ENUM` | `DEFAULT 'Active', INDEX` | `Active`, `Inactive` |
- Constraint: `UniqueConstraint('name', 'company_id', name='uq_customer_name_company')`.

### `contacts`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Contact ID |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `customer_id` | `INTEGER` | `FOREIGN KEY(customers.id), INDEX` | Parent customer account |
| `name` | `VARCHAR` | `NOT NULL` | Contact person name |
| `email` | `VARCHAR` | `NOT NULL, INDEX` | Contact email |
| `phone` | `VARCHAR` | `NULLABLE` | Phone number |
| `position` | `VARCHAR` | `NULLABLE` | Job position / title |
| `is_primary` | `BOOLEAN` | `DEFAULT FALSE` | Primary account contact flag |
- Constraint: `UniqueConstraint('email', 'customer_id', name='uq_contact_email_customer')`.

### `opportunities`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Opportunity ID |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `customer_id` | `INTEGER` | `FOREIGN KEY(customers.id), INDEX` | Associated customer account |
| `title` | `VARCHAR` | `NOT NULL` | Deal name |
| `value` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Deal currency value |
| `stage` | `ENUM` | `DEFAULT 'Prospecting', INDEX` | `Prospecting`, `Qualification`, `Proposal`, `Negotiation`, `Closed Won`, `Closed Lost` |
| `close_date` | `DATE` | `NULLABLE` | Expected closing date |

### `opportunity_products`
Association table connecting catalog products to opportunities.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Line-item record ID |
| `opportunity_id` | `INTEGER` | `FOREIGN KEY(opportunities.id), INDEX` | Target opportunity |
| `product_id` | `INTEGER` | `FOREIGN KEY(products.id), INDEX` | Catalog product |
| `quantity` | `INTEGER` | `DEFAULT 1` | Purchased quantity |
| `unit_price` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Negotiated unit price |

---

## 4. Dynamic Product Engine & Industry Blueprints

### `industry_templates`, `template_fields`, `template_categories`
System-wide industry blueprints configured by Super Admin (12 industries).

### `org_product_fields` & `org_product_field_options`
Tenant custom product attributes:
- `field_type`: `TEXT`, `NUMBER`, `CURRENCY`, `BOOLEAN`, `SELECT`, `MULTI_SELECT`, `DATE`.
- Options table manages selectable choices for `SELECT` and `MULTI_SELECT`.

### `org_categories`
Hierarchical product categories:
- Self-referencing FK (`parent_id`) allowing multi-level nested categories.

### `products`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Product ID |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `category_id` | `INTEGER` | `FOREIGN KEY(org_categories.id), NULLABLE` | Assigned category |
| `name` | `VARCHAR` | `NOT NULL` | Product name |
| `code` | `VARCHAR` | `NOT NULL, INDEX` | Unique SKU / product code |
| `price` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Selling price |
| `cost_price` | `NUMERIC(10,2)` | `DEFAULT 0.0` | Cost of goods |
| `product_type` | `VARCHAR` | `DEFAULT 'PHYSICAL'` | `PHYSICAL`, `SUBSCRIPTION`, `SERVICE` |
| `status` | `VARCHAR` | `DEFAULT 'ACTIVE'` | `ACTIVE`, `INACTIVE` |
| `stock_quantity` | `INTEGER` | `DEFAULT 0` | Available inventory count |
| `track_inventory`| `BOOLEAN` | `DEFAULT TRUE` | Stock tracking toggle |
- Constraint: `UniqueConstraint('code', 'company_id', name='uq_product_code_company')`.

### `product_field_values`
EAV storage for dynamic product field values:
- `value_text`, `value_number`, `value_boolean`, `value_json`.
- Constraint: `UniqueConstraint('product_id', 'field_id', name='uq_product_field_val')`.

### `product_variants`
Sub-SKUs for variations (size, color, material):
- `sku` (`INDEX`), `name`, `price`, `cost_price`, `stock_quantity`, `attributes_json`, `is_active`.

---

## 5. Collaboration, Reminders & Imports

### `reminders`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT` | Reminder ID |
| `company_id` | `INTEGER` | `FOREIGN KEY(companies.id), INDEX` | Tenant organization |
| `creator_id` | `INTEGER` | `FOREIGN KEY(users.id), INDEX` | Creator user |
| `title` | `VARCHAR` | `NOT NULL` | Meeting or task title |
| `description` | `TEXT` | `NULLABLE` | Detailed agenda / notes |
| `reminder_type` | `ENUM` | `DEFAULT 'meeting', INDEX` | `meeting`, `task`, `deal_call`, `reminder` |
| `priority` | `ENUM` | `DEFAULT 'medium'` | `low`, `medium`, `high`, `urgent` |
| `status` | `ENUM` | `DEFAULT 'scheduled', INDEX` | `scheduled`, `completed`, `cancelled` |
| `scheduled_at` | `DATETIME` | `NOT NULL, INDEX` | Due timestamp |
| `end_at` | `DATETIME` | `NULLABLE` | End timestamp |
| `meeting_link` | `VARCHAR` | `NULLABLE` | Video conference URL |
| `location` | `VARCHAR` | `NULLABLE` | Physical room / address |
| `related_entity_type` | `VARCHAR` | `NULLABLE` | `opportunity`, `lead`, `customer` |
| `related_entity_id` | `INTEGER` | `NULLABLE` | Related entity ID |

### `reminder_attendees`
Tracks invited users and popup dismissals:
- `reminder_id`, `user_id`, `status` (`invited`, `accepted`), `is_read`, `is_dismissed`, `dismissed_at`.
- Constraint: `UniqueConstraint('reminder_id', 'user_id', name='uq_reminder_attendee')`.

### `chat_groups`, `chat_group_members`, `chat_messages`
Team chat messaging infrastructure with soft deletion support (`is_deleted = True`).

### `import_jobs`
Audit trail of CSV bulk data uploads:
- `company_id`, `imported_by`, `import_type`, `filename`, `total_rows`, `imported_rows`, `skipped_rows`, `error_rows`, `status`.
