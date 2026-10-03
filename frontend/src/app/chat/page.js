'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Plus, Users, Send, Trash2, Settings,
  UserPlus, UserMinus, X, ChevronLeft, Hash, Search,
  MoreVertical, AlertCircle, Edit3, CheckCircle
} from 'lucide-react';
import { crmAPI, authHelpers } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_COLORS = {
  admin: '#6366f1',
  manager: '#f59e0b',
  employee: '#10b981',
  super_admin: '#ef4444',
};

// Group messages by date
function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      currentGroup = { date: msg.created_at, messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  }
  return groups;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, role, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ROLE_COLORS[role] || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.33 + 'px',
      flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Create / Edit Group Modal ────────────────────────────────────────────────

function GroupModal({ onClose, onSave, users, existingGroup }) {
  const [name, setName] = useState(existingGroup?.name || '');
  const [description, setDescription] = useState(existingGroup?.description || '');
  const [icon, setIcon] = useState(existingGroup?.icon || '💬');
  const [selectedUsers, setSelectedUsers] = useState(
    existingGroup?.members?.map(m => m.user_id) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ICONS = ['💬', '🚀', '💼', '📊', '🎯', '🔥', '⭐', '🏆', '📢', '🤝', '💡', '🎉'];

  const toggleUser = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    if (selectedUsers.length === 0) { setError('Add at least one member'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), description: description.trim(), icon, member_ids: selectedUsers });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {existingGroup ? 'Edit Group' : 'Create Group Chat'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}><AlertCircle size={14} /> {error}</div>}

        {/* Icon Picker */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            Group Icon
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                style={{
                  width: '40px', height: '40px', fontSize: '1.3rem', cursor: 'pointer',
                  border: icon === ic ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                  borderRadius: '8px', background: icon === ic ? 'var(--accent-primary)15' : 'var(--bg-card)',
                }}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Group Name *
          </label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Team, Marketing Hub..." />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Description
          </label>
          <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What is this group about?" rows={2} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            Members ({selectedUsers.length} selected)
          </label>
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            {users.map(u => (
              <div key={u.id} onClick={() => toggleUser(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                  background: selectedUsers.includes(u.id) ? 'var(--accent-primary)10' : 'transparent',
                }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px',
                  border: selectedUsers.includes(u.id) ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                  background: selectedUsers.includes(u.id) ? 'var(--accent-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedUsers.includes(u.id) && <CheckCircle size={12} color="white" />}
                </div>
                <Avatar name={u.name} role={u.role} size={30} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : existingGroup ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────

function ChatWindow({ group, currentUser, onGroupUpdate, onGroupDelete }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const loadMessages = useCallback(async () => {
    try {
      const data = await crmAPI.getChatMessages(group.id, { limit: 100 });
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [group.id, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await crmAPI.sendChatMessage(group.id, content);
      await loadMessages();
    } catch (err) {
      setInput(content); // restore on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await crmAPI.deleteChatMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await crmAPI.removeChatMember(group.id, userId);
      onGroupUpdate();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const grouped = groupMessagesByDate(messages);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.6rem' }}>{group.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{group.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {group.member_count} members
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              onClick={() => setShowSettings(!showSettings)}>
              <Settings size={14} /> Settings
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isAdmin && (
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-hover)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Group Members:</span>
          {(group.members || []).map(m => (
            <div key={m.user_id} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
              borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
            }}>
              <Avatar name={m.user_name} role={m.user_role} size={22} />
              {m.user_name}
              {m.user_id !== currentUser?.id && (
                <button onClick={() => handleRemoveMember(m.user_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 2px' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button className="btn" style={{ padding: '4px 10px', fontSize: '0.82rem', background: '#ef4444', color: 'white' }}
            onClick={onGroupDelete}>
            <Trash2 size={12} /> Delete Group
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            Loading messages...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{group.icon}</div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No messages yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Be the first to say something!
            </div>
          </div>
        )}

        {grouped.map((dateGroup, gi) => (
          <div key={gi}>
            {/* Date Separator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
                background: 'var(--bg-card)', padding: '3px 12px', borderRadius: '12px',
                border: '1px solid var(--border-color)', whiteSpace: 'nowrap',
              }}>
                {formatDateLabel(dateGroup.date)}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>

            {/* Messages in this date group */}
            {dateGroup.messages.map((msg, mi) => {
              const isMe = msg.sender_id === currentUser?.id;
              const prevMsg = mi > 0 ? dateGroup.messages[mi - 1] : null;
              const sameSender = prevMsg && prevMsg.sender_id === msg.sender_id;

              return (
                <div key={msg.id} style={{
                  display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                  gap: '8px', marginTop: sameSender ? '2px' : '12px',
                  alignItems: 'flex-end',
                }}>
                  {/* Avatar (only show when sender changes) */}
                  <div style={{ width: 32, flexShrink: 0 }}>
                    {!sameSender && !isMe && (
                      <Avatar name={msg.sender_name} role={msg.sender_role} size={32} />
                    )}
                  </div>

                  <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* Sender name (only first in sequence) */}
                    {!sameSender && !isMe && (
                      <div style={{
                        fontSize: '0.75rem', fontWeight: 600, color: ROLE_COLORS[msg.sender_role] || 'var(--text-secondary)',
                        marginLeft: '4px',
                      }}>
                        {msg.sender_name} · {msg.sender_role}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <div style={{
                        padding: '8px 13px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? 'var(--accent-primary)' : 'var(--bg-hover)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        fontSize: '0.9rem', lineHeight: '1.4',
                        wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      }}>
                        {msg.content}
                      </div>

                      {/* Timestamp + delete */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatTime(msg.created_at)}
                        </span>
                        {(isMe || isAdmin) && (
                          <button onClick={() => handleDeleteMessage(msg.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, opacity: 0.5 }}>
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-card)', display: 'flex', gap: '10px', alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${group.name}...`}
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--border-color)',
            borderRadius: '22px', padding: '10px 16px', fontSize: '0.9rem',
            background: 'var(--bg-hover)', color: 'var(--text-primary)',
            outline: 'none', lineHeight: '1.4',
            maxHeight: '120px', overflowY: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: input.trim() ? 'var(--accent-primary)' : 'var(--border-color)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const currentUser = authHelpers.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadGroups = useCallback(async () => {
    try {
      const data = await crmAPI.getChatGroups();
      setGroups(data || []);
      // If active group was deleted, deselect
      if (activeGroup && !data.find(g => g.id === activeGroup.id)) {
        setActiveGroup(null);
      } else if (activeGroup) {
        // Refresh active group data
        const updated = data.find(g => g.id === activeGroup.id);
        if (updated) setActiveGroup(updated);
      }
    } catch (err) {
      setError('Failed to load chat groups');
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    loadGroups();
    // Poll group list every 10s
    const interval = setInterval(loadGroups, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      crmAPI.getUsers().then(setAllUsers).catch(() => {});
    }
  }, [isAdmin]);

  const handleCreateGroup = async (data) => {
    await crmAPI.createChatGroup(data);
    await loadGroups();
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!confirm(`Delete group "${activeGroup.name}"? This cannot be undone.`)) return;
    try {
      await crmAPI.deleteChatGroup(activeGroup.id);
      setActiveGroup(null);
      await loadGroups();
    } catch (err) {
      setError('Failed to delete group');
    }
  };

  const filtered = groups.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentUser) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Please log in to use chat.</div>;
  }

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 120px)',
      border: '1px solid var(--border-color)', borderRadius: '12px',
      overflow: 'hidden', background: 'var(--bg-card)',
    }}>
      {/* Sidebar */}
      <div style={{
        width: '280px', flexShrink: 0, borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-card)',
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
              Team Chat
            </div>
            {isAdmin && (
              <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              placeholder="Search groups..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--border-color)',
                borderRadius: '8px', background: 'var(--bg-hover)', fontSize: '0.84rem', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Group List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              Loading...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              {isAdmin ? 'Create your first group chat' : 'No groups yet — ask your Admin to create one'}
            </div>
          )}
          {filtered.map(group => (
            <div key={group.id}
              onClick={() => setActiveGroup(group)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                background: activeGroup?.id === group.id ? 'var(--accent-primary)15' : 'transparent',
                borderLeft: activeGroup?.id === group.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                transition: 'background 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '1.4rem', width: 36, textAlign: 'center' }}>{group.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 4 }}>
                      {group.last_message_at ? formatTime(group.last_message_at) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {group.last_message || `${group.member_count} members`}
                    </span>
                    {group.unread_count > 0 && (
                      <span style={{
                        background: 'var(--accent-primary)', color: 'white', borderRadius: '10px',
                        fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', flexShrink: 0, marginLeft: 4,
                      }}>
                        {group.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeGroup ? (
          <ChatWindow
            group={activeGroup}
            currentUser={currentUser}
            onGroupUpdate={loadGroups}
            onGroupDelete={handleDeleteGroup}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', gap: '12px',
          }}>
            <MessageSquare size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Select a group to start chatting
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {isAdmin ? 'Or create a new group with the + New button' : 'Contact your admin to be added to a group'}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <GroupModal
          users={allUsers.filter(u => u.id !== currentUser?.id && u.role !== 'super_admin')}
          onClose={() => setShowCreate(false)}
          onSave={handleCreateGroup}
        />
      )}
    </div>
  );
}
