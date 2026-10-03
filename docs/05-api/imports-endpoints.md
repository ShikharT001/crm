# API: CSV Data Imports Endpoints (`/api/imports`)

## 1. Download Lead CSV Template

Returns CSV header format for leads with Content-Type `text/plain`.

- **URL**: `/api/imports/template/leads`
- **Method**: `GET`
- **Authentication**: Public / None
- **Response**:
  ```csv
  title,contact_name,contact_email,phone,company_name,status,value,notes
  ```

---

## 2. Download Contact CSV Template

- **URL**: `/api/imports/template/contacts`
- **Method**: `GET`
- **Authentication**: Public / None
- **Response**:
  ```csv
  name,email,phone,position,customer_name
  ```

---

## 3. Import Leads via CSV

Parses and validates up to 5,000 lead rows per file with encoding auto-detection.

- **URL**: `/api/imports/leads`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file` *(file, required)*: The CSV file.
  - `default_status` *(string, optional)*: Default fallback status (e.g. "New").
  - `category_tag` *(string, optional)*: Injected into lead notes as `[Category: ...]`.
  - `assigned_user_id` *(integer, optional)*: Assigned salesperson.
  - `default_company_name` *(string, optional)*
- **Success Response (200 OK)**:
  ```json
  {
    "imported": 48,
    "skipped": 0,
    "errors": 2,
    "error_details": [
      { "row": 15, "field": "multiple", "reason": "Missing required fields (contact_name, contact_email)" }
    ],
    "job_id": 3,
    "total": 50
  }
  ```

---

## 4. Import Contacts via CSV

- **URL**: `/api/imports/contacts`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file` *(file, required)*: The CSV file.
  - `assignment_mode` *(string, default: "auto")*: `auto`, `existing`, or `new`.
  - `default_customer_id` *(integer, optional)*: Used when `assignment_mode="existing"`.
  - `default_customer_name` *(string, optional)*: Used when `assignment_mode="new"`.
  - `default_industry` *(string, optional)*
- **Success Response (200 OK)**: Returns import execution counts and `job_id`.

---

## 5. Import Job History

Returns the historical log of import operations executed in the company.

- **URL**: `/api/imports/history`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "import_type": "leads",
      "filename": "q3_leads_export.csv",
      "total_rows": 250,
      "imported_rows": 248,
      "skipped_rows": 0,
      "error_rows": 2,
      "status": "partial",
      "created_at": "2026-09-28T09:15:00Z"
    }
  ]
  ```
