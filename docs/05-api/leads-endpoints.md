# API: Leads Endpoints (`/api/leads`)

Access requires the `leads` feature to be enabled for the organization.

---

## 1. List Leads

Returns tenant-scoped leads with optional status filtering.

- **URL**: `/api/leads/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `status` *(string, optional)*: Filter by `New`, `Contacted`, `Qualified`, `Converted`, `Lost`.
  - `skip` *(integer, default: 0)*
  - `limit` *(integer, default: 100)*
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "title": "CRM Upgrade Inquiry",
      "company_id": 1,
      "company_name": "Starlight Media",
      "contact_name": "David Miller",
      "contact_email": "dmiller@starlight.com",
      "phone": "+1 (555) 234-5678",
      "status": "New",
      "value": "15000.00",
      "assigned_salesperson_id": 1,
      "notes": "Interested in switching from legacy CRM solution.",
      "created_at": "2026-09-28T14:30:00Z",
      "updated_at": "2026-09-28T14:30:00Z"
    }
  ]
  ```

---

## 2. Get Single Lead

- **URL**: `/api/leads/{lead_id}`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns `LeadResponse`.

---

## 3. Create Lead

- **URL**: `/api/leads/`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "title": "Cloud Migration RFP",
    "company_name": "Horizon Dynamics",
    "contact_name": "Sarah Connor",
    "contact_email": "sconnor@horizondyn.com",
    "phone": "+1 555-0192",
    "status": "New",
    "value": 24000.00,
    "notes": "Wants security audit before proposal."
  }
  ```
- **Success Response (200 OK)**: Returns created `LeadResponse`.

---

## 4. Update Lead

- **URL**: `/api/leads/{lead_id}`
- **Method**: `PATCH`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "status": "Qualified",
    "value": 28000.00
  }
  ```
- **Success Response (200 OK)**: Returns updated `LeadResponse`.

---

## 5. Convert Lead to Customer

Executes atomic conversion: marks lead as `Converted`, creates `Customer` record, creates primary `Contact`, and optionally creates initial `Opportunity`.

- **URL**: `/api/leads/{lead_id}/convert`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns created `CustomerResponse` including contacts and initial deal.
- **Error Responses**:
  - `400 Bad Request`: `"Lead not found or already converted"`
