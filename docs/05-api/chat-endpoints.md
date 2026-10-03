# API: Team Chat Endpoints (`/api/chat`)

## 1. List Chat Groups

Returns channels the user belongs to (or all company channels if Admin).

- **URL**: `/api/chat/groups`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "General Sales",
      "description": "General discussions and deal celebrations",
      "icon": "🚀",
      "created_by": 2,
      "creator_name": "Sam Admin",
      "member_count": 3,
      "last_message": "Awesome work on the Acme renewal!",
      "last_message_at": "2026-09-28T16:45:00Z"
    }
  ]
  ```

---

## 2. Create Chat Group

Creates a channel and invites initial members (Admin only).

- **URL**: `/api/chat/groups`
- **Method**: `POST`
- **Authentication**: Bearer Token (`admin` or `super_admin`)
- **Request Body**:
  ```json
  {
    "name": "Enterprise Deals War Room",
    "description": "Q4 priority enterprise accounts",
    "icon": "⚔️",
    "member_ids": [3, 4]
  }
  ```
- **Success Response (200 OK)**: Returns created channel details.

---

## 3. Get Messages in Group

Returns chronological messages with optional pagination cursor (`before_id`).

- **URL**: `/api/chat/groups/{group_id}/messages`
- **Method**: `GET`
- **Authentication**: Bearer Token (Must be group member or Admin)
- **Query Parameters**:
  - `before_id` *(integer, optional)*: Fetch messages prior to this ID.
  - `limit` *(integer, default: 50)*
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 12,
      "group_id": 1,
      "sender_id": 4,
      "sender_name": "Sam Employee",
      "sender_role": "employee",
      "content": "Just sent the revised contract over to legal.",
      "message_type": "text",
      "created_at": "2026-09-28T16:40:00Z"
    }
  ]
  ```

---

## 4. Send Message

- **URL**: `/api/chat/groups/{group_id}/messages`
- **Method**: `POST`
- **Authentication**: Bearer Token (Must be group member)
- **Request Body**:
  ```json
  {
    "content": "Contract signed! Marking deal as Closed Won."
  }
  ```
- **Success Response (200 OK)**: Returns committed message object.

---

## 5. Delete Message (Soft Delete)

- **URL**: `/api/chat/messages/{message_id}`
- **Method**: `DELETE`
- **Authentication**: Bearer Token (Sender or Admin)
- **Success Response (200 OK)**: `{"message": "Message deleted"}`
