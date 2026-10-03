import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.main import app
from app.database import get_db, Base
from app import models
from app.routers.auth import hash_password

# Use a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_new_features.db"
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
    
    # Create test company
    company = models.Company(name="Test Company")
    db.add(company)
    db.commit()
    
    # Create admin user
    admin = models.User(
        name="Admin Test",
        email="admin@test.com",
        password_hash=hash_password("password"),
        role=models.UserRole.ADMIN,
        company_id=company.id
    )
    db.add(admin)
    
    # Create normal user
    user = models.User(
        name="User Test",
        email="user@test.com",
        password_hash=hash_password("password"),
        role=models.UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(user)
    db.commit()
    
    yield
    
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def get_token(email="admin@test.com"):
    response = client.post("/api/auth/login", json={"email": email, "password": "password"})
    return response.json()["access_token"]

def test_activity_log():
    client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password"})
    token = get_token()
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/activity/logs", headers=headers)
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert logs[0]["action"] == "login"

def test_permissions():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get users to find the employee ID
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.email == "user@test.com").first()
    user_id = user.id
    db.close()
    
    # Update permissions
    res = client.put(f"/api/permissions/user/{user_id}", json={"permissions": ["leads.view", "leads.create"]}, headers=headers)
    assert res.status_code == 200
    
    # Get permissions
    res = client.get(f"/api/permissions/user/{user_id}", headers=headers)
    assert res.status_code == 200
    perms = res.json()
    assert "leads.view" in perms
    assert "leads.create" in perms
    
def test_chat():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.email == "user@test.com").first()
    user_id = user.id
    db.close()
    
    # Create group
    res = client.post("/api/chat/groups", json={"name": "Sales", "member_ids": [user_id]}, headers=headers)
    assert res.status_code == 200
    group_id = res.json()["id"]
    
    # Send message
    res = client.post(f"/api/chat/groups/{group_id}/messages", json={"content": "Hello team!"}, headers=headers)
    assert res.status_code == 200
    
    # Get messages
    res = client.get(f"/api/chat/groups/{group_id}/messages", headers=headers)
    assert res.status_code == 200
    msgs = res.json()
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Hello team!"

def test_csv_import():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    csv_content = "title,contact_name,contact_email,phone,company_name,status,value,notes\nTest Lead,John Doe,john@example.com,123456,Test Corp,New,1000,Notes"
    
    files = {'file': ('test.csv', csv_content, 'text/csv')}
    res = client.post("/api/imports/leads", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["imported"] == 1
    assert data["errors"] == 0
