# Frontend: Page Directory & API Integration

This guide details every page in the CRM frontend, its UI responsibilities, user interactions, and the backend API endpoints it connects to.

---

## Page Mapping Matrix

| Route | Page File | Primary Purpose | API Endpoints Invoked |
| :--- | :--- | :--- | :--- |
| **`/`** | [`app/page.js`](file:///d:/Projects/CRM/frontend/src/app/page.js) | Executive Dashboard & KPI Intelligence | `GET /api/dashboard/stats`<br>`GET /api/leads/`<br>`GET /api/opportunities/`<br>`GET /api/superadmin/organizations/`<br>`GET /api/superadmin/plans/` |
| **`/leads`** | [`app/leads/page.js`](file:///d:/Projects/CRM/frontend/src/app/leads/page.js) | Lead Management & 1-Click Conversion | `GET /api/leads/`<br>`POST /api/leads/`<br>`PATCH /api/leads/{id}`<br>`POST /api/leads/{id}/convert`<br>`POST /api/imports/leads` |
| **`/opportunities`**| [`app/opportunities/page.js`](file:///d:/Projects/CRM/frontend/src/app/opportunities/page.js)| 6-Stage Sales Pipeline Kanban Board | `GET /api/opportunities/`<br>`POST /api/opportunities/`<br>`PATCH /api/opportunities/{id}`<br>`GET /api/customers/`<br>`GET /api/products/`<br>`POST /api/reminders/` |
| **`/customers`** | [`app/customers/page.js`](file:///d:/Projects/CRM/frontend/src/app/customers/page.js) | Customer Accounts Directory | `GET /api/customers/`<br>`POST /api/customers/`<br>`POST /api/customers/{id}/contacts` |
| **`/contacts`** | [`app/contacts/page.js`](file:///d:/Projects/CRM/frontend/src/app/contacts/page.js) | Contacts Table & Joined Deal History | `GET /api/contacts/`<br>`POST /api/customers/`<br>`POST /api/imports/contacts` |
| **`/products`** | [`app/products/page.js`](file:///d:/Projects/CRM/frontend/src/app/products/page.js) | Dynamic Products, Variants & Categories | `GET/POST/PUT/DELETE /api/products/`<br>`GET/POST/PUT/DELETE /api/products/fields/`<br>`GET/POST/DELETE /api/products/categories/` |
| **`/organizations`**| [`app/organizations/page.js`](file:///d:/Projects/CRM/frontend/src/app/organizations/page.js)| Super Admin Tenant Organization Portal | `GET/POST/PATCH/DELETE /api/superadmin/organizations/`<br>`GET /api/superadmin/plans/`<br>`GET /api/superadmin/features/`<br>`GET/POST /api/superadmin/templates/` |
| **`/users`** | [`app/users/page.js`](file:///d:/Projects/CRM/frontend/src/app/users/page.js) | User Management & Permissions Matrix | `GET/POST/PATCH/DELETE /api/users/`<br>`POST /api/users/{id}/toggle-active`<br>`GET /api/permissions/available`<br>`GET/PUT /api/permissions/user/{id}`<br>`GET /api/permissions/all-users` |
| **`/activity`** | [`app/activity/page.js`](file:///d:/Projects/CRM/frontend/src/app/activity/page.js) | Audit Log & 24h Online Users Monitor | `GET /api/activity/logs`<br>`GET /api/activity/online-users` |
| **`/chat`** | [`app/chat/page.js`](file:///d:/Projects/CRM/frontend/src/app/chat/page.js) | Internal Team Chat & Channels | `GET/POST/PATCH/DELETE /api/chat/groups`<br>`GET/POST /api/chat/groups/{id}/messages`<br>`DELETE /api/chat/messages/{id}`<br>`POST/DELETE /api/chat/groups/{id}/members` |
| **Header Component**| [`app/components/NotificationReminderCenter.js`](file:///d:/Projects/CRM/frontend/src/app/components/NotificationReminderCenter.js)| Persistent Notification Bell, Agenda, Toasts | `GET /api/reminders/`<br>`GET /api/reminders/due`<br>`GET /api/reminders/today`<br>`GET /api/reminders/organization-users`<br>`POST /api/reminders/`<br>`PATCH /api/reminders/{id}`<br>`POST /api/reminders/{id}/dismiss`<br>`POST /api/reminders/{id}/complete` |

---

## In-Depth Page Details

### 1. Executive Dashboard (`/`)
- Renders KPI metric cards: Total Active Leads, Open Pipeline Value, Closed Won Revenue, Customer Account Count.
- For Super Admins: Displays total tenant companies, active subscriptions, and platform user counts.
- Displays Quick Links for fast navigation to Leads, Deals, and Customers.

### 2. Leads Management (`/leads`)
- Filter tabs: All, New, Contacted, Qualified, Converted, Lost.
- Search bar matching company name, contact name, and email.
- Modal dialog for adding new leads.
- Dedicated **Convert** button triggering automated customer account creation.
- CSV import modal with sample template download.

### 3. Sales Pipeline Kanban (`/opportunities`)
- 6 columns corresponding to sales stages.
- Each deal card displays deal title, value in USD, target close date, and customer name.
- 1-click stage advancement buttons on deal cards.
- **Schedule Call** button opening pre-filled reminder modal.
- Deal creation form with catalog product selector and auto-calculated total deal value.

### 4. Products & Dynamic Catalog (`/products`)
- Left sidebar category browser displaying parent-child tree.
- Custom field inspector rendering industry-specific attributes (e.g. Size, Fabric, Software Version).
- Product variant manager for adding sub-SKUs with independent pricing and inventory.
- Stock quantity badges indicating low or healthy inventory.

### 5. Notification & Reminder Center (Header Component)
- Bell icon with real-time numeric counter of unread/due items.
- Dropdown drawer showing today's agenda, upcoming meetings, and daily tasks.
- Non-blocking side popup toasts that alert users 5 minutes before scheduled appointments.
- Built-in Web Audio chime generator.
