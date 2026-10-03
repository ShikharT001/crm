'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Power, PowerOff, X,
  ShieldCheck, Users, UserCheck, UserX, Eye, EyeOff, AlertCircle, CheckCircle,
  Key, Shield, Check, Activity, Clock, LogIn, LogOut, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import { crmAPI, authHelpers } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

const ROLE_ORDER = ['super_admin', 'admin', 'manager', 'employee'];

const ROLE_COLORS = {
  super_admin: 'role-super_admin',
  admin: 'role-admin',
  manager: 'role-manager',
  employee: 'role-employee',
};

const ROLE_ICONS_MAP = {
  super_admin: '👑',
  admin: '🏢',
  manager: '🎯',
  employee: '👤',
};

// Roles that can be created by each actor role
const CREATABLE_ROLES = {
  super_admin: ['super_admin', 'admin', 'manager', 'employee'],
  admin: ['manager', 'employee'],
  manager: ['employee'],
  employee: [],
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span className={`role-badge ${ROLE_COLORS[role] || ''}`}>
      {ROLE_ICONS_MAP[role]} {ROLE_LABELS[role] || role}
    </span>
  );
}

// ─── User Avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ name, role, size = 38 }) {
  return (
    <div
      className={`user-avatar avatar-${role}`}
      style={{ width: size, height: size, fontSize: size * 0.26 + 'px' }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────

function StatusDot({ active }) {
  return (
    <span className={`status-dot ${active ? 'status-active' : 'status-inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── User Form Modal ─────────────────────────────────────────────────────────

function UserModal({ mode, user, currentUser, allUsers, onClose, onSave }) {
  const isEdit = mode === 'edit';
  const allowedRoles = CREATABLE_ROLES[currentUser?.role] || [];

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || allowedRoles[0] || 'employee',
    company_id: user?.company_id || currentUser?.company_id || null,
    manager_id: user?.manager_id || null,
    is_active: user?.is_active !== undefined ? user.is_active : true,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Eligible managers: users with manager role in same company
  const managerOptions = allUsers.filter(
    u => u.role === 'manager' && u.company_id === (form.company_id || currentUser?.company_id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.manager_id) delete payload.manager_id;
      if (!payload.company_id) delete payload.company_id;
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        await onSave('update', user.id, payload);
      } else {
        await onSave('create', null, payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {isEdit ? 'Edit User' : 'Add New User'}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isEdit ? `Editing ${user?.name}` : 'Create a new team member account'}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {/* Name */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                required
                placeholder="John Doe"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="john@company.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                disabled={isEdit}
                style={isEdit ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                required
                value={form.role}
                onChange={e => set('role', e.target.value)}
                disabled={isEdit && currentUser?.role !== 'super_admin'}
              >
                {(isEdit
                  ? ROLE_ORDER.filter(r => allowedRoles.includes(r) || r === user?.role)
                  : allowedRoles
                ).filter(r => currentUser?.role === 'super_admin' || r !== 'super_admin').map(r => (
                  <option key={r} value={r}>
                    {ROLE_ICONS_MAP[r]} {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  required={!isEdit}
                  placeholder={isEdit ? 'Leave blank to keep current...' : 'Min 6 characters'}
                  minLength={isEdit ? 0 : 6}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center'
                }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Manager (only for employee role) */}
            {form.role === 'employee' && managerOptions.length > 0 && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Assigned Manager</label>
                <select
                  className="form-select"
                  value={form.manager_id || ''}
                  onChange={e => set('manager_id', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">— No manager assigned —</option>
                  {managerOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Active toggle (edit only) */}
            {isEdit && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Account Status</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{
                    width: 44, height: 24, borderRadius: '12px',
                    background: form.is_active ? 'var(--color-success)' : 'var(--border-color)',
                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
                  }} onClick={() => set('is_active', !form.is_active)}>
                    <div style={{
                      position: 'absolute', top: 2, left: form.is_active ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: form.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: '16px' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ user, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="confirm-dialog">
          <div className="danger-icon"><Trash2 size={24} /></div>
          <h3>Delete User?</h3>
          <p>
            Are you sure you want to permanently delete{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>?{' '}
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn"
              style={{ background: 'var(--color-danger)', color: 'white' }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Permissions Modal (Admin control for EMP and Manager) ───────────────────

function PermissionsModal({ user, onClose, onSaved }) {
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [avail, userPerms] = await Promise.all([
          crmAPI.getAvailablePermissions(),
          crmAPI.getUserPermissions(user.id),
        ]);
        setAvailable(avail || []);
        setSelected(userPerms || []);
      } catch (err) {
        setError(err.message || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (catKeys) => {
    const allSelected = catKeys.every(k => selected.includes(k));
    if (allSelected) {
      setSelected(prev => prev.filter(k => !catKeys.includes(k)));
    } else {
      setSelected(prev => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const applyPreset = (preset) => {
    if (preset === 'none') {
      setSelected([]);
    } else if (preset === 'all') {
      setSelected(available.map(p => p.key));
    } else if (preset === 'readonly') {
      setSelected(available.filter(p => p.key.endsWith('.view')).map(p => p.key));
    } else if (preset === 'sales') {
      const keys = ['leads.view', 'leads.create', 'leads.edit', 'leads.convert', 'contacts.view', 'contacts.create', 'customers.view', 'opportunities.view', 'opportunities.create', 'opportunities.edit', 'products.view'];
      setSelected(keys.filter(k => available.some(a => a.key === k)));
    } else if (preset === 'manager') {
      const keys = available.filter(p => !p.key.includes('delete') || p.key === 'leads.delete').map(p => p.key);
      setSelected(keys);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await crmAPI.setUserPermissions(user.id, selected);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm-permissions-updated'));
      }
      onSaved(user.name);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Group by category
  const categories = available.reduce((acc, p) => {
    const cat = p.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--accent-primary)20', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Custom Permissions: {user.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Role: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-primary)' }}>{user.role}</span> &bull; {user.email}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && (
          <div className="alert-error" style={{ margin: '14px 0' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Quick Presets */}
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Presets:</span>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => applyPreset('sales')}>
            Sales Rep
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => applyPreset('manager')}>
            Team Manager
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => applyPreset('readonly')}>
            Read Only
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => applyPreset('all')}>
            Select All
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem', color: 'var(--color-danger)' }} onClick={() => applyPreset('none')}>
            Clear All
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
            {selected.length} of {available.length} active
          </span>
        </div>

        {/* Permissions Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading permission rules...</div>
          ) : (
            Object.entries(categories).map(([catName, perms]) => {
              const catKeys = perms.map(p => p.key);
              const allChecked = catKeys.every(k => selected.includes(k));
              const someChecked = catKeys.some(k => selected.includes(k));

              return (
                <div key={catName} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => toggleCategory(catKeys)}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '4px',
                        border: allChecked ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                        background: allChecked ? 'var(--accent-primary)' : someChecked ? 'var(--accent-primary)30' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {allChecked && <Check size={12} color="#fff" />}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{catName} Module</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {catKeys.filter(k => selected.includes(k)).length}/{catKeys.length} enabled
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
                    {perms.map(p => {
                      const isChecked = selected.includes(p.key);
                      return (
                        <label
                          key={p.key}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 10px', borderRadius: '6px',
                            background: isChecked ? 'var(--accent-primary)10' : 'var(--bg-hover)',
                            border: isChecked ? '1px solid var(--accent-primary)40' : '1px solid var(--border-color)',
                            cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(p.key)}
                            style={{ display: 'none' }}
                          />
                          <div style={{
                            width: 14, height: 14, borderRadius: '3px',
                            border: isChecked ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                            background: isChecked ? 'var(--accent-primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isChecked && <Check size={10} color="#fff" />}
                          </div>
                          <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {p.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'delete', user? }
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [permModalUser, setPermModalUser] = useState(null);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'matrix' | 'activity'
  const [matrixPerms, setMatrixPerms] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [availableList, setAvailableList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityAction, setActivityAction] = useState('');

  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (['super_admin', 'admin'].includes(currentUser.role)) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };
  const canSeeUsers = currentUser && (['super_admin', 'admin', 'manager'].includes(currentUser.role) || hasPerm('users.view'));
  const canCreate = currentUser && CREATABLE_ROLES[currentUser.role]?.length > 0;
  const canManage = currentUser && ['super_admin', 'admin'].includes(currentUser.role);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const [avail, allP] = await Promise.all([
        crmAPI.getAvailablePermissions(),
        crmAPI.getAllUsersPermissions().catch(() => ({})),
      ]);
      setAvailableList(avail || []);
      setMatrixPerms(allP || {});
    } catch (e) {
      showToast('error', 'Failed to load permissions matrix');
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async (action) => {
    setActivityLoading(true);
    try {
      const params = { limit: 100 };
      if (action) params.action = action;
      const data = await crmAPI.getActivityLogs(params);
      setActivityLogs(data || []);
    } catch (e) {
      showToast('error', 'Failed to load activity logs');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const handlePermSaved = (userName) => {
    showToast('success', `Permissions updated for ${userName}!`);
    if (activeTab === 'matrix') {
      loadMatrix();
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await crmAPI.getUsers();
      setUsers(data);
    } catch (err) {
      showToast('error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const visibleRoleOrder = isSuperAdmin
    ? ROLE_ORDER
    : ROLE_ORDER.filter(r => r !== 'super_admin');

  // Filter logic
  const filtered = users.filter(u => {
    if (!isSuperAdmin && u.role === 'super_admin') return false;
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus =
      statusFilter === '' ? true :
      statusFilter === 'active' ? u.is_active :
      !u.is_active;
    return matchSearch && matchRole && matchStatus;
  });

  // Stats
  const totalByRole = visibleRoleOrder.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  // Actions
  const handleSave = async (action, id, payload) => {
    if (action === 'create') {
      await crmAPI.createUser(payload);
      showToast('success', 'User created successfully!');
    } else {
      await crmAPI.updateUser(id, payload);
      showToast('success', 'User updated successfully!');
    }
    await loadUsers();
  };

  const handleDelete = async (user) => {
    try {
      await crmAPI.deleteUser(user.id);
      setModal(null);
      showToast('success', `${user.name} deleted.`);
      await loadUsers();
    } catch (err) {
      showToast('error', err.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await crmAPI.toggleUserActive(user.id);
      showToast('success', `${user.name} ${user.is_active ? 'deactivated' : 'activated'}.`);
      await loadUsers();
    } catch (err) {
      showToast('error', err.message || 'Toggle failed');
    }
  };

  // Permission check: can actor manage this user?
  const canEdit = (u) => {
    if (!currentUser) return false;
    if (currentUser.id === u.id) return true;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin') return u.company_id === currentUser.company_id && !['super_admin', 'admin'].includes(u.role);
    if (currentUser.role === 'manager') return u.manager_id === currentUser.id && u.role === 'employee';
    return false;
  };

  const canDelete = (u) => {
    if (!currentUser) return false;
    if (currentUser.id === u.id) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin') return u.company_id === currentUser.company_id && !['super_admin', 'admin'].includes(u.role);
    return false;
  };

  const canToggle = (u) => canManage && currentUser.id !== u.id && canDelete(u);

  if (!canSeeUsers) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view or manage Users. Please contact your organization Administrator to request access.
          </p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Toast */}
      {toast && (
        <div
          className={toast.type === 'success' ? 'alert-success' : 'alert-error'}
          style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 200, minWidth: '280px', animation: 'fadeSlideUp 0.3s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>User Management & Access Control</h2>
          <p>Manage team members, roles, granular permissions, and track login/logout activity.</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginTop: '-4px' }}>
        <button
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveTab('directory')}
        >
          <Users size={15} /> Team Directory
        </button>
        {canManage && (
          <button
            className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setActiveTab('matrix'); loadMatrix(); }}
          >
            <Key size={15} /> Permissions Control Matrix
          </button>
        )}
        {canManage && (
          <button
            className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setActiveTab('activity'); loadActivity(); }}
          >
            <Activity size={15} /> Login / Logout Activity
          </button>
        )}
      </div>

      {/* TAB 1: Team Directory */}
      {activeTab === 'directory' && (
        <>
          {/* Role Stats Strip */}
          <div className="stats-strip">
            {visibleRoleOrder.map(role => (
              <div key={role} className="stat-chip">
                <span>{ROLE_ICONS_MAP[role]}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{ROLE_LABELS[role]}s</span>
                <strong>{totalByRole[role] || 0}</strong>
              </div>
            ))}
            <div className="stat-chip">
              <UserCheck size={15} style={{ color: 'var(--color-success)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Active</span>
              <strong style={{ color: 'var(--color-success)' }}>{users.filter(u => u.is_active).length}</strong>
            </div>
            <div className="stat-chip">
              <UserX size={15} style={{ color: 'var(--color-danger)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Inactive</span>
              <strong style={{ color: 'var(--color-danger)' }}>{users.filter(u => !u.is_active).length}</strong>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search size={15} />
              <input
                className="search-input"
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="select-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {visibleRoleOrder.map(r => (
                <option key={r} value={r}>{ROLE_ICONS_MAP[r]} {ROLE_LABELS[r]}</option>
              ))}
            </select>
            <select className="select-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="panel-card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="panel-title">
                <Users size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
                Team Directory
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filtered.length} of {users.length} users
              </span>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Loading users...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <Users size={40} />
                          <p>{search || roleFilter || statusFilter ? 'No users match your filters.' : 'No users found. Add your first team member.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => (
                      <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                        <td>
                          <div className="user-name-cell">
                            <UserAvatar name={u.name} role={u.role} />
                            <div className="user-name-info">
                              <strong>
                                {u.name}
                                {u.id === currentUser?.id && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginLeft: 6, fontWeight: 600 }}>you</span>
                                )}
                              </strong>
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td style={{ color: u.company_name ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {u.company_name || '—'}
                        </td>
                        <td style={{ color: u.manager_name ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {u.manager_name || '—'}
                        </td>
                        <td><StatusDot active={u.is_active} /></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div className="action-btns">
                            {/* Manage Permissions Button for Manager & Employee */}
                            {canManage && (u.role === 'employee' || u.role === 'manager') && (
                              <button
                                className="btn-icon"
                                title={`Manage custom permissions for ${u.name}`}
                                style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)40' }}
                                onClick={() => setPermModalUser(u)}
                              >
                                <Key size={14} />
                              </button>
                            )}
                            {canEdit(u) && (
                              <button
                                className="btn-icon"
                                title="Edit user"
                                onClick={() => setModal({ type: 'edit', user: u })}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canToggle(u) && (
                              <button
                                className={`btn-icon ${u.is_active ? 'danger' : 'success'}`}
                                title={u.is_active ? 'Deactivate user' : 'Activate user'}
                                onClick={() => handleToggleActive(u)}
                              >
                                {u.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                              </button>
                            )}
                            {canDelete(u) && (
                              <button
                                className="btn-icon danger"
                                title="Delete user"
                                onClick={() => setModal({ type: 'delete', user: u })}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Hierarchy Info Card */}
          <div className="panel-card" style={{ padding: '20px 24px' }}>
            <h3 className="panel-title" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
              Access Hierarchy & Permissions Architecture
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ...(isSuperAdmin ? [{ role: 'super_admin', desc: 'Full system access — all organizations, subscriptions, and system templates.' }] : []),
                { role: 'admin', desc: 'Company Administrator — sets team permissions, creates group chats, manages member access and imports.' },
                { role: 'manager', desc: 'Team Manager — manages direct subordinates with Admin-granted module permissions.' },
                { role: 'employee', desc: 'Individual Contributor — operates strictly within permissions explicitly granted by the Admin.' },
              ].map(({ role, desc }) => (
                <div key={role} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <RoleBadge role={role} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Permissions Control Matrix */}
      {activeTab === 'matrix' && (
        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--accent-primary)' }} />
                Team Permissions Control Matrix
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Granular permission controls configured by Admin for Managers and Employees.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={loadMatrix} disabled={matrixLoading}>
              <RefreshCw size={14} className={matrixLoading ? 'spin' : ''} /> Refresh Matrix
            </button>
          </div>

          {matrixLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading permissions matrix...</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th>Role</th>
                    <th>Active Permissions</th>
                    <th>Coverage</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'manager' || u.role === 'employee').length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No Managers or Employees found. Add team members to assign custom permissions.
                      </td>
                    </tr>
                  ) : (
                    users.filter(u => u.role === 'manager' || u.role === 'employee').map(u => {
                      const perms = matrixPerms[String(u.id)] || [];
                      const pct = availableList.length > 0 ? Math.round((perms.length / availableList.length) * 100) : 0;
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="user-name-cell">
                              <UserAvatar name={u.name} role={u.role} />
                              <div className="user-name-info">
                                <strong>{u.name}</strong>
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td><RoleBadge role={u.role} /></td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '480px' }}>
                              {perms.length === 0 ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)', background: 'var(--color-danger)15', padding: '2px 8px', borderRadius: '4px' }}>
                                  No permissions granted
                                </span>
                              ) : (
                                perms.map(p => (
                                  <span key={p} style={{
                                    fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px',
                                    background: 'var(--accent-primary)15', color: 'var(--accent-primary)',
                                    border: '1px solid var(--accent-primary)30'
                                  }}>
                                    {p}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, width: '70px', height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: pct > 50 ? 'var(--color-success)' : 'var(--accent-primary)', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{pct}%</span>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                              onClick={() => setPermModalUser(u)}
                            >
                              <Key size={13} /> Edit Permissions
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Login / Logout Activity */}
      {activeTab === 'activity' && (
        <div className="panel-card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
                Team Login & Logout History
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Real-time tracking of team member access and authentication sessions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ width: '140px', padding: '6px 10px', fontSize: '0.82rem' }}
                value={activityAction}
                onChange={e => { setActivityAction(e.target.value); loadActivity(e.target.value); }}
              >
                <option value="">All Actions</option>
                <option value="login">Login Only</option>
                <option value="logout">Logout Only</option>
              </select>
              <button className="btn btn-secondary" onClick={() => loadActivity(activityAction)} disabled={activityLoading}>
                <RefreshCw size={14} className={activityLoading ? 'spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {activityLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading activity logs...</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No recent login/logout activity recorded.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log, idx) => {
                      const isLogin = log.action === 'login';
                      return (
                        <tr key={log.id || idx}>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                              background: isLogin ? '#10b98115' : '#ef444415',
                              color: isLogin ? '#10b981' : '#ef4444',
                            }}>
                              {isLogin ? <LogIn size={12} /> : <LogOut size={12} />}
                              {isLogin ? 'Login' : 'Logout'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_name || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.user_email || ''}</div>
                          </td>
                          <td><RoleBadge role={log.user_role} /></td>
                          <td>
                            <div style={{ fontSize: '0.82rem' }}>{new Date(log.created_at).toLocaleString()}</div>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.78rem', padding: '2px 6px', background: 'var(--bg-hover)', borderRadius: '4px' }}>
                              {log.ip_address || '—'}
                            </code>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {log.details || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {permModalUser && (
        <PermissionsModal
          user={permModalUser}
          onClose={() => setPermModalUser(null)}
          onSaved={handlePermSaved}
        />
      )}
      {modal?.type === 'create' && (
        <UserModal
          mode="create"
          user={null}
          currentUser={currentUser}
          allUsers={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.type === 'edit' && (
        <UserModal
          mode="edit"
          user={modal.user}
          currentUser={currentUser}
          allUsers={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.user)}
        />
      )}
    </div>
  );
}
