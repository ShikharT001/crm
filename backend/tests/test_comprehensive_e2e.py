import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app import models
from app.routers.auth import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_comprehensive_e2e.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Company
    company = models.Company(name="Acme Global")
    db.add(company)
    db.commit()
    
    # 2. Admin User
    admin = models.User(
        name="Admin Boss",
        email="admin@acme.com",
        password_hash=hash_password("admin123"),
        role=models.UserRole.ADMIN,
        company_id=company.id
    )
    db.add(admin)
    
    # 3. Manager User
    manager = models.User(
        name="Manager Mike",
        email="manager@acme.com",
        password_hash=hash_password("manager123"),
        role=models.UserRole.MANAGER,
        company_id=company.id
    )
    db.add(manager)
    
    # 4. Employee User
    emp = models.User(
        name="Employee Emma",
        email="emp@acme.com",
        password_hash=hash_password("emp123"),
        role=models.UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(emp)
    db.commit()
    
    yield
    
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def login(email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

def test_auth_and_activity_logging():
    # 1. Login as employee Emma
    emp_token = login("emp@acme.com", "emp123")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    
    # 2. Logout as employee Emma
    res_logout = client.post("/api/auth/logout", headers=emp_headers)
    assert res_logout.status_code == 200
    
    # 3. Login as Admin Boss
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 4. Admin inspects activity logs
    res_logs = client.get("/api/activity/logs", headers=admin_headers)
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 3  # emp login, emp logout, admin login
    actions = [l["action"] for l in logs]
    assert "login" in actions
    assert "logout" in actions
    
    # 5. Check online users (within 24h)
    res_online = client.get("/api/activity/online-users", headers=admin_headers)
    assert res_online.status_code == 200
    online_data = res_online.json()
    assert "users" in online_data or isinstance(online_data, list)

def test_granular_permissions_workflow():
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Get available permissions list
    res_avail = client.get("/api/permissions/available", headers=admin_headers)
    assert res_avail.status_code == 200
    avail_perms = res_avail.json()
    assert len(avail_perms) >= 10
    
    # 2. Get Employee ID
    db = TestingSessionLocal()
    emp = db.query(models.User).filter(models.User.email == "emp@acme.com").first()
    emp_id = emp.id
    db.close()
    
    # 3. Grant specific permissions to Employee (leads.view, leads.create)
    desired_perms = ["leads.view", "leads.create", "contacts.view"]
    res_put = client.put(f"/api/permissions/user/{emp_id}", json={"permissions": desired_perms}, headers=admin_headers)
    assert res_put.status_code == 200
    
    # 4. Fetch permissions for user as Admin
    res_get = client.get(f"/api/permissions/user/{emp_id}", headers=admin_headers)
    assert res_get.status_code == 200
    perms = res_get.json()
    assert set(perms) == set(desired_perms)
    
    # 5. Check /api/permissions/all-users batch endpoint for the admin matrix
    res_all = client.get("/api/permissions/all-users", headers=admin_headers)
    assert res_all.status_code == 200
    all_users_perms = res_all.json()
    assert str(emp_id) in all_users_perms or emp_id in all_users_perms
    
    # 6. Verify Employee calling /api/permissions/me sees their granted permissions
    emp_token = login("emp@acme.com", "emp123")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    res_me = client.get("/api/permissions/me", headers=emp_headers)
    assert res_me.status_code == 200
    my_perms = res_me.json()
    assert "leads.view" in my_perms
    assert "contacts.view" in my_perms
    
    # 7. Verify /api/auth/login and /api/auth/me return permissions list
    res_emp_login = client.post("/api/auth/login", json={"email": "emp@acme.com", "password": "emp123"})
    assert res_emp_login.status_code == 200
    assert "permissions" in res_emp_login.json()["user"]
    assert set(res_emp_login.json()["user"]["permissions"]) == set(desired_perms)

    res_emp_me = client.get("/api/auth/me", headers=emp_headers)
    assert res_emp_me.status_code == 200
    assert set(res_emp_me.json()["permissions"]) == set(desired_perms)

    # 8. Admin /api/auth/me receives all permissions implicitly
    res_admin_me = client.get("/api/auth/me", headers=admin_headers)
    assert res_admin_me.status_code == 200
    assert "leads.view" in res_admin_me.json()["permissions"]
    assert "opportunities.view" in res_admin_me.json()["permissions"]

    # 9. Verify Endpoint Access Enforcement
    # Emma has leads.view and leads.create, but NOT leads.convert, opportunities.view, or products.view
    res_leads_get = client.get("/api/leads/", headers=emp_headers)
    assert res_leads_get.status_code == 200, f"res_leads_get failed: {res_leads_get.status_code} {res_leads_get.text}"

    # Emma creates a lead
    res_create_lead = client.post(
        "/api/leads/",
        headers=emp_headers,
        json={
            "title": "Enterprise Cloud Deal",
            "contact_name": "Sarah Connor",
            "contact_email": "sarah@cyberdyne.io",
            "company_name": "Cyberdyne Systems",
            "value": 50000.0,
            "status": "New"
        }
    )
    assert res_create_lead.status_code in [200, 201]
    created_lead_id = res_create_lead.json()["id"]

    # Emma cannot convert lead because leads.convert is not checked/granted
    res_fail_convert = client.post(f"/api/leads/{created_lead_id}/convert", headers=emp_headers)
    assert res_fail_convert.status_code == 403
    assert res_fail_convert.json()["detail"]["code"] == "PERMISSION_DENIED"

    # Emma cannot view opportunities or products
    assert client.get("/api/opportunities/", headers=emp_headers).status_code == 403
    assert client.get("/api/products/", headers=emp_headers).status_code == 403

    # 10. Admin checks leads.convert for Emma
    client.put(
        f"/api/permissions/user/{emp_id}",
        json={"permissions": ["leads.view", "leads.create", "leads.convert", "contacts.view"]},
        headers=admin_headers
    )
    # Emma now converts the lead successfully
    res_convert_ok = client.post(f"/api/leads/{created_lead_id}/convert", headers=emp_headers)
    assert res_convert_ok.status_code == 200

    # 11. Admin UNCHECKS leads.view (revoking lead visibility)
    client.put(
        f"/api/permissions/user/{emp_id}",
        json={"permissions": ["contacts.view"]},
        headers=admin_headers
    )
    # Emma can no longer view or create leads
    res_blocked_view = client.get("/api/leads/", headers=emp_headers)
    assert res_blocked_view.status_code == 403
    assert res_blocked_view.json()["detail"]["code"] == "PERMISSION_DENIED"

    res_blocked_create = client.post(
        "/api/leads/",
        headers=emp_headers,
        json={"title": "Denied Lead", "contact_name": "No Access", "contact_email": "no@access.com"}
    )
    assert res_blocked_create.status_code == 403
    assert res_blocked_create.json()["detail"]["code"] == "PERMISSION_DENIED"

    # 12. Non-admin (Employee & Manager) cannot alter permissions (only Admin/SuperAdmin can give permissions)
    res_forbidden = client.put(f"/api/permissions/user/{emp_id}", json={"permissions": ["users.view"]}, headers=emp_headers)
    assert res_forbidden.status_code in [401, 403]

    mgr_token = login("manager@acme.com", "manager123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    res_mgr_forbidden = client.put(f"/api/permissions/user/{emp_id}", json={"permissions": ["users.view"]}, headers=mgr_headers)
    assert res_mgr_forbidden.status_code in [401, 403]

    # 13. Admin cannot alter an Admin user's permissions
    admin_user = db.query(models.User).filter(models.User.email == "admin@acme.com").first()
    res_admin_perm_fail = client.put(f"/api/permissions/user/{admin_user.id}", json={"permissions": []}, headers=admin_headers)
    assert res_admin_perm_fail.status_code == 400

def test_admin_group_chat_workflow():
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    db = TestingSessionLocal()
    manager = db.query(models.User).filter(models.User.email == "manager@acme.com").first()
    emp = db.query(models.User).filter(models.User.email == "emp@acme.com").first()
    manager_id, emp_id = manager.id, emp.id
    db.close()
    
    # 1. Non-admin cannot create group
    emp_token = login("emp@acme.com", "emp123")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    res_fail = client.post("/api/chat/groups", json={"name": "Hacked Group"}, headers=emp_headers)
    assert res_fail.status_code in [401, 403]
    
    # 2. Admin creates group with Manager and Employee
    res_create = client.post("/api/chat/groups", json={
        "name": "Q4 Sales Strategy",
        "description": "WhatsApp-style collaboration group",
        "member_ids": [manager_id, emp_id]
    }, headers=admin_headers)
    assert res_create.status_code == 200
    group = res_create.json()
    group_id = group["id"]
    assert group["name"] == "Q4 Sales Strategy"
    
    # 3. Employee sends a message to the group
    res_msg1 = client.post(f"/api/chat/groups/{group_id}/messages", json={"content": "Hi everyone! Ready for Q4."}, headers=emp_headers)
    assert res_msg1.status_code == 200
    msg1 = res_msg1.json()
    
    # 4. Admin replies
    res_msg2 = client.post(f"/api/chat/groups/{group_id}/messages", json={"content": "Welcome! Let's close some deals."}, headers=admin_headers)
    assert res_msg2.status_code == 200
    
    # 5. Fetch messages
    res_msgs = client.get(f"/api/chat/groups/{group_id}/messages", headers=admin_headers)
    assert res_msgs.status_code == 200
    messages = res_msgs.json()
    assert len(messages) == 2
    assert messages[0]["content"] == "Hi everyone! Ready for Q4."
    assert messages[1]["content"] == "Welcome! Let's close some deals."
    
    # 6. Soft delete a message
    res_del = client.delete(f"/api/chat/messages/{msg1['id']}", headers=admin_headers)
    assert res_del.status_code == 200
    
    # 7. Check that messages reflect deletion
    res_msgs_after = client.get(f"/api/chat/groups/{group_id}/messages", headers=admin_headers)
    assert res_msgs_after.status_code == 200
    msgs_after = res_msgs_after.json()
    assert len(msgs_after) == 1 or msgs_after[0].get("is_deleted") is True

def test_csv_import_leads_with_categorization():
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Download Lead CSV template
    res_tpl = client.get("/api/imports/template/leads", headers=admin_headers)
    assert res_tpl.status_code == 200
    assert "title,contact_name" in res_tpl.text
    
    # 2. Upload Leads CSV with categorization fields
    csv_data = (
        "title,contact_name,contact_email,phone,company_name,value,notes\n"
        "Enterprise Tier,Sarah Connor,sarah@skynet.com,555-0199,Cyberdyne,50000,Key Account\n"
        "SMB Package,Kyle Reese,kyle@future.com,555-0188,,12000,Interested in trial\n"
    )
    
    files = {"file": ("leads_october.csv", csv_data, "text/csv")}
    form_data = {
        "default_status": "contacted",
        "category_tag": "TechExpo-2026",
        "default_company_name": "Initech Systems"
    }
    
    res_imp = client.post("/api/imports/leads", data=form_data, files=files, headers=admin_headers)
    assert res_imp.status_code == 200
    result = res_imp.json()
    assert result["imported"] == 2
    assert result["errors"] == 0
    
    # 3. Verify leads were created in DB with correct status & company
    db = TestingSessionLocal()
    lead1 = db.query(models.Lead).filter(models.Lead.contact_email == "sarah@skynet.com").first()
    assert lead1 is not None
    assert lead1.status == models.LeadStatus.CONTACTED
    assert lead1.company_name == "Cyberdyne"
    assert "TechExpo-2026" in (lead1.title or "") or "TechExpo-2026" in (lead1.notes or "")
    
    lead2 = db.query(models.Lead).filter(models.Lead.contact_email == "kyle@future.com").first()
    assert lead2 is not None
    assert lead2.company_name == "Initech Systems"  # Fallback applied
    db.close()

def test_csv_import_contacts_with_categorization():
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Download Contacts CSV template
    res_tpl = client.get("/api/imports/template/contacts", headers=admin_headers)
    assert res_tpl.status_code == 200
    assert "name,email,phone" in res_tpl.text
    
    # 2. Create an existing Customer
    db = TestingSessionLocal()
    admin_user = db.query(models.User).filter(models.User.email == "admin@acme.com").first()
    customer = models.Customer(
        name="Stark Industries",
        company_id=admin_user.company_id
    )
    db.add(customer)
    db.commit()
    cust_id = customer.id
    db.close()
    
    # 3. Import Contacts mapped to this existing Customer
    csv_data = (
        "name,email,phone,position\n"
        "Pepper Potts,pepper@stark.com,555-1212,CEO\n"
        "Happy Hogan,happy@stark.com,555-3434,Head of Security\n"
    )
    files = {"file": ("contacts_stark.csv", csv_data, "text/csv")}
    form_data = {
        "assignment_mode": "existing",
        "default_customer_id": str(cust_id),
        "default_position": "Executive"
    }
    
    res_imp = client.post("/api/imports/contacts", data=form_data, files=files, headers=admin_headers)
    assert res_imp.status_code == 200
    result = res_imp.json()
    assert result["imported"] == 2
    assert result["errors"] == 0
    
    # 4. Verify in DB
    db = TestingSessionLocal()
    contact = db.query(models.Contact).filter(models.Contact.email == "pepper@stark.com").first()
    assert contact is not None
    assert contact.customer_id == cust_id
    assert contact.position == "CEO"
    db.close()
    
    # 5. Check import history
    res_hist = client.get("/api/imports/history", headers=admin_headers)
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) >= 1

def test_csv_import_with_cp1252_encoding():
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Simulate a CSV exported from Excel containing 0x92 byte (smart quote / apostrophe: O’Connor)
    raw_csv_bytes = b"title,contact_name,contact_email,phone,company_name\nLead Alpha,Brian O\x92Connor,brian@ff.com,555-1234,Toretto\x92s Garage\n"
    
    files = {"file": ("windows1252_export.csv", raw_csv_bytes, "text/csv")}
    form_data = {
        "default_status": "new"
    }
    
    res = client.post("/api/imports/leads", data=form_data, files=files, headers=admin_headers)
    assert res.status_code == 200, f"Failed with: {res.text}"
    data = res.json()
    assert data["imported"] == 1
    assert data["errors"] == 0
    
    db = TestingSessionLocal()
    lead = db.query(models.Lead).filter(models.Lead.contact_email == "brian@ff.com").first()
    assert lead is not None
    assert "Connor" in lead.contact_name
    db.close()

def test_meeting_scheduling_and_reminders_workflow():
    from datetime import datetime, timedelta
    admin_token = login("admin@acme.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    emp_token = login("emp@acme.com", "emp123")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # 1. Admin gets organization colleagues
    res_users = client.get("/api/reminders/organization-users", headers=admin_headers)
    assert res_users.status_code == 200
    colleagues = res_users.json()
    emp_id = next(c["id"] for c in colleagues if c["email"] == "emp@acme.com")

    # 2. Admin schedules meeting inviting Emma
    now = datetime.utcnow()
    meeting_time = (now + timedelta(minutes=3)).isoformat()
    res_meet = client.post(
        "/api/reminders/",
        headers=admin_headers,
        json={
            "title": "Quarterly Performance & Deal Review",
            "description": "Review closing rates and quarterly targets.",
            "reminder_type": "meeting",
            "priority": "high",
            "scheduled_at": meeting_time,
            "meeting_link": "https://meet.google.com/xyz-uvwx-rst",
            "attendee_ids": [emp_id],
        },
    )
    assert res_meet.status_code == 201
    meeting = res_meet.json()
    meeting_id = meeting["id"]
    assert meeting["title"] == "Quarterly Performance & Deal Review"
    assert len(meeting["attendees"]) == 2  # Admin + Emma

    # 3. Employee checks due reminders -> receives popup side notification
    res_due = client.get("/api/reminders/due", headers=emp_headers)
    assert res_due.status_code == 200
    due_items = res_due.json()
    assert any(item["id"] == meeting_id for item in due_items)

    # 4. Employee dismisses the popup side notification
    res_dismiss = client.post(f"/api/reminders/{meeting_id}/dismiss", headers=emp_headers)
    assert res_dismiss.status_code == 200

    # 5. Emma no longer sees it in due list
    res_due_after = client.get("/api/reminders/due", headers=emp_headers)
    assert res_due_after.status_code == 200
    assert not any(item["id"] == meeting_id for item in res_due_after.json())

    # 6. Emma can add a daily task for today
    res_task = client.post(
        "/api/reminders/",
        headers=emp_headers,
        json={
            "title": "Daily Task: Prepare Slide Deck",
            "description": "11:00 AM draft slides\n03:00 PM send to manager",
            "reminder_type": "task",
            "priority": "medium",
            "scheduled_at": (now + timedelta(hours=1)).isoformat(),
        },
    )
    assert res_task.status_code == 201
    task_id = res_task.json()["id"]

    # 7. Complete task
    res_comp = client.post(f"/api/reminders/{task_id}/complete", headers=emp_headers)
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"

