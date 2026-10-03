# Enterprise CRM Application

A full-stack Customer Relationship Management (CRM) system built with:
- **Backend**: Python FastAPI, SQLAlchemy 2.0 ORM, and SQLite database.
- **Frontend**: Next.js App Router (JavaScript / JSX) with a sleek dark-mode glassmorphic UI.

---

## Architecture & Project Structure

```
CRM/
├── backend/
│   ├── .venv/                 # Python Virtual Environment
│   ├── app/
│   │   ├── main.py            # FastAPI main entrypoint & CORS
│   │   ├── database.py        # SQLAlchemy SQLite engine & session setup
│   │   ├── models.py          # ORM models (Companies, Employees, Leads, Customers, Contacts, Deals, Products)
│   │   ├── schemas.py         # Pydantic request/response validation schemas
│   │   ├── crud.py            # Database operations & aggregate stats
│   │   └── routers/           # FastAPI routers (dashboard, leads, customers, opportunities, products)
│   ├── crm.db                 # SQLite database file
│   ├── seed.py                # Database seeding script
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages (Dashboard, Leads, Pipeline, Customers, Products)
│   │   └── lib/api.js         # API client connecting to FastAPI backend
│   ├── package.json           # Frontend JS dependencies
│   └── jsconfig.json          # JS path aliases (@/* -> ./src/*)
│
├── docs/                      # Business requirements & domain specs
└── README.md                  # Quick-start guide
```

---

## Quick Start Guide

### 1. Run the Python FastAPI Backend

Open a terminal in `d:\Projects\CRM\backend`:

```powershell
cd backend

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1   # Windows PowerShell

# Seed/reset initial sample CRM database (Creates crm.db)
python seed.py

# Start the FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

FastAPI server runs at: **`http://localhost:8000`**  
Interactive Swagger API Docs available at: **`http://localhost:8000/docs`**

---

### 2. Run the Next.js JavaScript Frontend

Open a new terminal in `d:\Projects\CRM\frontend`:

```powershell
cd frontend

# Install dependencies (if not already installed)
npm install

# Start the Next.js development server
npm run dev
```

Next.js frontend runs at: **`http://localhost:3000`**

---

## Key Features

1. **Executive Dashboard**: Real-time KPI metric cards (Active Leads, Open Pipeline Value, Closed Won Revenue, Customer Counts).
2. **Leads Management**: Filter by status, create leads with modal forms, and convert qualified leads into active customer accounts.
3. **Sales Pipeline (Kanban Board)**: Drag/track sales opportunities across stages (*Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost*).
4. **Customer Accounts Directory**: Track company accounts, primary contacts, job positions, and related opportunities.
5. **Product & Service Catalog**: Manage product SKUs, descriptions, and unit prices.
