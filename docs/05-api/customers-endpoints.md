# API: Customers Endpoints (`/api/customers`)

Access requires the `contacts` feature to be enabled for the organization.

---

## 1. List Customers

Returns customer accounts including associated contacts and deals.

- **URL**: `/api/customers/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Apex Financial Group",
      "company_id": 1,
      "lead_id": 3,
      "industry": "Finance",
      "status": "Active",
      "created_at": "2026-09-28T10:00:00Z",
      "contacts": [
        {
          "id": 1,
          "customer_id": 1,
          "name": "Robert Vance",
          "email": "rvance@apexfin.com",
          "phone": "+1 555-999-1122",
          "position": "VP Operations",
          "is_primary": true
        }
      ],
      "opportunities": [
        {
          "id": 1,
          "title": "Deal for Apex Financial Group",
          "value": "24400.00",
          "stage": "Proposal"
        }
      ]
    }
  ]
  ```

---

## 2. Get Single Customer

- **URL**: `/api/customers/{customer_id}`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns `CustomerResponse`.

---

## 3. Create Customer

- **URL**: `/api/customers/`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "name": "Pacific Logistics LLC",
    "industry": "Transportation",
    "status": "Active"
  }
  ```
- **Success Response (200 OK)**: Returns created `CustomerResponse`.

---

## 4. Add Contact to Customer

Appends a contact person directly to an existing customer account.

- **URL**: `/api/customers/{customer_id}/contacts`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "name": "Alice Morgan",
    "email": "amorgan@pacificlog.com",
    "phone": "+1 555-4321",
    "position": "Director of Procurement",
    "is_primary": false
  }
  ```
- **Success Response (200 OK)**: Returns created `ContactResponse`.
