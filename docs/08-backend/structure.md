# Backend: Architecture & Directory Structure

The CRM backend is built on **Python 3.10+** using the **FastAPI** web framework and **SQLAlchemy 2.0 ORM** with **SQLite** (`crm.db`).

---

## Directory Layout

```
backend/
├── app/
│   ├── main.py                # FastAPI app initialization, CORS, and router registration
│   ├── database.py            # SQLite engine, SessionLocal, declarative Base, and get_db()
│   ├── models.py              # 28 SQLAlchemy declarative ORM models
│   ├── schemas.py             # Pydantic v2 request/response validation schemas
│   ├── crud.py                # Database queries, aggregates, and conversion logic
│   ├── services/
│   │   └── template_service.py # Industry template auto-seeding engine
│   └── routers/               # 14 modular API routers
│       ├── auth.py            # JWT authentication & session management
│       ├── users.py           # Team member management & hierarchy
│       ├── superadmin.py      # Platform tenant organization administration
│       ├── permissions.py     # Granular permission matrix
│       ├── dashboard.py       # KPI metrics calculation
│       ├── leads.py           # Lead capture & 1-click conversion
│       ├── opportunities.py   # Deals pipeline & products association
│       ├── customers.py       # Customer company accounts
│       ├── contacts.py        # Contacts directory with joined deals
│       ├── products.py        # Dynamic catalog, custom fields, categories & variants
│       ├── reminders.py       # Meetings, daily tasks, and due popup alerts
│       ├── chat.py            # Internal team messaging channels
│       ├── imports.py         # CSV bulk imports with encoding auto-detection
│       └── activity.py        # Login audit logs & 24h active user tracking
├── tests/                     # Pytest automated test suites
├── alembic/                   # Alembic database migration environment
├── crm.db                     # SQLite database file
├── requirements.txt           # Python package dependencies
├── seed.py                    # Sample CRM records seed script
├── seed_users.py              # Core system initialization seed script
└── seed_industry_templates.py # 12 Industry Product Templates seed script
```

---

## Dependency Injection Patterns

FastAPI's dependency injection system (`Depends`) is used to enforce security boundaries across all endpoints:

### 1. Database Session Injection (`get_db`)
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
Ensures every request operates within its own SQLAlchemy session and guarantees connection closure.

### 2. User Authentication (`get_current_active_user`)
Extracts the HTTP Bearer token from the `Authorization` header, decodes the JWT signature, looks up the user in `models.User`, and verifies `is_active == True`.

### 3. Multi-Tenant Context (`get_tenant_context`)
Instantiates a `TenantContext` object derived from the authenticated user, supplying helper methods:
- `tenant.filter_query(query, model)`: Automatically attaches `WHERE company_id = ?` to queries for non-superadmin users.
- `tenant.enforce_ownership(entity)`: Verifies that a fetched entity belongs to the tenant organization before proceeding.

### 4. Role Guard (`require_role(*roles)`)
Creates a reusable dependency verifying that the caller's role is in the allowed whitelist:
```python
super_admin_only = require_role(models.UserRole.SUPER_ADMIN)
admin_or_manager = require_role(models.UserRole.ADMIN, models.UserRole.MANAGER)
```

### 5. Feature Toggle Guard (`require_feature(code)`)
Verifies both that the tenant's organization subscription is active (`TRIAL`, `ACTIVE`, `PAID`) and that the specific feature code is enabled in `organization_features`.

### 6. Granular Permission Guard (`require_permission(key)`)
Verifies that the user has been granted a specific permission in `user_permissions` (Admins and SuperAdmins bypass this check).
