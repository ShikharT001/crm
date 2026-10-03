'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, X, Plus, Calendar, CheckCircle2, Clock, PhoneCall,
  ListTodo, Users, ExternalLink, Trash2, Check,
  Volume2, Sparkles, Filter, AlertCircle, Video, Search,
  MapPin, Briefcase, Zap, Sun
} from 'lucide-react';
import { crmAPI, authHelpers } from '@/lib/api';

// ─── Web Audio Chime Generator ───────────────────────────────────────────────

function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);
  } catch (e) {
    // Web audio blocked before user gesture or unavailable
  }
}

// ─── Format & Timezone Helpers ───────────────────────────────────────────────

function parseServerDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let str = String(dateStr).trim();
  if (!str) return null;
  // If already has Z or explicit offset (+05:30 / -04:00), parse directly
  if (str.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(str)) {
    return new Date(str);
  }
  // SQLite naive UTC timestamp (no timezone saved in DB, so treat as UTC)
  return new Date(str.replace(' ', 'T') + 'Z');
}

function formatForDateTimeInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = parseServerDate(dateStr);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${timeStr}`;
  }

  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function getTimeDifferenceLabel(dateStr) {
  if (!dateStr) return '';
  const d = parseServerDate(dateStr);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = d - now;
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < -60) {
    const hours = Math.abs(Math.round(diffMin / 60));
    return `Overdue by ${hours}h`;
  }
  if (diffMin < 0) {
    return `Overdue by ${Math.abs(diffMin)}m`;
  }
  if (diffMin <= 5) {
    return 'Due now / Starting!';
  }
  if (diffMin < 60) {
    return `In ${diffMin} mins`;
  }
  const diffHours = Math.round(diffMin / 60);
  return `In ${diffHours}h`;
}

const TYPE_CONFIG = {
  meeting: {
    label: 'Meeting',
    shortLabel: 'Meeting',
    icon: Video,
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.18)',
    border: 'rgba(99,102,241,0.3)',
    desc: 'Sync with team members & video conference'
  },
  task: {
    label: 'Daily Task',
    shortLabel: 'Task',
    icon: ListTodo,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.3)',
    desc: 'Daily to-do item with time-to-time agenda'
  },
  deal_call: {
    label: 'Deal Call',
    shortLabel: 'Call',
    icon: PhoneCall,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.3)',
    desc: 'Client outreach & negotiation reminder'
  },
  reminder: {
    label: 'Reminder',
    shortLabel: 'Alert',
    icon: Clock,
    color: '#f472b6',
    bg: 'rgba(236,72,153,0.18)',
    border: 'rgba(236,72,153,0.3)',
    desc: 'General time notification & follow-up'
  },
};

const PRIORITY_BADGES = {
  urgent: { label: 'Urgent', bg: 'rgba(244,63,94,0.15)', text: '#f43f5e', border: 'rgba(244,63,94,0.3)' },
  high: { label: 'High', bg: 'rgba(249,115,22,0.15)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
  medium: { label: 'Medium', bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  low: { label: 'Low', bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};

// ─── Main Notification & Reminder Component ──────────────────────────────────

export default function NotificationReminderCenter({ currentUser }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, today, meeting, task, deal_call
  const [reminders, setReminders] = useState([]);
  const [duePopups, setDuePopups] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTaskTime, setQuickTaskTime] = useState('today_eod');
  const [alertedIds, setAlertedIds] = useState(new Set());

  // ─── Fetch Colleague Users (for inviting to meetings) ──────────────────────
  const loadColleagues = useCallback(async () => {
    try {
      const data = await crmAPI.getOrganizationColleagues();
      setColleagues(data || []);
    } catch (e) {
      console.warn('Could not load colleagues:', e);
    }
  }, []);

  // ─── Fetch Reminders List ──────────────────────────────────────────────────
  const loadReminders = useCallback(async () => {
    try {
      const data = await crmAPI.getReminders();
      setReminders(data || []);
    } catch (e) {
      console.warn('Could not load reminders:', e);
    }
  }, []);

  // ─── Fetch Due Reminders for Side Popup Notifications ──────────────────────
  const checkDueReminders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const dueItems = await crmAPI.getDueReminders();
      if (!dueItems || dueItems.length === 0) {
        setDuePopups([]);
        return;
      }

      setDuePopups(dueItems);

      // Check if there are newly due items that haven't chimed yet
      let hasNewAlert = false;
      setAlertedIds(prev => {
        const next = new Set(prev);
        for (const item of dueItems) {
          if (!next.has(item.id)) {
            next.add(item.id);
            hasNewAlert = true;
          }
        }
        return next;
      });

      if (hasNewAlert) {
        playReminderChime();
        // Request desktop notification if possible
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            const first = dueItems[0];
            new Notification(`CRM Reminder: ${first.title}`, {
              body: first.description || 'Scheduled meeting or task reminder due now.',
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      }
    } catch (e) {
      console.warn('Could not check due reminders:', e);
    }
  }, [currentUser]);

  // Initial load and periodic polling
  useEffect(() => {
    if (!currentUser || !authHelpers.isLoggedIn()) return;
    loadReminders();
    loadColleagues();
    checkDueReminders();

    // Poll for due popup reminders every 10 seconds
    const interval = setInterval(() => {
      if (!authHelpers.isLoggedIn()) {
        clearInterval(interval);
        return;
      }
      checkDueReminders();
      loadReminders();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser, checkDueReminders, loadReminders, loadColleagues]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const [successBanner, setSuccessBanner] = useState('');

  const handleDismissPopup = async (reminderId) => {
    try {
      await crmAPI.dismissReminderPopup(reminderId);
      setDuePopups(prev => prev.filter(r => r.id !== reminderId));
      loadReminders();
    } catch (e) {
      console.error('Failed to dismiss reminder:', e);
    }
  };

  const handleComplete = async (reminderId) => {
    try {
      await crmAPI.completeReminder(reminderId);
      setDuePopups(prev => prev.filter(r => r.id !== reminderId));
      loadReminders();
      setSuccessBanner('✓ Marked as completed!');
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (e) {
      console.error('Failed to complete reminder:', e);
    }
  };

  const handleDelete = async (reminderId) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await crmAPI.deleteReminder(reminderId);
      setDuePopups(prev => prev.filter(r => r.id !== reminderId));
      loadReminders();
      setSuccessBanner('Item deleted');
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (e) {
      alert('Failed to delete: ' + (e.message || 'Permission denied'));
    }
  };

  // Quick Add Today's Task
  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    let targetTime = new Date();
    if (quickTaskTime === 'now') {
      targetTime = new Date(Date.now() + 60000); // 1 min from now
    } else if (quickTaskTime === 'plus_1h') {
      targetTime = new Date(Date.now() + 60 * 60 * 1000);
    } else if (quickTaskTime === 'today_2pm') {
      targetTime.setHours(14, 0, 0, 0);
    } else if (quickTaskTime === 'today_4pm') {
      targetTime.setHours(16, 0, 0, 0);
    } else {
      // today end of day (6pm)
      targetTime.setHours(18, 0, 0, 0);
    }

    try {
      const created = await crmAPI.createReminder({
        title: quickTaskText.trim(),
        description: `Daily task scheduled for ${targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        reminder_type: 'task',
        priority: 'medium',
        scheduled_at: targetTime.toISOString(),
      });
      setQuickTaskText('');
      loadReminders();
      checkDueReminders();
      setActiveTab('task');
      setSuccessBanner(`✓ Task "${created.title}" generated successfully!`);
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      alert('Failed to create task: ' + err.message);
    }
  };

  // Filtered Reminders for Drawer
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      if (activeTab === 'all') return true;
      if (activeTab === 'today') {
        const d = parseServerDate(r.scheduled_at);
        const now = new Date();
        return d && d.toDateString() === now.toDateString();
      }
      return r.reminder_type === activeTab;
    });
  }, [reminders, activeTab]);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: reminders.length,
      today: reminders.filter(r => {
        const d = parseServerDate(r.scheduled_at);
        return d && d.toDateString() === now.toDateString();
      }).length,
      meeting: reminders.filter(r => r.reminder_type === 'meeting').length,
      task: reminders.filter(r => r.reminder_type === 'task').length,
      deal_call: reminders.filter(r => r.reminder_type === 'deal_call').length,
    };
  }, [reminders]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCount = duePopups.length;
  const totalUpcoming = reminders.filter(r => r.status === 'scheduled').length;

  return (
    <>
      {/* ─── Header Notification Bell Icon (Remains in top-header) ──────── */}
      <button
        className="notification-bell-btn"
        onClick={() => setDrawerOpen(true)}
        title="Reminders & Notifications"
        id="header-notification-bell"
      >
        <Bell size={18} />
        {activeCount > 0 ? (
          <span className="notification-badge" title={`${activeCount} due reminders`}>
            {activeCount}
          </span>
        ) : totalUpcoming > 0 ? (
          <span
            style={{
              position: 'absolute', top: 3, right: 3,
              width: 8, height: 8, borderRadius: '50%',
              background: '#6366f1',
              boxShadow: '0 0 8px #6366f1'
            }}
          />
        ) : null}
      </button>

      {/* ─── Portaled to document.body: Prevents stacking context and backdrop-filter containment traps ─── */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <>
          {/* ─── Floating Top Success Banner (Confirms generation!) ──────────── */}
          {successBanner && (
            <div style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '11px 24px',
              borderRadius: '30px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              zIndex: 100200,
              animation: 'fadeInPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <CheckCircle2 size={18} />
              <span>{successBanner}</span>
            </div>
          )}

          {/* ─── Side Popup Notification Reminders (Top-Right Floating) ─────── */}
          {duePopups.length > 0 && (
            <div className="side-popup-container" id="side-popup-reminders">
          {duePopups.map((item) => {
            const typeInfo = TYPE_CONFIG[item.reminder_type] || TYPE_CONFIG.reminder;
            const Icon = typeInfo.icon;
            const priorityBadge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.medium;

            return (
              <div key={item.id} className={`side-popup-card type-${item.reminder_type}`}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '8px',
                      background: typeInfo.bg, color: typeInfo.color,
                      border: `1px solid ${typeInfo.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: typeInfo.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {typeInfo.shortLabel} Reminder
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px',
                      background: priorityBadge.bg, color: priorityBadge.text,
                      border: `1px solid ${priorityBadge.border}`, fontWeight: 700
                    }}>
                      {priorityBadge.label}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDismissPopup(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Dismiss reminder"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Title & Timing */}
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {item.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                    <Clock size={13} /> {getTimeDifferenceLabel(item.scheduled_at)} • {formatDateTime(item.scheduled_at)}
                  </div>
                </div>

                {/* Description / Agenda */}
                {item.description && (
                  <p style={{
                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                    lineHeight: '1.45', background: 'rgba(0,0,0,0.25)',
                    padding: '8px 12px', borderRadius: '8px', whiteSpace: 'pre-line',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {item.description}
                  </p>
                )}

                {/* If meeting: Attendees info */}
                {item.reminder_type === 'meeting' && item.attendees?.length > 0 && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={13} />
                    <span>
                      {item.attendees.length} Attendees: {item.attendees.map(a => a.user_name).join(', ')}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  {item.meeting_link && (
                    <a
                      href={item.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '7px 12px' }}
                    >
                      <ExternalLink size={13} /> Join Call
                    </a>
                  )}

                  <button
                    onClick={() => handleComplete(item.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '7px 10px', color: '#34d399' }}
                  >
                    <Check size={14} /> Done
                  </button>

                  <button
                    onClick={() => handleDismissPopup(item.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Slide-out Drawer Panel ───────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="notification-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="notification-drawer" id="notification-drawer-panel">
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.95)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
                }}>
                  <Bell size={19} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Reminders & Tasks
                    </h3>
                    <span style={{
                      fontSize: '0.65rem', padding: '2px 7px', borderRadius: '10px',
                      background: 'rgba(16,185,129,0.15)', color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700
                    }}>
                      LIVE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {totalUpcoming} active reminders & schedule items
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setModalOpen(true)}
                  style={{ gap: '6px', fontSize: '0.82rem', padding: '7px 14px', borderRadius: '8px' }}
                >
                  <Plus size={15} /> Schedule
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    width: 32, height: 32, borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)', cursor: 'pointer'
                  }}
                  title="Close panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Add Today's Task Capsule */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <form onSubmit={handleQuickAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Quick add task to do today... (e.g. Call client at 3pm)"
                    value={quickTaskText}
                    onChange={e => setQuickTaskText(e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem', padding: '9px 12px', background: 'rgba(15,23,42,0.8)' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!quickTaskText.trim()}
                    style={{ padding: '0 16px', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    Add
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <span>Due preset:</span>
                    <select
                      value={quickTaskTime}
                      onChange={e => setQuickTaskTime(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="now">Immediate (in 1 min)</option>
                      <option value="plus_1h">In 1 hour</option>
                      <option value="today_2pm">Today at 2:00 PM</option>
                      <option value="today_4pm">Today at 4:00 PM</option>
                      <option value="today_eod">End of Day (6:00 PM)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600 }}
                  >
                    + Detailed Schedule
                  </button>
                </div>
              </form>
            </div>

            {/* Filter Tabs */}
            <div style={{
              padding: '10px 20px',
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              overflowX: 'auto',
              background: 'rgba(15,23,42,0.4)'
            }}>
              <button
                className={`notification-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({counts.all})
              </button>
              <button
                className={`notification-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => setActiveTab('today')}
              >
                <Sun size={12} /> Today ({counts.today})
              </button>
              <button
                className={`notification-tab-btn ${activeTab === 'meeting' ? 'active' : ''}`}
                onClick={() => setActiveTab('meeting')}
              >
                <Video size={12} /> Meetings ({counts.meeting})
              </button>
              <button
                className={`notification-tab-btn ${activeTab === 'task' ? 'active' : ''}`}
                onClick={() => setActiveTab('task')}
              >
                <ListTodo size={12} /> Tasks ({counts.task})
              </button>
              <button
                className={`notification-tab-btn ${activeTab === 'deal_call' ? 'active' : ''}`}
                onClick={() => setActiveTab('deal_call')}
              >
                <PhoneCall size={12} /> Calls ({counts.deal_call})
              </button>
            </div>

            {/* Reminders List Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReminders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <Calendar size={28} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      No reminders in this view
                    </p>
                    <p style={{ fontSize: '0.8rem', maxWidth: '280px', lineHeight: '1.4' }}>
                      Schedule meetings with colleagues or add daily to-do items to stay on track.
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '6px', fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    <Plus size={14} /> Schedule Now
                  </button>
                </div>
              ) : (
                filteredReminders.map(item => {
                  const typeInfo = TYPE_CONFIG[item.reminder_type] || TYPE_CONFIG.reminder;
                  const Icon = typeInfo.icon;
                  const priorityBadge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.medium;
                  const isDone = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      className={`notification-item-card type-${item.reminder_type}`}
                      style={{ opacity: isDone ? 0.65 : 1 }}
                    >
                      {/* Top Row: Type Pill, Priority, Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '0.72rem', fontWeight: 700, color: typeInfo.color,
                            background: typeInfo.bg, padding: '2px 8px', borderRadius: '5px',
                            border: `1px solid ${typeInfo.border}`
                          }}>
                            <Icon size={12} /> {typeInfo.label}
                          </span>

                          <span style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px',
                            background: priorityBadge.bg, color: priorityBadge.text,
                            border: `1px solid ${priorityBadge.border}`, fontWeight: 700
                          }}>
                            {priorityBadge.label}
                          </span>

                          {isDone && (
                            <span style={{
                              fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px',
                              background: 'rgba(16,185,129,0.2)', color: '#34d399',
                              border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700
                            }}>
                              ✓ Done
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isDone && (
                            <button
                              onClick={() => handleComplete(item.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#34d399' }}
                              title="Mark as completed"
                            >
                              <Check size={13} /> Complete
                            </button>
                          )}
                          {(item.is_creator || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                              title="Delete reminder"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Scheduled Time */}
                      <div>
                        <div style={{
                          fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)',
                          textDecoration: isDone ? 'line-through' : 'none'
                        }}>
                          {item.title}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '0.76rem', color: item.is_due ? '#f59e0b' : 'var(--text-muted)',
                          marginTop: '3px', fontWeight: item.is_due ? 700 : 500
                        }}>
                          <Clock size={12} /> {formatDateTime(item.scheduled_at)}
                          {!isDone && (
                            <span style={{ color: item.is_due ? '#f59e0b' : 'var(--accent-primary)', fontWeight: 700 }}>
                              • {getTimeDifferenceLabel(item.scheduled_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description / Time-to-time agenda */}
                      {item.description && (
                        <div style={{
                          fontSize: '0.8rem', color: 'var(--text-secondary)',
                          lineHeight: '1.45', background: 'rgba(0,0,0,0.22)',
                          padding: '8px 12px', borderRadius: '8px', whiteSpace: 'pre-line',
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}>
                          {item.description}
                        </div>
                      )}

                      {/* Meeting Link & Attendees */}
                      {item.reminder_type === 'meeting' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                          {item.meeting_link && (
                            <a
                              href={item.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                              style={{ alignSelf: 'flex-start', fontSize: '0.76rem', padding: '5px 12px', gap: '6px' }}
                            >
                              <Video size={13} /> Join Meeting Link
                            </a>
                          )}
                          {item.attendees?.length > 0 && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <Users size={13} />
                              <span style={{ fontWeight: 600 }}>Invited:</span>
                              {item.attendees.map(a => (
                                <span key={a.id} style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  padding: '2px 8px', borderRadius: '12px',
                                  fontSize: '0.72rem', color: 'var(--text-primary)'
                                }}>
                                  {a.user_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Deal Call Entity info */}
                      {item.reminder_type === 'deal_call' && item.related_entity_title && (
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Briefcase size={12} /> Related: {item.related_entity_title}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}

      {/* ─── Schedule Meeting / Reminder / Task Modal (Elevated z-index) ─── */}
      {modalOpen && (
        <ScheduleModal
          currentUser={currentUser}
          colleagues={colleagues}
          onClose={() => setModalOpen(false)}
          onSaved={(createdItem) => {
            loadReminders();
            checkDueReminders();
            // Automatically open drawer so user sees their new reminder!
            setDrawerOpen(true);
            if (createdItem?.reminder_type) {
              setActiveTab(createdItem.reminder_type);
            }
            setSuccessBanner(`✓ "${createdItem?.title || 'Reminder'}" scheduled successfully!`);
            setTimeout(() => setSuccessBanner(''), 5000);
          }}
        />
      )}
        </>,
        document.body
      )}
    </>
  );
}

// ─── Schedule Meeting / Task / Reminder Modal Component ──────────────────────

function ScheduleModal({ currentUser, colleagues, onClose, onSaved }) {
  const [reminderType, setReminderType] = useState('meeting');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priority, setPriority] = useState('medium');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [relatedEntityTitle, setRelatedEntityTitle] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [colleagueFilter, setColleagueFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Default time: 30 minutes from now (rounded to nearest 5 minutes)
  useEffect(() => {
    const target = new Date();
    target.setMinutes(target.getMinutes() + 30);
    target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5, 0, 0);
    setScheduledAt(formatForDateTimeInput(target));
  }, []);

  const setPresetTime = (preset) => {
    const target = new Date();
    if (preset === 'in_5m') {
      target.setMinutes(target.getMinutes() + 5);
    } else if (preset === 'in_15m') {
      target.setMinutes(target.getMinutes() + 15);
    } else if (preset === 'in_30m') {
      target.setMinutes(target.getMinutes() + 30);
    } else if (preset === 'in_1h') {
      target.setHours(target.getHours() + 1);
    } else if (preset === 'today_6pm') {
      target.setHours(18, 0, 0, 0);
    } else if (preset === 'tomorrow_10am') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    }
    setScheduledAt(formatForDateTimeInput(target));
  };

  const toggleAttendee = (id) => {
    setSelectedAttendees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllColleagues = () => {
    if (selectedAttendees.length === colleagues.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees(colleagues.map(c => c.id));
    }
  };

  const filteredColleagues = useMemo(() => {
    if (!colleagueFilter.trim()) return colleagues;
    const q = colleagueFilter.toLowerCase();
    return colleagues.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  }, [colleagues, colleagueFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Auto-fallback title so scheduling NEVER fails if title was somehow left blank!
    const finalTitle = title.trim() || (
      reminderType === 'meeting' ? 'Team Sync Meeting' :
      reminderType === 'task' ? 'Daily Task' :
      reminderType === 'deal_call' ? 'Deal Call' : 'General Reminder'
    );

    if (!scheduledAt) {
      setError('Date and time are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const localDate = new Date(scheduledAt);
      if (isNaN(localDate.getTime())) {
        setError('Please enter a valid date and time');
        setSaving(false);
        return;
      }
      const scheduledUtc = localDate.toISOString();
      const created = await crmAPI.createReminder({
        title: finalTitle,
        description: description.trim() || null,
        reminder_type: reminderType,
        priority: priority,
        scheduled_at: scheduledUtc,
        meeting_link: meetingLink.trim() || null,
        location: location.trim() || null,
        related_entity_title: relatedEntityTitle.trim() || null,
        attendee_ids: reminderType === 'meeting' ? selectedAttendees : [],
      });
      onSaved(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="reminder-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="reminder-modal-content">
        {/* Modal Header */}
        <div className="reminder-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Schedule Notification & Reminder
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Set team meetings with colleagues, daily to-dos, or deal call alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)', cursor: 'pointer'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="reminder-modal-body">
            {/* Segmented Type Picker */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Select Notification Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { type: 'meeting', label: 'Team Meeting', icon: Video, color: '#818cf8', subtitle: 'Invite colleagues' },
                  { type: 'task', label: 'Daily Task', icon: ListTodo, color: '#34d399', subtitle: 'To-do schedule' },
                  { type: 'deal_call', label: 'Deal Call', icon: PhoneCall, color: '#fbbf24', subtitle: 'Client follow-up' },
                  { type: 'reminder', label: 'General Alert', icon: Clock, color: '#f472b6', subtitle: 'Time reminder' },
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = reminderType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setReminderType(opt.type)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '6px',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.02)',
                        color: isSelected ? 'white' : 'var(--text-secondary)',
                        boxShadow: isSelected ? `0 0 15px -3px ${opt.color}40` : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon size={20} color={isSelected ? opt.color : 'inherit'} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{opt.label}</span>
                      <span style={{ fontSize: '0.68rem', color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {opt.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                {reminderType === 'meeting' ? 'Meeting Title / Subject' :
                 reminderType === 'deal_call' ? 'Call Title / Client Subject' :
                 reminderType === 'task' ? 'Daily Task Title' : 'Reminder Title'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={
                  reminderType === 'meeting' ? 'e.g. Q4 Sales Pipeline Sync & Strategy Review' :
                  reminderType === 'deal_call' ? 'e.g. Follow-up Call with Acme Corp regarding enterprise renewal' :
                  reminderType === 'task' ? 'e.g. Review 5 proposals & send client pricing by EOD' :
                  'e.g. Send weekly sales executive report'
                }
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Date & Time and Priority row with quick presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    required
                  />
                  {scheduledAt && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '0.74rem',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 600,
                      background: 'rgba(99,102,241,0.08)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(99,102,241,0.2)'
                    }}>
                      <Clock size={12} />
                      <span>Local: {formatDateTime(scheduledAt)} • {getTimeDifferenceLabel(scheduledAt)}</span>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Quick time preset pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>Quick set:</span>
                {[
                  { label: 'In 5m', preset: 'in_5m' },
                  { label: 'In 15m', preset: 'in_15m' },
                  { label: 'In 30m', preset: 'in_30m' },
                  { label: 'In 1 Hour', preset: 'in_1h' },
                  { label: 'Today 6:00 PM', preset: 'today_6pm' },
                  { label: 'Tomorrow 10:00 AM', preset: 'tomorrow_10am' },
                ].map(p => (
                  <button
                    key={p.preset}
                    type="button"
                    onClick={() => setPresetTime(p.preset)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Agenda (time-to-time daily schedule notes) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                {reminderType === 'task' ? 'Daily Task Schedule / Time-to-Time Agenda' :
                 reminderType === 'meeting' ? 'Meeting Agenda & Discussion Topics' : 'Description / Notes'}
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder={
                  reminderType === 'task' ? 'e.g.\n10:00 AM - Team standup\n01:30 PM - Review leads pipeline\n04:00 PM - Proposal negotiation' :
                  'Add details, topics to cover, or specific objectives...'
                }
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* If Meeting: Link & Location */}
            {reminderType === 'meeting' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Video Call Link</label>
                    <button
                      type="button"
                      onClick={() => setMeetingLink('https://meet.google.com/new')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Google Meet
                    </button>
                  </div>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://meet.google.com/... or Zoom link"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Location / Room (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Conf Room 2 / Online"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If Meeting: Organization Colleagues Selector */}
            {reminderType === 'meeting' && (
              <div style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Invite Organization Colleagues
                    </span>
                    <span style={{
                      fontSize: '0.7rem', padding: '1px 8px', borderRadius: '10px',
                      background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)', fontWeight: 700
                    }}>
                      {selectedAttendees.length} selected
                    </span>
                  </div>

                  {colleagues.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllColleagues}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {selectedAttendees.length === colleagues.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Filter search bar for colleagues */}
                {colleagues.length > 4 && (
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search colleagues by name, email or role..."
                      value={colleagueFilter}
                      onChange={e => setColleagueFilter(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '0.8rem', padding: '6px 12px 6px 32px' }}
                    />
                  </div>
                )}

                <div style={{
                  maxHeight: '170px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  paddingRight: '4px'
                }}>
                  {filteredColleagues.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {colleagues.length === 0 ? 'No other active users found in your company organization.' : 'No colleagues matching search.'}
                    </div>
                  ) : (
                    filteredColleagues.map(user => {
                      const isSelected = selectedAttendees.includes(user.id);
                      const isMe = user.id === currentUser?.id;
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleAttendee(user.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                            background: isSelected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.02)',
                            border: isSelected ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#6366f1' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {user.name} {isMe && <span style={{ color: 'var(--accent-primary)', fontSize: '0.72rem' }}>(You)</span>}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {user.email}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
                            textTransform: 'capitalize', fontWeight: 600
                          }}>
                            {user.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{
                  fontSize: '0.73rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(99,102,241,0.08)',
                  padding: '6px 10px',
                  borderRadius: '6px'
                }}>
                  <Sparkles size={13} color="var(--accent-primary)" />
                  <span>
                    Each selected colleague will receive a live popup notification chime when the meeting time arrives.
                  </span>
                </div>
              </div>
            )}

            {/* If Deal Call: Associated deal or lead */}
            {reminderType === 'deal_call' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Associated Deal / Client Account / Lead</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Corp 100-Seat License / John Doe"
                  value={relatedEntityTitle}
                  onChange={e => setRelatedEntityTitle(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Modal Footer with Visible Live Status & Errors */}
          <div className="reminder-modal-footer">
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              {error && (
                <div style={{
                  color: '#f43f5e',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'fadeInPop 0.2s ease'
                }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '9px 18px', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ padding: '9px 24px', fontSize: '0.88rem', fontWeight: 700 }}
            >
              {saving ? 'Scheduling & Generating...' :
               reminderType === 'meeting' ? 'Schedule Meeting & Invite' :
               reminderType === 'task' ? 'Add Task to Schedule' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
