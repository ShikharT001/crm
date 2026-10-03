# Feature: Authentication & Session Management

## Overview

The **Authentication & Session Management** feature handles secure user identity verification, JSON Web Token (JWT) issuance, cryptographic password hashing, role identification, and automated login/logout audit logging across the entire CRM platform.

---

## Key Capabilities

1. **Email & Password Authentication**:
   - Case-insensitive email normalization.
   - Secure verification using bcrypt hashes.
   - Defense against bcrypt buffer overruns by safely truncating plain strings to 72 UTF-8 bytes.

2. **Stateless JWT Tokens**:
   - Tokens signed with HS256 algorithm.
   - Encodes user ID (`sub`), email, role, and tenant ID (`company_id`).
   - Default validity duration: **8 hours** (`ACCESS_TOKEN_EXPIRE_MINUTES = 480`).

3. **User Activity Logging**:
   - Every login event automatically records client IP address, HTTP `User-Agent`, and server timestamp in `user_activity_logs`.
   - Every logout event commits a corresponding `'logout'` record.

4. **Client Session Persistence & Expiry Handling**:
   - JWT token stored in browser `localStorage` (`crm_jwt_token`).
   - Current user object cached in `localStorage` (`crm_current_user`).
   - Global 401 interception: if any backend call rejects a token, `src/lib/api.js` dispatches a `crm-auth-expired` custom window event that cleanly transitions the UI back to the login screen.

---

## Architecture & Code Map

- **Router**: [`backend/app/routers/auth.py`](file:///d:/Projects/CRM/backend/app/routers/auth.py)
  - `POST /api/auth/login`: Validates credentials, logs activity, returns JWT token and user profile.
  - `POST /api/auth/logout`: Records logout event and confirms termination.
  - `GET /api/auth/me`: Returns the current user's profile and company metadata.
- **Dependencies**:
  - `get_current_user`: Extracts Bearer token from `Authorization` header, decodes JWT, and verifies user exists and is active.
  - `get_current_active_user`: Ensures `user.is_active == True`.
- **Frontend Layer**:
  - `LoginScreen` in [`frontend/src/app/layout.js`](file:///d:/Projects/CRM/frontend/src/app/layout.js): Interactive login form with password visibility toggle and 1-click demo account auto-fill.
  - `authHelpers` in [`frontend/src/lib/api.js`](file:///d:/Projects/CRM/frontend/src/lib/api.js): Manages token lifecycle, session saving, and cleanup.

---

## Token Payload Structure

```json
{
  "sub": "2",
  "email": "admin@saminc.local",
  "role": "admin",
  "company_id": 1,
  "exp": 1727650000
}
```

---

## Security Policies & Best Practices

- **Password Hashing**: Uses `passlib.context.CryptContext(schemes=["bcrypt"])`.
- **Development Fallbacks**: Includes graceful recovery for common test/demo passwords to ensure seamless local onboarding.
- **Production Recommendation**: Replace default `SECRET_KEY` in `backend/.env.local` with a cryptographically generated 256-bit string (`openssl rand -hex 32`).
