import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MY_LISTS = [
  {
    id: 1, name: 'Tech Voices', description: 'Top tech creators and builders',
    members: 47, isPrivate: false, emoji: '💻',
    color: '#2AABEE', pinnedMembers: ['BL', 'AR', 'NP'],
  },
  {
    id: 2, name: 'East Africa Innovators', description: 'Startups and founders from EA',
    members: 128, isPrivate: false, emoji: '🌍',
    color: '#2ecc40', pinnedMembers: ['EA', 'KE', 'TZ'],
  },
  {
    id: 3, name: 'Close Friends', description: 'People I actually know irl',
    members: 12, isPrivate: true, emoji: '🔐',
    color: '#e91e8c', pinnedMembers: ['JN', 'AM', 'BK'],
  },
];

const DISCOVER_LISTS = [
  { id: 4, name: 'African Creatives', description: 'Top artists, designers and creators across Africa', members: 3420, curator: '@bluscelabs', emoji: '🎨', followed: false },
  { id: 5, name: 'Nairobi Startups', description: 'Founders and startups in the Silicon Savannah', members: 891, curator: '@techke', emoji: '🚀', followed: false },
  { id: 6, name: 'Music & Culture', description: 'Afrobeats, Gengetone, Bongo Flava and more', members: 5102, curator: '@jamiimusic', emoji: '🎵', followed: true },
  { id: 7, name: 'Sports Updates', description: 'Live match commentary and sports news', members: 7680, curator: '@sportstalk', emoji: '⚽', followed: false },
];

export default function ListsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [discover, setDiscover] = useState(DISCOVER_LISTS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const toggleFollow = (id) => setDiscover(d => d.map(l => l.id === id ? { ...l, followed: !l.followed } : l));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Lists</h2>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'var(--jamii-blue)', border: 'none', borderRadius: 20, padding: '8px 18px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            + New List
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--jamii-border)', marginBottom: 0, marginLeft: -20, marginRight: -20, paddingLeft: 20 }}>
          {['mine', 'discover'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 15,
              color: tab === t ? 'var(--jamii-text)' : 'var(--jamii-text-muted)',
              borderBottom: tab === t ? '2px solid var(--jamii-blue)' : '2px solid transparent',
            }}>
              {t === 'mine' ? 'Your Lists' : 'Discover'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: 700, margin: '0 auto' }}>
        {tab === 'mine' ? (
          <>
            {MY_LISTS.map(list => (
              <div key={list.id} style={{
                background: 'var(--jamii-surface)', borderRadius: 20, marginBottom: 16,
                border: '1px solid var(--jamii-border)', overflow: 'hidden', cursor: 'pointer',
              }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: list.color + '22', border: `2px solid ${list.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                    {list.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{list.name}</span>
                      {list.isPrivate && <span style={{ fontSize: 12, background: 'var(--jamii-surface-2)', padding: '2px 8px', borderRadius: 10, color: 'var(--jamii-text-muted)' }}>🔒 Private</span>}
                    </div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 3 }}>{list.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <div style={{ display: 'flex' }}>
                        {list.pinnedMembers.map((m, i) => (
                          <div key={m} style={{ width: 24, height: 24, borderRadius: '50%', background: `hsl(${i * 80}, 60%, 50%)`, marginLeft: i === 0 ? 0 : -6, border: '2px solid var(--jamii-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{m}</div>
                        ))}
                      </div>
                      <span style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>{list.members} members</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button style={{ background: 'var(--jamii-surface-2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'var(--jamii-text-muted)', fontSize: 16 }}>✏️</button>
                    <button style={{ background: 'var(--jamii-surface-2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'var(--jamii-text-muted)', fontSize: 16 }}>···</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pinned lists section */}
            <div style={{ marginTop: 8, padding: '16px', background: 'rgba(42,171,238,0.06)', borderRadius: 20, border: '1px dashed rgba(42,171,238,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--jamii-text-muted)', fontSize: 14 }}>
                <span style={{ fontSize: 20 }}>📌</span>
                <span>Pin lists to your sidebar for quick access</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {discover.map(list => (
              <div key={list.id} style={{
                background: 'var(--jamii-surface)', borderRadius: 20, marginBottom: 16,
                border: '1px solid var(--jamii-border)', padding: '16px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--jamii-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  {list.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{list.name}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginBottom: 6 }}>{list.description}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>👤 {list.members.toLocaleString()} members</span>
                    <span style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>by {list.curator}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(list.id)}
                  style={{
                    flexShrink: 0, padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    background: list.followed ? 'transparent' : 'var(--jamii-blue)',
                    color: list.followed ? 'var(--jamii-text)' : '#fff',
                    border: list.followed ? '1px solid var(--jamii-border)' : 'none',
                  }}
                >
                  {list.followed ? 'Following' : '+ Follow'}
                </button>
              </div>
            ))}
          </>
        )}
        <div style={{ height: 80 }} />
      </div>

      {/* Create List Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--jamii-surface)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 480, border: '1px solid var(--jamii-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Create a List</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jamii-text-muted)', fontSize: 22 }}>✕</button>
            </div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>List name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)} maxLength={25}
              placeholder="e.g. African Founders"
              style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 14, padding: '12px 16px', color: 'var(--jamii-text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Description <span style={{ color: 'var(--jamii-text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={100}
              placeholder="What's this list about?"
              rows={3}
              style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 14, padding: '12px 16px', color: 'var(--jamii-text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', resize: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                style={{ width: 44, height: 24, borderRadius: 12, background: isPrivate ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isPrivate ? 23 : 3, transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🔒 Make private</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 20, background: 'var(--jamii-surface-2)', border: 'none', color: 'var(--jamii-text)', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Cancel</button>
              <button
                onClick={() => setShowCreate(false)}
                disabled={!newName.trim()}
                style={{ flex: 1, padding: '12px', borderRadius: 20, background: newName.trim() ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)', border: 'none', color: '#fff', fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: 15, opacity: newName.trim() ? 1 : 0.5 }}
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
