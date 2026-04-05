import React, { useState } from 'react';

const COLLECTIONS = [
  { id: 'all', label: 'All Saved', icon: '🔖', count: 47 },
  { id: 'videos', label: 'Videos', icon: '🎬', count: 12 },
  { id: 'photos', label: 'Photos', icon: '📸', count: 18 },
  { id: 'quotes', label: 'Quotes', icon: '💬', count: 9 },
  { id: 'articles', label: 'Articles', icon: '📰', count: 5 },
  { id: 'products', label: 'Products', icon: '🛍️', count: 3 },
];

const BOOKMARKS = [
  { id: 1, type: 'post', author: 'BlusceLabs', username: '@bluscelabs', time: '2d', initials: 'BL', color: '#2AABEE', text: 'The future of social commerce in Africa is not just mobile-first — it\'s community-first. That\'s what Jamii is building. 🌍', likes: 3200, saved: true, collection: 'all' },
  { id: 2, type: 'video', author: 'Amara Wanjiku', username: '@amara_w', time: '3d', initials: 'AW', color: '#e91e8c', text: 'How I grew from 0 to 50K followers on Jamii in 6 months — full breakdown', thumb: true, duration: '8:42', likes: 8900, saved: true, collection: 'videos' },
  { id: 3, type: 'post', author: 'Kevin Otieno', username: '@kevindev', time: '5d', initials: 'KO', color: '#ff5722', text: '"The best time to start building is when you have no experience. The second best time is now." — Build every day.', likes: 1800, saved: true, collection: 'quotes' },
  { id: 4, type: 'photo', author: 'Nina Patel', username: '@ninapatel', time: '1w', initials: 'NP', color: '#9c27b0', text: 'Sunset at Naivasha last weekend. Nature always wins 🌅', thumb: true, likes: 4400, saved: true, collection: 'photos' },
  { id: 5, type: 'video', author: 'DJ Maina', username: '@djmaina', time: '1w', initials: 'DM', color: '#ff9800', text: 'My full Afrobeats Mix Vol. 3 — 2 hours of pure energy 🎵🔥', thumb: true, duration: '2:01:34', likes: 15000, saved: true, collection: 'videos' },
  { id: 6, type: 'post', author: 'Fintech EA', username: '@fintechea', time: '2w', initials: 'FE', color: '#009688', text: 'Thread: 10 things I wish I knew before investing in African startups. A breakdown by sector, stage and risk profile. 🧵', likes: 6200, saved: true, collection: 'articles' },
  { id: 7, type: 'product', author: 'Jamii Shop', username: '@jamii_shop', time: '2w', initials: 'JS', color: '#4caf50', text: 'Premium Wireless Earbuds — KES 3,499 · Free delivery Nairobi', thumb: true, likes: 220, saved: true, collection: 'products', price: 'KES 3,499' },
  { id: 8, type: 'photo', author: 'SafariSnaps', username: '@safarisnaps', time: '3w', initials: 'SS', color: '#795548', text: 'A lion family at sunrise in the Maasai Mara. One of those shots you never forget. 📷', thumb: true, likes: 22000, saved: true, collection: 'photos' },
];

export default function BookmarksPage() {
  const [activeCollection, setActiveCollection] = useState('all');
  const [view, setView] = useState('list');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [saved, setSaved] = useState(BOOKMARKS.reduce((acc, b) => ({ ...acc, [b.id]: true }), {}));

  const filtered = activeCollection === 'all' ? BOOKMARKS : BOOKMARKS.filter(b => b.collection === activeCollection || (activeCollection === 'videos' && b.type === 'video') || (activeCollection === 'photos' && b.type === 'photo') || (activeCollection === 'products' && b.type === 'product') || (activeCollection === 'quotes' && b.type === 'post' && b.collection === 'quotes') || (activeCollection === 'articles' && b.type === 'post' && b.collection === 'articles'));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Bookmarks</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView(v => v === 'list' ? 'grid' : 'list')} style={{ background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 12, padding: '8px 12px', color: 'var(--jamii-text)', cursor: 'pointer', fontSize: 16 }}>{view === 'list' ? '⊞' : '☰'}</button>
            <button onClick={() => setShowNewFolder(true)} style={{ background: 'var(--jamii-blue)', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>+ Collection</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollbarWidth: 'none' }}>
          {COLLECTIONS.map(col => (
            <button key={col.id} onClick={() => setActiveCollection(col.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: activeCollection === col.id ? 'none' : '1px solid var(--jamii-border)', background: activeCollection === col.id ? 'var(--jamii-blue)' : 'var(--jamii-surface)', color: activeCollection === col.id ? '#fff' : 'var(--jamii-text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <span>{col.icon}</span> {col.label} <span style={{ background: activeCollection === col.id ? 'rgba(255,255,255,0.25)' : 'var(--jamii-surface-2)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{col.count}</span>
            </button>
          ))}
        </div>

        {view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: 'var(--jamii-surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--jamii-border)', cursor: 'pointer' }}>
                {b.thumb && (
                  <div style={{ height: 120, background: `linear-gradient(135deg, ${b.color}33, ${b.color}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                    {b.type === 'video' ? '▶️' : b.type === 'product' ? '🛍️' : '📸'}
                    {b.duration && <span style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>{b.duration}</span>}
                  </div>
                )}
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{b.text.slice(0, 60)}{b.text.length > 60 ? '…' : ''}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 11, marginTop: 6 }}>{b.username} · {b.time}</div>
                  {b.price && <div style={{ color: 'var(--jamii-blue)', fontWeight: 700, fontSize: 12, marginTop: 4 }}>{b.price}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: 'var(--jamii-surface)', borderRadius: 16, padding: 16, border: '1px solid var(--jamii-border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  {b.thumb && (
                    <div style={{ width: 80, height: 80, borderRadius: 12, background: `linear-gradient(135deg, ${b.color}33, ${b.color}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, position: 'relative' }}>
                      {b.type === 'video' ? '▶️' : b.type === 'product' ? '🛍️' : '📸'}
                      {b.duration && <span style={{ position: 'absolute', bottom: 3, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 5 }}>{b.duration}</span>}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0 }}>{b.initials}</div>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{b.author}</span>
                        <span style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginLeft: 6 }}>{b.username} · {b.time}</span>
                      </div>
                      {b.type !== 'post' && <span style={{ marginLeft: 'auto', background: 'var(--jamii-surface-2)', borderRadius: 8, padding: '2px 8px', fontSize: 11, color: 'var(--jamii-text-muted)', textTransform: 'capitalize' }}>{b.type}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--jamii-text)' }}>{b.text}</p>
                    {b.price && <div style={{ color: 'var(--jamii-blue)', fontWeight: 700, fontSize: 13, marginTop: 6 }}>{b.price}</div>}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>❤️ {b.likes >= 1000 ? (b.likes / 1000).toFixed(1) + 'K' : b.likes}</span>
                      <button onClick={e => { e.stopPropagation(); setSaved(s => ({ ...s, [b.id]: !s[b.id] })); }} style={{ background: 'none', border: 'none', color: saved[b.id] ? 'var(--jamii-blue)' : 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 12, padding: 0, fontWeight: 600 }}>{saved[b.id] ? '🔖 Saved' : '+ Save'}</button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 12, padding: 0 }}>📤 Share</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--jamii-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔖</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Nothing saved here yet</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Tap the bookmark icon on any post to save it</div>
          </div>
        )}
      </div>

      {showNewFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--jamii-surface)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>New Collection</h3>
            <input placeholder="Collection name" style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 12, padding: '12px 16px', color: 'var(--jamii-text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jamii-text-muted)', marginBottom: 10 }}>PICK AN ICON</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['🔖', '❤️', '📌', '⭐', '🎬', '📸', '🎵', '📰', '🛍️', '💡', '🔥', '📚'].map(icon => (
                  <button key={icon} style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', fontSize: 20, cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewFolder(false)} style={{ flex: 1, padding: 12, background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 16, color: 'var(--jamii-text)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => setShowNewFolder(false)} style={{ flex: 1, padding: 12, background: 'var(--jamii-blue)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
