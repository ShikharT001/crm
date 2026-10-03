"""
Seed script: creates default Super Admin user, Subscription Plans, Features, Organization, demo users, and sample data.
Run from backend/ directory:
  python seed_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import (
    User, UserRole, Company, OrganizationStatus, Lead, Customer, Product,
    SubscriptionPlan, Feature, OrganizationSubscription, OrganizationFeature
)
from app.routers.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_plans():
    plans_data = [
        {"name": "Trial", "description": "14-day free trial with core features", "price": 0.0, "max_users": 5},
        {"name": "Basic", "description": "Ideal for small teams", "price": 29.0, "max_users": 10},
        {"name": "Professional", "description": "Full CRM suite with inventory & stock management", "price": 99.0, "max_users": 25},
        {"name": "Enterprise", "description": "Custom scale & unlimited capacity", "price": 299.0, "max_users": 100},
    ]
    created_plans = {}
    for p in plans_data:
        existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == p["name"]).first()
        if not existing:
            existing = SubscriptionPlan(**p)
            db.add(existing)
            db.commit()
            db.refresh(existing)
            print(f"  + Subscription Plan: {p['name']}")
        created_plans[p["name"]] = existing
    return created_plans

def seed_features():
    features_data = [
        {"code": "leads", "name": "Lead Management", "description": "Manage potential sales leads and status workflow"},
        {"code": "contacts", "name": "Contact Management", "description": "Track business contacts and accounts"},
        {"code": "products", "name": "Product Catalog", "description": "Manage organization products and pricing"},
        {"code": "inventory", "name": "Inventory & Stock", "description": "Stock tracking, adjustments, and transactions"},
        {"code": "reports", "name": "Analytics & Reports", "description": "Business performance reports"},
        {"code": "activities", "name": "Activities & Tasks", "description": "Lead follow-up calls, meetings, notes"},
        {"code": "warehouses", "name": "Multi-Warehouse", "description": "Warehouse stock management"},
        {"code": "campaigns", "name": "Marketing Campaigns", "description": "Targeted outreach campaigns"},
        {"code": "whatsapp", "name": "WhatsApp Automation", "description": "Automated WhatsApp messages"},
        {"code": "email_automation", "name": "Email Automation", "description": "Drip email campaigns"},
    ]
    created_feats = []
    for f in features_data:
        existing = db.query(Feature).filter(Feature.code == f["code"]).first()
        if not existing:
            existing = Feature(**f)
            db.add(existing)
            db.commit()
            db.refresh(existing)
            print(f"  + System Feature: {f['name']} ({f['code']})")
        created_feats.append(existing)
    return created_feats

def upsert_company(name, domain, industry):
    company = db.query(Company).filter(Company.domain == domain).first()
    if not company:
        company = Company(
            name=name,
            domain=domain,
            industry=industry,
            status=OrganizationStatus.ACTIVE,
            max_users=25
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        print("  + Organization created: " + company.name)
    else:
        print("  . Organization exists:  " + company.name)
    return company

def upsert_user(email, name, password, role, company_id=None, manager_id=None):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            company_id=company_id,
            manager_id=manager_id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("  + User created: [" + role.value + "] " + email)
    else:
        user.password_hash = hash_password(password)
        user.is_active = True
        user.company_id = company_id
        user.manager_id = manager_id
        db.commit()
        db.refresh(user)
        print("  ~ User updated: [" + user.role.value + "] " + email)
    return user


if __name__ == "__main__":
    print("")
    print("--- SaaS CRM Seed Script -------------------------------------")
    print("Seeding Subscription Plans & Features...")
    plans = seed_plans()
    features = seed_features()

    print("")
    print("Creating default Super Admin...")
    super_admin = upsert_user(
        email="superadmin@crm.local",
        name="Super Admin",
        password="Admin@123",
        role=UserRole.SUPER_ADMIN,
    )

    print("")
    print("Creating demo organization + users...")
    demo_company = upsert_company("Saminc Corp", "saminc.local", "Technology")

    admin = upsert_user(
        email="admin@saminc.local",
        name="Rajesh Kumar",
        password="Admin@123",
        role=UserRole.ADMIN,
        company_id=demo_company.id,
    )

    demo_company.owner_id = admin.id
    db.commit()

    manager = upsert_user(
        email="manager@saminc.local",
        name="Priya Sharma",
        password="Manager@123",
        role=UserRole.MANAGER,
        company_id=demo_company.id,
        manager_id=admin.id,
    )

    emp1 = upsert_user(
        email="emp1@saminc.local",
        name="Amit Singh",
        password="Emp@12345",
        role=UserRole.EMPLOYEE,
        company_id=demo_company.id,
        manager_id=manager.id,
    )

    emp2 = upsert_user(
        email="emp2@saminc.local",
        name="Sunita Patel",
        password="Emp@12345",
        role=UserRole.EMPLOYEE,
        company_id=demo_company.id,
        manager_id=manager.id,
    )

    # Link Saminc Corp to Professional Plan
    pro_plan = plans.get("Professional")
    if pro_plan:
        existing_sub = db.query(OrganizationSubscription).filter(OrganizationSubscription.company_id == demo_company.id).first()
        if not existing_sub:
            sub = OrganizationSubscription(company_id=demo_company.id, plan_id=pro_plan.id, status=OrganizationStatus.ACTIVE)
            db.add(sub)
            db.commit()
            print("  + Linked Saminc Corp to Professional Plan")

    # Enable features for Saminc Corp (leads, contacts, products, inventory, reports, activities, warehouses)
    enabled_codes = ["leads", "contacts", "products", "inventory", "reports", "activities", "warehouses"]
    for f in features:
        existing_of = db.query(OrganizationFeature).filter(
            OrganizationFeature.company_id == demo_company.id,
            OrganizationFeature.feature_id == f.id
        ).first()
        if not existing_of:
            is_enabled = f.code in enabled_codes
            of = OrganizationFeature(company_id=demo_company.id, feature_id=f.id, is_enabled=is_enabled)
            db.add(of)
    db.commit()

    # Seed demo lead for Saminc Corp if not exists
    existing_lead = db.query(Lead).filter(Lead.company_id == demo_company.id).first()
    if not existing_lead:
        lead = Lead(
            title="Enterprise Cloud Migration",
            company_id=demo_company.id,
            company_name="Apex Global",
            contact_name="Rohan Verma",
            contact_email="rohan@apexglobal.test",
            phone="+91-9876543210",
            status="New",
            value=250000.00,
            assigned_user_id=emp1.id
        )
        db.add(lead)
        db.commit()
        print("  + Sample Lead created for Saminc Corp")

    # Seed demo product for Saminc Corp if not exists
    existing_product = db.query(Product).filter(Product.company_id == demo_company.id).first()
    if not existing_product:
        prod = Product(
            company_id=demo_company.id,
            name="SaaS License Pro",
            code="SAAS-PRO-01",
            price=1200.00,
            description="Annual subscription plan"
        )
        db.add(prod)
        db.commit()
        print("  + Sample Product created for Saminc Corp")

    db.close()

    print("")
    print("--- Seed complete! -------------------------------------------")
    print("")
    print("Login credentials:")
    print("  Super Admin : superadmin@crm.local  / Admin@123")
    print("  Admin       : admin@saminc.local    / Admin@123")
    print("  Manager     : manager@saminc.local  / Manager@123")
    print("  Employee 1  : emp1@saminc.local     / Emp@12345")
    print("  Employee 2  : emp2@saminc.local     / Emp@12345")
    print("")
