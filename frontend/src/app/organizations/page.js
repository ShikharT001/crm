'use client';

import { useEffect, useState } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import { Building2, Plus, Shield, Check, X, AlertCircle, Edit3, Users, Key, Zap, Trash2, Layers } from 'lucide-react';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: 'Clothing / Fashion',
    owner_name: '',
    owner_email: '',
    owner_password: 'Admin@123',
    status: 'ACTIVE',
    plan_id: '',
    max_users: 25,
    enabled_features: ['leads', 'contacts', 'products', 'inventory', 'reports'],
  });

  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [orgsData, plansData, featData, tmplData] = await Promise.all([
        crmAPI.getOrganizations().catch(() => []),
        crmAPI.getPlans().catch(() => []),
        crmAPI.getFeatures().catch(() => []),
        crmAPI.getIndustryTemplates().catch(() => []),
      ]);
      setOrganizations(orgsData);
      setPlans(plansData);
      setFeatures(featData);
      setTemplates(tmplData);
      if (tmplData.length > 0 && !formData.industry) {
        setFormData(prev => ({ ...prev, industry: tmplData[0].name }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load organization platform data.');
    } finally {
      setLoading(false);
    }
  }

  const handleFeatureToggle = (code) => {
    setFormData(prev => {
      const current = prev.enabled_features || [];
      const updated = current.includes(code)
        ? current.filter(c => c !== code)
        : [...current, code];
      return { ...prev, enabled_features: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await crmAPI.createOrganization({
        ...formData,
        plan_id: formData.plan_id ? parseInt(formData.plan_id) : null,
      });
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create organization.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editOrg) return;
    setError('');
    try {
      await crmAPI.updateOrganization(editOrg.id, {
        name: formData.name,
        domain: formData.domain,
        industry: formData.industry,
        status: formData.status,
        max_users: parseInt(formData.max_users),
        plan_id: formData.plan_id ? parseInt(formData.plan_id) : null,
        enabled_features: formData.enabled_features,
      });
      setEditOrg(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update organization.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmOrg) return;
    setDeleting(true);
    setError('');
    try {
      await crmAPI.deleteOrganization(deleteConfirmOrg.id);
      setDeleteConfirmOrg(null);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete organization.');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (org) => {
    setEditOrg(org);
    const matchingPlan = plans.find(p => p.name === org.subscription_plan_name);
    setFormData({
      name: org.name,
      domain: org.domain || '',
      industry: org.industry || 'Clothing / Fashion',
      owner_name: '',
      owner_email: org.owner_email || '',
      owner_password: '',
      status: org.status,
      plan_id: matchingPlan ? matchingPlan.id : '',
      max_users: org.max_users,
      enabled_features: org.enabled_features || ['leads', 'contacts', 'products', 'inventory', 'reports'],
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      industry: templates.length > 0 ? templates[0].name : 'Clothing / Fashion',
      owner_name: '',
      owner_email: '',
      owner_password: 'Admin@123',
      status: 'ACTIVE',
      plan_id: '',
      max_users: 25,
      enabled_features: ['leads', 'contacts', 'products', 'inventory', 'reports'],
    });
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="alert-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> Super Admin access required to manage SaaS Organizations & Subscription Plans.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} style={{ color: 'var(--accent-primary)' }} />
            SaaS Tenant Organizations & Multi-Industry Engine
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Onboard multi-industry businesses with automated custom product management structures, subscription plans, and user limits.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus size={16} /> Onboard New Organization
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Organizations List Table */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">Active Platform Tenants ({organizations.length})</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Industry / Template</th>
                <th>Owner Email</th>
                <th>Status</th>
                <th>Plan</th>
                <th>User Limit</th>
                <th>Enabled Modules</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading tenant organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No organizations created yet.
                  </td>
                </tr>
              ) : (
                organizations.map(org => (
                  <tr key={org.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{org.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{org.domain || 'no domain'}</div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        color: 'var(--accent-primary)'
                      }}>
                        <Layers size={13} /> {org.industry || 'General'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{org.owner_email || 'Unassigned'}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${(org.status || 'ACTIVE').toLowerCase()}`}>
                        {org.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {org.subscription_plan_name || 'Free Trial'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        {org.current_users_count} / {org.max_users} users
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(org.enabled_features || []).map(feat => (
                          <span key={feat} style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            color: 'var(--accent-primary)',
                            textTransform: 'capitalize'
                          }}>
                            {feat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(org)}>
                          <Edit3 size={14} /> Configure
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--color-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.25)'
                          }}
                          onClick={() => setDeleteConfirmOrg(org)}
                          title="Delete Organization"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Organization Wizard */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h3 className="panel-title">Onboard New SaaS Organization</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Organization Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Organization Name *</label>
                  <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Acme Fashions Inc" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Domain Name</label>
                  <input className="form-input" value={formData.domain} onChange={e => setFormData({ ...formData, domain: e.target.value })} placeholder="acmefashions.com" />
                </div>
              </div>

              {/* Industry Template Selection */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '6px', display: 'block' }}>
                  🏭 Select Business / Industry Template *
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  The CRM will automatically build custom product fields, attributes, options, and category trees tailored for this industry.
                </p>
                <select
                  className="form-input"
                  style={{ fontWeight: 600, padding: '10px 14px' }}
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  required
                >
                  {templates.length > 0 ? (
                    templates.map(t => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.fields ? t.fields.length : 0} custom fields)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Clothing / Fashion">Clothing / Fashion</option>
                      <option value="Software / SaaS">Software / SaaS</option>
                      <option value="Sports">Sports</option>
                      <option value="Jewellery">Jewellery</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Cosmetics">Cosmetics</option>
                      <option value="Food">Food</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Automobile">Automobile</option>
                      <option value="General">General</option>
                    </>
                  )}
                </select>
              </div>

              {/* Owner Info */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-primary)' }}>
                  👑 Organization Admin / Owner Account
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner Name *</label>
                    <input className="form-input" value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} placeholder="John Doe" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Email *</label>
                    <input className="form-input" type="email" value={formData.owner_email} onChange={e => setFormData({ ...formData, owner_email: e.target.value })} placeholder="admin@acme.com" required />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Initial Password *</label>
                  <input className="form-input" type="password" value={formData.owner_password} onChange={e => setFormData({ ...formData, owner_password: e.target.value })} required />
                </div>
              </div>

              {/* Plan & Users */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Subscription Plan</label>
                  <select className="form-input" value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}>
                    <option value="">Select Plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Users Limit</label>
                  <input className="form-input" type="number" value={formData.max_users} onChange={e => setFormData({ ...formData, max_users: e.target.value })} min={1} max={1000} required />
                </div>
              </div>

              {/* Module Toggles */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Enabled Module Features</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {features.map(f => {
                    const isChecked = (formData.enabled_features || []).includes(f.code);
                    return (
                      <label key={f.code} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                        background: isChecked ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                        border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem'
                      }}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleFeatureToggle(f.code)} />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Onboard Organization</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit / Configure Organization */}
      {editOrg && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h3 className="panel-title">Configure Tenant: {editOrg.name}</h3>
              <button onClick={() => setEditOrg(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Subscription Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subscription Plan</label>
                  <select className="form-input" value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}>
                    <option value="">Select Plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price}/mo)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Max Users Limit</label>
                <input className="form-input" type="number" value={formData.max_users} onChange={e => setFormData({ ...formData, max_users: e.target.value })} min={1} max={1000} required />
              </div>

              {/* Module Toggles */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Module Feature Access</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {features.map(f => {
                    const isChecked = (formData.enabled_features || []).includes(f.code);
                    return (
                      <label key={f.code} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                        background: isChecked ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                        border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem'
                      }}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleFeatureToggle(f.code)} />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditOrg(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Organization Confirmation */}
      {deleteConfirmOrg && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)'
              }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Delete Organization?</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmOrg.name}</strong>?
              </p>
              <div style={{
                padding: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--color-danger)', textAlign: 'left', width: '100%'
              }}>
                ⚠️ <strong>Warning:</strong> This action will permanently erase all associated users, leads, customers, opportunities, products, and subscription data for this tenant. This action cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setDeleteConfirmOrg(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, background: 'var(--color-danger)', color: 'white' }}
                  onClick={handleDeleteSubmit}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
