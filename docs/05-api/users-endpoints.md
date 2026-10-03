# API: Users & Team Endpoints (`/api/users`)

## 1. List Users

Retrieves team members scoped by the caller's role (Super Admin sees all, Admin sees company, Manager sees subordinates and self, Employee sees self).

- **URL**: `/api/users/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `role` *(string, optional)*: Filter by `admin`, `manager`, `employee`.
  - `is_active` *(boolean, optional)*: Filter by active status.
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 4,
      "name": "Sam Employee",
      "email": "emp1@saminc.local",
      "role": "employee",
      "company_id": 1,
      "manager_id": 3,
      "is_active": true,
      "company_name": "Sam Inc",
      "manager_name": "Sam Manager",
      "created_at": "2026-09-28T12:00:00Z",
      "updated_at": "2026-09-28T12:00:00Z"
    }
  ]
  ```

---

## 2. Create User

Creates a new team member with specified role and manager hierarchy.

- **URL**: `/api/users/`
- **Method**: `POST`
- **Authentication**: Bearer Token (Manager, Admin, or Super Admin)
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@saminc.local",
    "password": "Password@123",
    "role": "employee",
    "manager_id": 3,
    "is_active": true
  }
  ```
- **Success Response (201 Created)**: Returns created `UserResponse`.
- **Error Responses**:
  - `400 Bad Request`: Email already exists.
  - `403 Forbidden`: Unauthorized role assignment (e.g. Employee trying to create user, or Admin attempting to create Super Admin).

---

## 3. Update User

Updates user profile, role, manager, or password.

- **URL**: `/api/users/{user_id}`
- **Method**: `PATCH`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "role": "manager"
  }
  ```
- **Success Response (200 OK)**: Returns updated `UserResponse`.
- **Error Responses**:
  - `403 Forbidden`: Attempting to edit a user outside supervisory hierarchy or employee attempting to change role.

---

## 4. Toggle Active Status

Activates or deactivates a user account. Deactivated users cannot log in.

- **URL**: `/api/users/{user_id}/toggle-active`
- **Method**: `POST`
- **Authentication**: Bearer Token (Admin or Super Admin)
- **Success Response (200 OK)**: Returns updated `UserResponse` with inverted `is_active`.
- **Error Responses**:
  - `400 Bad Request`: User cannot deactivate their own account.

---

## 5. Delete User

Permanently deletes a user record.

- **URL**: `/api/users/{user_id}`
- **Method**: `DELETE`
- **Authentication**: Bearer Token (Admin or Super Admin)
- **Success Response (204 No Content)**
- **Error Responses**:
  - `400 Bad Request`: User cannot delete themselves.
