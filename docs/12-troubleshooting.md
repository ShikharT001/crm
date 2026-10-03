# 12 - Troubleshooting & Diagnostic Runbook

This runbook covers common errors, edge cases, and architectural hurdles encountered when running or developing the **Enterprise CRM**.

---

## 1. Backend Connection Refused / Port Mismatch

### Symptom:
Frontend displays `"Unable to connect to CRM backend at http://localhost:8000. Please ensure the server is running on port 8000."`

### Root Causes & Fixes:
1. **FastAPI server is not running**:
   - Check if the backend terminal is running: `uvicorn app.main:app --reload --port 8000`.
2. **Port 8000 vs. 8001 Conflict**:
   - In older development configurations, the backend was sometimes booted on port 8001. Ensure `uvicorn` is executed with `--port 8000` to match `frontend/.env.local`.
3. **Windows IPv6 `localhost` Resolution**:
   - On Windows, `localhost` can resolve to IPv6 `::1` while Uvicorn listens on `127.0.0.1`.
   - The frontend API client in [`src/lib/api.js`](file:///d:/Projects/CRM/frontend/src/lib/api.js) automatically retries requests against `127.0.0.1:8000`. If testing with `curl`, always test `http://127.0.0.1:8000`.

---

## 2. CORS Errors in Browser Console

### Symptom:
Browser console displays: `Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy.`

### Fix:
Inspect `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Ensure `allow_credentials=True` is enabled when passing `Authorization: Bearer` headers.

---

## 3. Bcrypt Password 72-Byte Buffer Overrun

### Symptom:
`ValueError: password must be bytes <= 72 characters long` when creating or hashing user passwords.

### Fix:
Bcrypt natively truncates passwords beyond 72 bytes. The CRM handles this automatically via `_truncate_password` in [`backend/app/routers/auth.py`](file:///d:/Projects/CRM/backend/app/routers/auth.py#L33):
```python
def _truncate_password(plain: str) -> str:
    if not plain:
        return ""
    return plain.encode('utf-8')[:72].decode('utf-8', errors='ignore')
```
Always use `hash_password(plain)` rather than calling `pwd_context.hash` directly.

---

## 4. SQLite Circular Foreign Key Warning During `drop_all`

### Symptom:
When running `pytest`, SQLAlchemy emits:
`SAWarning: Can't sort tables for DROP; an unresolvable foreign key dependency exists between tables: companies, users`

### Explanation & Resolution:
- `companies.owner_id` points to `users.id`, and `users.company_id` points to `companies.id`.
- This is a known circular reference. In tests, the warning is benign.
- When deleting an organization via API ([`backend/app/routers/superadmin.py`](file:///d:/Projects/CRM/backend/app/routers/superadmin.py#L239)), the backend explicitly sets `org.owner_id = None` and commits before deleting the company, ensuring no constraint deadlock occurs.

---

## 5. CSV Import Fails on Windows Excel Files

### Symptom:
Uploading a CSV file results in `400 Invalid CSV` or unreadable characters in lead names.

### Explanation & Resolution:
- Excel on Windows often exports CSV files encoded in `CP1252` (Windows-1252) or UTF-8 with Byte Order Mark (BOM).
- The import parser in [`backend/app/routers/imports.py`](file:///d:/Projects/CRM/backend/app/routers/imports.py#L47) automatically tries multiple encodings (`utf-8-sig`, `utf-8`, `cp1252`, `iso-8859-1`, `latin1`, `utf-16`) and strips `\ufeff`.
- If a custom file still fails, open the file in Notepad, click **File &rarr; Save As**, and choose **Encoding: UTF-8**.

---

## 6. HTTP 403 `FEATURE_NOT_ENABLED` or `SUBSCRIPTION_SUSPENDED`

### Symptom:
Calling `/api/leads/` or `/api/products/` returns `HTTP 403 Forbidden` with detail:
`FEATURE_NOT_ENABLED: Feature module 'products' is not enabled for your organization.`

### Resolution:
1. Sign in as Super Admin (`superadmin@crm.local` / `Admin@123`).
2. Go to **Organizations** (`/organizations`).
3. Click on the company card and toggle the required feature switch (e.g. Products or Leads) to ON.
4. If the organization status is `SUSPENDED` or `EXPIRED`, update the status back to `ACTIVE`.

---

## 7. Database Reset / Missing Tables on Fresh Checkout

### Symptom:
`sqlite3.OperationalError: no such table: companies`

### Resolution:
Run the seeding scripts from `backend/`:
```powershell
cd backend
python seed_users.py
python seed_industry_templates.py
python seed.py
```
This initializes all 28 tables and loads default platform data into `crm.db`.
