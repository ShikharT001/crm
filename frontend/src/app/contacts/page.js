'use client';

import { useEffect, useState, useCallback } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import {
  User, Mail, Phone, Building2, Briefcase, DollarSign, Search,
  CheckCircle2, AlertCircle, Upload, Download, FileText, X, CheckCircle
} from 'lucide-react';

// ─── Contact CSV Import Modal ────────────────────────────────────────────────

function ContactImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState('auto'); // 'auto' | 'existing' | 'new'
  const [defaultCustomerId, setDefaultCustomerId] = useState('');
  const [defaultCustomerName, setDefaultCustomerName] = useState('');
  const [defaultIndustry, setDefaultIndustry] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [defaultPosition, setDefaultPosition] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState({});

  useEffect(() => {
    crmAPI.getCustomers().then(data => {
      setCustomers(data || []);
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
      const res = await crmAPI.importContactsCSV(file, {
        assignment_mode: assignmentMode,
        default_customer_id: defaultCustomerId ? parseInt(defaultCustomerId) : undefined,
        default_customer_name: defaultCustomerName || undefined,
        default_industry: defaultIndustry || undefined,
        category_tag: categoryTag || undefined,
        default_position: defaultPosition || undefined,
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
      <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--accent-primary)20', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Import Contacts via CSV</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Bulk import customer decision makers with flexible categorization
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
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Contacts Import Complete!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Your contacts have been processed and linked to corresponding customer accounts.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '8px 0' }}>
              <div style={{ padding: '10px', background: '#10b98115', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{result.imported}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Imported</div>
              </div>
              <div style={{ padding: '10px', background: '#f59e0b15', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{result.skipped || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplicates Skipped</div>
              </div>
              <div style={{ padding: '10px', background: result.errors > 0 ? '#ef444415' : 'var(--bg-hover)', borderRadius: '6px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: result.errors > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{result.errors || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Errors</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ alignSelf: 'center', marginTop: '8px' }}>
              Done & View Contacts
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Step 1: File Upload */}
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <input
                type="file"
                accept=".csv"
                id="contacts-csv-input"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <label htmlFor="contacts-csv-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-primary)15', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} />
                </div>
                {file ? (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{file.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {(file.size / 1024).toFixed(1)} KB &bull; {preview.total || 'Multiple'} contacts detected
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Choose a CSV file or drag and drop</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Columns: name, email, phone, position, customer_name
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Template download link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Need a formatted starter file?</span>
              <a
                href={crmAPI.getImportTemplate('contacts')}
                download="contacts_template.csv"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <Download size={13} /> Download Template
              </a>
            </div>

            {/* Categorization & Assignment Options */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🏢 Customer Account & Categorization Rules
              </div>

              {/* Assignment Mode */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Account Assignment Mode</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="assignMode"
                      value="auto"
                      checked={assignmentMode === 'auto'}
                      onChange={e => setAssignmentMode(e.target.value)}
                    />
                    From CSV (customer_name)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="assignMode"
                      value="existing"
                      checked={assignmentMode === 'existing'}
                      onChange={e => setAssignmentMode(e.target.value)}
                    />
                    Assign to Existing Account
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="assignMode"
                      value="new"
                      checked={assignmentMode === 'new'}
                      onChange={e => setAssignmentMode(e.target.value)}
                    />
                    Create Single Account
                  </label>
                </div>
              </div>

              {/* Conditional Account Fields */}
              {assignmentMode === 'existing' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Target Account *</label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    value={defaultCustomerId}
                    onChange={e => setDefaultCustomerId(e.target.value)}
                  >
                    <option value="">— Choose an existing customer account —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.industry || 'General'})</option>
                    ))}
                  </select>
                </div>
              )}

              {assignmentMode === 'new' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>New Account Name *</label>
                    <input
                      className="form-input"
                      style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                      placeholder="e.g. Acme Global Logistics"
                      value={defaultCustomerName}
                      onChange={e => setDefaultCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Industry</label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                      value={defaultIndustry}
                      onChange={e => setDefaultIndustry(e.target.value)}
                    >
                      <option value="">— Select Industry —</option>
                      <option value="Technology">Technology</option>
                      <option value="Retail">Retail</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Real Estate">Real Estate</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Categorization & Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Contact Department / Category</label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    placeholder="e.g. Executive, Procurement, Tech Lead..."
                    value={categoryTag}
                    onChange={e => setCategoryTag(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Default Position / Title</label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                    placeholder="e.g. Account Representative..."
                    value={defaultPosition}
                    onChange={e => setDefaultPosition(e.target.value)}
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
                {loading ? 'Processing Import...' : 'Import Contacts Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContactsShowcasePage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canViewContacts = hasPerm('contacts.view');
  const canCreateContacts = hasPerm('contacts.create');

  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmAPI.getAllContacts();
      setContacts(data || []);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewContacts) {
      loadContacts();
    } else {
      setLoading(false);
    }
  }, [canViewContacts, loadContacts]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const companyMatch = c.company?.name?.toLowerCase().includes(q) || c.customer_name?.toLowerCase().includes(q);
    return nameMatch || emailMatch || companyMatch;
  });

  if (isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="alert-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> Super Admin manages SaaS platform organizations and does not use tenant-specific CRM features.
        </div>
      </div>
    );
  }

  if (!canViewContacts) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view Contacts. Please contact your organization Administrator to request access.
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
      {/* Header Banner & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>CRM Contact Directory & Accounts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Comprehensive overview of key decision makers, their company, and deal history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '38px' }}
              placeholder="Search contact or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {canCreateContacts && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowImportModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Upload size={15} /> Import Contacts (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Contacts List Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading CRM contacts & company deal metrics...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No matching contacts found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id} 
              className="panel-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                position: 'relative',
                border: '1px solid var(--border-color)',
                transition: 'var(--transition-smooth)'
              }}
            >
              {/* Contact Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '1.1rem', background: 'var(--accent-gradient)' }}>
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{contact.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {contact.position || 'Contact Person'}
                    </div>
                  </div>
                </div>

                {contact.is_primary && (
                  <span className="badge badge-converted">
                    Primary Contact
                  </span>
                )}
              </div>

              {/* Direct Communication Details */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="var(--accent-primary)" />
                  <a href={`mailto:${contact.email}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {contact.email}
                  </a>
                </div>
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} color="var(--color-success)" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </div>

              {/* Company Info Box */}
              <div style={{
                background: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Associated Organization
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} color="var(--accent-primary)" />
                    <span>{contact.company?.name || contact.customer_name}</span>
                  </div>
                  {contact.company?.industry && (
                    <span className="badge badge-new" style={{ fontSize: '0.7rem' }}>
                      {contact.company.industry}
                    </span>
                  )}
                </div>
                {contact.company?.domain && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    🌐 {contact.company.domain}
                  </div>
                )}
              </div>

              {/* Deals Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} /> Associated Deals ({contact.deals ? contact.deals.length : 0})
                </div>

                {!contact.deals || contact.deals.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No deals linked to this contact account yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {contact.deals.map((deal) => (
                      <div 
                        key={deal.id}
                        style={{
                          background: 'rgba(99, 102, 241, 0.05)',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{deal.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Close target: {deal.close_date || 'N/A'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                            {formatCurrency(deal.value)}
                          </div>
                          <span className="badge badge-qualified" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {deal.stage}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <ContactImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={loadContacts}
        />
      )}
    </div>
  );
}
