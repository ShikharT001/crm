"""
Phase 2 Automated Verification Test: Organization & Feature Control
Tests Super Admin Organization onboarding, feature module toggles, and subscription status enforcement.
Run with: python tests/test_feature_control.py
"""
import sys
import os
import time
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, UserRole, Company, SubscriptionPlan, Feature, OrganizationFeature
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)

def run_tests():
    print("--- Starting Phase 2 Feature & Subscription Control Tests ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    run_id = int(time.time())

    # Get Super Admin
    super_admin = db.query(User).filter(User.email == "superadmin@crm.local").first()
    assert super_admin is not None, "Super Admin account missing!"

    token_super = create_access_token({"sub": str(super_admin.id), "email": super_admin.email, "role": super_admin.role.value, "company_id": None})
    headers_super = {"Authorization": f"Bearer {token_super}"}

    # TEST 1: Super Admin retrieves system plans and features
    print("[Test 1] Super Admin fetching plans & features...")
    plans_res = client.get("/api/superadmin/plans/", headers=headers_super)
    assert plans_res.status_code == 200, f"Failed fetching plans: {plans_res.text}"
    plans = plans_res.json()
    assert len(plans) >= 4, f"Expected at least 4 plans, got {len(plans)}"
    pro_plan_id = next(p["id"] for p in plans if p["name"] == "Professional")

    features_res = client.get("/api/superadmin/features/", headers=headers_super)
    assert features_res.status_code == 200, f"Failed fetching features: {features_res.text}"
    print("  [OK] Super Admin can access SaaS management endpoints.")

    # TEST 2: Super Admin onboards new tenant Gamma Corp with disabled 'inventory' module
    print("[Test 2] Onboarding Organization Gamma Corp with disabled 'inventory' module...")
    gamma_email = f"admin_gamma_{run_id}@gamma.com"
    create_res = client.post("/api/superadmin/organizations/", json={
        "name": f"Gamma Corp {run_id}",
        "domain": f"gamma_{run_id}.com",
        "industry": "Logistics",
        "owner_name": "Gamma Owner",
        "owner_email": gamma_email,
        "owner_password": "GammaPassword@123",
        "plan_id": pro_plan_id,
        "status": "ACTIVE",
        "max_users": 15,
        "enabled_features": ["leads", "contacts", "products"]  # 'inventory' explicitly left out!
    }, headers=headers_super)
    assert create_res.status_code == 201, f"Failed creating organization: {create_res.text}"
    gamma_org_id = create_res.json()["id"]
    print("  [OK] Organization created successfully.")

    # TEST 3: Login as Gamma Corp Admin
    print("[Test 3] Authenticating as Gamma Corp Admin...")
    login_res = client.post("/api/auth/login", json={"email": gamma_email, "password": "GammaPassword@123"})
    assert login_res.status_code == 200, f"Failed login for Gamma Admin: {login_res.text}"
    gamma_token = login_res.json()["access_token"]
    headers_gamma = {"Authorization": f"Bearer {gamma_token}"}
    print("  [OK] Gamma Admin authenticated.")

    # TEST 4: Gamma Admin accesses enabled feature (leads) -> 200 OK
    print("[Test 4] Testing access to enabled feature ('leads')...")
    leads_res = client.get("/api/leads/", headers=headers_gamma)
    assert leads_res.status_code == 200, f"Expected 200 OK on enabled feature, got {leads_res.status_code}"
    print("  [OK] Access granted for enabled feature.")

    # TEST 5: Super Admin suspends Gamma Corp organization
    print("[Test 5] Super Admin suspending Gamma Corp organization...")
    suspend_res = client.patch(f"/api/superadmin/organizations/{gamma_org_id}", json={
        "status": "SUSPENDED"
    }, headers=headers_super)
    assert suspend_res.status_code == 200, f"Failed suspending org: {suspend_res.text}"
    assert suspend_res.json()["status"] == "SUSPENDED"
    print("  [OK] Organization status set to SUSPENDED.")

    # TEST 6: Gamma Admin attempts API call while suspended -> 403 FORBIDDEN
    print("[Test 6] Verifying suspended tenant receives HTTP 403 SUBSCRIPTION_SUSPENDED...")
    blocked_res = client.get("/api/leads/", headers=headers_gamma)
    assert blocked_res.status_code == 403, f"Expected 403 on suspended org, got {blocked_res.status_code}"
    assert "SUBSCRIPTION_SUSPENDED" in blocked_res.text
    print("  [OK] Server-side subscription status guard strictly enforced.")

    db.close()
    print("\n=======================================================")
    print("ALL PHASE 2 FEATURE & SUBSCRIPTION CONTROL TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
