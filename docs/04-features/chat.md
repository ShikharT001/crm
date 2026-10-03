# Feature: Internal Team Chat & Group Channels

## Overview

The **Internal Team Chat** module provides private and group communication channels directly within the CRM. It allows sales reps, managers, and admins to coordinate on deals, discuss client accounts, and broadcast company updates without leaving the application.

---

## Key Capabilities

1. **Admin-Controlled Group Creation**:
   - Admins and SuperAdmins can create channels with custom names, descriptions, and emoji icons (e.g. 💬, 🚀, 📢, 💼).
   - Creators select member user IDs to immediately seed group membership.

2. **Membership Governance**:
   - Tracks members via `chat_group_members` with roles (`admin`, `member`).
   - Admins can add or remove team members at any time.

3. **Message Threading & History**:
   - Fast, paginated message retrieval with cursor support (`before_id`).
   - Supports text messages and system notification events.

4. **Security & Data Privacy**:
   - Access is restricted strictly to members of the specific chat group (plus company Admins).
   - Users can delete their own sent messages; Admins can delete any message to moderate channels.
   - Message deletions use soft-deletion (`is_deleted = True`) to preserve database audit integrity.

---

## Code & Router Mapping

- **Router**: [`backend/app/routers/chat.py`](file:///d:/Projects/CRM/backend/app/routers/chat.py)
  - `GET /api/chat/groups`: Lists chat groups the user belongs to, including member count, last message snippet, and last timestamp.
  - `POST /api/chat/groups`: Creates a new channel with initial members (Admin only).
  - `GET /api/chat/groups/{id}/messages`: Fetches chronological messages for a group.
  - `POST /api/chat/groups/{id}/messages`: Sends a new message to the group.
  - `POST /api/chat/groups/{id}/members`: Adds members to an existing group (Admin only).
  - `DELETE /api/chat/groups/{id}/members/{user_id}`: Removes a member from a group (Admin only).
  - `DELETE /api/chat/messages/{id}`: Soft-deletes a message.
- **Frontend Page**: [`frontend/src/app/chat/page.js`](file:///d:/Projects/CRM/frontend/src/app/chat/page.js)
  - Two-pane glassmorphic interface with channel list, active user roster, message feed with sender avatars and timestamps, auto-scroll to latest message, and group creation modal.
