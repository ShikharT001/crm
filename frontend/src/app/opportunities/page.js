'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { crmAPI, authHelpers } from '@/lib/api';
import {
  Plus, X, DollarSign, Calendar, TrendingUp, AlertCircle, Package,
  Search, Filter, LayoutGrid, List, BarChart3, ChevronRight,
  CheckCircle2, XCircle, ArrowRight, Eye, Briefcase, Building2,
  SlidersHorizontal, RefreshCw, Layers, ArrowUpRight, Clock,
  ChevronLeft, Sparkles, ChevronDown, Check, PhoneCall, Video, Trash2
} from 'lucide-react';

const STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_CONFIG = {
  "Prospecting": {
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)',
    probability: 0.10,
    desc: 'Initial outreach & lead contact'
  },
  "Qualification": {
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.25)',
    probability: 0.30,
    desc: 'Needs analysis & budget confirmed'
  },
  "Proposal": {
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.25)',
    probability: 0.60,
    desc: 'Formal quote or proposal submitted'
  },
  "Negotiation": {
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    probability: 0.80,
    desc: 'Terms & contract review'
  },
  "Closed Won": {
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.25)',
    probability: 1.00,
    desc: 'Successfully signed deal'
  },
  "Closed Lost": {
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.25)',
    probability: 0.00,
    desc: 'Opportunity lost or canceled'
  }
};

// ─── Safe Numeric & Currency Helpers ─────────────────────────────────────────

function getNumericValue(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(val) {
  const num = getNumericValue(val);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

function formatCompactNumber(val) {
  const num = getNumericValue(val);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export default function PipelinePage() {
  const currentUser = authHelpers.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = (key) => {
    if (!currentUser) return false;
    if (isSuperAdmin || isAdmin) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(key);
  };

  const canViewOpps = hasPerm('opportunities.view');
  const canCreateOpps = hasPerm('opportunities.create');
  const canEditOpps = hasPerm('opportunities.edit');

  // Raw data states
  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Window management states
  const [activeView, setActiveView] = useState('kanban'); // 'kanban' | 'stage_tabs' | 'table' | 'analytics'
  const [selectedStageTab, setSelectedStageTab] = useState('all'); // for stage tabs window
  const [selectedDeal, setSelectedDeal] = useState(null); // opens Slide-Over Deal Inspector
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterValueRange, setFilterValueRange] = useState('all'); // all, under10k, 10k_50k, 50k_100k, above100k
  const [sortBy, setSortBy] = useState('value_desc'); // value_desc, value_asc, date_soon, newest, title_asc

  // Kanban Performance Windowing: Max visible items per column initially
  const [visibleCountMap, setVisibleCountMap] = useState({
    "Prospecting": 8,
    "Qualification": 8,
    "Proposal": 8,
    "Negotiation": 8,
    "Closed Won": 8,
    "Closed Lost": 8
  });
  const [collapsedStages, setCollapsedStages] = useState(new Set());

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(25);

  // Stage Tab window pagination
  const [stageTabPage, setStageTabPage] = useState(1);
  const stageTabItemsPerPage = 12;

  // New Deal Form State
  const [formData, setFormData] = useState({
    title: '',
    customer_id: '',
    value: 0.0,
    stage: 'Prospecting',
    close_date: '',
    selected_product_ids: []
  });

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [oppsData, custsData, prodsData] = await Promise.all([
        crmAPI.getOpportunities().catch(() => []),
        crmAPI.getCustomers().catch(() => []),
        crmAPI.getProducts().catch(() => [])
      ]);
      setOpportunities(oppsData || []);
      setCustomers(custsData || []);
      setProducts(prodsData || []);
      if (custsData && custsData.length > 0 && !formData.customer_id) {
        setFormData(prev => ({ ...prev, customer_id: custsData[0].id }));
      }
    } catch (err) {
      console.error("Error loading pipeline data:", err);
    } finally {
      setLoading(false);
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (!isSuperAdmin && canViewOpps) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, canViewOpps, loadData]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleStageChange = async (oppId, newStage) => {
    try {
      await crmAPI.updateOpportunity(oppId, { stage: newStage });
      setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage: newStage } : o));
      if (selectedDeal && selectedDeal.id === oppId) {
        setSelectedDeal(prev => ({ ...prev, stage: newStage }));
      }
    } catch (err) {
      alert("Failed to update stage: " + err.message);
    }
  };

  const handleProductToggle = (prodId) => {
    setFormData(prev => {
      const current = prev.selected_product_ids || [];
      const isSelected = current.includes(prodId);
      const updated = isSelected ? current.filter(id => id !== prodId) : [...current, prodId];

      const newTotal = updated.reduce((sum, pId) => {
        const prod = products.find(p => p.id === pId);
        return sum + (prod ? getNumericValue(prod.price) : 0);
      }, 0);

      return {
        ...prev,
        selected_product_ids: updated,
        value: newTotal > 0 ? newTotal : prev.value
      };
    });
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert("Please select a customer account.");
      return;
    }
    try {
      await crmAPI.createOpportunity({
        title: formData.title,
        customer_id: parseInt(formData.customer_id),
        value: getNumericValue(formData.value),
        stage: formData.stage,
        close_date: formData.close_date || null,
        product_ids: formData.selected_product_ids
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        customer_id: customers[0]?.id || '',
        value: 0.0,
        stage: 'Prospecting',
        close_date: '',
        selected_product_ids: []
      });
      loadData();
    } catch (err) {
      alert("Failed to create opportunity: " + err.message);
    }
  };

  const toggleColumnCollapse = (stage) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const handleLoadMoreInColumn = (stage) => {
    setVisibleCountMap(prev => ({
      ...prev,
      [stage]: (prev[stage] || 8) + 12
    }));
  };

  // Helper: map customer_id to Customer Name
  const getCustomerName = (opp) => {
    if (opp.customer_name) return opp.customer_name;
    const found = customers.find(c => c.id === opp.customer_id);
    return found ? found.name : `Customer #${opp.customer_id}`;
  };

  // ─── Filter & Search Engine (Scales smoothly to 1,000+ items) ───────────────

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (opp.title || '').toLowerCase().includes(q);
        const custMatch = getCustomerName(opp).toLowerCase().includes(q);
        const stageMatch = (opp.stage || '').toLowerCase().includes(q);
        if (!titleMatch && !custMatch && !stageMatch) return false;
      }

      // Stage filter
      if (filterStage !== 'all' && opp.stage !== filterStage) {
        return false;
      }

      // Value range filter
      const val = getNumericValue(opp.value);
      if (filterValueRange === 'under10k' && val >= 10000) return false;
      if (filterValueRange === '10k_50k' && (val < 10000 || val > 50000)) return false;
      if (filterValueRange === '50k_100k' && (val < 50000 || val > 100000)) return false;
      if (filterValueRange === 'above100k' && val <= 100000) return false;

      return true;
    }).sort((a, b) => {
      const valA = getNumericValue(a.value);
      const valB = getNumericValue(b.value);

      if (sortBy === 'value_desc') return valB - valA;
      if (sortBy === 'value_asc') return valA - valB;
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'date_soon') {
        if (!a.close_date) return 1;
        if (!b.close_date) return -1;
        return new Date(a.close_date) - new Date(b.close_date);
      }
      if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
      return 0;
    });
  }, [opportunities, customers, searchQuery, filterStage, filterValueRange, sortBy]);

  // ─── Executive Metrics Computations (Instant & Accurate) ───────────────────

  const metrics = useMemo(() => {
    let totalVal = 0;
    let weightedVal = 0;
    let wonCount = 0;
    let lostCount = 0;
    let activeCount = 0;

    opportunities.forEach(o => {
      const val = getNumericValue(o.value);
      totalVal += val;
      const prob = STAGE_CONFIG[o.stage]?.probability || 0;
      weightedVal += val * prob;

      if (o.stage === 'Closed Won') wonCount++;
      else if (o.stage === 'Closed Lost') lostCount++;
      else activeCount++;
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
    const avgDeal = opportunities.length > 0 ? Math.round(totalVal / opportunities.length) : 0;

    return {
      totalVal,
      weightedVal,
      totalCount: opportunities.length,
      activeCount,
      wonCount,
      lostCount,
      winRate,
      avgDeal
    };
  }, [opportunities]);

  // ─── Stage Specific Grouping ───────────────────────────────────────────────

  const stageGroups = useMemo(() => {
    const map = {};
    STAGES.forEach(s => {
      map[s] = { count: 0, totalVal: 0, items: [] };
    });

    filteredOpportunities.forEach(opp => {
      const stage = opp.stage || 'Prospecting';
      if (!map[stage]) {
        map[stage] = { count: 0, totalVal: 0, items: [] };
      }
      map[stage].items.push(opp);
      map[stage].count += 1;
      map[stage].totalVal += getNumericValue(opp.value);
    });

    return map;
  }, [filteredOpportunities]);

  // Table pagination data slice
  const paginatedTableData = useMemo(() => {
    const start = (tablePage - 1) * tableRowsPerPage;
    return filteredOpportunities.slice(start, start + tableRowsPerPage);
  }, [filteredOpportunities, tablePage, tableRowsPerPage]);

  const totalTablePages = Math.ceil(filteredOpportunities.length / tableRowsPerPage) || 1;

  // Stage Tab data slice
  const stageTabDeals = useMemo(() => {
    if (selectedStageTab === 'all') return filteredOpportunities;
    return filteredOpportunities.filter(o => o.stage === selectedStageTab);
  }, [filteredOpportunities, selectedStageTab]);

  const paginatedStageTabData = useMemo(() => {
    const start = (stageTabPage - 1) * stageTabItemsPerPage;
    return stageTabDeals.slice(start, start + stageTabItemsPerPage);
  }, [stageTabDeals, stageTabPage]);

  const totalStageTabPages = Math.ceil(stageTabDeals.length / stageTabItemsPerPage) || 1;

  if (isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="alert-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> Super Admin manages SaaS platform organizations and does not use tenant-specific CRM features.
        </div>
      </div>
    );
  }

  if (!canViewOpps) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="panel-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-danger)15', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You do not have permission to view Pipeline Deals. Please contact your organization Administrator to request access.
          </p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ─── Top Page Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Sales Deals Pipeline
            </h2>
            <span style={{
              fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 700
            }}>
              {opportunities.length} Total Deals
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
            Track high-volume deal velocity across sales stages, manage product line items, and schedule client calls
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadData()}
            className="btn btn-secondary"
            title="Refresh Pipeline"
            style={{ padding: '8px 12px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {canCreateOpps && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> New Opportunity
            </button>
          )}
        </div>
      </div>

      {/* ─── Executive Metric KPI Ribbon ──────────────────────────────────── */}
      <div className="pipeline-metrics-grid">
        <div className="pipeline-stat-card">
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Pipeline Value
            </span>
            <div style={{ fontSize: '1.28rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {formatCurrency(metrics.totalVal)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {metrics.activeCount} active in progress
            </span>
          </div>
        </div>

        <div className="pipeline-stat-card">
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Weighted Forecast
            </span>
            <div style={{ fontSize: '1.28rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
              {formatCurrency(metrics.weightedVal)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Expected probability value
            </span>
          </div>
        </div>

        <div className="pipeline-stat-card">
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Avg Deal Size
            </span>
            <div style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(metrics.avgDeal)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Per opportunity
            </span>
          </div>
        </div>

        <div className="pipeline-stat-card">
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Win Rate
            </span>
            <div style={{ fontSize: '1.28rem', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>
              {metrics.winRate}%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {metrics.wonCount} won vs {metrics.lostCount} lost
            </span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & View Mode Switcher ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="pipeline-tab-group">
          <button
            onClick={() => setActiveView('kanban')}
            className={`pipeline-tab-btn ${activeView === 'kanban' ? 'active' : ''}`}
          >
            <LayoutGrid size={15} />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveView('stage_tabs')}
            className={`pipeline-tab-btn ${activeView === 'stage_tabs' ? 'active' : ''}`}
          >
            <Layers size={15} />
            <span>Stage Focus Windows</span>
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`pipeline-tab-btn ${activeView === 'table' ? 'active' : ''}`}
          >
            <List size={15} />
            <span>Data Grid (1000+ Table)</span>
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`pipeline-tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={15} />
            <span>Funnel Analytics</span>
          </button>
        </div>

        {/* Quick Filter Counters Summary */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Filtered: <strong style={{ color: 'var(--text-primary)' }}>{filteredOpportunities.length}</strong> of {opportunities.length}</span>
          {(searchQuery || filterStage !== 'all' || filterValueRange !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setFilterStage('all'); setFilterValueRange('all'); }}
              style={{
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Global Filtering & Search Toolbar ─────────────────────────────── */}
      <div className="pipeline-filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.84rem' }}
              placeholder="Search by deal title, customer, or stage..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setTablePage(1); setStageTabPage(1); }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stage Dropdown Filter */}
          <select
            className="form-select"
            style={{ width: '160px', height: '36px', fontSize: '0.82rem', padding: '0 10px' }}
            value={filterStage}
            onChange={e => { setFilterStage(e.target.value); setTablePage(1); setStageTabPage(1); }}
          >
            <option value="all">All Stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Deal Value Filter */}
          <select
            className="form-select"
            style={{ width: '160px', height: '36px', fontSize: '0.82rem', padding: '0 10px' }}
            value={filterValueRange}
            onChange={e => { setFilterValueRange(e.target.value); setTablePage(1); setStageTabPage(1); }}
          >
            <option value="all">All Deal Sizes</option>
            <option value="under10k">&lt; $10,000</option>
            <option value="10k_50k">$10,000 - $50,000</option>
            <option value="50k_100k">$50,000 - $100,000</option>
            <option value="above100k">&gt; $100,000</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort:</span>
          <select
            className="form-select"
            style={{ width: '170px', height: '36px', fontSize: '0.82rem', padding: '0 10px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="value_desc">Value: High to Low</option>
            <option value="value_asc">Value: Low to High</option>
            <option value="date_soon">Close Date: Soonest</option>
            <option value="newest">Recently Created</option>
            <option value="title_asc">Title: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* ─── Content Windows ──────────────────────────────────────────────── */}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent-primary)' }} />
          Loading pipeline opportunities...
        </div>
      ) : activeView === 'kanban' ? (
        /* ══════════════════════════════════════════════════════════════════ */
        /* VIEW 1: KANBAN BOARD WITH WINDOWED CHUNKING FOR 1,000+ DEALS      */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="kanban-horizontal-scroll">
          {STAGES.map(stage => {
            const stageInfo = STAGE_CONFIG[stage] || STAGE_CONFIG["Prospecting"];
            const group = stageGroups[stage] || { count: 0, totalVal: 0, items: [] };
            const isCollapsed = collapsedStages.has(stage);
            const visibleLimit = visibleCountMap[stage] || 8;
            const displayedItems = group.items.slice(0, visibleLimit);
            const remainingCount = group.items.length - displayedItems.length;

            if (isCollapsed) {
              return (
                <div
                  key={stage}
                  className="kanban-stage-col collapsed"
                  onClick={() => toggleColumnCollapse(stage)}
                  title={`Click to expand ${stage}`}
                >
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, color: stageInfo.color }}>
                    <span>{stage}</span>
                    <span style={{ background: stageInfo.bg, padding: '4px 6px', borderRadius: '10px', fontSize: '0.74rem' }}>
                      {group.count}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={stage} className="kanban-stage-col">
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageInfo.color }} />
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stage}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px',
                      background: stageInfo.bg, color: stageInfo.color,
                      border: `1px solid ${stageInfo.border}`, fontWeight: 700
                    }}>
                      {group.count}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleColumnCollapse(stage)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    title="Collapse column"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>

                {/* Total Column Amount (Fixed NaN!) */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stage Total:</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: stage === 'Closed Won' ? '#34d399' : 'var(--text-primary)' }}>
                    {formatCurrency(group.totalVal)}
                  </span>
                </div>

                {/* Cards Container with windowed chunking */}
                <div className="kanban-col-cards">
                  {displayedItems.length === 0 ? (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                      No deals in {stage}
                    </div>
                  ) : (
                    displayedItems.map(opp => (
                      <div
                        key={opp.id}
                        className="deal-card"
                        onClick={() => setSelectedDeal(opp)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <h4 className="deal-title" style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0 }}>
                            {opp.title}
                          </h4>
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }}>
                            {formatCurrency(opp.value)}
                          </span>
                        </div>

                        {/* Customer name */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={12} />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {getCustomerName(opp)}
                          </span>
                        </div>

                        {/* Close date & details */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {opp.close_date ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={11} /> {opp.close_date}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No date set</span>
                          )}

                          <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>
                            Details →
                          </span>
                        </div>

                        {/* Quick stage changer footer */}
                        <div
                          style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <select
                            className="form-select"
                            style={{ fontSize: '0.76rem', padding: '4px 8px', height: '28px' }}
                            value={opp.stage}
                            onChange={e => handleStageChange(opp.id, e.target.value)}
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Windowing: "Load more" button for columns with 100+ deals */}
                  {remainingCount > 0 && (
                    <button
                      onClick={() => handleLoadMoreInColumn(stage)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#818cf8',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      + Show {Math.min(12, remainingCount)} more ({remainingCount} remaining)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeView === 'stage_tabs' ? (
        /* ══════════════════════════════════════════════════════════════════ */
        /* VIEW 2: DEDICATED STAGE FOCUS WINDOWS (Ideal for 1,000+ Deals)    */
        /* ══════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Horizontal Stage Selection Ribbon */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto',
            padding: '4px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => { setSelectedStageTab('all'); setStageTabPage(1); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                borderRadius: '10px', fontSize: '0.84rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: selectedStageTab === 'all' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                color: selectedStageTab === 'all' ? '#fff' : 'var(--text-secondary)',
                boxShadow: selectedStageTab === 'all' ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                whiteSpace: 'nowrap', transition: 'all 0.15s ease'
              }}
            >
              <span>All Stages</span>
              <span style={{
                fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px',
                background: selectedStageTab === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                color: selectedStageTab === 'all' ? '#fff' : 'var(--text-muted)'
              }}>
                {filteredOpportunities.length}
              </span>
            </button>

            {STAGES.map(s => {
              const info = STAGE_CONFIG[s] || STAGE_CONFIG["Prospecting"];
              const count = (stageGroups[s]?.count || 0);
              const val = (stageGroups[s]?.totalVal || 0);
              const isSelected = selectedStageTab === s;

              return (
                <button
                  key={s}
                  onClick={() => { setSelectedStageTab(s); setStageTabPage(1); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                    borderRadius: '10px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                    background: isSelected ? info.bg : 'transparent',
                    color: isSelected ? info.color : 'var(--text-secondary)',
                    border: isSelected ? `2px solid ${info.color}` : '1px solid transparent',
                    boxShadow: isSelected ? `0 0 16px -2px ${info.color}40` : 'none',
                    whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.color }} />
                  <span>{s}</span>
                  <span style={{
                    fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px',
                    background: isSelected ? `${info.color}25` : 'rgba(255,255,255,0.06)',
                    color: isSelected ? info.color : 'var(--text-muted)'
                  }}>
                    {count} • {formatCompactNumber(val)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Focused Stage Window Summary Banner */}
          {selectedStageTab !== 'all' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderRadius: '12px',
              background: STAGE_CONFIG[selectedStageTab]?.bg || 'rgba(99,102,241,0.1)',
              border: `1px solid ${STAGE_CONFIG[selectedStageTab]?.border || 'rgba(99,102,241,0.2)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: STAGE_CONFIG[selectedStageTab]?.color }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: STAGE_CONFIG[selectedStageTab]?.color, margin: 0 }}>
                    {selectedStageTab} Window
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {STAGE_CONFIG[selectedStageTab]?.desc} • Win probability: {Math.round((STAGE_CONFIG[selectedStageTab]?.probability || 0) * 100)}%
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume</span>
                <div style={{ fontSize: '1.18rem', fontWeight: 800, color: STAGE_CONFIG[selectedStageTab]?.color }}>
                  {formatCurrency(stageGroups[selectedStageTab]?.totalVal || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Paginated Grid of Deals in this Stage */}
          {paginatedStageTabData.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              No deals match your current search and filters for this stage.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {paginatedStageTabData.map(opp => (
                <div
                  key={opp.id}
                  className="deal-card"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px' }}
                  onClick={() => setSelectedDeal(opp)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                      background: STAGE_CONFIG[opp.stage]?.bg, color: STAGE_CONFIG[opp.stage]?.color,
                      border: `1px solid ${STAGE_CONFIG[opp.stage]?.border}`, fontWeight: 700
                    }}>
                      {opp.stage}
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                      {formatCurrency(opp.value)}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px 0' }}>
                    {opp.title}
                  </h3>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} />
                    <span>{getCustomerName(opp)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {opp.close_date || 'No target date'}
                    </span>
                    <span style={{ color: '#818cf8', fontWeight: 700 }}>Inspect Deal →</span>
                  </div>

                  {/* Stage Progress selector */}
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }} onClick={e => e.stopPropagation()}>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.78rem', height: '32px' }}
                      value={opp.stage}
                      onChange={e => handleStageChange(opp.id, e.target.value)}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>Move to: {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stage Tab Pagination Controls */}
          {totalStageTabPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing {(stageTabPage - 1) * stageTabItemsPerPage + 1} - {Math.min(stageTabPage * stageTabItemsPerPage, stageTabDeals.length)} of {stageTabDeals.length} deals
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={stageTabPage === 1}
                  onClick={() => setStageTabPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0 8px' }}>
                  Page {stageTabPage} of {totalStageTabPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={stageTabPage >= totalStageTabPages}
                  onClick={() => setStageTabPage(p => Math.min(totalStageTabPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeView === 'table' ? (
        /* ══════════════════════════════════════════════════════════════════ */
        /* VIEW 3: HIGH-DENSITY ENTERPRISE DATA GRID TABLE (1,000+ DEALS)    */
        /* ══════════════════════════════════════════════════════════════════ */
        <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th>Deal Title</th>
                  <th>Customer Account</th>
                  <th>Stage</th>
                  <th style={{ textAlign: 'right' }}>Deal Value</th>
                  <th>Target Close Date</th>
                  <th style={{ textAlign: 'center' }}>Stage Transition</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTableData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No deals match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTableData.map(opp => {
                    const stageInfo = STAGE_CONFIG[opp.stage] || STAGE_CONFIG["Prospecting"];

                    return (
                      <tr key={opp.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedDeal(opp)}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: stageInfo.color }} />
                            <span>{opp.title}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                            {getCustomerName(opp)}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px',
                            background: stageInfo.bg, color: stageInfo.color,
                            border: `1px solid ${stageInfo.border}`, fontWeight: 700
                          }}>
                            {opp.stage}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#34d399', fontSize: '0.94rem' }}>
                          {formatCurrency(opp.value)}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {opp.close_date || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <select
                            className="form-select"
                            style={{ fontSize: '0.76rem', padding: '3px 8px', height: '28px', maxWidth: '140px' }}
                            value={opp.stage}
                            onChange={e => handleStageChange(opp.id, e.target.value)}
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDeal(opp); }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>
                Showing {(tablePage - 1) * tableRowsPerPage + 1} - {Math.min(tablePage * tableRowsPerPage, filteredOpportunities.length)} of {filteredOpportunities.length} deals
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Rows:</span>
                <select
                  className="form-select"
                  style={{ width: '70px', height: '28px', fontSize: '0.78rem', padding: '0 6px' }}
                  value={tableRowsPerPage}
                  onChange={e => { setTableRowsPerPage(parseInt(e.target.value)); setTablePage(1); }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={tablePage === 1}
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0 8px' }}>
                Page {tablePage} of {totalTablePages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={tablePage >= totalTablePages}
                onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════ */
        /* VIEW 4: FUNNEL VELOCITY & PIPELINE ANALYTICS                      */
        /* ══════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Funnel Stage Breakdown */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Sales Stage Distribution & Funnel
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Volume and total dollar amount flowing across all stages
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {STAGES.map(s => {
                const info = STAGE_CONFIG[s];
                const count = stageGroups[s]?.count || 0;
                const val = stageGroups[s]?.totalVal || 0;
                const pct = opportunities.length > 0 ? Math.round((count / opportunities.length) * 100) : 0;

                return (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 700, color: info.color }}>{s}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{count} deals ({pct}%)</span>
                        <span style={{ fontWeight: 800, color: '#34d399' }}>{formatCurrency(val)}</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', background: info.color,
                        borderRadius: '4px', transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversion Insights & Forecast */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Pipeline Health Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Total Open Deals</span>
                  <span style={{ fontWeight: 800 }}>{metrics.activeCount} opportunities</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Weighted Forecast</span>
                  <span style={{ fontWeight: 800, color: '#818cf8' }}>{formatCurrency(metrics.weightedVal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Closed Won Volume</span>
                  <span style={{ fontWeight: 800, color: '#34d399' }}>{formatCurrency(stageGroups['Closed Won']?.totalVal || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Closed Lost Volume</span>
                  <span style={{ fontWeight: 800, color: '#f87171' }}>{formatCurrency(stageGroups['Closed Lost']?.totalVal || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span style={{ color: '#818cf8', fontSize: '0.84rem', fontWeight: 700 }}>Overall Win Rate</span>
                  <span style={{ fontWeight: 800, color: '#818cf8' }}>{metrics.winRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Slide-Over Deal Inspector Window (Drawer) ────────────────────── */}
      {selectedDeal && (
        <div className="deal-inspector-overlay" onClick={e => e.target === e.currentTarget && setSelectedDeal(null)}>
          <div className="deal-inspector-window">
            {/* Header */}
            <div className="deal-inspector-header">
              <div>
                <span style={{
                  fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px',
                  background: STAGE_CONFIG[selectedDeal.stage]?.bg, color: STAGE_CONFIG[selectedDeal.stage]?.color,
                  border: `1px solid ${STAGE_CONFIG[selectedDeal.stage]?.border}`, fontWeight: 700
                }}>
                  {selectedDeal.stage}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                  {selectedDeal.title}
                </h3>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <Building2 size={13} /> {getCustomerName(selectedDeal)}
                </span>
              </div>

              <button
                onClick={() => setSelectedDeal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: 'var(--text-secondary)', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="deal-inspector-body">
              {/* 1-Click Interactive Stage Progression Chevron */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Stage Progression (Click to advance)
                </label>
                <div className="stage-chevron-bar">
                  {STAGES.map(s => {
                    const isCurrent = selectedDeal.stage === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStageChange(selectedDeal.id, s)}
                        className={`stage-chevron-item ${isCurrent ? 'current' : ''}`}
                        title={`Move deal to ${s}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deal Metrics Card */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                padding: '16px', background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deal Value</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                    {formatCurrency(selectedDeal.value)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Close Date</span>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: '#818cf8' }} /> {selectedDeal.close_date || 'Not set'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Win Probability</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
                    {Math.round((STAGE_CONFIG[selectedDeal.stage]?.probability || 0) * 100)}%
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Forecast Value</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {formatCurrency(getNumericValue(selectedDeal.value) * (STAGE_CONFIG[selectedDeal.stage]?.probability || 0))}
                  </div>
                </div>
              </div>

              {/* CRM Reminder Action for this Deal */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
                padding: '16px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={16} color="#818cf8" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Schedule Call or Sync for this Deal
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add a client reminder, negotiation call, or team sync with an alert reminder when the time arrives.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '6px 14px', gap: '6px' }}
                  onClick={() => {
                    const bell = document.getElementById('header-notification-bell');
                    if (bell) bell.click();
                  }}
                >
                  <Plus size={14} /> Open Schedule Notification
                </button>
              </div>

              {/* Close Drawer Button */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedDeal(null)}>
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Opportunity Modal ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Sales Opportunity</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Deal Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Acme Tech Annual Enterprise SLA Package"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Customer Account *</label>
                <select
                  className="form-select"
                  value={formData.customer_id}
                  onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Products Attachment */}
              {products.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={15} /> Attach Products / Line Items to Deal
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '140px', overflowY: 'auto', padding: '4px' }}>
                    {products.map(prod => {
                      const isChecked = (formData.selected_product_ids || []).includes(prod.id);
                      return (
                        <label key={prod.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px',
                          background: isChecked ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                          border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleProductToggle(prod.id)} />
                            <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prod.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.78rem' }}>{formatCurrency(prod.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Deal Value ($)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="15000"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Initial Stage</label>
                  <select
                    className="form-select"
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Target Close Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.close_date}
                  onChange={e => setFormData({ ...formData, close_date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
