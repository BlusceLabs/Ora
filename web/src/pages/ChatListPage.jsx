import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockChats } from '../data/mockChats';

export function Sidebar() {
  const navigate = useNavigate();
  return (
    <div className="sidebar">
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--ora-border)' }}>
        <button onClick={() => navigate('/settings')} style={{ color: 'var(--ora-text-muted)', fontSize: 24 }}>☰</button>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Ora</h2>
      </div>
      <div style={{ padding: 12 }}>
        <input 
          type="text" 
          placeholder="Search" 
          style={{ 
            width: '100%', 
            background: 'var(--ora-surface-2)', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: 20, 
            color: 'var(--ora-text)',
            outline: 'none'
          }} 
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {mockChats.map(chat => (
          <Link to={`/chats/${chat.id}`} key={chat.id} style={{ display: 'flex', padding: '12px 16px', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }} className="chat-item">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: chat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, color: '#fff', position: 'relative' }}>
              {chat.initials}
              {chat.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, background: '#34c759', borderRadius: '50%', border: '3px solid var(--ora-surface)' }} />}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{chat.name}</span>
                <span style={{ fontSize: 12, color: 'var(--ora-text-muted)' }}>{chat.timestamp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--ora-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</span>
                {chat.unread > 0 && (
                  <span style={{ background: 'var(--ora-blue)', color: '#fff', fontSize: 12, fontWeight: 'bold', padding: '2px 8px', borderRadius: 12 }}>{chat.unread}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ChatListPage() {
  return (
    <div className="two-column-layout">
      <Sidebar />
      <div className="main-content hide-on-mobile flex-center" style={{ color: 'var(--ora-text-muted)' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: 20 }}>Select a chat to start messaging</div>
      </div>
    </div>
  );
}
