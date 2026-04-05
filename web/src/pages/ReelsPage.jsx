import React, { useState, useCallback } from 'react';

const REELS = [
  {
    id: 'r1',
    author: { name: 'Nina Patel', username: '@ninapatel', initials: 'NP', color: '#ff5722' },
    caption: 'New drop — swipe to see the full lookbook ✨ #Fashion #Style',
    audio: '🎵 Original audio - Nina Patel',
    likes: 84200, comments: 1203, shares: 4210,
    gradient: 'linear-gradient(160deg, #f7971e, #ffd200, #ff6b35)',
    liked: false,
    saved: false,
    followed: false,
  },
  {
    id: 'r2',
    author: { name: 'Sam Torres', username: '@samuelTorres', initials: 'ST', color: '#4caf50' },
    caption: 'Golden hour never misses 🌅 #Photography #GoldenHour',
    audio: '🎵 Aesthetic Lofi - Chillhop',
    likes: 121000, comments: 3401, shares: 9820,
    gradient: 'linear-gradient(160deg, #f6d365, #fda085)',
    liked: true,
    saved: true,
    followed: true,
  },
  {
    id: 'r3',
    author: { name: 'Alex Rivera', username: '@alexrivera', initials: 'AR', color: '#e91e8c' },
    caption: 'POV: you just shipped Phase 1 of your startup 🚀🔥 #BuildInPublic',
    audio: '🎵 Trending Sound',
    likes: 43100, comments: 891, shares: 2300,
    gradient: 'linear-gradient(160deg, #1a1a2e, #e91e8c, #ff6b35)',
    liked: false,
    saved: false,
    followed: false,
  },
  {
    id: 'r4',
    author: { name: 'BlusceLabs', username: '@bluscelabs', initials: 'BL', color: '#2AABEE' },
    caption: 'Jamii Spaces — go live with your community 🎙️ #Jamii #SuperApp',
    audio: '🎵 Original audio - BlusceLabs',
    likes: 92800, comments: 5621, shares: 18400,
    gradient: 'linear-gradient(160deg, #0f2027, #2AABEE, #7f00ff)',
    liked: false,
    saved: false,
    followed: false,
  },
  {
    id: 'r5',
    author: { name: 'Mia Chen', username: '@miachen', initials: 'MC', color: '#ff6b35' },
    caption: 'Thread dropped: how I built my first app with zero experience 🧵 Full story on my page.',
    audio: '🎵 motivational beats',
    likes: 67300, comments: 2103, shares: 13200,
    gradient: 'linear-gradient(160deg, #232526, #ff6b35)',
    liked: false,
    saved: false,
    followed: false,
  },
];

export default function ReelsPage() {
  const [reels, setReels] = useState(REELS);
  const [current, setCurrent] = useState(0);

  const toggle = useCallback((idx, field, countField) => {
    setReels(rs => rs.map((r, i) => i !== idx ? r : {
      ...r,
      [field]: !r[field],
      [countField]: r[field] ? r[countField] - 1 : r[countField] + 1,
    }));
  }, []);

  const fmt = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n;

  const reel = reels[current];

  return (
    <div style={{
      height: '100%', overflow: 'hidden', position: 'relative',
      background: '#000',
    }}>
      {/* Video area */}
      <div style={{
        width: '100%', height: '100%',
        background: reel.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        transition: 'background 0.4s ease',
      }}>
        {/* Placeholder video label */}
        <div style={{ fontSize: 48, opacity: 0.3 }}>🎬</div>

        {/* Gradient overlay bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 50%)',
        }} />

        {/* Gradient overlay top */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%)',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '20px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 10,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Reels</h2>
          <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>📷</button>
        </div>

        {/* Right action bar */}
        <div style={{
          position: 'absolute', right: 16, bottom: 120, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}>
          {/* Author avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: reel.author.color, border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, color: '#fff',
            }}>{reel.author.initials}</div>
            {!reels[current].followed && (
              <button onClick={() => toggle(current, 'followed', 'noop')} style={{
                position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                width: 22, height: 22, borderRadius: '50%', background: 'var(--jamii-blue)',
                border: '2px solid #fff', color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, cursor: 'pointer',
              }}>+</button>
            )}
          </div>

          {/* Like */}
          <ActionBtn icon={reels[current].liked ? '❤️' : '🤍'} count={fmt(reel.likes)} onClick={() => toggle(current, 'liked', 'likes')} active={reels[current].liked} />

          {/* Comment */}
          <ActionBtn icon="💬" count={fmt(reel.comments)} />

          {/* Share */}
          <ActionBtn icon="↗" count={fmt(reel.shares)} />

          {/* Save */}
          <ActionBtn icon={reels[current].saved ? '🔖' : '🏷️'} count="Save" onClick={() => toggle(current, 'saved', 'noop2')} active={reels[current].saved} />

          {/* More */}
          <ActionBtn icon="···" />
        </div>

        {/* Bottom info */}
        <div style={{
          position: 'absolute', left: 16, right: 80, bottom: 90, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{reel.author.name}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{reel.author.username}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>
            {reel.caption.split(' ').map((w, i) =>
              w.startsWith('#') ? <span key={i} style={{ fontWeight: 700 }}>{w} </span> : w + ' '
            )}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎵</div>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{reel.audio}</span>
          </div>
        </div>

        {/* Navigation dots */}
        <div style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {reels.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: 4, height: i === current ? 20 : 6, borderRadius: 3,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        {/* Tap areas for navigation */}
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 200, display: 'flex', zIndex: 5 }}>
          <div style={{ flex: 1 }} onClick={() => setCurrent(c => Math.max(0, c - 1))} />
          <div style={{ flex: 1 }} onClick={() => setCurrent(c => Math.min(reels.length - 1, c + 1))} />
        </div>
      </div>

      {/* Bottom nav spacer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }} />
    </div>
  );
}

function ActionBtn({ icon, count, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
    }}>
      <div style={{ fontSize: 28, filter: active ? 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' : 'none' }}>{icon}</div>
      {count && <span style={{ fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{count}</span>}
    </button>
  );
}
