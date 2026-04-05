import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-center" style={{ width: '100%', height: '100%', background: 'var(--ora-bg)', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--ora-surface)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--ora-border)' }}>
          <button onClick={() => navigate('/chats')} style={{ color: 'var(--ora-blue)', fontSize: 24 }}>←</button>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h2>
        </div>

        <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--ora-border)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--ora-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', color: '#fff' }}>
            ME
          </div>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>My Profile</h3>
            <p style={{ color: 'var(--ora-text-muted)', fontSize: 16 }}>+1 234 567 8900</p>
          </div>
        </div>

        <div style={{ padding: '16px 0' }}>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>Notifications</span>
            <span style={{ color: 'var(--ora-blue)' }}>On</span>
          </div>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>Privacy and Security</span>
            <span style={{ color: 'var(--ora-text-muted)' }}>&gt;</span>
          </div>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>Theme</span>
            <span style={{ color: 'var(--ora-text-muted)' }}>Dark</span>
          </div>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>About Ora</span>
            <span style={{ color: 'var(--ora-text-muted)' }}>v1.0.0</span>
          </div>
        </div>

        <div style={{ padding: 24, borderTop: '1px solid var(--ora-border)', textAlign: 'center' }}>
          <button onClick={() => navigate('/')} style={{ color: '#ff3b30', fontSize: 16, fontWeight: 600 }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
