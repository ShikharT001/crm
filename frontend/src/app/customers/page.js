'use client';

import { useEffect, useState } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import { Building2, User, Mail, Phone, Plus, X, Briefcase, AlertCircle } from 'lucide-react';

export default function CustomersPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canViewCust = hasPerm('customers.view');
  const canCreateCust = hasPerm('customers.create');
  const canCreateContact = hasPerm('contacts.create');

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const [customerForm, setCustomerForm] = useState({ name: '', industry: '', status: 'Active' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '', is_primary: false });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await crmAPI.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewCust) {
      loadCustomers();
    } else {
      setLoading(false);
    }
  }, [canViewCust]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await crmAPI.createCustomer(customerForm);
      setShowCustomerModal(false);
      setCustomerForm({ name: '', industry: '', status: 'Active' });
      loadCustomers();
    } catch (err) {
      alert("Failed to create customer: " + err.message);
    }
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    try {
      await crmAPI.createCustomerContact(selectedCustomerId, contactForm);
      setShowContactModal(false);
      setContactForm({ name: '', email: '', phone: '', position: '', is_primary: false });
      loadCustomers();
    } catch (err) {
      alert("Error adding contact: " + err.message);
    }
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

  if (!canViewCust) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view Customers. Please contact your organization Administrator to request access.
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Customer Accounts Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage company accounts and key decision makers</p>
        </div>
        {canCreateCust && (
          <button className="btn btn-primary" onClick={() => setShowCustomerModal(true)}>
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      <div className="panel-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Contacts</th>
                <th>Opportunities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ background: 'var(--bg-surface-hover)', color: 'var(--accent-primary)' }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{cust.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #CUST-{cust.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{cust.industry || 'General'}</td>
                    <td>
                      <span className="badge badge-active">{cust.status}</span>
                    </td>
                    <td>
                      {cust.contacts && cust.contacts.length > 0 ? (
                        cust.contacts.map((c) => (
                          <div key={c.id} style={{ fontSize: '0.825rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{c.name}</span> ({c.position || 'Contact'})
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No contacts</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {cust.opportunities ? cust.opportunities.length : 0} deals
                      </span>
                    </td>
                    <td>
                      {canCreateContact ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setSelectedCustomerId(cust.id); setShowContactModal(true); }}
                        >
                          <User size={14} /> + Contact
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create Customer Account</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label className="form-label">Customer / Company Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g. Acme International"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Healthcare, Software, Retail"
                  value={customerForm.industry}
                  onChange={(e) => setCustomerForm({ ...customerForm, industry: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Contact Person</h3>
              <button onClick={() => setShowContactModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateContact}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="John Smith"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  placeholder="john@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="+1 555-0100"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Position / Job Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="VP Sales"
                    value={contactForm.position}
                    onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
