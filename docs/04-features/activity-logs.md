# Feature: Audit Logging & User Activity Monitoring

## Overview

The **Audit Logging & User Activity Monitoring** module tracks authentication events, session creation, client network identifiers, and recent user presence. It provides security administrators with real-time visibility over active team members and historical login trails.

---

## Key Capabilities

1. **Automated Event Capture**:
   - Every successful login via `/api/auth/login` commits an audit record with `action = 'login'`, client IP address (`request.client.host`), HTTP `User-Agent`, and server timestamp.
   - User logouts via `/api/auth/logout` write an `action = 'logout'` event.

2. **24-Hour Active Presence Engine**:
   - Computes online and recently active users by aggregating distinct user IDs with login records within a sliding 24-hour window.
   - Returns user profile information, role badge, last login timestamp, and originating IP address.

3. **Role-Scoped Privacy**:
   - **Employees**: Restricted to viewing only their own activity events.
   - **Admins**: Can view the full log of all employees within their organization.
   - **Super Admins**: Can view system-wide logs across all tenant organizations.

---

## Code & Router Mapping

- **Router**: [`backend/app/routers/activity.py`](file:///d:/Projects/CRM/backend/app/routers/activity.py)
  - `GET /api/activity/logs`: Lists paginated activity logs with optional `user_id` or `action` filters.
  - `GET /api/activity/online-users`: Returns list of team members who authenticated in the last 24 hours.
- **Frontend Page**: [`frontend/src/app/activity/page.js`](file:///d:/Projects/CRM/frontend/src/app/activity/page.js)
  - Split dashboard with **Active Team Members** card grid on top and an audit log table below with IP badges, device agents, and filtering tools.
