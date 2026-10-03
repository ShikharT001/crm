'use client';

import { useEffect, useState } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import { Users, DollarSign, Target, CheckCircle2, TrendingUp, Plus, Building2, Layers } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canSeeLeads = hasPerm('leads.view');
  const canCreateLeads = hasPerm('leads.create');
  const canSeeOpps = hasPerm('opportunities.view');

  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentDeals, setRecentDeals] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        if (isSuperAdmin) {
          const [orgsData, plansData] = await Promise.all([
            crmAPI.getOrganizations().catch(() => []),
            crmAPI.getPlans().catch(() => []),
          ]);
          setOrgs(orgsData);
          setPlans(plansData);
        } else {
          const [statsData, leadsData, dealsData] = await Promise.all([
            crmAPI.getDashboardStats().catch(() => null),
            canSeeLeads ? crmAPI.getLeads().catch(() => []) : Promise.resolve([]),
            canSeeOpps ? crmAPI.getOpportunities().catch(() => []) : Promise.resolve([]),
          ]);
          setStats(statsData);
          setRecentLeads((leadsData || []).slice(0, 5));
          setRecentDeals((dealsData || []).slice(0, 5));
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [isSuperAdmin, canSeeLeads, canSeeOpps]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading CRM Intelligence Dashboard...
      </div>
    );
  }

  if (isSuperAdmin) {
    const activeOrgs = orgs.filter(o => o.status === 'ACTIVE').length;
    const totalPlatformUsers = orgs.reduce((sum, o) => sum + (o.current_users_count || 0), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* SuperAdmin Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>Super Admin SaaS Overview 👑</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Platform management control center. Onboard tenant organizations, configure subscription plans, and toggle feature modules.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/organizations" className="btn btn-primary">
              <Building2 size={16} /> Manage Organizations
            </Link>
          </div>
        </div>

        {/* SuperAdmin KPI Cards Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Tenant Organizations</span>
              <div className="kpi-icon"><Building2 size={20} /></div>
            </div>
            <div className="kpi-value">{orgs.length}</div>
            <div className="kpi-subtext">{activeOrgs} active subscriptions</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Active Platform Users</span>
              <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)' }}>
                <Users size={20} />
              </div>
            </div>
            <div className="kpi-value">{totalPlatformUsers}</div>
            <div className="kpi-subtext">across all client tenants</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Subscription Plans</span>
              <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning)' }}>
                <Layers size={20} />
              </div>
            </div>
            <div className="kpi-value">{plans.length}</div>
            <div className="kpi-subtext">tier plans configured</div>
          </div>
        </div>

        {/* Tenant Organizations Table */}
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Client Organizations Overview</h3>
            <Link href="/organizations" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
              View All Organizations →
            </Link>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Owner Email</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Users Limit</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tenant organizations onboarded yet.</td>
                  </tr>
                ) : (
                  orgs.slice(0, 5).map((org) => (
                    <tr key={org.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{org.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{org.domain || 'no domain'}</div>
                      </td>
                      <td>{org.owner_email || 'Unassigned'}</td>
                      <td>
                        <span className={`badge badge-${org.status.toLowerCase()}`}>
                          {org.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {org.subscription_plan_name || 'Free Trial'}
                      </td>
                      <td>{org.current_users_count} / {org.max_users}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>Welcome back, Team! 👋</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Here is your live sales pipeline & business performance overview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {canCreateLeads && (
            <Link href="/leads" className="btn btn-primary">
              <Plus size={16} /> New Lead
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Leads</span>
            <div className="kpi-icon"><Users size={20} /></div>
          </div>
          <div className="kpi-value">{stats?.active_leads || 0}</div>
          <div className="kpi-subtext">out of {stats?.total_leads || 0} total leads</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Open Pipeline Value</span>
            <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(stats?.open_pipeline_value)}</div>
          <div className="kpi-subtext">{stats?.total_opportunities || 0} active opportunities</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Closed Won Revenue</span>
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(stats?.closed_won_value)}</div>
          <div className="kpi-subtext">{stats?.converted_leads || 0} converted customer leads</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Customers</span>
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--color-info)' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="kpi-value">{stats?.total_customers || 0}</div>
          <div className="kpi-subtext">{stats?.total_products || 0} products in catalog</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Recent Leads Panel */}
        {canSeeLeads && (
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Recent Leads</h3>
              <Link href="/leads" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                View All →
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead / Contact</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leads created yet.</td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{lead.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.contact_name}</div>
                        </td>
                        <td>{lead.company_name || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${lead.status.toLowerCase()}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(lead.value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pipeline Deals Panel */}
        {canSeeOpps && (
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Active Opportunities</h3>
              <Link href="/opportunities" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                View Pipeline →
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Deal Title</th>
                    <th>Stage</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No opportunities yet.</td>
                    </tr>
                  ) : (
                    recentDeals.map((deal) => (
                      <tr key={deal.id}>
                        <td style={{ fontWeight: 600 }}>{deal.title}</td>
                        <td>
                          <span className="badge badge-qualified">
                            {deal.stage}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                          {formatCurrency(deal.value)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
