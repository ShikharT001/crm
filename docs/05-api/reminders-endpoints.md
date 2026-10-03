# API: Reminders & Notifications Endpoints (`/api/reminders`)

## 1. List Reminders

Returns meetings, daily tasks, and reminders for the organization with scope filtering.

- **URL**: `/api/reminders/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `type` *(string, optional)*: `meeting`, `task`, `deal_call`, `reminder`.
  - `status` *(string, optional)*: `scheduled`, `completed`, `cancelled`, `all`.
  - `scope` *(string, optional)*: `all`, `today`, `upcoming`, `past`, `my_tasks`.
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "company_id": 1,
      "creator_id": 2,
      "creator_name": "Sam Admin",
      "creator_role": "admin",
      "title": "Quarterly Sales Pipeline Review",
      "description": "Review Q4 enterprise deals and forecast closing dates.",
      "reminder_type": "meeting",
      "priority": "high",
      "status": "scheduled",
      "scheduled_at": "2026-09-30T14:00:00Z",
      "end_at": "2026-09-30T15:00:00Z",
      "meeting_link": "https://meet.google.com/xyz-qwer-asd",
      "location": "Boardroom A & Google Meet",
      "related_entity_type": "opportunity",
      "related_entity_id": 1,
      "related_entity_title": "Enterprise CRM Suite Licensing",
      "attendees": [
        {
          "id": 1,
          "user_id": 2,
          "user_name": "Sam Admin",
          "status": "accepted",
          "is_read": true,
          "is_dismissed": false
        },
        {
          "id": 2,
          "user_id": 4,
          "user_name": "Sam Employee",
          "status": "invited",
          "is_read": false,
          "is_dismissed": false
        }
      ],
      "is_creator": true,
      "is_dismissed_by_me": false,
      "is_due": false
    }
  ]
  ```

---

## 2. Get Due Reminders (Polling Endpoint)

Used by the frontend notification polling engine (every 30s) to retrieve meetings or tasks occurring within the next 10 minutes that have not been dismissed by the current user.

- **URL**: `/api/reminders/due`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns array of due `ReminderResponse` objects.

---

## 3. Get Today's Agenda

- **URL**: `/api/reminders/today`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns meetings and tasks for the current server UTC calendar day.

---

## 4. Get Organization Colleagues

Returns active colleagues in the user's company for attendee selector dropdowns.

- **URL**: `/api/reminders/organization-users`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    { "id": 2, "name": "Sam Admin", "email": "admin@saminc.local", "role": "admin" },
    { "id": 3, "name": "Sam Manager", "email": "manager@saminc.local", "role": "manager" },
    { "id": 4, "name": "Sam Employee", "email": "emp1@saminc.local", "role": "employee" }
  ]
  ```

---

## 5. Create Meeting / Task / Reminder

- **URL**: `/api/reminders/`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "title": "Client Discovery Call",
    "reminder_type": "meeting",
    "priority": "medium",
    "scheduled_at": "2026-09-30T10:00:00Z",
    "meeting_link": "https://meet.google.com/abc-def-ghi",
    "attendee_ids": [3, 4]
  }
  ```
- **Success Response (201 Created)**: Returns created `ReminderResponse`.

---

## 6. Dismiss Reminder Popup Toast

Marks a reminder popup as dismissed for the current user, stopping active side alerts.

- **URL**: `/api/reminders/{id}/dismiss`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: `{"message": "Reminder popup dismissed", "reminder_id": 1}`

---

## 7. Mark as Completed

- **URL**: `/api/reminders/{id}/complete`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns updated `ReminderResponse` with `status: "completed"`.
