# API: Contacts Endpoints (`/api/contacts`)

Access requires the `contacts` feature to be enabled for the organization.

---

## 1. List All Contacts with Full Details

Returns all customer contacts enriched with joined parent company details and associated deal summaries.

- **URL**: `/api/contacts/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Robert Vance",
      "email": "rvance@apexfin.com",
      "phone": "+1 (555) 999-1122",
      "position": "VP Operations",
      "is_primary": true,
      "customer_id": 1,
      "customer_name": "Apex Financial Group",
      "company": {
        "id": 1,
        "name": "Apex Financial Group",
        "domain": "apexfin.com",
        "industry": "Finance"
      },
      "deals": [
        {
          "id": 1,
          "title": "Deal for Apex Financial Group",
          "value": 24400.0,
          "stage": "Proposal",
          "close_date": null
        }
      ]
    }
  ]
  ```
