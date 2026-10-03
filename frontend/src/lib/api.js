const rawEnvUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Sanitize against outdated 8001 port setting
const API_BASE_URL = rawEnvUrl.includes('8001') ? rawEnvUrl.replace('8001', '8000') : rawEnvUrl;

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('crm_jwt_token');
}

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('crm_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function fetchAPI(endpoint, options = {}) {
  let url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let res;
  try {
    res = await fetch(url, config);
  } catch (netErr) {
    // If connection failed (e.g. localhost IPv6 resolution or port issue), try 127.0.0.1:8000
    if (url.includes('localhost:8000')) {
      const fallbackUrl = url.replace('localhost:8000', '127.0.0.1:8000');
      try {
        res = await fetch(fallbackUrl, config);
      } catch (fallbackErr) {
        throw new Error(`Unable to connect to CRM backend at ${url}. Please ensure the server is running on port 8000.`);
      }
    } else {
      throw new Error(`Unable to connect to CRM backend at ${url}. Please ensure the server is running on port 8000.`);
    }
  }

  if (res.status === 204) return null; // No content

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      authHelpers.clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm-auth-expired'));
      }
    }

    let errorMsg = `API request failed: ${res.status}`;
    if (typeof data.detail === 'string') {
      errorMsg = data.detail;
    } else if (Array.isArray(data.detail)) {
      // Pydantic validation errors
      errorMsg = data.detail.map(d => {
        const field = d.loc ? d.loc[d.loc.length - 1] : 'field';
        return `${field}: ${d.msg}`;
      }).join(', ');
    } else if (data.message) {
      errorMsg = data.message;
    }
    throw new Error(errorMsg);
  }

  return data;
}

// ─── File upload fetch (no Content-Type header - browser sets multipart) ──────

async function fetchUpload(endpoint, formData) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Upload failed: ${res.status}`);
  return data;
}

// ─── Public API client ────────────────────────────────────────────────────────

export const crmAPI = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => fetchAPI('/api/auth/logout', { method: 'POST' }),

  getMe: () => fetchAPI('/api/auth/me'),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.role) qs.set('role', params.role);
    if (params.is_active !== undefined) qs.set('is_active', params.is_active);
    const query = qs.toString();
    return fetchAPI(`/api/users/${query ? `?${query}` : ''}`);
  },
  getUser: (id) => fetchAPI(`/api/users/${id}`),
  createUser: (data) =>
    fetchAPI('/api/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    fetchAPI(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) =>
    fetchAPI(`/api/users/${id}`, { method: 'DELETE' }),
  toggleUserActive: (id) =>
    fetchAPI(`/api/users/${id}/toggle-active`, { method: 'POST' }),
  getUsersByCompany: (companyId) =>
    fetchAPI(`/api/users/company/${companyId}`),

  // ── Permissions ───────────────────────────────────────────────────────────
  getAvailablePermissions: () => fetchAPI('/api/permissions/available'),
  getMyPermissions: () => fetchAPI('/api/permissions/me'),
  getUserPermissions: (userId) => fetchAPI(`/api/permissions/user/${userId}`),
  setUserPermissions: (userId, permissions) =>
    fetchAPI(`/api/permissions/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  getAllUsersPermissions: () => fetchAPI('/api/permissions/all-users'),

  // ── Activity Logs ─────────────────────────────────────────────────────────
  getActivityLogs: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.user_id) qs.set('user_id', params.user_id);
    if (params.action) qs.set('action', params.action);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return fetchAPI(`/api/activity/logs${query ? `?${query}` : ''}`);
  },
  getOnlineUsers: () => fetchAPI('/api/activity/online-users'),

  // ── Chat ──────────────────────────────────────────────────────────────────
  getChatGroups: () => fetchAPI('/api/chat/groups'),
  createChatGroup: (data) =>
    fetchAPI('/api/chat/groups', { method: 'POST', body: JSON.stringify(data) }),
  getChatGroup: (id) => fetchAPI(`/api/chat/groups/${id}`),
  updateChatGroup: (id, data) =>
    fetchAPI(`/api/chat/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteChatGroup: (id) =>
    fetchAPI(`/api/chat/groups/${id}`, { method: 'DELETE' }),
  addChatMembers: (groupId, userIds) =>
    fetchAPI(`/api/chat/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    }),
  removeChatMember: (groupId, userId) =>
    fetchAPI(`/api/chat/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  getChatMessages: (groupId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.before_id) qs.set('before_id', params.before_id);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return fetchAPI(`/api/chat/groups/${groupId}/messages${query ? `?${query}` : ''}`);
  },
  sendChatMessage: (groupId, content) =>
    fetchAPI(`/api/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  deleteChatMessage: (messageId) =>
    fetchAPI(`/api/chat/messages/${messageId}`, { method: 'DELETE' }),

  // ── CSV Imports ───────────────────────────────────────────────────────────
  importLeadsCSV: (file, options = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (options.default_status) fd.append('default_status', options.default_status);
    if (options.category_tag) fd.append('category_tag', options.category_tag);
    if (options.assigned_user_id) fd.append('assigned_user_id', options.assigned_user_id);
    if (options.default_company_name) fd.append('default_company_name', options.default_company_name);
    return fetchUpload('/api/imports/leads', fd);
  },
  importContactsCSV: (file, options = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (options.assignment_mode) fd.append('assignment_mode', options.assignment_mode);
    if (options.default_customer_id) fd.append('default_customer_id', options.default_customer_id);
    if (options.default_customer_name) fd.append('default_customer_name', options.default_customer_name);
    if (options.default_industry) fd.append('default_industry', options.default_industry);
    if (options.category_tag) fd.append('category_tag', options.category_tag);
    if (options.default_position) fd.append('default_position', options.default_position);
    return fetchUpload('/api/imports/contacts', fd);
  },
  getImportHistory: () => fetchAPI('/api/imports/history'),
  getImportTemplate: (type) =>
    `${API_BASE_URL}/api/imports/template/${type}`,

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardStats: () => fetchAPI('/api/dashboard/stats'),

  // ── Leads ─────────────────────────────────────────────────────────────────
  getLeads: (status) =>
    fetchAPI(`/api/leads/${status ? `?status=${status}` : ''}`),
  getLead: (id) => fetchAPI(`/api/leads/${id}`),
  createLead: (data) =>
    fetchAPI('/api/leads/', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id, data) =>
    fetchAPI(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  convertLead: (id) =>
    fetchAPI(`/api/leads/${id}/convert`, { method: 'POST' }),

  // ── Customers & Contacts ──────────────────────────────────────────────────
  getCustomers: () => fetchAPI('/api/customers/'),
  getCustomer: (id) => fetchAPI(`/api/customers/${id}`),
  createCustomer: (data) =>
    fetchAPI('/api/customers/', { method: 'POST', body: JSON.stringify(data) }),
  createCustomerContact: (customerId, data) =>
    fetchAPI(`/api/customers/${customerId}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
  getAllContacts: () => fetchAPI('/api/contacts/'),

  // ── Opportunities ─────────────────────────────────────────────────────────
  getOpportunities: (params = {}) => {
    if (typeof params === 'string' && params) {
      return fetchAPI(`/api/opportunities/?stage=${encodeURIComponent(params)}&limit=2000`);
    } else if (typeof params === 'object' && params !== null) {
      const sp = new URLSearchParams();
      if (params.stage) sp.append('stage', params.stage);
      sp.append('limit', params.limit || '2000');
      if (params.skip) sp.append('skip', params.skip);
      return fetchAPI(`/api/opportunities/?${sp.toString()}`);
    }
    return fetchAPI('/api/opportunities/?limit=2000');
  },
  getOpportunity: (id) => fetchAPI(`/api/opportunities/${id}`),
  createOpportunity: (data) =>
    fetchAPI('/api/opportunities/', { method: 'POST', body: JSON.stringify(data) }),
  updateOpportunity: (id, data) =>
    fetchAPI(`/api/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Dynamic Products Engine ───────────────────────────────────────────────
  getProducts: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.category_id) qs.set('category_id', params.category_id);
    if (params.search) qs.set('search', params.search);
    if (params.product_type) qs.set('product_type', params.product_type);
    if (params.status) qs.set('status', params.status);
    const query = qs.toString();
    return fetchAPI(`/api/products/${query ? `?${query}` : ''}`);
  },
  getProduct: (id) => fetchAPI(`/api/products/${id}`),
  createProduct: (data) =>
    fetchAPI('/api/products/', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    fetchAPI(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) =>
    fetchAPI(`/api/products/${id}`, { method: 'DELETE' }),

  // ── Tenant Product Fields & Categories ────────────────────────────────────
  getProductFields: () => fetchAPI('/api/products/fields/'),
  createProductField: (data) =>
    fetchAPI('/api/products/fields/', { method: 'POST', body: JSON.stringify(data) }),
  updateProductField: (id, data) =>
    fetchAPI(`/api/products/fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProductField: (id) =>
    fetchAPI(`/api/products/fields/${id}`, { method: 'DELETE' }),

  getProductCategories: () => fetchAPI('/api/products/categories/'),
  createProductCategory: (data) =>
    fetchAPI('/api/products/categories/', { method: 'POST', body: JSON.stringify(data) }),
  updateProductCategory: (id, data) =>
    fetchAPI(`/api/products/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProductCategory: (id) =>
    fetchAPI(`/api/products/categories/${id}`, { method: 'DELETE' }),

  // ── Super Admin & Organizations ───────────────────────────────────────────
  getOrganizations: () => fetchAPI('/api/superadmin/organizations/'),
  getOrganization: (id) => fetchAPI(`/api/superadmin/organizations/${id}`),
  createOrganization: (data) =>
    fetchAPI('/api/superadmin/organizations/', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id, data) =>
    fetchAPI(`/api/superadmin/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOrganization: (id) =>
    fetchAPI(`/api/superadmin/organizations/${id}`, { method: 'DELETE' }),
  getPlans: () => fetchAPI('/api/superadmin/plans/'),
  getFeatures: () => fetchAPI('/api/superadmin/features/'),

  // ── Industry Templates ────────────────────────────────────────────────────
  getIndustryTemplates: () => fetchAPI('/api/superadmin/templates/'),
  getIndustryTemplate: (id) => fetchAPI(`/api/superadmin/templates/${id}`),
  applyIndustryTemplate: (templateId, orgId, overwrite = false) =>
    fetchAPI(`/api/superadmin/templates/${templateId}/apply/${orgId}?overwrite=${overwrite}`, { method: 'POST' }),

  // ── Reminders & Notifications ───────────────────────────────────────────
  getReminders: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.status) qs.set('status', params.status);
    if (params.scope) qs.set('scope', params.scope);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return fetchAPI(`/api/reminders/${query ? `?${query}` : ''}`);
  },
  getDueReminders: () => fetchAPI('/api/reminders/due'),
  getTodayReminders: () => fetchAPI('/api/reminders/today'),
  getOrganizationColleagues: () => fetchAPI('/api/reminders/organization-users'),
  createReminder: (data) =>
    fetchAPI('/api/reminders/', { method: 'POST', body: JSON.stringify(data) }),
  updateReminder: (id, data) =>
    fetchAPI(`/api/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReminder: (id) =>
    fetchAPI(`/api/reminders/${id}`, { method: 'DELETE' }),
  dismissReminderPopup: (id) =>
    fetchAPI(`/api/reminders/${id}/dismiss`, { method: 'POST' }),
  completeReminder: (id) =>
    fetchAPI(`/api/reminders/${id}/complete`, { method: 'POST' }),
};

// ─── Auth state helpers ───────────────────────────────────────────────────────

export const authHelpers = {
  saveSession: (token, user) => {
    localStorage.setItem('crm_jwt_token', token);
    localStorage.setItem('crm_current_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('crm_jwt_token');
    localStorage.removeItem('crm_current_user');
    localStorage.removeItem('crm_auth_token');
  },
  isLoggedIn: () => !!getToken(),
  getToken: getToken,
  getCurrentUser: getStoredUser,
};
