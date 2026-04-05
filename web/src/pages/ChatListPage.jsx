import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockChats } from '../data/mockChats';

const FILTERS = ['All', 'Personal', 'Groups', 'Channels', 'Unread'];
const TYPE_ICON = { group: '👥', channel: '📢' };

export default function ChatListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = mockChats.filter(c => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Personal') return c.type === 'personal';
    if (filter === 'Groups') return c.type === 'group';
    if (filter === 'Channels') return c.type === 'channel';
    if (filter === 'Unread') return c.unread > 0;
    return true;
  });

  const totalUnread = mockChats.reduce((n, c) => n + c.unread, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{
        padding: '20px 20px 0',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>Messages</h2>
            {totalUnread > 0 && (
              <span style={{ background: 'var(--jamii-blue)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{totalUnread}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ background: 'var(--jamii-surface-2)', border: 'none', borderRadius: '50%', width: 38, height: 38, color: 'var(--jamii-text)', cursor: 'pointer', fontSize: 18 }}>🔍</button>
            <button style={{ background: 'var(--jamii-blue)', border: 'none', borderRadius: '50%', width: 38, height: 38, color: '#fff', cursor: 'pointer', fontSize: 18 }}>✏️</button>
          </div>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages"
            style={{
              width: '100%', background: 'var(--jamii-surface-2)',
              border: '1px solid var(--jamii-border)', borderRadius: 20,
              padding: '10px 16px 10px 42px', color: 'var(--jamii-text)',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
              fontWeight: 600, fontSize: 12,
              background: filter === f ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)',
              color: filter === f ? '#fff' : 'var(--jamii-text-muted)',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--jamii-text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>No messages</div>
          </div>
        ) : filtered.map(chat => (
          <div
            key={chat.id}
            onClick={() => navigate(`/chats/${chat.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', cursor: 'pointer',
              borderBottom: '1px solid var(--jamii-border)',
              background: chat.unread > 0 ? 'rgba(42,171,238,0.04)' : 'transparent',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: chat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 18, color: '#fff',
              }}>
                {TYPE_ICON[chat.type] || chat.initials}
              </div>
              {chat.online && (
                <div style={{ position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: '50%', background: '#34c759', border: '2px solid var(--jamii-bg)' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {chat.pinned && <span style={{ fontSize: 11 }}>📌</span>}
                  <span style={{ fontWeight: chat.unread > 0 ? 700 : 600, fontSize: 15 }}>{chat.name}</span>
                  {chat.type !== 'personal' && <span style={{ fontSize: 11, color: 'var(--jamii-text-muted)', background: 'var(--jamii-surface-2)', padding: '1px 6px', borderRadius: 8 }}>{chat.type}</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--jamii-text-muted)', flexShrink: 0 }}>{chat.timestamp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: chat.unread > 0 ? 600 : 400,
                  color: chat.unread > 0 ? 'var(--jamii-text)' : 'var(--jamii-text-muted)',
                }}>{chat.lastMessage}</span>
                {chat.unread > 0 && (
                  <span style={{ background: 'var(--jamii-blue)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, flexShrink: 0, marginLeft: 8 }}>{chat.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 80 }} />
    </div>
  );
}
