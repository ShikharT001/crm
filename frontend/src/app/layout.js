'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, TrendingUp, Building2, Package,
  Contact, LogOut, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle,
  MessageSquare, Activity
} from 'lucide-react';
import { crmAPI, authHelpers } from '@/lib/api';
import NotificationReminderCenter from './components/NotificationReminderCenter';

// ─── Role display helpers ─────────────────────────────────────────────────────

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

const ROLE_ICONS = {
  super_admin: '👑',
  admin: '🏢',
  manager: '🎯',
  employee: '👤',
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await crmAPI.login(email, password);
      authHelpers.saveSession(res.access_token, res.user);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">CRM</div>
          <div>
            <div className="login-title">Welcome back</div>
            <div className="login-subtitle">Sign in to your CRM account</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} /> Email Address
            </label>
            <input
              id="login-email"
              type="text"
              className="form-input"
              placeholder="you@company.com or username@domain.local"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={13} /> Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: '16px' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: '0.95rem', marginTop: '4px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials hint with 1-click auto-fill */}
        <div style={{
          marginTop: '20px',
          padding: '14px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Quick Login Accounts:</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Click to auto-fill</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: '👑 Super Admin', email: 'superadmin@crm.local', pass: 'Admin@123' },
              { label: '🏢 Sam Admin', email: 'admin@saminc.local', pass: 'Admin@123' },
              { label: '🎯 Sam Manager', email: 'manager@saminc.local', pass: 'Manager@123' },
              { label: '👤 Sam Employee', email: 'emp1@saminc.local', pass: 'Emp@12345' },
              { label: '💼 Ajay (Admin)', email: 'macner001@gmail.com', pass: 'password' },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.pass);
                  setError('');
                }}
                title={`Click to fill ${acc.email} (${acc.pass})`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: 'inherit',
                  textAlign: 'left',
                  fontSize: '0.78rem',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.label}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const user = authHelpers.getCurrentUser();
    const token = authHelpers.getToken();
    if (user && token) {
      crmAPI.getMe()
        .then((freshUser) => {
          authHelpers.saveSession(token, freshUser);
          setCurrentUser(freshUser);
        })
        .catch(() => {
          authHelpers.clearSession();
          setCurrentUser(null);
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      authHelpers.clearSession();
      setCurrentUser(null);
      setCheckingAuth(false);
    }

    const handleAuthExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('crm-auth-expired', handleAuthExpired);

    const handlePermissionsUpdated = () => {
      const token = authHelpers.getToken();
      if (token) {
        crmAPI.getMe()
          .then((freshUser) => {
            authHelpers.saveSession(token, freshUser);
            setCurrentUser(freshUser);
          })
          .catch(() => {});
      }
    };
    window.addEventListener('crm-permissions-updated', handlePermissionsUpdated);

    return () => {
      window.removeEventListener('crm-auth-expired', handleAuthExpired);
      window.removeEventListener('crm-permissions-updated', handlePermissionsUpdated);
    };
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await crmAPI.logout();
    } catch (e) {
      console.warn("Logout notification failed:", e);
    }
    authHelpers.clearSession();
    setCurrentUser(null);
  };

  // Role and Permission aware helper
  // Admins & SuperAdmins have all permissions implicitly.
  // Managers & Employees only have permissions granted by the Admin.
  const hasPerm = (permKey) => {
    if (!currentUser) return false;
    if (['super_admin', 'admin'].includes(currentUser.role)) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(permKey);
  };

  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';
  const isAdmin = currentUser && currentUser.role === 'admin';
  const canSeeUsers = currentUser && (isAdmin || isSuperAdmin || hasPerm('users.view') || currentUser.role === 'manager');
  const canSeeActivity = currentUser && ['admin', 'super_admin'].includes(currentUser.role);

  const navItems = isSuperAdmin
    ? [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Organizations', href: '/organizations', icon: Building2 },
        { name: 'Activity Log', href: '/activity', icon: Activity },
      ]
    : [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        ...(hasPerm('leads.view') ? [{ name: 'Leads', href: '/leads', icon: Users }] : []),
        ...(hasPerm('opportunities.view') ? [{ name: 'Pipeline', href: '/opportunities', icon: TrendingUp }] : []),
        ...(hasPerm('customers.view') ? [{ name: 'Customers', href: '/customers', icon: Building2 }] : []),
        ...(hasPerm('contacts.view') ? [{ name: 'Contacts', href: '/contacts', icon: Contact }] : []),
        ...(hasPerm('products.view') ? [{ name: 'Products', href: '/products', icon: Package }] : []),
        { name: 'Team Chat', href: '/chat', icon: MessageSquare },
        ...(canSeeUsers ? [{ name: 'Users & Roles', href: '/users', icon: ShieldCheck }] : []),
        ...(canSeeActivity ? [{ name: 'Activity & Logins', href: '/activity', icon: Activity }] : []),
      ];

  const orgName = currentUser?.company_name || (isSuperAdmin ? 'SaaS Platform Owner' : 'Default Org');

  return (
    <html lang="en">
      <body style={checkingAuth ? {
        background: '#0b0f19', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', margin: 0
      } : {}}>
        {checkingAuth ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Initializing CRM...
          </div>
        ) : !currentUser ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <div className="app-shell">
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-header">
                <div className="logo-badge">CRM</div>
                <div>
                  <div className="logo-title">SaaS CRM</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    🏢 {orgName}
                  </div>
                </div>
              </div>

              <nav className="sidebar-nav">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Sidebar user info */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div className={`user-avatar avatar-${currentUser.role}`} style={{ width: 34, height: 34, fontSize: '0.78rem' }}>
                  {getInitials(currentUser.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.name}
                  </div>
                  <span className={`role-badge role-${currentUser.role}`} style={{ fontSize: '0.63rem', padding: '1px 7px' }}>
                    {ROLE_ICONS[currentUser.role]} {ROLE_LABELS[currentUser.role]}
                  </span>
                </div>
              </div>
            </aside>

            {/* Main Area */}
            <div className="main-wrapper">
              {/* Top Header */}
              <header className="top-header">
                <div className="page-title-group">
                  <h1>Multi-Tenant SaaS CRM</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Tenant Organization badge */}
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🏢 {orgName}
                  </div>

                  {/* Notification & Reminder Center */}
                  <NotificationReminderCenter currentUser={currentUser} />

                  {/* User badge */}
                  <div className="user-profile-badge">
                    <div className={`user-avatar avatar-${currentUser.role}`}>
                      {getInitials(currentUser.name)}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
                      <span className={`role-badge role-${currentUser.role}`} style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                        {ROLE_LABELS[currentUser.role]}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleLogout}
                    title="Sign Out"
                    style={{ gap: '6px' }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </header>

              {/* Page Content */}
              <main className="content-area">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
