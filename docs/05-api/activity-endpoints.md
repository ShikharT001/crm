# API: Audit Activity & Monitoring Endpoints (`/api/activity`)

## 1. Get Activity Logs

Returns login/logout events and session details. Scoped to caller (Employees see self, Admins see company, Super Admins see platform).

- **URL**: `/api/activity/logs`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `user_id` *(integer, optional)*: Filter events for a specific user (Admin only).
  - `action` *(string, optional)*: Filter by `login` or `logout`.
  - `limit` *(integer, default: 100)*
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 14,
      "user_id": 2,
      "user_name": "Sam Admin",
      "user_email": "admin@saminc.local",
      "user_role": "admin",
      "action": "login",
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "details": "Login from 127.0.0.1",
      "created_at": "2026-09-29T10:00:00Z"
    }
  ]
  ```

---

## 2. Get Online Users

Returns list of team members who logged in within the previous 24 hours.

- **URL**: `/api/activity/online-users`
- **Method**: `GET`
- **Authentication**: Bearer Token (`admin` or `super_admin`)
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 2,
      "user_id": 2,
      "name": "Sam Admin",
      "email": "admin@saminc.local",
      "role": "admin",
      "last_seen": "2026-09-29T10:00:00Z",
      "ip_address": "127.0.0.1"
    }
  ]
  ```
