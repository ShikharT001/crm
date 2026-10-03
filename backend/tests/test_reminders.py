import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from app.main import app
from app.database import get_db, Base
from app import models
from app.routers.auth import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_reminders.db"
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

    # Clean up previous data
    db.query(models.ReminderAttendee).delete()
    db.query(models.Reminder).delete()
    db.query(models.User).delete()
    db.query(models.Company).delete()
    db.commit()

    # Create Company 1
    company1 = models.Company(name="Acme Corp")
    db.add(company1)
    # Create Company 2 for tenant isolation check
    company2 = models.Company(name="Beta LLC")
    db.add(company2)
    db.commit()

    # Company 1 Admin
    admin1 = models.User(
        name="Alice Admin",
        email="alice@acme.local",
        password_hash=hash_password("Pass123"),
        role=models.UserRole.ADMIN,
        company_id=company1.id,
    )
    # Company 1 Manager
    manager1 = models.User(
        name="Bob Manager",
        email="bob@acme.local",
        password_hash=hash_password("Pass123"),
        role=models.UserRole.MANAGER,
        company_id=company1.id,
    )
    # Company 1 Employees
    emp1 = models.User(
        name="Charlie Emp",
        email="charlie@acme.local",
        password_hash=hash_password("Pass123"),
        role=models.UserRole.EMPLOYEE,
        company_id=company1.id,
    )
    emp2 = models.User(
        name="Diana Emp",
        email="diana@acme.local",
        password_hash=hash_password("Pass123"),
        role=models.UserRole.EMPLOYEE,
        company_id=company1.id,
    )
    # Company 2 User
    other_user = models.User(
        name="Eve Other",
        email="eve@beta.local",
        password_hash=hash_password("Pass123"),
        role=models.UserRole.ADMIN,
        company_id=company2.id,
    )
    db.add_all([admin1, manager1, emp1, emp2, other_user])
    db.commit()

    yield {
        "company1_id": company1.id,
        "company2_id": company2.id,
        "admin1": admin1,
        "manager1": manager1,
        "emp1": emp1,
        "emp2": emp2,
        "other_user": other_user,
    }

    db.close()
    Base.metadata.drop_all(bind=engine)


def get_token(user):
    return create_access_token({"sub": str(user.id)})


def test_schedule_meeting_with_attendees(setup_db):
    data = setup_db
    admin = data["admin1"]
    manager = data["manager1"]
    emp1 = data["emp1"]
    emp2 = data["emp2"]

    admin_token = get_token(admin)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin schedules meeting inviting manager, emp1, emp2
    meeting_time = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    resp = client.post(
        "/api/reminders/",
        headers=headers,
        json={
            "title": "Q4 Strategy & Sales Alignment",
            "description": "Discuss Q4 enterprise targets and pipeline distribution.",
            "reminder_type": "meeting",
            "priority": "high",
            "scheduled_at": meeting_time,
            "meeting_link": "https://meet.google.com/abc-defg-hij",
            "attendee_ids": [manager.id, emp1.id, emp2.id],
        },
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["title"] == "Q4 Strategy & Sales Alignment"
    assert created["reminder_type"] == "meeting"
    assert created["priority"] == "high"
    assert len(created["attendees"]) == 4  # admin + manager + emp1 + emp2

    # 2. Check that employee 1 sees the meeting
    emp1_token = get_token(emp1)
    resp = client.get("/api/reminders/", headers={"Authorization": f"Bearer {emp1_token}"})
    assert resp.status_code == 200
    meetings = resp.json()
    assert len(meetings) == 1
    assert meetings[0]["title"] == "Q4 Strategy & Sales Alignment"
    assert meetings[0]["meeting_link"] == "https://meet.google.com/abc-defg-hij"


def test_popup_side_notification_when_time_arises(setup_db):
    data = setup_db
    admin = data["admin1"]
    emp1 = data["emp1"]
    emp2 = data["emp2"]

    admin_token = get_token(admin)
    emp1_token = get_token(emp1)

    # Schedule a meeting starting NOW (due for side notification popup)
    due_meeting_time = (datetime.utcnow() + timedelta(minutes=2)).isoformat()
    resp = client.post(
        "/api/reminders/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Emergency Client Sync",
            "description": "Immediate meeting with enterprise lead.",
            "reminder_type": "meeting",
            "priority": "urgent",
            "scheduled_at": due_meeting_time,
            "attendee_ids": [emp1.id, emp2.id],
        },
    )
    assert resp.status_code == 201
    reminder_id = resp.json()["id"]

    # Emp1 checks /api/reminders/due (polling endpoint for popup side notification)
    resp = client.get("/api/reminders/due", headers={"Authorization": f"Bearer {emp1_token}"})
    assert resp.status_code == 200
    due_items = resp.json()
    assert len(due_items) == 1
    assert due_items[0]["id"] == reminder_id
    assert due_items[0]["is_due"] is True

    # Emp1 dismisses the popup side notification
    resp = client.post(f"/api/reminders/{reminder_id}/dismiss", headers={"Authorization": f"Bearer {emp1_token}"})
    assert resp.status_code == 200

    # Emp1 checks /api/reminders/due again -> should be empty since dismissed!
    resp = client.get("/api/reminders/due", headers={"Authorization": f"Bearer {emp1_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # Emp2 has NOT dismissed yet -> should still see it!
    emp2_token = get_token(emp2)
    resp = client.get("/api/reminders/due", headers={"Authorization": f"Bearer {emp2_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_daily_tasks_and_deal_call_reminders(setup_db):
    data = setup_db
    manager = data["manager1"]
    manager_token = get_token(manager)
    headers = {"Authorization": f"Bearer {manager_token}"}

    # Manager adds a daily task with descriptive schedule
    now_str = datetime.utcnow().isoformat()
    resp = client.post(
        "/api/reminders/",
        headers=headers,
        json={
            "title": "Daily Task Schedule: Follow up 5 Enterprise Leads",
            "description": "10:00 AM - Call Acme Lead\n02:00 PM - Prep pitch deck\n04:30 PM - Team Standup",
            "reminder_type": "task",
            "priority": "medium",
            "scheduled_at": now_str,
        },
    )
    assert resp.status_code == 201
    task = resp.json()
    assert task["reminder_type"] == "task"

    # Manager adds a deal call reminder
    resp = client.post(
        "/api/reminders/",
        headers=headers,
        json={
            "title": "Deal Call: TechCorp Contract Renewal",
            "description": "Discuss annual license terms and discount options with VP of TechCorp.",
            "reminder_type": "deal_call",
            "priority": "high",
            "scheduled_at": now_str,
            "related_entity_type": "opportunity",
            "related_entity_id": 101,
            "related_entity_title": "TechCorp 50-Seat Deal",
        },
    )
    assert resp.status_code == 201
    deal_call = resp.json()
    assert deal_call["reminder_type"] == "deal_call"
    assert deal_call["related_entity_title"] == "TechCorp 50-Seat Deal"

    # Check today's reminders
    resp = client.get("/api/reminders/today", headers=headers)
    assert resp.status_code == 200
    today_items = resp.json()
    assert len(today_items) >= 2

    # Complete the task
    resp = client.post(f"/api/reminders/{task['id']}/complete", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_tenant_isolation_and_colleagues(setup_db):
    data = setup_db
    admin1 = data["admin1"]
    other_user = data["other_user"]

    # 1. Check organization colleagues list for Admin1
    resp = client.get(
        "/api/reminders/organization-users",
        headers={"Authorization": f"Bearer {get_token(admin1)}"},
    )
    assert resp.status_code == 200
    colleagues = resp.json()
    # Company 1 has admin1, manager1, emp1, emp2 (4 users). Should NOT include Eve (company 2)
    assert len(colleagues) == 4
    emails = [c["email"] for c in colleagues]
    assert "eve@beta.local" not in emails
    assert "alice@acme.local" in emails

    # 2. Admin 1 schedules meeting
    resp = client.post(
        "/api/reminders/",
        headers={"Authorization": f"Bearer {get_token(admin1)}"},
        json={
            "title": "Acme Internal Confidential",
            "scheduled_at": datetime.utcnow().isoformat(),
            "reminder_type": "meeting",
        },
    )
    rem_id = resp.json()["id"]

    # 3. Eve from Beta LLC tries to view or access it
    resp = client.get(
        f"/api/reminders/{rem_id}",
        headers={"Authorization": f"Bearer {get_token(other_user)}"},
    )
    assert resp.status_code == 404

    # 4. Eve's reminder list should NOT contain Acme's meeting
    resp = client.get(
        "/api/reminders/",
        headers={"Authorization": f"Bearer {get_token(other_user)}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0
