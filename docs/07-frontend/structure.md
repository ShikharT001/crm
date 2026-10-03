# Frontend: Architecture & File Structure

The CRM frontend is built using **Next.js 14 App Router** with **React 18** and client-side rendering. It delivers a modern, dark-mode glassmorphic user interface styled with custom CSS variables and **Lucide React** icons.

---

## Directory Layout

```
frontend/
├── package.json               # Dependencies (Next 14, React 18, Lucide React)
├── next.config.js             # Next.js build configuration
├── jsconfig.json              # Path aliases (@/* -> ./src/*)
├── .env.local                 # Frontend environment variables
└── src/
    ├── lib/
    │   └── api.js             # Universal API client, token manager, and network fallback
    └── app/
        ├── layout.js          # Root layout shell (Login screen, Sidebar, Header, Polling)
        ├── globals.css        # Comprehensive design system, glassmorphism, animations
        ├── page.js            # Executive Dashboard & KPI intelligence page
        ├── components/
        │   └── NotificationReminderCenter.js  # Audio alert synthesizer, bell agenda, toasts
        ├── leads/
        │   └── page.js        # Lead management table, create lead modal, 1-click convert
        ├── opportunities/
        │   └── page.js        # 6-stage sales pipeline Kanban board & deal editor
        ├── customers/
        │   └── page.js        # Customer accounts directory with primary contact badges
        ├── contacts/
        │   └── page.js        # Comprehensive contacts table with joined deal history
        ├── products/
        │   └── page.js        # Dynamic product catalog, custom fields, and variant editor
        ├── organizations/
        │   └── page.js        # Super Admin multi-tenant organization manager
        ├── users/
        │   └── page.js        # Team member management & Granular Permissions Matrix
        ├── activity/
        │   └── page.js        # Audit log viewer & 24h online active user monitor
        └── chat/
            └── page.js        # Internal team channels & live messaging feed
```

---

## Root Layout Shell (`layout.js`)

[`src/app/layout.js`](file:///d:/Projects/CRM/frontend/src/app/layout.js) controls top-level authentication state and application navigation:
1. **Session Gate**: Checks `localStorage` on initial mount. If unauthenticated, displays the interactive `LoginScreen`.
2. **Role-Aware Sidebar**: Renders navigation links dynamically based on user role:
   - **Super Admin**: Dashboard, Organizations, Activity Log.
   - **Admin & Manager**: Dashboard, Leads, Pipeline, Customers, Contacts, Products, Team Chat, Users & Roles, Activity Log.
   - **Employee**: Dashboard, Leads, Pipeline, Customers, Contacts, Products, Team Chat.
3. **Top Navigation Header**: Displays the organization name badge, **Notification & Reminder Center** bell icon, current user profile badge, and Sign Out button.

---

## Design System & Styling (`globals.css`)

The UI is built with a custom **Glassmorphism Dark Theme** using pure CSS variables:
- **Color Palette**:
  - Background: `#0b0f19` (Deep Obsidian)
  - Surface Glass: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(16px)`
  - Border Accents: `rgba(255, 255, 255, 0.08)`
  - Primary Indigo: `#6366f1` (Buttons, active states, focus outlines)
  - Success Emerald: `#10b981` (Closed Won, Active, Converted)
  - Warning Amber: `#f59e0b` (High priority, Qualified, In Review)
  - Danger Rose: `#ef4444` (Closed Lost, Suspended, Errors)
- **Component Classes**:
  - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
  - `.kpi-grid`, `.kpi-card`, `.kpi-value`, `.kpi-subtext`
  - `.role-badge`, `.avatar-super_admin`, `.avatar-admin`, `.avatar-manager`, `.avatar-employee`
  - `.form-input`, `.form-select`, `.modal-overlay`, `.modal-card`
