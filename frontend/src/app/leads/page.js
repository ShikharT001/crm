'use client';

import { useEffect, useState } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import {
  Plus, X, UserCheck, Phone, Mail, Building, AlertCircle,
  Upload, Download, FileText, CheckCircle
} from 'lucide-react';

// ─── Lead CSV Import Modal ───────────────────────────────────────────────────

function LeadImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('New');
  const [categoryTag, setCategoryTag] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [defaultCompany, setDefaultCompany] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState({});

  useEffect(() => {
    crmAPI.getUsers().then(data => {
      setUsers(data?.filter(u => u.role !== 'super_admin') || []);
    }).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 4).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        setPreview({ headers, rows, total: lines.length - 1 });
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file to upload');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.importLeadsCSV(file, {
        default_status: defaultStatus,
        category_tag: categoryTag,
        assigned_user_id: assignedUserId ? parseInt(assignedUserId) : undefined,
        default_company_name: defaultCompany || undefined,
      });
      setResult(res);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--accent-primary)20', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Import Leads via CSV</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Bulk upload leads with intelligent categorization and team assignment
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {result ? (
          <div style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#10b98120', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle size={28} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Import Completed!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Your CSV data has been processed and saved into the CRM.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '8px 0' }}>
              <div style={{ padding: '10px', background: '#10b98115', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{result.imported}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Imported</div>
              </div>
              <div style={{ padding: '10px', background: '#f59e0b15', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{result.skipped || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Skipped</div>
              </div>
              <div style={{ padding: '10px', background: result.errors > 0 ? '#ef444415' : 'var(--bg-hover)', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: result.errors > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{result.errors || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Errors</div>
              </div>
            </div>
            {result.error_details?.length > 0 && (
              <div style={{ textAlign: 'left', maxHeight: '100px', overflowY: 'auto', background: 'var(--bg-hover)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', color: '#ef4444' }}>
                {result.error_details.map((err, i) => (
                  <div key={i}>Row {err.row}: {err.reason}</div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={onClose} style={{ alignSelf: 'center', marginTop: '8px' }}>
              Done & View Leads
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Step 1: File Upload */}
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <input
                type="file"
                accept=".csv"
                id="leads-csv-input"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <label htmlFor="leads-csv-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-primary)15', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} />
                </div>
                {file ? (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{file.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {(file.size / 1024).toFixed(1)} KB &bull; {preview.total || 'Multiple'} records detected
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Choose a CSV file or drag and drop</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Columns: title, contact_name, contact_email, phone, company_name, status, value, notes
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Template download link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Need a formatted starter file?</span>
              <a
                href={crmAPI.getImportTemplate('leads')}
                download="leads_template.csv"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <Download size={13} /> Download Template
              </a>
            </div>

            {/* Categorization & Assignment Options */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🏷️ Import Categorization & Assignment Options
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Default Status Category</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    value={defaultStatus}
                    onChange={e => setDefaultStatus(e.target.value)}
                  >
                    <option value="New">New (Default)</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Assign To Team Member</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    value={assignedUserId}
                    onChange={e => setAssignedUserId(e.target.value)}
                  >
                    <option value="">— Unassigned (Team Pool) —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Lead Source / Campaign Category</label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    placeholder="e.g. Q4 Web Leads, Expo 2026, Cold List..."
                    value={categoryTag}
                    onChange={e => setCategoryTag(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Fallback Company / Org Name</label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    placeholder="e.g. Inbound Retail Clients..."
                    value={defaultCompany}
                    onChange={e => setDefaultCompany(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Preview table */}
            {preview.headers && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  CSV Header Preview ({preview.headers.join(', ')})
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '110px' }}>
                  <table className="data-table" style={{ fontSize: '0.75rem' }}>
                    <tbody>
                      {preview.rows?.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((c, ci) => (
                            <td key={ci} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{c || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!file || loading}>
                {loading ? 'Processing Import...' : 'Import Leads Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canViewLeads = hasPerm('leads.view');
  const canCreateLeads = hasPerm('leads.create');
  const canConvertLeads = hasPerm('leads.convert');

  const [leads, setLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    status: 'New',
    value: 0.0,
    notes: ''
  });

  const loadLeads = async (status) => {
    setLoading(true);
    try {
      const data = await crmAPI.getLeads(status || undefined);
      setLeads(data);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewLeads) {
      loadLeads(filterStatus);
    } else {
      setLoading(false);
    }
  }, [filterStatus, canViewLeads]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await crmAPI.createLead({
        ...formData,
        value: parseFloat(formData.value) || 0.0
      });
      setShowModal(false);
      setFormData({ title: '', company_name: '', contact_name: '', contact_email: '', phone: '', status: 'New', value: 0.0, notes: '' });
      loadLeads(filterStatus);
    } catch (err) {
      alert("Failed to create lead: " + err.message);
    }
  };

  const handleConvertLead = async (leadId) => {
    if (!confirm("Convert this lead into an active customer account?")) return;
    try {
      await crmAPI.convertLead(leadId);
      alert("Lead successfully converted to Customer!");
      loadLeads(filterStatus);
    } catch (err) {
      alert("Conversion failed: " + err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  if (isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="alert-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> Super Admin manages SaaS platform organizations and does not use tenant-specific CRM features.
        </div>
      </div>
    );
  }

  if (!canViewLeads) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view Leads. Please contact your organization Administrator to request access.
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
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            className="form-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Lead Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {canCreateLeads && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={15} /> Import Leads (CSV)
              </button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Add New Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="panel-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead Title</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lead.title}</div>
                      {lead.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.notes}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} color="var(--text-muted)" />
                        <span>{lead.company_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lead.contact_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <span><Mail size={12} /> {lead.contact_email}</span>
                        {lead.phone && <span><Phone size={12} /> {lead.phone}</span>}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(lead.value)}</td>
                    <td>
                      <span className={`badge badge-${lead.status.toLowerCase()}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      {lead.status !== 'Converted' ? (
                        canConvertLeads ? (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleConvertLead(lead.id)}
                          >
                            <UserCheck size={14} /> Convert
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                          Converted Customer
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create New Lead</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="form-group">
                <label className="form-label">Lead Title *</label>
                <input 
                  type="text" 
                  className="form-input"
                  required 
                  placeholder="e.g. Enterprise Cloud License Deal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Acme Corp"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Value ($)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="10000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Name *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    required
                    placeholder="Jane Doe"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email *</label>
                  <input 
                    type="email" 
                    className="form-input"
                    required
                    placeholder="jane@example.com"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="+1 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select 
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-textarea" 
                  rows={3}
                  placeholder="Additional background context..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      {showImportModal && (
        <LeadImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => loadLeads(filterStatus)}
        />
      )}
    </div>
  );
}
