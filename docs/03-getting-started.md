# 03 - Getting Started

This guide walks you through setting up and running the **Enterprise CRM** full-stack application on your local machine.

---

## Prerequisites

Before starting, ensure you have the following installed on your system:

| Dependency | Minimum Version | Check Command |
| :--- | :--- | :--- |
| **Python** | 3.10 or higher | `python --version` |
| **Node.js** | 18.0 or higher | `node --version` |
| **npm** | 9.0 or higher | `npm --version` |
| **PowerShell** or **Bash** | Standard shell | `$PSVersionTable` (on Windows) |

---

## 1. Backend Setup (FastAPI & SQLite)

Open a terminal and navigate to the `backend/` directory:

```powershell
cd d:\Projects\CRM\backend
```

### Step 1.1: Activate Virtual Environment
A virtual environment (`.venv`) is included in the project or can be generated:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Or create a fresh virtual environment if needed:
# python -m venv .venv
# .\.venv\Scripts\Activate.ps1
```

### Step 1.2: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

Key dependencies installed include:
- `fastapi` and `uvicorn[standard]` (Web server)
- `sqlalchemy` (ORM database engine)
- `pydantic` and `pydantic[email]` (Request & response validation)
- `python-jose[cryptography]` (JWT token management)
- `passlib[bcrypt]` (Password hashing)
- `python-multipart` (CSV file uploads)
- `alembic` (Database migrations)

### Step 1.3: Initialize and Seed the Database
The project provides three modular seeding scripts. Run them in order to configure a rich development environment:

```powershell
# 1. Initialize DB schema, Subscription Plans, System Features, Super Admin & Demo Users
python seed_users.py

# 2. Populate 12 rich Industry Product Templates (Clothing, SaaS, Sports, etc.)
python seed_industry_templates.py

# 3. Populate sample leads, pipeline deals, customers, and contacts
python seed.py
```

> [!TIP]
> Running these scripts creates or updates `backend/crm.db`. If you ever wish to perform a complete reset, you can delete `backend/crm.db` and re-run these three commands.

### Step 1.4: Start the FastAPI Server
```powershell
uvicorn app.main:app --reload --port 8000
```

- **Backend API URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 2. Frontend Setup (Next.js 14)

Open a **second terminal** and navigate to the `frontend/` directory:

```powershell
cd d:\Projects\CRM\frontend
```

### Step 2.1: Install Node Dependencies
```powershell
npm install
```

### Step 2.2: Verify Frontend Environment Config
Check that `frontend/.env.local` contains:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_PASSWORD=admin123
```

### Step 2.3: Start the Next.js Development Server
```powershell
npm run dev
```

- **Frontend Application URL**: `http://localhost:3000`

---

## 3. Demo Login Credentials

The CRM includes pre-configured accounts representing each level of the permission hierarchy:

| Account Type | Email Address | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `superadmin@crm.local` | `Admin@123` | Platform owner. Can view and edit all tenant organizations, configure subscription tiers, assign templates, and inspect audit logs. |
| **🏢 Tenant Admin** | `admin@saminc.local` | `Admin@123` | Organization admin for "Sam Inc". Can manage team users, grant granular permissions, configure custom product fields, and manage all CRM records. |
| **🎯 Tenant Manager**| `manager@saminc.local` | `Manager@123` | Team manager. Can manage subordinate employees (`emp1`, `emp2`), assign leads, schedule meetings, and view team pipeline. |
| **👤 Tenant Employee**| `emp1@saminc.local` | `Emp@12345` | Sales representative. Can manage assigned leads, update deal stages, chat with team, and attend scheduled meetings. |
| **👤 Tenant Employee 2**| `emp2@saminc.local` | `Emp@12345` | Second sales representative for multi-user collaboration tests. |
| **💼 Secondary Admin**| `macner001@gmail.com` | `password` | Additional admin account for Acme Tech Solutions. |

> [!NOTE]
> **One-Click Auto-Fill**: The login screen (`http://localhost:3000`) provides clickable shortcut buttons for the primary demo accounts. Clicking any of them automatically fills the email and password fields.

---

## 4. Verification Checklist

To verify your installation is running correctly:
1. Open `http://localhost:8000/docs` in your browser. Confirm that the 14 API router groups (Auth, Users, SuperAdmin, Dashboard, Leads, Customers, Contacts, Opportunities, Products, Permissions, Activity, Chat, Imports, Reminders) are visible.
2. Open `http://localhost:3000` and sign in with `superadmin@crm.local`. Confirm you can access the **Organizations** page.
3. Sign out and sign in with `admin@saminc.local`. Confirm you can view the Executive Dashboard with leads, customer records, and the Kanban pipeline.
4. Check the top-right corner of the header for the **Notification & Reminder Center** bell icon. Click it to view scheduled meetings or schedule a new task.
