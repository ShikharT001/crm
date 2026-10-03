"""
Multi-Tenant Isolation Automated Verification Test
Tests tenant boundary enforcement across Organizations, Leads, and Products.
Run with: python tests/test_tenant_isolation.py
"""
import sys
import os
import time
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, UserRole, Company, OrganizationStatus, Lead, Product
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)

def run_tests():
    print("--- Starting Multi-Tenant Data Isolation Tests ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    run_id = int(time.time())

    # 1. Setup Org A
    org_a = db.query(Company).filter(Company.domain == "orga.com").first()
    if not org_a:
        org_a = Company(name="Org A Inc", domain="orga.com", status=OrganizationStatus.ACTIVE)
        db.add(org_a)
        db.commit()
        db.refresh(org_a)

    user_a = db.query(User).filter(User.email == "admin@orga.com").first()
    if not user_a:
        user_a = User(
            name="Admin A",
            email="admin@orga.com",
            password_hash=hash_password("Pass@123"),
            role=UserRole.ADMIN,
            company_id=org_a.id
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

    # 2. Setup Org B
    org_b = db.query(Company).filter(Company.domain == "orgb.com").first()
    if not org_b:
        org_b = Company(name="Org B Corp", domain="orgb.com", status=OrganizationStatus.ACTIVE)
        db.add(org_b)
        db.commit()
        db.refresh(org_b)

    user_b = db.query(User).filter(User.email == "admin@orgb.com").first()
    if not user_b:
        user_b = User(
            name="Admin B",
            email="admin@orgb.com",
            password_hash=hash_password("Pass@123"),
            role=UserRole.ADMIN,
            company_id=org_b.id
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

    token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email, "role": user_a.role.value, "company_id": org_a.id})
    token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email, "role": user_b.role.value, "company_id": org_b.id})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # TEST 1: Lead Isolation
    print("[Test 1] Creating Leads in Org A and Org B...")
    res_a = client.post("/api/leads/", json={
        "title": f"Confidential Lead Org A {run_id}",
        "contact_name": "Alice A",
        "contact_email": f"alice_{run_id}@orga.com",
        "value": "50000.00"
    }, headers=headers_a)
    assert res_a.status_code == 200, f"Failed Org A lead creation: {res_a.text}"
    lead_a_id = res_a.json()["id"]

    res_b = client.post("/api/leads/", json={
        "title": f"Secret Project Org B {run_id}",
        "contact_name": "Bob B",
        "contact_email": f"bob_{run_id}@orgb.com",
        "value": "80000.00"
    }, headers=headers_b)
    assert res_b.status_code == 200, f"Failed Org B lead creation: {res_b.text}"
    lead_b_id = res_b.json()["id"]

    print("[Test 2] Verifying Org A cannot list Org B leads...")
    leads_list_a = client.get("/api/leads/", headers=headers_a).json()
    lead_ids_a = [l["id"] for l in leads_list_a]
    assert lead_a_id in lead_ids_a, "Org A missing its own lead!"
    assert lead_b_id not in lead_ids_a, "SECURITY VIOLATION: Org A can see Org B lead!"
    print("  [OK] PASSED: Org A sees only Org A leads.")

    print("[Test 3] Verifying Org B cannot list Org A leads...")
    leads_list_b = client.get("/api/leads/", headers=headers_b).json()
    lead_ids_b = [l["id"] for l in leads_list_b]
    assert lead_b_id in lead_ids_b, "Org B missing its own lead!"
    assert lead_a_id not in lead_ids_b, "SECURITY VIOLATION: Org B can see Org A lead!"
    print("  [OK] PASSED: Org B sees only Org B leads.")

    print("[Test 4] Verifying direct cross-tenant GET returns 404...")
    direct_view = client.get(f"/api/leads/{lead_a_id}", headers=headers_b)
    assert direct_view.status_code == 404, f"SECURITY VIOLATION: Org B accessed Org A lead! Code: {direct_view.status_code}"
    print("  [OK] PASSED: Cross-tenant direct access denied with HTTP 404.")

    # TEST 2: Product SKU Isolation
    print("[Test 5] Verifying SKU uniqueness per organization...")
    shared_sku = f"SKU-{run_id}"
    p1 = client.post("/api/products/", json={
        "name": f"Widget Org A {run_id}",
        "code": shared_sku,
        "price": "199.99"
    }, headers=headers_a)
    assert p1.status_code == 200, f"Failed product creation in Org A: {p1.text}"

    p2 = client.post("/api/products/", json={
        "name": f"Widget Org B {run_id}",
        "code": shared_sku,
        "price": "299.99"
    }, headers=headers_b)
    assert p2.status_code == 200, f"Failed product creation in Org B with same SKU: {p2.text}"

    prods_a = client.get("/api/products/", headers=headers_a).json()
    assert any(p["name"] == f"Widget Org A {run_id}" for p in prods_a)
    assert not any(p["name"] == f"Widget Org B {run_id}" for p in prods_a), "SECURITY VIOLATION: Org A sees Org B product!"
    print("  [OK] PASSED: Product list & SKU isolation strictly enforced.")

    db.close()
    print("\n=======================================================")
    print("ALL TENANT ISOLATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
