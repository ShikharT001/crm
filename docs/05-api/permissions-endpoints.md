# API: Permissions Endpoints (`/api/permissions`)

## 1. List Available Permissions

Returns the catalog of all 21 permissions available in the system grouped by category.

- **URL**: `/api/permissions/available`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    { "key": "leads.view", "label": "View Leads", "category": "Leads" },
    { "key": "leads.create", "label": "Create Leads", "category": "Leads" },
    { "key": "leads.edit", "label": "Edit Leads", "category": "Leads" },
    { "key": "leads.delete", "label": "Delete Leads", "category": "Leads" },
    { "key": "leads.convert", "label": "Convert Leads", "category": "Leads" }
  ]
  ```

---

## 2. Get My Permissions

Returns the array of active permission keys for the currently authenticated user.

- **URL**: `/api/permissions/me`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    "leads.view",
    "leads.create",
    "opportunities.view",
    "contacts.view"
  ]
  ```
  *(Note: For `admin` and `super_admin` users, returns all 21 permission keys).*

---

## 3. Get User Permissions (Admin Only)

Retrieves granted permissions for a specific team member.

- **URL**: `/api/permissions/user/{user_id}`
- **Method**: `GET`
- **Authentication**: Bearer Token (`admin` or `super_admin`)
- **Success Response (200 OK)**: Returns array of string permission keys.

---

## 4. Update User Permissions (Admin Only)

Replaces a user's granted permissions with a new set of keys.

- **URL**: `/api/permissions/user/{user_id}`
- **Method**: `PUT`
- **Authentication**: Bearer Token (`admin` or `super_admin`)
- **Request Body**:
  ```json
  {
    "permissions": ["leads.view", "leads.create", "opportunities.view", "opportunities.edit"]
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Permissions updated successfully",
    "permissions": ["leads.view", "leads.create", "opportunities.view", "opportunities.edit"]
  }
  ```

---

## 5. Get All Users Permissions (Admin Only)

Returns a dictionary mapping every non-admin user ID to their array of granted permission keys for rendering the permission grid.

- **URL**: `/api/permissions/all-users`
- **Method**: `GET`
- **Authentication**: Bearer Token (`admin` or `super_admin`)
- **Success Response (200 OK)**:
  ```json
  {
    "3": ["leads.view", "leads.create", "leads.edit"],
    "4": ["leads.view", "opportunities.view"]
  }
  ```
