import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CreatePostModal from './CreatePostModal';

const NAV = [
  { id: 'feed',          path: '/feed',           icon: '🏠', label: 'Home' },
  { id: 'search',        path: '/search',          icon: '🔍', label: 'Search' },
  { id: 'create',        path: null,               icon: '➕', label: 'Create', isAction: true },
  { id: 'notifications', path: '/notifications',   icon: '🔔', label: 'Alerts' },
  { id: 'messages',      path: '/chats',           icon: '✉️', label: 'Messages' },
];

const SIDEBAR_EXTRA = [
  { path: '/profile',  icon: '👤', label: 'Profile' },
  { path: '/spaces',   icon: '🎙️', label: 'Spaces' },
  { path: '/lists',    icon: '📋', label: 'Lists' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const isActive = (path) => path && location.pathname.startsWith(path);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--jamii-bg)', overflow: 'hidden' }}>
      {/* ── Desktop sidebar ── */}
      <nav style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--jamii-border)', padding: '16px 12px',
        overflowY: 'auto',
      }} className="hide-on-mobile">
        {/* Logo */}
        <div style={{ padding: '8px 12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--jamii-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff' }}>J</div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Jamii</span>
        </div>

        {/* Main nav */}
        {NAV.map(item => (
          <button key={item.id}
            onClick={() => item.isAction ? setShowCreate(true) : navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 16, marginBottom: 4,
              background: !item.isAction && isActive(item.path) ? 'rgba(42,171,238,0.12)' : 'none',
              border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              color: !item.isAction && isActive(item.path) ? 'var(--jamii-blue)' : 'var(--jamii-text)',
              fontWeight: !item.isAction && isActive(item.path) ? 700 : 500,
              fontSize: 16, transition: 'background 0.2s',
            }}
          >
            <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
            {item.isAction && (
              <span style={{ marginLeft: 'auto', background: 'var(--jamii-blue)', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>Post</span>
            )}
          </button>
        ))}

        <div style={{ height: 1, background: 'var(--jamii-border)', margin: '12px 0' }} />

        {SIDEBAR_EXTRA.map(item => (
          <button key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '11px 14px', borderRadius: 14, marginBottom: 2,
              background: isActive(item.path) ? 'rgba(42,171,238,0.12)' : 'none',
              border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              color: isActive(item.path) ? 'var(--jamii-blue)' : 'var(--jamii-text-muted)',
              fontWeight: isActive(item.path) ? 700 : 400,
              fontSize: 15, transition: 'background 0.2s',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        {/* User mini-profile */}
        <div style={{ marginTop: 'auto', padding: '14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid var(--jamii-border)' }} onClick={() => navigate('/profile')}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--jamii-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>Me</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>You</div>
            <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>@you</div>
          </div>
          <span style={{ color: 'var(--jamii-text-muted)' }}>···</span>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* ── Right panel (desktop) ── */}
      <aside style={{ width: 340, flexShrink: 0, padding: '20px 16px', overflowY: 'auto', borderLeft: '1px solid var(--jamii-border)' }} className="hide-on-mobile hide-on-tablet">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input placeholder="Search Jamii" onClick={() => navigate('/search')} readOnly style={{
            width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)',
            borderRadius: 24, padding: '10px 16px 10px 42px', color: 'var(--jamii-text)',
            fontSize: 14, outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
          }} />
        </div>

        {/* Trending */}
        <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '16px', marginBottom: 20, border: '1px solid var(--jamii-border)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Trending</h3>
          {['#Jamii', '#SuperApp', '#BuildInPublic', '#AI', '#Tech'].map((tag, i) => (
            <div key={tag} style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--jamii-border)' : 'none', cursor: 'pointer' }}>
              <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>#{i + 1} · Trending</div>
              <div style={{ fontWeight: 700, color: 'var(--jamii-blue)', marginTop: 2 }}>{tag}</div>
            </div>
          ))}
        </div>

        {/* Who to follow */}
        <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '16px', border: '1px solid var(--jamii-border)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Who to follow</h3>
          {[
            { name: 'BlusceLabs', username: '@bluscelabs', initials: 'BL', color: '#2AABEE' },
            { name: 'Alex Rivera', username: '@alexrivera', initials: 'AR', color: '#e91e8c' },
            { name: 'Nina Patel', username: '@ninapatel', initials: 'NP', color: '#ff5722' },
          ].map(person => (
            <div key={person.username} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>{person.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{person.name}</div>
                <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>{person.username}</div>
              </div>
              <button style={{ background: 'var(--jamii-blue)', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>Follow</button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(23,33,43,0.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--jamii-border)',
        display: 'flex', padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      }} className="show-on-mobile">
        {NAV.map(item => (
          <button key={item.id}
            onClick={() => item.isAction ? setShowCreate(true) : navigate(item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
              color: !item.isAction && isActive(item.path) ? 'var(--jamii-blue)' : 'var(--jamii-text-muted)',
            }}
          >
            {item.isAction ? (
              <div style={{ width: 44, height: 44, borderRadius: 16, background: 'var(--jamii-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginTop: -8 }}>➕</div>
            ) : (
              <>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: isActive(item.path) ? 700 : 400 }}>{item.label}</span>
              </>
            )}
          </button>
        ))}
      </nav>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
