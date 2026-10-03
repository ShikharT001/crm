# API: Authentication Endpoints (`/api/auth`)

## 1. User Login

Authenticates a user using email and password, generates an 8-hour JWT access token, and records a login activity event.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "admin@saminc.local",
    "password": "Admin@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": 2,
      "name": "Sam Admin",
      "email": "admin@saminc.local",
      "role": "admin",
      "company_id": 1,
      "manager_id": null,
      "is_active": true,
      "company_name": "Sam Inc",
      "manager_name": null,
      "created_at": "2026-09-28T12:00:00Z",
      "updated_at": "2026-09-28T12:00:00Z"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `"Incorrect email or password"`

---

## 2. User Logout

Records a logout event in the audit log for the authenticated session.

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

## 3. Current User Profile (`/me`)

Retrieves the currently authenticated user's profile and company details.

- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  {
    "id": 2,
    "name": "Sam Admin",
    "email": "admin@saminc.local",
    "role": "admin",
    "company_id": 1,
    "manager_id": null,
    "is_active": true,
    "company_name": "Sam Inc",
    "manager_name": null,
    "created_at": "2026-09-28T12:00:00Z",
    "updated_at": "2026-09-28T12:00:00Z"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Token expired or invalid credentials.
