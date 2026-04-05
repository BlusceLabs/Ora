import React, { useState } from 'react';
import { mockNotifications } from '../data/mockFeed';

const ICON = { like: '❤️', follow: '👤', comment: '💬', repost: '🔁', mention: '@' };
const TABS = ['All', 'Mentions', 'Likes', 'Follows'];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState(mockNotifications);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));

  const filtered = notifications.filter(n => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Mentions') return n.type === 'mention';
    if (activeTab === 'Likes') return n.type === 'like';
    if (activeTab === 'Follows') return n.type === 'follow';
    return true;
  });

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 20px 0',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.92)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Notifications</h2>
          {unread > 0 && (
            <span style={{
              background: 'var(--jamii-blue)', color: '#fff', borderRadius: 12,
              padding: '2px 8px', fontSize: 12, fontWeight: 700,
            }}>{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: 'none', color: 'var(--jamii-blue)',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}>Mark all read</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', padding: '12px 20px 0',
        borderBottom: '1px solid var(--jamii-border)',
        gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
        position: 'sticky', top: 56, zIndex: 10,
        background: 'rgba(23,33,43,0.92)', backdropFilter: 'blur(16px)',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
            fontWeight: 600, fontSize: 13,
            background: activeTab === tab ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)',
            color: activeTab === tab ? '#fff' : 'var(--jamii-text-muted)',
            marginBottom: 12,
          }}>{tab}</button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--jamii-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All caught up</div>
          <div style={{ fontSize: 14 }}>You have no {activeTab.toLowerCase()} notifications</div>
        </div>
      ) : (
        filtered.map(notif => (
          <div key={notif.id} onClick={() => setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, read: true } : n))} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 20px',
            background: notif.read ? 'transparent' : 'rgba(42,171,238,0.06)',
            borderBottom: '1px solid var(--jamii-border)',
            cursor: 'pointer', transition: 'background 0.2s',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: notif.actor.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: '#fff',
              }}>{notif.actor.initials}</div>
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--jamii-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, border: '2px solid var(--jamii-surface)',
              }}>{ICON[notif.type]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700 }}>{notif.actor.name}</span>
              {' '}
              <span style={{ color: 'var(--jamii-text-muted)' }}>{notif.content}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!notif.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--jamii-blue)' }} />}
              <span style={{ color: 'var(--jamii-text-muted)', fontSize: 13 }}>{notif.time}</span>
            </div>
          </div>
        ))
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}
