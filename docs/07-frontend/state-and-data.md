# Frontend: State Management & Data Fetching

## Overview

The CRM uses a lightweight, dependency-free state architecture. Rather than relying on heavy external state managers (e.g. Redux or MobX), the frontend leverages **React Component State (`useState`, `useEffect`)**, **Persistent Browser Storage (`localStorage`)**, a **Centralized API Client Layer (`src/lib/api.js`)**, and **Custom Window Events**.

---

## 1. Authentication State & Token Lifecycle

Authentication state is maintained in `localStorage` via the `authHelpers` utility:

```javascript
// src/lib/api.js
export const authHelpers = {
  saveSession: (token, user) => {
    localStorage.setItem('crm_jwt_token', token);
    localStorage.setItem('crm_current_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('crm_jwt_token');
    localStorage.removeItem('crm_current_user');
  },
  isLoggedIn: () => !!localStorage.getItem('crm_jwt_token'),
  getToken: () => localStorage.getItem('crm_jwt_token'),
  getCurrentUser: () => JSON.parse(localStorage.getItem('crm_current_user') || 'null'),
};
```

### Global Session Expiry Interception:
If any backend API request returns `HTTP 401 Unauthorized`, `src/lib/api.js` automatically clears local credentials and dispatches a custom browser event:

```javascript
if (res.status === 401) {
  authHelpers.clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-auth-expired'));
  }
}
```

The root layout in `src/app/layout.js` listens for `crm-auth-expired`, clears the React state, and immediately renders the login screen.

---

## 2. Universal API Client (`src/lib/api.js`)

All network communication flows through the centralized `fetchAPI` wrapper:

### Automatic Bearer Token Injection:
```javascript
const defaultHeaders = {
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};
```

### Automatic Localhost IP Fallback:
On Windows machines, DNS queries for `localhost` may resolve to IPv6 (`::1`), failing if the backend is listening strictly on IPv4 (`127.0.0.1`). The API client intercepts connection failures and seamlessly re-attempts the request:

```javascript
try {
  res = await fetch(url, config);
} catch (netErr) {
  if (url.includes('localhost:8000')) {
    const fallbackUrl = url.replace('localhost:8000', '127.0.0.1:8000');
    res = await fetch(fallbackUrl, config);
  }
}
```

### Multipart File Uploads:
For CSV data uploads, `fetchUpload` passes `FormData` directly to `fetch` without setting the `Content-Type` header, enabling the browser to automatically insert the required boundary string.

---

## 3. Real-Time Polling Engines

### 1. Notification & Due Reminders Poller
Located in [`src/app/components/NotificationReminderCenter.js`](file:///d:/Projects/CRM/frontend/src/app/components/NotificationReminderCenter.js):
- Polls `crmAPI.getDueReminders()` every **30 seconds**.
- Checks if incoming reminder IDs have already been dismissed.
- If a new due reminder is received, plays an audio chime via the in-browser **Web Audio API** and renders a non-intrusive side popup toast.

### 2. Team Chat Live Feed Poller
Located in [`src/app/chat/page.js`](file:///d:/Projects/CRM/frontend/src/app/chat/page.js):
- When an active chat group is selected, polls `crmAPI.getChatMessages(activeGroupId)` every **3 seconds**.
- Appends new messages and updates the unread indicator without refreshing the entire screen.
