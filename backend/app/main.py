from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import dashboard, leads, customers, opportunities, products, auth, contacts, users, superadmin, permissions, activity, chat, imports, reminders

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Enterprise CRM API",
    description="Python FastAPI backend powering the CRM platform with SQLite DB",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(superadmin.router)
app.include_router(dashboard.router)
app.include_router(leads.router)
app.include_router(customers.router)
app.include_router(contacts.router)
app.include_router(opportunities.router)
app.include_router(products.router)
app.include_router(permissions.router)
app.include_router(activity.router)
app.include_router(chat.router)
app.include_router(imports.router)
app.include_router(reminders.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Enterprise CRM API v2",
        "docs": "/docs",
        "database": "SQLite (crm.db)",
        "auth": "JWT Bearer (email + password)"
    }
