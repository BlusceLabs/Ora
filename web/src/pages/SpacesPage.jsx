import React, { useState } from 'react';

const LIVE_SPACES = [
  {
    id: 's1',
    title: 'The Future of Super-Apps 🚀',
    host: { name: 'BlusceLabs', initials: 'BL', color: '#2AABEE' },
    speakers: [
      { name: 'Alex R.', initials: 'AR', color: '#e91e8c' },
      { name: 'Nina P.', initials: 'NP', color: '#ff5722' },
      { name: 'Jordan K.', initials: 'JK', color: '#9c27b0' },
    ],
    listeners: 4821,
    tags: ['#Tech', '#SuperApp', '#Jamii'],
    live: true,
    pinned: true,
  },
  {
    id: 's2',
    title: 'Creator Economy in 2026 💰',
    host: { name: 'Mia Chen', initials: 'MC', color: '#ff6b35' },
    speakers: [
      { name: 'Sam T.', initials: 'ST', color: '#4caf50' },
      { name: 'Dana W.', initials: 'DW', color: '#00bcd4' },
    ],
    listeners: 2103,
    tags: ['#Creators', '#Money', '#Content'],
    live: true,
    pinned: false,
  },
  {
    id: 's3',
    title: 'Building in Public — Lessons Learned 🧵',
    host: { name: 'Jordan Kim', initials: 'JK', color: '#9c27b0' },
    speakers: [
      { name: 'Chris W.', initials: 'CW', color: '#795548' },
    ],
    listeners: 891,
    tags: ['#BuildInPublic', '#Startup'],
    live: true,
    pinned: false,
  },
  {
    id: 's4',
    title: 'Fashion x Tech: Where Do They Meet? 👗',
    host: { name: 'Nina Patel', initials: 'NP', color: '#ff5722' },
    speakers: [],
    listeners: 342,
    tags: ['#Fashion', '#Tech'],
    live: false,
    scheduled: 'Tonight at 8:00 PM',
    pinned: false,
  },
  {
    id: 's5',
    title: 'Late Night Dev Talk 🌙',
    host: { name: 'Sam Torres', initials: 'ST', color: '#4caf50' },
    speakers: [],
    listeners: 0,
    tags: ['#Dev', '#OpenSource'],
    live: false,
    scheduled: 'Tomorrow at 11:00 PM',
    pinned: false,
  },
];

const CATEGORIES = ['All', 'Tech', 'Music', 'Sports', 'News', 'Creator', 'Fashion'];

export default function SpacesPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [joined, setJoined] = useState(null);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Spaces</h2>
            <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 2 }}>Live audio conversations</div>
          </div>
          <button style={{
            background: 'var(--jamii-blue)', color: '#fff',
            border: 'none', borderRadius: 20, padding: '10px 20px',
            fontWeight: 700, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🎙️ Start a Space
          </button>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveFilter(cat)} style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
              fontWeight: 600, fontSize: 13,
              background: activeFilter === cat ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)',
              color: activeFilter === cat ? '#fff' : 'var(--jamii-text-muted)',
            }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Live spaces */}
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Live Now
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {LIVE_SPACES.filter(s => s.live).map(space => (
            <SpaceCard key={space.id} space={space} joined={joined === space.id} onJoin={() => setJoined(space.id)} onLeave={() => setJoined(null)} />
          ))}
        </div>

        {/* Scheduled */}
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--jamii-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          📅 Scheduled
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LIVE_SPACES.filter(s => !s.live).map(space => (
            <SpaceCard key={space.id} space={space} scheduled />
          ))}
        </div>
      </div>

      {/* Active space mini-player */}
      {joined && (() => {
        const space = LIVE_SPACES.find(s => s.id === joined);
        return (
          <div style={{
            position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 200,
            background: 'var(--jamii-blue)', borderRadius: 20,
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(42,171,238,0.4)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{space?.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>You are listening</div>
            </div>
            <button onClick={() => {}} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: 16 }}>🎤</button>
            <button onClick={() => setJoined(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        );
      })()}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>

      <div style={{ height: 100 }} />
    </div>
  );
}

function SpaceCard({ space, joined, onJoin, onLeave, scheduled }) {
  return (
    <div style={{
      background: 'var(--jamii-surface)',
      borderRadius: 20, padding: '18px 18px 14px',
      border: joined ? '1.5px solid var(--jamii-blue)' : '1px solid var(--jamii-border)',
      boxShadow: joined ? '0 0 0 4px rgba(42,171,238,0.1)' : 'none',
    }}>
      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {space.live && <span style={{ background: '#ff3b30', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>LIVE</span>}
        {space.tags.map(tag => (
          <span key={tag} style={{ background: 'rgba(42,171,238,0.1)', color: 'var(--jamii-blue)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{tag}</span>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, lineHeight: 1.4 }}>{space.title}</div>

      {/* Host & speakers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: space.host.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff' }}>{space.host.initials}</div>
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#ff3b30', border: '2px solid var(--jamii-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7 }}>🎤</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{space.host.name}</div>
          <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>Host</div>
        </div>
        {space.speakers.length > 0 && (
          <>
            <div style={{ width: 1, height: 32, background: 'var(--jamii-border)', marginLeft: 4 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {space.speakers.map((s, i) => (
                <div key={i} title={s.name} style={{ width: 32, height: 32, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#fff', border: '2px solid var(--jamii-surface)' }}>{s.initials}</div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--jamii-text-muted)', fontSize: 13 }}>
          {space.live ? (
            <>🎧 <strong style={{ color: 'var(--jamii-text)' }}>{space.listeners.toLocaleString()}</strong> listening</>
          ) : (
            <span>📅 {space.scheduled}</span>
          )}
        </div>

        {space.live ? (
          joined ? (
            <button onClick={onLeave} style={{
              background: 'rgba(255,59,48,0.15)', color: '#ff3b30',
              border: '1px solid rgba(255,59,48,0.3)',
              borderRadius: 20, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>Leave</button>
          ) : (
            <button onClick={onJoin} style={{
              background: 'var(--jamii-blue)', color: '#fff',
              border: 'none', borderRadius: 20, padding: '8px 20px',
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>Join 🎧</button>
          )
        ) : (
          <button style={{
            background: 'none', border: '1.5px solid var(--jamii-blue)',
            color: 'var(--jamii-blue)', borderRadius: 20, padding: '7px 18px',
            fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>Set Reminder</button>
        )}
      </div>
    </div>
  );
}
