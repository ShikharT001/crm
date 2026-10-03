# Feature: Bulk CSV Data Import Engine

## Overview

The **Bulk CSV Data Import Engine** enables sales teams to migrate and onboard contact and lead lists into the CRM. It includes automatic character encoding detection (solving common Windows Excel formatting problems), schema normalization, configurable customer assignment modes, and complete job history audit tracking.

---

## Key Capabilities

1. **Multi-Encoding Auto-Detection**:
   - Files exported from Microsoft Excel on Windows often use `CP1252` (Windows-1252) or UTF-8 with Byte Order Marks (BOM).
   - The engine automatically tests `utf-8-sig`, `utf-8`, `cp1252`, `iso-8859-1`, `latin1`, and `utf-16` encodings, falling back to character substitution rather than failing with an error.

2. **Header Normalization**:
   - Strips leading BOM marks (`\ufeff`), trims whitespace, and converts all headers to lowercase.
   - Recognizes common column aliases (e.g. `title` or `lead_name`, `name` or `contact_name`, `email` or `contact_email`, `value` or `amount`).

3. **Lead Import Workflows**:
   - Parses values with currency symbols (`$`, `,`).
   - Normalizes lead status (`New`, `Contacted`, `Qualified`, `Converted`, `Lost`).
   - Injects optional category tags into lead notes (e.g. `[Category: Q4-Webinar]`).

4. **Contact Import Assignment Modes**:
   - **`auto`**: Inspects the CSV for `customer_name` or `company_name`. If a customer exists in the company, attaches the contact; otherwise creates the customer account automatically.
   - **`existing`**: Forces all imported contacts to link to an existing selected customer account ID.
   - **`new`**: Creates a single new customer account and attaches all rows in the file to it.
   - **Deduplication**: Automatically skips rows if the email is already registered under that specific customer.

5. **Import Job Audit History (`import_jobs`)**:
   - Tracks `total_rows`, `imported_rows`, `skipped_rows`, `error_rows`, and status (`completed`, `partial`, `failed`).
   - Provides downloadable CSV template files.

---

## Code & Router Mapping

- **Router**: [`backend/app/routers/imports.py`](file:///d:/Projects/CRM/backend/app/routers/imports.py)
  - `GET /api/imports/template/leads`: Returns sample CSV header for leads.
  - `GET /api/imports/template/contacts`: Returns sample CSV header for contacts.
  - `GET /api/imports/history`: Returns historical import jobs for the organization.
  - `POST /api/imports/leads`: Uploads and parses leads CSV file with options.
  - `POST /api/imports/contacts`: Uploads and parses contacts CSV file with assignment mode.
- **Frontend Integration**:
  - Modal import wizard embedded directly into [`frontend/src/app/leads/page.js`](file:///d:/Projects/CRM/frontend/src/app/leads/page.js) and [`frontend/src/app/contacts/page.js`](file:///d:/Projects/CRM/frontend/src/app/contacts/page.js).
