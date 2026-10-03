# 11 - Testing & Quality Assurance

This document details the test framework, test suite organization, database isolation fixtures, and procedures for running and authoring automated tests in the CRM backend.

---

## Testing Framework & Tooling

- **Test Runner**: `pytest` 9.1+
- **HTTP Client**: `starlette.testclient.TestClient` (FastAPI)
- **Database Fixtures**: Isolated SQLite test databases created per test run (e.g. `test_comprehensive_e2e.db`, `test_reminders.db`)
- **Dependency Overrides**: FastAPI's `app.dependency_overrides[get_db]` swaps the production database session for an ephemeral test database session.

---

## Running the Automated Test Suite

To run all backend tests, open a terminal in `backend/`:

```powershell
cd d:\Projects\CRM\backend
.\.venv\Scripts\Activate.ps1

# Run all test suites in the tests/ directory
python -m pytest tests

# Run with verbose output
python -m pytest -v tests

# Run a specific test suite
python -m pytest tests/test_comprehensive_e2e.py

# Run a specific test function
python -m pytest tests/test_reminders.py -k test_schedule_meeting_with_attendees
```

---

## Test Suites Inventory

The test suite in [`backend/tests/`](file:///d:/Projects/CRM/backend/tests/) contains **17 end-to-end integration and unit tests**:

| Test File | Test Cases | Areas Verified |
| :--- | :--- | :--- |
| **`test_comprehensive_e2e.py`** | 7 tests | - Authentication & activity logging (`login`, `logout`)<br>- Granular permission matrix workflow<br>- Admin group chat creation and messaging<br>- CSV import for leads with tags<br>- CSV import for contacts with auto-account creation<br>- CSV import with Windows `CP1252` encoding<br>- Meeting scheduling and reminder workflows |
| **`test_reminders.py`** | 4 tests | - Schedule meeting with attendee invitations<br>- Popup side notification when due time arrives (&le; 5 min)<br>- Daily tasks and deal call reminders<br>- Tenant isolation and colleague list boundaries |
| **`test_new_features.py`** | 4 tests | - User activity audit logging<br>- Permission assignment and enforcement<br>- Chat group messaging and member moderation<br>- CSV data ingestion |
| **`test_module4_5_products.py`** | 1 test | - Dynamic custom product field creation and values<br>- Product variant creation and SKU pricing |
| **`test_module3_templates.py`** | 1 test | - Industry template application to tenant company (`seed_org_product_template`) |
| **`test_tenant_isolation.py`** | Suites | - Ensures company A cannot query or mutate company B's leads, deals, or contacts |
| **`test_feature_control.py`** | Suites | - Ensures disabled features reject API calls with HTTP 403<br>- Ensures expired/suspended subscriptions are blocked |

---

## Database Fixture Architecture

Tests use an automated fixture pattern that guarantees test isolation without polluting the development database:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_suite.db"
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
    
    # Seed baseline test tenant and users here...
    
    yield
    
    # Teardown
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)
```

---

## Writing a New Test Case

When creating a new feature test:
1. Obtain an access token using the test login helper:
   ```python
   res = client.post("/api/auth/login", json={"email": "admin@acme.com", "password": "password"})
   token = res.json()["access_token"]
   headers = {"Authorization": f"Bearer {token}"}
   ```
2. Perform the API call using `client`:
   ```python
   response = client.post("/api/leads/", json={
       "title": "New Enterprise Lead",
       "contact_name": "Bob Vance",
       "contact_email": "bob@vance.com"
   }, headers=headers)
   assert response.status_code == 200
   assert response.json()["contact_name"] == "Bob Vance"
   ```
3. Verify tenant isolation by attempting to access the created record using a token from a different company, verifying `HTTP 404 Not Found`.
