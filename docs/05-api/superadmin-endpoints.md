# API: Super Admin & Organization Endpoints (`/api/superadmin`)

All endpoints in this router require the caller to possess the `super_admin` role.

---

## 1. List Organizations

Returns all registered tenant companies with plan, status, and feature flags.

- **URL**: `/api/superadmin/organizations/`
- **Method**: `GET`
- **Authentication**: Bearer Token (`super_admin`)
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Sam Inc",
      "domain": "saminc.local",
      "industry": "Software & SaaS",
      "status": "ACTIVE",
      "owner_id": 2,
      "owner_email": "admin@saminc.local",
      "max_users": 25,
      "current_users_count": 4,
      "subscription_plan_name": "Professional",
      "expires_at": null,
      "enabled_features": ["leads", "contacts", "products", "inventory"],
      "created_at": "2026-09-28T10:00:00Z"
    }
  ]
  ```

---

## 2. Create Organization

Onboards a new company, creates the primary Admin user, binds a subscription plan, activates requested features, and automatically seeds corresponding industry product templates.

- **URL**: `/api/superadmin/organizations/`
- **Method**: `POST`
- **Authentication**: Bearer Token (`super_admin`)
- **Request Body**:
  ```json
  {
    "name": "Nexus Retail Corp",
    "domain": "nexusretail.com",
    "industry": "Clothing / Fashion",
    "owner_email": "owner@nexusretail.com",
    "owner_name": "Robert Nexus",
    "owner_password": "SecurePassword@123",
    "plan_id": 3,
    "status": "ACTIVE",
    "max_users": 25,
    "enabled_features": ["leads", "contacts", "products", "inventory"]
  }
  ```
- **Success Response (201 Created)**: Returns `OrganizationDetailResponse`.
- **Error Responses**:
  - `400 Bad Request`: Domain already registered.

---

## 3. Update Organization

Modifies organization limits, status, subscription tier, or feature toggles.

- **URL**: `/api/superadmin/organizations/{org_id}`
- **Method**: `PATCH`
- **Authentication**: Bearer Token (`super_admin`)
- **Request Body**:
  ```json
  {
    "status": "ACTIVE",
    "max_users": 50,
    "enabled_features": ["leads", "contacts", "products", "inventory", "reports"]
  }
  ```
- **Success Response (200 OK)**: Returns updated `OrganizationDetailResponse`.

---

## 4. Delete Organization

Cascades deletion across all tenant data: products, variants, fields, deals, contacts, leads, and users.

- **URL**: `/api/superadmin/organizations/{org_id}`
- **Method**: `DELETE`
- **Authentication**: Bearer Token (`super_admin`)
- **Success Response (204 No Content)**

---

## 5. Subscription Plans CRUD

- **`GET /api/superadmin/plans/`**: Lists all available plans (Trial, Basic, Professional, Enterprise).
- **`POST /api/superadmin/plans/`**: Creates a new subscription plan with seat/storage thresholds.

---

## 6. Industry Templates CRUD

- **`GET /api/superadmin/templates/`**: Lists all 12 system industry templates.
- **`GET /api/superadmin/templates/{id}`**: Retrieves template with categories and custom field definitions.
- **`POST /api/superadmin/templates/{id}/apply/{org_id}?overwrite=false`**: Copies fields, options, and categories from an industry template into an organization.
