'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, LogIn, LogOut, Search, Filter, RefreshCw,
  User, Clock, Wifi, AlertCircle, ChevronDown
} from 'lucide-react';
import { crmAPI, authHelpers } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString([], {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const ROLE_COLORS = {
  admin: { bg: '#6366f115', text: '#6366f1', dot: '#6366f1' },
  manager: { bg: '#f59e0b15', text: '#f59e0b', dot: '#f59e0b' },
  employee: { bg: '#10b98115', text: '#10b981', dot: '#10b981' },
  super_admin: { bg: '#ef444415', text: '#ef4444', dot: '#ef4444' },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || { bg: '#6b728015', text: '#6b7280', dot: '#6b7280' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
      background: c.bg, color: c.text, textTransform: 'capitalize',
    }}>
      {role?.replace('_', ' ')}
    </span>
  );
}

function ActionBadge({ action }) {
  const isLogin = action === 'login';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
      background: isLogin ? '#10b98115' : '#ef444415',
      color: isLogin ? '#10b981' : '#ef4444',
    }}>
      {isLogin ? <LogIn size={12} /> : <LogOut size={12} />}
      {isLogin ? 'Login' : 'Logout'}
    </span>
  );
}

// ─── Online Users Card ────────────────────────────────────────────────────────

function OnlineUsersCard({ onlineUsers }) {
  return (
    <div className="panel-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Online Now</span>
        <span style={{
          background: '#10b98120', color: '#10b981', padding: '2px 8px',
          borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
        }}>
          {onlineUsers.length}
        </span>
      </div>
      {onlineUsers.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '10px 0' }}>
          No users online in the last 24h
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onlineUsers.map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: ROLE_COLORS[u.role]?.dot || '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.75rem',
                }}>
                  {(u.user_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 10, height: 10, borderRadius: '50%', background: '#10b981',
                  border: '2px solid var(--bg-card)',
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.user_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Last seen {timeAgo(u.last_seen)}
                </div>
              </div>
              <RoleBadge role={u.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Activity Log Page ───────────────────────────────────────────────────

export default function ActivityPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [logs, setLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [limit, setLimit] = useState(100);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const params = { limit };
      if (actionFilter) params.action = actionFilter;
      if (userFilter && isAdmin) params.user_id = userFilter;

      const [logsData, onlineData] = await Promise.all([
        crmAPI.getActivityLogs(params),
        isAdmin ? crmAPI.getOnlineUsers().catch(() => []) : Promise.resolve([]),
      ]);

      setLogs(logsData || []);
      setOnlineUsers(onlineData || []);
    } catch (err) {
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [limit, actionFilter, userFilter, isAdmin]);

  useEffect(() => {
    loadData();
    if (isAdmin) {
      crmAPI.getUsers().then(setUsers).catch(() => {});
    }
  }, [loadData, isAdmin]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(s) ||
      (log.user_email || '').toLowerCase().includes(s) ||
      (log.ip_address || '').includes(s)
    );
  });

  // Group logs by date for display
  const groupedLogs = [];
  let currentDate = null;
  for (const log of filtered) {
    const d = new Date(log.created_at).toDateString();
    if (d !== currentDate) {
      currentDate = d;
      groupedLogs.push({ isDateHeader: true, date: log.created_at });
    }
    groupedLogs.push(log);
  }

  const loginCount = logs.filter(l => l.action === 'login').length;
  const logoutCount = logs.filter(l => l.action === 'logout').length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
            Activity Log
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            {isAdmin ? 'Track all team login & logout events across your organization' : 'Your personal login & activity history'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 280px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { icon: <LogIn size={18} />, label: 'Logins', value: loginCount, color: '#10b981' },
              { icon: <LogOut size={18} />, label: 'Logouts', value: logoutCount, color: '#ef4444' },
              { icon: <User size={18} />, label: 'Active Users', value: uniqueUsers, color: '#6366f1' },
            ].map(stat => (
              <div key={stat.label} className="panel-card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ color: stat.color, marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="panel-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '30px' }}
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <select className="form-input" style={{ width: 'auto' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                <option value="login">Login Only</option>
                <option value="logout">Logout Only</option>
              </select>

              {isAdmin && users.length > 0 && (
                <select className="form-input" style={{ width: 'auto' }} value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                  <option value="">All Users</option>
                  {users.filter(u => u.role !== 'super_admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}

              <select className="form-input" style={{ width: 'auto' }} value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
                <option value={50}>Last 50</option>
                <option value={100}>Last 100</option>
                <option value={250}>Last 250</option>
                <option value={500}>Last 500</option>
              </select>
            </div>
          </div>

          {/* Log Table */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">
                <Clock size={15} style={{ display: 'inline', marginRight: 6 }} />
                Activity History ({filtered.length} records)
              </h3>
            </div>
            <div className="table-container">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No activity records found</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      {isAdmin && <th>User</th>}
                      {isAdmin && <th>Role</th>}
                      <th>Date & Time</th>
                      <th>IP Address</th>
                      {!isAdmin && <th>Details</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td><ActionBadge action={log.action} /></td>
                        {isAdmin && (
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{log.user_name || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.user_email || ''}</div>
                          </td>
                        )}
                        {isAdmin && <td><RoleBadge role={log.user_role} /></td>}
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{formatDateTime(log.created_at)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{timeAgo(log.created_at)}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {log.ip_address || '—'}
                          </span>
                        </td>
                        {!isAdmin && (
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.details || '—'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Online Users */}
        {isAdmin && <OnlineUsersCard onlineUsers={onlineUsers} />}
      </div>
    </div>
  );
}
