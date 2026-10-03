# API: Opportunities & Pipeline Endpoints (`/api/opportunities`)

## 1. List Opportunities

Returns deals for the organization, with stage filter support and high default limit for Kanban views.

- **URL**: `/api/opportunities/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `stage` *(string, optional)*: Filter by `Prospecting`, `Qualification`, `Proposal`, `Negotiation`, `Closed Won`, `Closed Lost`.
  - `limit` *(integer, default: 2000)*
  - `skip` *(integer, default: 0)*
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "customer_id": 1,
      "customer_name": "Apex Financial Group",
      "title": "Enterprise CRM Suite Licensing",
      "value": "12000.00",
      "stage": "Proposal",
      "close_date": "2026-10-31",
      "created_at": "2026-09-28T10:00:00Z",
      "updated_at": "2026-09-28T10:00:00Z"
    }
  ]
  ```

---

## 2. Get Single Opportunity

- **URL**: `/api/opportunities/{opp_id}`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns `OpportunityResponse`.

---

## 3. Create Opportunity

Creates a deal and attaches line-item product associations if specified.

- **URL**: `/api/opportunities/`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "title": "Cloud Infrastructure Expansion",
    "value": 15600.00,
    "stage": "Prospecting",
    "close_date": "2026-11-15",
    "product_ids": [1, 2]
  }
  ```
- **Success Response (200 OK)**: Returns created `OpportunityResponse`.

---

## 4. Update Opportunity

Progresses deal stage, amends deal value, or updates expected close date.

- **URL**: `/api/opportunities/{opp_id}`
- **Method**: `PATCH`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "stage": "Closed Won",
    "value": 16000.00
  }
  ```
- **Success Response (200 OK)**: Returns updated `OpportunityResponse`.
