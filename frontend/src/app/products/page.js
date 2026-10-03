'use client';

import { useEffect, useState, Fragment } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import { Package, Plus, X, Tag, AlertCircle, Edit3, Trash2, ChevronDown, ChevronRight, Layers, SlidersHorizontal, Search, Settings, Check, ListFilter } from 'lucide-react';

export default function ProductsPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canViewProducts = hasPerm('products.view');
  const canCreateProducts = hasPerm('products.create');
  const canEditProducts = hasPerm('products.edit');
  const canDeleteProducts = hasPerm('products.delete');

  // Navigation tabs: 'catalog' | 'fields' | 'categories'
  const [activeTab, setActiveTab] = useState('catalog');

  const [products, setProducts] = useState([]);
  const [fields, setFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states for Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');

  // Expand row state
  const [expandedProductIds, setExpandedProductIds] = useState([]);

  // Modal states for Product
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for Product
  const [productFormData, setProductFormData] = useState({
    name: '',
    code: '',
    price: '0.00',
    cost_price: '0.00',
    product_type: 'PHYSICAL',
    status: 'ACTIVE',
    stock_quantity: 0,
    track_inventory: true,
    category_id: '',
    description: '',
    field_values: {},
    variants: [],
  });

  // Modal states for Custom Field Settings (Module 13)
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [fieldFormData, setFieldFormData] = useState({
    name: '',
    label: '',
    field_type: 'TEXT',
    description: '',
    unit: '',
    required: false,
    filterable: true,
    searchable: true,
    sortable: true,
    display_order: 0,
    options: [] // [{ label, value }]
  });
  const [newOptionInput, setNewOptionInput] = useState('');

  // Modal states for Category Settings (Module 13)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    parent_id: '',
    description: '',
    display_order: 0
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prodsData, fieldsData, catsData] = await Promise.all([
        crmAPI.getProducts().catch(() => []),
        crmAPI.getProductFields().catch(() => []),
        crmAPI.getProductCategories().catch(() => []),
      ]);
      setProducts(prodsData);
      setFields(fieldsData);
      setCategories(catsData);
    } catch (err) {
      setError(err.message || 'Failed to load product catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin && canViewProducts) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canViewProducts]);

  const toggleExpand = (id) => {
    setExpandedProductIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ─── Product CRUD Handlers ──────────────────────────────────────────────────

  const openCreateProductModal = () => {
    setEditProduct(null);
    const initialFieldVals = {};
    fields.forEach(f => {
      initialFieldVals[f.id] = f.default_value || '';
    });
    setProductFormData({
      name: '',
      code: '',
      price: '0.00',
      cost_price: '0.00',
      product_type: 'PHYSICAL',
      status: 'ACTIVE',
      stock_quantity: 0,
      track_inventory: true,
      category_id: '',
      description: '',
      field_values: initialFieldVals,
      variants: [],
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (product) => {
    setEditProduct(product);
    const fVals = {};
    (product.field_values || []).forEach(fv => {
      fVals[fv.field_id] = fv.value || '';
    });

    setProductFormData({
      name: product.name,
      code: product.code,
      price: product.price ? String(product.price) : '0.00',
      cost_price: product.cost_price ? String(product.cost_price) : '0.00',
      product_type: product.product_type || 'PHYSICAL',
      status: product.status || 'ACTIVE',
      stock_quantity: product.stock_quantity || 0,
      track_inventory: product.track_inventory ?? true,
      category_id: product.category_id ? String(product.category_id) : '',
      description: product.description || '',
      field_values: fVals,
      variants: (product.variants || []).map(v => ({
        sku: v.sku,
        name: v.name,
        price: v.price ? String(v.price) : '0.00',
        stock_quantity: v.stock_quantity || 0
      })),
    });
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formattedFieldValues = Object.entries(productFormData.field_values).map(([fId, val]) => ({
      field_id: parseInt(fId),
      value: Array.isArray(val) ? val.join(', ') : String(val || '')
    }));

    const formattedVariants = productFormData.variants.map(v => ({
      sku: v.sku,
      name: v.name,
      price: parseFloat(v.price) || 0.0,
      stock_quantity: parseInt(v.stock_quantity) || 0
    }));

    const payload = {
      name: productFormData.name,
      code: productFormData.code,
      price: parseFloat(productFormData.price) || 0.0,
      cost_price: parseFloat(productFormData.cost_price) || 0.0,
      product_type: productFormData.product_type,
      status: productFormData.status,
      stock_quantity: parseInt(productFormData.stock_quantity) || 0,
      track_inventory: productFormData.track_inventory,
      category_id: productFormData.category_id ? parseInt(productFormData.category_id) : null,
      description: productFormData.description,
      field_values: formattedFieldValues,
      variants: formattedVariants
    };

    try {
      if (editProduct) {
        await crmAPI.updateProduct(editProduct.id, payload);
      } else {
        await crmAPI.createProduct(payload);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await crmAPI.deleteProduct(id);
      loadData();
    } catch (err) {
      alert("Failed to delete product: " + err.message);
    }
  };

  // ─── Custom Field Settings Handlers (Module 13) ─────────────────────────────

  const openCreateFieldModal = () => {
    setEditField(null);
    setFieldFormData({
      name: '',
      label: '',
      field_type: 'TEXT',
      description: '',
      unit: '',
      required: false,
      filterable: true,
      searchable: true,
      sortable: true,
      display_order: fields.length + 1,
      options: []
    });
    setNewOptionInput('');
    setShowFieldModal(true);
  };

  const openEditFieldModal = (field) => {
    setEditField(field);
    setFieldFormData({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      description: field.description || '',
      unit: field.unit || '',
      required: field.required,
      filterable: field.filterable,
      searchable: field.searchable,
      sortable: field.sortable,
      display_order: field.display_order || 0,
      options: (field.options || []).map(o => ({ label: o.label, value: o.value }))
    });
    setNewOptionInput('');
    setShowFieldModal(true);
  };

  const handleAddFieldOption = () => {
    if (!newOptionInput.trim()) return;
    const val = newOptionInput.trim();
    setFieldFormData(prev => ({
      ...prev,
      options: [...prev.options, { label: val, value: val }]
    }));
    setNewOptionInput('');
  };

  const handleRemoveFieldOption = (idx) => {
    setFieldFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }));
  };

  const handleFieldSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editField) {
        await crmAPI.updateProductField(editField.id, {
          label: fieldFormData.label,
          description: fieldFormData.description,
          unit: fieldFormData.unit,
          required: fieldFormData.required,
          filterable: fieldFormData.filterable,
          searchable: fieldFormData.searchable,
          sortable: fieldFormData.sortable,
          display_order: parseInt(fieldFormData.display_order) || 0
        });
      } else {
        await crmAPI.createProductField({
          ...fieldFormData,
          display_order: parseInt(fieldFormData.display_order) || 0
        });
      }
      setShowFieldModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save product field.');
    }
  };

  const handleDeleteField = async (id) => {
    if (!confirm("Are you sure you want to delete this custom field? This will erase all values entered for this field across products.")) return;
    try {
      await crmAPI.deleteProductField(id);
      loadData();
    } catch (err) {
      alert("Failed to delete field: " + err.message);
    }
  };

  // ─── Category Settings Handlers (Module 13) ─────────────────────────────────

  const openCreateCategoryModal = () => {
    setEditCategory(null);
    setCategoryFormData({
      name: '',
      parent_id: '',
      description: '',
      display_order: categories.length + 1
    });
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditCategory(cat);
    setCategoryFormData({
      name: cat.name,
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      description: cat.description || '',
      display_order: cat.display_order || 0
    });
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: categoryFormData.name,
      parent_id: categoryFormData.parent_id ? parseInt(categoryFormData.parent_id) : null,
      description: categoryFormData.description,
      display_order: parseInt(categoryFormData.display_order) || 0
    };
    try {
      if (editCategory) {
        await crmAPI.updateProductCategory(editCategory.id, payload);
      } else {
        await crmAPI.createProductCategory(payload);
      }
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await crmAPI.deleteProductCategory(id);
      loadData();
    } catch (err) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  // Filter products locally
  const filteredProducts = products.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCode = p.code?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDesc) return false;
    }
    if (selectedCategory && String(p.category_id) !== selectedCategory) {
      return false;
    }
    if (selectedProductType && p.product_type !== selectedProductType) {
      return false;
    }
    return true;
  });

  if (isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="alert-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> Super Admin manages SaaS platform organizations and does not access tenant product catalogs directly.
        </div>
      </div>
    );
  }

  if (!canViewProducts) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view Products. Please contact your organization Administrator to request access.
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
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={24} style={{ color: 'var(--accent-primary)' }} />
            Dynamic Multi-Industry Product Engine
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage your organization's custom product catalog, field structure, and categories.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'catalog' && canCreateProducts && (
            <button className="btn btn-primary" onClick={openCreateProductModal}>
              <Plus size={16} /> Add Product
            </button>
          )}
          {activeTab === 'fields' && canEditProducts && (
            <button className="btn btn-primary" onClick={openCreateFieldModal}>
              <Plus size={16} /> Add Custom Field
            </button>
          )}
          {activeTab === 'categories' && canEditProducts && (
            <button className="btn btn-primary" onClick={openCreateCategoryModal}>
              <Plus size={16} /> Add Category
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs Header (Module 13 Settings Integration) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '10px 18px', background: 'none', border: 'none',
            borderBottom: activeTab === 'catalog' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'catalog' ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Package size={16} /> Product Catalog ({products.length})
        </button>

        {canEditProducts && (
          <>
            <button
              onClick={() => setActiveTab('fields')}
              style={{
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: activeTab === 'fields' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'fields' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <SlidersHorizontal size={16} /> Custom Industry Fields ({fields.length})
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              style={{
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: activeTab === 'categories' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'categories' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Layers size={16} /> Product Categories
            </button>
          </>
        )}
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'catalog' && (
        <>
          {/* Filter Toolbar */}
          <div className="panel-card" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search products by name, SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <select className="form-input" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select className="form-input" value={selectedProductType} onChange={e => setSelectedProductType(e.target.value)}>
                  <option value="">All Product Types</option>
                  <option value="PHYSICAL">Physical Product</option>
                  <option value="DIGITAL">Digital Product</option>
                  <option value="SERVICE">Service / SLA</option>
                  <option value="SUBSCRIPTION">SaaS Subscription</option>
                </select>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Showing <strong>{filteredProducts.length}</strong> of {products.length} products
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="panel-card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>SKU Code</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Selling Price</th>
                    <th>Stock</th>
                    <th>Dynamic Attributes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Loading dynamic product engine...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No products match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isExpanded = expandedProductIds.includes(prod.id);
                      return (
                        <Fragment key={prod.id}>
                          <tr>
                            <td>
                              <button
                                onClick={() => toggleExpand(prod.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            </td>
                            <td>
                              <span className="badge badge-new" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {prod.code}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{prod.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{prod.product_type}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                {prod.category_name || 'Uncategorized'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                              {formatCurrency(prod.price)}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.82rem', padding: '3px 8px', borderRadius: '4px',
                                background: prod.stock_quantity > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                color: prod.stock_quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                fontWeight: 600
                              }}>
                                {prod.stock_quantity} in stock
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                                {(prod.field_values || []).slice(0, 3).map(fv => (
                                  <span key={fv.id} style={{
                                    fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px',
                                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                                    color: 'var(--accent-primary)'
                                  }}>
                                    <strong>{fv.field_label || fv.field_name}:</strong> {fv.value}
                                  </span>
                                ))}
                                {(prod.field_values || []).length > 3 && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    +{(prod.field_values || []).length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {canEditProducts && (
                                  <button className="btn btn-secondary btn-sm" onClick={() => openEditProductModal(prod)}>
                                    <Edit3 size={14} /> Edit
                                  </button>
                                )}
                                {canDeleteProducts && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)' }}
                                    onClick={() => handleDeleteProduct(prod.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                {!canEditProducts && !canDeleteProducts && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr style={{ background: 'var(--bg-tertiary)' }}>
                              <td colSpan={8} style={{ padding: '16px 24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                  {/* Custom Dynamic Fields */}
                                  <div>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                                      📋 Industry Specific Field Values
                                    </h4>
                                    {prod.field_values && prod.field_values.length > 0 ? (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {prod.field_values.map(fv => (
                                          <div key={fv.id} style={{ padding: '6px 10px', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.82rem' }}>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{fv.field_label}</div>
                                            <div style={{ fontWeight: 600 }}>{fv.value || 'N/A'}</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No dynamic field values recorded.</p>
                                    )}
                                  </div>

                                  {/* Variants */}
                                  <div>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                                      📦 Product Variants ({prod.variants ? prod.variants.length : 0})
                                    </h4>
                                    {prod.variants && prod.variants.length > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {prod.variants.map(v => (
                                          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.82rem' }}>
                                            <div>
                                              <strong>{v.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({v.sku})</span>
                                            </div>
                                            <div>
                                              <span style={{ fontWeight: 700, color: 'var(--color-success)', marginRight: '12px' }}>{formatCurrency(v.price)}</span>
                                              <span style={{ color: 'var(--text-muted)' }}>{v.stock_quantity} in stock</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No variants created for this product.</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: CUSTOM INDUSTRY FIELDS SETTINGS (MODULE 13) */}
      {activeTab === 'fields' && (
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Active Industry Product Fields ({fields.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={openCreateFieldModal}>
              <Plus size={14} /> Add Custom Field
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field Label</th>
                  <th>Code Name</th>
                  <th>Data Type</th>
                  <th>Unit</th>
                  <th>Predefined Options</th>
                  <th>Toggles</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No custom product fields created yet.
                    </td>
                  </tr>
                ) : (
                  fields.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{f.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.description || 'No description'}</div>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.82rem', color: 'var(--accent-primary)' }}>{f.name}</code>
                      </td>
                      <td>
                        <span className="badge badge-new" style={{ fontSize: '0.75rem' }}>{f.field_type}</span>
                      </td>
                      <td>{f.unit || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '260px' }}>
                          {(f.options || []).map(opt => (
                            <span key={opt.id} style={{
                              fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)'
                            }}>
                              {opt.label}
                            </span>
                          ))}
                          {(!f.options || f.options.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {f.required && <span className="badge badge-error" style={{ fontSize: '0.68rem' }}>Required</span>}
                          {f.filterable && <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>Filterable</span>}
                          {f.searchable && <span className="badge badge-converted" style={{ fontSize: '0.68rem' }}>Searchable</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditFieldModal(f)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)' }}
                            onClick={() => handleDeleteField(f.id)}
                          >
                            <Trash2 size={14} />
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
      )}

      {/* TAB 3: PRODUCT CATEGORIES (MODULE 13) */}
      {activeTab === 'categories' && (
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Hierarchical Product Categories ({categories.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={openCreateCategoryModal}>
              <Plus size={14} /> Add Category
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Subcategories</th>
                  <th>Description</th>
                  <th>Display Order</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No categories created yet.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                        📂 {cat.name}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(cat.children || []).map(child => (
                            <span key={child.id} style={{
                              fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px',
                              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)'
                            }}>
                              └ {child.name}
                            </span>
                          ))}
                          {(!cat.children || cat.children.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{cat.description || 'No description'}</td>
                      <td>{cat.display_order}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditCategoryModal(cat)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)' }}
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <Trash2 size={14} />
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
      )}

      {/* MODAL 1: Create / Edit Product */}
      {showProductModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h3 className="panel-title">{editProduct ? `Edit Product: ${editProduct.name}` : 'Create Dynamic Product'}</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Core Standard Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" required value={productFormData.name} onChange={e => setProductFormData({ ...productFormData, name: e.target.value })} placeholder="e.g. Slim Fit Denim Shirt" />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU Code *</label>
                  <input className="form-input" required value={productFormData.code} onChange={e => setProductFormData({ ...productFormData, code: e.target.value })} placeholder="SHIRT-DNM-001" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Selling Price ($) *</label>
                  <input className="form-input" type="number" step="0.01" required value={productFormData.price} onChange={e => setProductFormData({ ...productFormData, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price ($)</label>
                  <input className="form-input" type="number" step="0.01" value={productFormData.cost_price} onChange={e => setProductFormData({ ...productFormData, cost_price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input className="form-input" type="number" value={productFormData.stock_quantity} onChange={e => setProductFormData({ ...productFormData, stock_quantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Type</label>
                  <select className="form-input" value={productFormData.product_type} onChange={e => setProductFormData({ ...productFormData, product_type: e.target.value })}>
                    <option value="PHYSICAL">Physical Product</option>
                    <option value="DIGITAL">Digital Product</option>
                    <option value="SERVICE">Service</option>
                    <option value="SUBSCRIPTION">SaaS Subscription</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={productFormData.category_id} onChange={e => setProductFormData({ ...productFormData, category_id: e.target.value })}>
                    <option value="">Select Category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={productFormData.status} onChange={e => setProductFormData({ ...productFormData, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              {/* Industry Dynamic Custom Fields Section */}
              {fields.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '12px' }}>
                    ✨ Organization Dynamic Industry Fields ({fields.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {fields.map(f => {
                      const val = productFormData.field_values[f.id] ?? '';
                      return (
                        <div key={f.id} className="form-group">
                          <label className="form-label">
                            {f.label} {f.unit ? `(${f.unit})` : ''} {f.required ? '*' : ''}
                          </label>

                          {f.field_type === 'SELECT' ? (
                            <select
                              className="form-input"
                              value={val}
                              onChange={e => setProductFormData(prev => ({
                                ...prev,
                                field_values: { ...prev.field_values, [f.id]: e.target.value }
                              }))}
                            >
                              <option value="">Select {f.label}...</option>
                              {(f.options || []).map(opt => (
                                <option key={opt.id} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : f.field_type === 'MULTI_SELECT' ? (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                              {(f.options || []).map(opt => {
                                const isChecked = (val || '').includes(opt.value);
                                return (
                                  <label key={opt.id} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        let currentList = (val || '').split(', ').filter(Boolean);
                                        if (isChecked) {
                                          currentList = currentList.filter(v => v !== opt.value);
                                        } else {
                                          currentList.push(opt.value);
                                        }
                                        setProductFormData(prev => ({
                                          ...prev,
                                          field_values: { ...prev.field_values, [f.id]: currentList.join(', ') }
                                        }));
                                      }}
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : f.field_type === 'BOOLEAN' ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={val === 'true' || val === true}
                                onChange={e => setProductFormData(prev => ({
                                  ...prev,
                                  field_values: { ...prev.field_values, [f.id]: e.target.checked ? 'true' : 'false' }
                                }))}
                              />
                              <span style={{ fontSize: '0.85rem' }}>Enabled / Yes</span>
                            </label>
                          ) : (
                            <input
                              className="form-input"
                              type={f.field_type === 'NUMBER' || f.field_type === 'CURRENCY' ? 'number' : 'text'}
                              placeholder={`Enter ${f.label.toLowerCase()}`}
                              value={val}
                              onChange={e => setProductFormData(prev => ({
                                ...prev,
                                field_values: { ...prev.field_values, [f.id]: e.target.value }
                              }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Variants Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    📦 Product Variants & SKUs ({productFormData.variants.length})
                  </h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setProductFormData(prev => ({
                    ...prev,
                    variants: [...prev.variants, { sku: `${prev.code || 'VAR'}-${prev.variants.length + 1}`, name: 'New Variant', price: prev.price, stock_quantity: 0 }]
                  }))}>
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                {productFormData.variants.map((v, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 40px', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                    <input className="form-input" placeholder="SKU" value={v.sku} onChange={e => {
                      const updated = [...productFormData.variants];
                      updated[idx].sku = e.target.value;
                      setProductFormData({ ...productFormData, variants: updated });
                    }} />
                    <input className="form-input" placeholder="Variant Name" value={v.name} onChange={e => {
                      const updated = [...productFormData.variants];
                      updated[idx].name = e.target.value;
                      setProductFormData({ ...productFormData, variants: updated });
                    }} />
                    <input className="form-input" type="number" step="0.01" placeholder="Price" value={v.price} onChange={e => {
                      const updated = [...productFormData.variants];
                      updated[idx].price = e.target.value;
                      setProductFormData({ ...productFormData, variants: updated });
                    }} />
                    <input className="form-input" type="number" placeholder="Stock" value={v.stock_quantity} onChange={e => {
                      const updated = [...productFormData.variants];
                      updated[idx].stock_quantity = e.target.value;
                      setProductFormData({ ...productFormData, variants: updated });
                    }} />
                    <button type="button" onClick={() => setProductFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }))} style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', border: 'none', borderRadius: '4px', padding: '8px', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <label className="form-label">Description & Specifications</label>
                <textarea className="form-textarea" rows={3} value={productFormData.description} onChange={e => setProductFormData({ ...productFormData, description: e.target.value })} placeholder="Detailed item description..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Custom Field (Module 13) */}
      {showFieldModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h3 className="panel-title">{editField ? `Edit Field: ${editField.label}` : 'Add Tenant Custom Product Field'}</h3>
              <button onClick={() => setShowFieldModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFieldSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Field Label *</label>
                  <input className="form-input" required placeholder="e.g. Battery Capacity" value={fieldFormData.label} onChange={e => setFieldFormData({ ...fieldFormData, label: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">System Code Name *</label>
                  <input className="form-input" required disabled={!!editField} placeholder="e.g. battery_capacity" value={fieldFormData.name} onChange={e => setFieldFormData({ ...fieldFormData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Field Data Type *</label>
                  <select className="form-input" disabled={!!editField} value={fieldFormData.field_type} onChange={e => setFieldFormData({ ...fieldFormData, field_type: e.target.value })}>
                    <option value="TEXT">Short Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="CURRENCY">Currency Amount</option>
                    <option value="SELECT">Single Select Dropdown</option>
                    <option value="MULTI_SELECT">Multi-Select Checkboxes</option>
                    <option value="BOOLEAN">Boolean Checkbox</option>
                    <option value="DATE">Date Picker</option>
                    <option value="URL">URL / Link</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Measurement Unit</label>
                  <input className="form-input" placeholder="e.g. mAh, GB, cm" value={fieldFormData.unit} onChange={e => setFieldFormData({ ...fieldFormData, unit: e.target.value })} />
                </div>
              </div>

              {/* Predefined Options for Select / Multi-Select */}
              {['SELECT', 'MULTI_SELECT'].includes(fieldFormData.field_type) && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Predefined Dropdown Options</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input className="form-input" placeholder="Enter option value (e.g. 5000mAh)" value={newOptionInput} onChange={e => setNewOptionInput(e.target.value)} />
                    <button type="button" className="btn btn-secondary" onClick={handleAddFieldOption}>Add</button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {fieldFormData.options.map((opt, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px',
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        {opt.label}
                        <X size={13} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFieldOption(idx)} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldFormData.required} onChange={e => setFieldFormData({ ...fieldFormData, required: e.target.checked })} />
                  <span>Required</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldFormData.filterable} onChange={e => setFieldFormData({ ...fieldFormData, filterable: e.target.checked })} />
                  <span>Filterable</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fieldFormData.searchable} onChange={e => setFieldFormData({ ...fieldFormData, searchable: e.target.checked })} />
                  <span>Searchable</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFieldModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editField ? 'Save Field' : 'Create Custom Field'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create / Edit Category (Module 13) */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h3 className="panel-title">{editCategory ? `Edit Category: ${editCategory.name}` : 'Add Product Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input className="form-input" required placeholder="e.g. Footwear / Outerwear" value={categoryFormData.name} onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Category (Optional)</label>
                <select className="form-input" value={categoryFormData.parent_id} onChange={e => setCategoryFormData({ ...categoryFormData, parent_id: e.target.value })}>
                  <option value="">None (Top-Level Category)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} placeholder="Category description..." value={categoryFormData.description} onChange={e => setCategoryFormData({ ...categoryFormData, description: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editCategory ? 'Save Category' : 'Create Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
