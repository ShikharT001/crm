# Feature: Multi-Tenancy & SaaS Organization Control

## Overview

The **Multi-Tenancy & SaaS Organization Control** module provides complete multi-company isolation, subscription tier governance, and modular feature toggles across the CRM. It allows a single deployment to host multiple independent businesses with zero cross-tenant data leakage.

---

## Key Capabilities

1. **Organization Lifecycle**:
   - Each business is modeled as a `Company` / `Organization` with unique domain name, industry classification, user seat capacity (`max_users`), and account status.
   - Supported Account Statuses:
     - `TRIAL`: Standard evaluation period.
     - `ACTIVE` / `PAID`: Healthy paying customer account.
     - `UNPAID` / `EXPIRED`: Grace period or lapsed subscription (read access or locked).
     - `SUSPENDED` / `CANCELLED`: Hard-locked account; access immediately rejected by API guards.

2. **Subscription Plans**:
   - Customizable plans defining monthly pricing, seat allowances, and storage limits:
     - **Trial**: 5 users, free evaluation.
     - **Basic**: 10 users, \$29/month.
     - **Professional**: 25 users, \$99/month (includes inventory & stock tracking).
     - **Enterprise**: 100+ users, \$299/month (unlimited scale).

3. **Modular Feature Toggling**:
   - Platform features are registered as independent modules in the `features` catalog:
     - `leads`, `contacts`, `products`, `inventory`, `reports`, `activities`, `warehouses`, `campaigns`, `whatsapp`, `email_automation`.
   - Super Admins can toggle individual features on or off for any tenant organization via the `organization_features` bridge table.

4. **Automated Industry Template Seeding**:
   - When an organization is created or updated with an industry (e.g. "Clothing / Fashion"), the system automatically seeds corresponding custom product fields, dropdown options, and category trees into the organization's catalog.

5. **Safe Cascade Deletion**:
   - Deleting an organization safely handles circular foreign key constraints (such as `companies.owner_id` &harr; `users.company_id`) and systematically purges all associated records: custom fields, field options, categories, products, variants, deals, contacts, leads, reminders, and activity logs.

---

## Code & Router Mapping

- **Router**: [`backend/app/routers/superadmin.py`](file:///d:/Projects/CRM/backend/app/routers/superadmin.py)
  - `GET /api/superadmin/organizations/`: Lists all organizations with active subscription plan and enabled feature codes.
  - `POST /api/superadmin/organizations/`: Onboards a new organization, creates its owner/admin user, assigns subscription plan, and seeds industry templates.
  - `PATCH /api/superadmin/organizations/{id}`: Updates company status, limits, subscription plan, and toggles feature modules.
  - `DELETE /api/superadmin/organizations/{id}`: Executes cascade deletion of tenant data.
- **Frontend Page**: [`frontend/src/app/organizations/page.js`](file:///d:/Projects/CRM/frontend/src/app/organizations/page.js)
  - Interactive Super Admin portal with organization cards, status badges, plan assignment modals, feature switchers, and template applicators.
