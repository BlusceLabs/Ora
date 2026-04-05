import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['All', 'Tech', 'Sports', 'Music', 'Gaming', 'Fashion', 'Art', 'Travel', 'Food', 'Finance', 'Health', 'Education'];

const COMMUNITIES = [
  { id: 1, name: 'Kenya Tech Hub', slug: '@kenyatechhub', members: 48200, posts: 3100, icon: '💻', color: '#2AABEE', cover: '#0d2233', category: 'Tech', joined: true, description: 'The largest tech community in East Africa. Startups, coding, AI & innovation.' },
  { id: 2, name: 'Nairobi Foodies', slug: '@nrbfoodies', members: 32100, posts: 8700, icon: '🍜', color: '#ff5722', cover: '#2d1100', category: 'Food', joined: true, description: 'Discover the best restaurants, recipes and food events in Nairobi.' },
  { id: 3, name: 'Beats & Vibes KE', slug: '@beatsvibesKE', members: 61000, posts: 12400, icon: '🎵', color: '#e91e8c', cover: '#2d0020', category: 'Music', joined: false, description: 'Kenyan music, afrobeats, gengetone, bongo & more. Producers welcome.' },
  { id: 4, name: 'Jogoo Road Garage', slug: '@jogoogarage', members: 15400, posts: 2200, icon: '🚗', color: '#ff9800', cover: '#2d1800', category: 'Tech', joined: false, description: 'Car lovers, mechanics, mods & road trips across East Africa.' },
  { id: 5, name: 'Harambee Stars Fans', slug: '@harambeestars', members: 90300, posts: 45000, icon: '⚽', color: '#4caf50', cover: '#002200', category: 'Sports', joined: true, description: 'Official fan community for Kenya national football team.' },
  { id: 6, name: 'African Art Collective', slug: '@africanartco', members: 22700, posts: 9800, icon: '🎨', color: '#9c27b0', cover: '#1a002d', category: 'Art', joined: false, description: 'Celebrating African visual arts, sculpture, photography and design.' },
  { id: 7, name: 'Fintech East Africa', slug: '@fintechea', members: 35000, posts: 4200, icon: '💳', color: '#009688', cover: '#001a18', category: 'Finance', joined: false, description: 'Mobile money, crypto, investing, and banking innovation in Africa.' },
  { id: 8, name: 'Gamer\'s Guild KE', slug: '@gamersguildke', members: 28900, posts: 18600, icon: '🎮', color: '#673ab7', cover: '#100020', category: 'Gaming', joined: true, description: 'FIFA, COD, Valorant, esports tournaments and gaming culture in Kenya.' },
  { id: 9, name: 'Wanderlust Africa', slug: '@wanderlustaf', members: 19400, posts: 7300, icon: '✈️', color: '#00bcd4', cover: '#001a20', category: 'Travel', joined: false, description: 'Travel guides, tips, hidden gems and safari experiences across Africa.' },
  { id: 10, name: 'Fit & Healthy KE', slug: '@fithealthyke', members: 41000, posts: 16000, icon: '🏃', color: '#8bc34a', cover: '#141e00', category: 'Health', joined: false, description: 'Workouts, nutrition, mental health and wellness for the modern Kenyan.' },
];

const POSTS = [
  { id: 1, author: 'Amara Wanjiku', username: '@amara_w', time: '2h', text: 'Just shipped our MVP using React Native + Supabase in 3 days. The Jamii developer community helped so much! 🚀 #BuildInPublic', likes: 284, comments: 47, initials: 'AW', color: '#2AABEE' },
  { id: 2, author: 'Kevin Otieno', username: '@kevindev', time: '4h', text: 'Hot take: TypeScript has saved more Kenyan startups from midnight production bugs than any framework. Discuss 👇', likes: 512, comments: 119, initials: 'KO', color: '#e91e8c' },
  { id: 3, author: 'BlusceLabs', username: '@bluscelabs', time: '6h', text: 'We are building the future of social commerce in Africa. Every feature in Jamii is designed for us, by us. 🌍', likes: 1204, comments: 88, initials: 'BL', color: '#ff5722' },
];

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joined, setJoined] = useState({ 1: true, 2: true, 5: true, 8: true });
  const [search, setSearch] = useState('');

  const filtered = COMMUNITIES.filter(c =>
    (activeCategory === 'All' || c.category === activeCategory) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (activeCommunity) {
    const c = activeCommunity;
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--jamii-bg)' }}>
        <div style={{ height: 160, background: c.cover, position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setActiveCommunity(null)} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ position: 'absolute', bottom: -32, left: 20, width: 64, height: 64, borderRadius: 18, background: c.color, border: '3px solid var(--jamii-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{c.icon}</div>
        </div>
        <div style={{ padding: '44px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{c.name}</h2>
              <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 2 }}>{c.slug} · {c.category}</div>
            </div>
            <button onClick={() => setJoined(j => ({ ...j, [c.id]: !j[c.id] }))} style={{ background: joined[c.id] ? 'var(--jamii-surface-2)' : 'var(--jamii-blue)', color: joined[c.id] ? 'var(--jamii-text)' : '#fff', border: joined[c.id] ? '1px solid var(--jamii-border)' : 'none', borderRadius: 24, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{joined[c.id] ? 'Joined ✓' : 'Join'}</button>
          </div>
          <p style={{ color: 'var(--jamii-text-muted)', fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>{c.description}</p>
          <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
            <div><span style={{ fontWeight: 700, fontSize: 16 }}>{c.members.toLocaleString()}</span><span style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginLeft: 4 }}>Members</span></div>
            <div><span style={{ fontWeight: 700, fontSize: 16 }}>{c.posts.toLocaleString()}</span><span style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginLeft: 4 }}>Posts</span></div>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 16, borderBottom: '1px solid var(--jamii-border)', paddingBottom: 0 }}>
            {['Posts', 'Members', 'Media', 'Events'].map(tab => (
              <button key={tab} style={{ padding: '10px 18px', background: tab === 'Posts' ? 'none' : 'none', border: 'none', borderBottom: tab === 'Posts' ? '2px solid var(--jamii-blue)' : '2px solid transparent', color: tab === 'Posts' ? 'var(--jamii-blue)' : 'var(--jamii-text-muted)', fontWeight: tab === 'Posts' ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{tab}</button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            {POSTS.map(post => (
              <div key={post.id} style={{ background: 'var(--jamii-surface)', borderRadius: 16, padding: 16, marginBottom: 12, border: '1px solid var(--jamii-border)' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: post.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>{post.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{post.author}</div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>{post.username} · {post.time}</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{post.text}</p>
                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  {[['❤️', post.likes], ['💬', post.comments], ['🔁', ''], ['📤', '']].map(([icon, count], i) => (
                    <button key={i} style={{ background: 'none', border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>{icon} {count}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Communities</h2>
          <button onClick={() => setShowCreate(true)} style={{ background: 'var(--jamii-blue)', color: '#fff', border: 'none', borderRadius: 24, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>+ Create</button>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities…" style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 24, padding: '10px 16px 10px 42px', color: 'var(--jamii-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: activeCategory === cat ? 'none' : '1px solid var(--jamii-border)', background: activeCategory === cat ? 'var(--jamii-blue)' : 'var(--jamii-surface)', color: activeCategory === cat ? '#fff' : 'var(--jamii-text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{cat}</button>
          ))}
        </div>

        {joined && Object.keys(joined).some(k => joined[k]) && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--jamii-text-muted)' }}>YOUR COMMUNITIES</h3>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
              {COMMUNITIES.filter(c => joined[c.id]).map(c => (
                <div key={c.id} onClick={() => setActiveCommunity(c)} style={{ flexShrink: 0, width: 100, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 20, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 6px', border: '2px solid var(--jamii-border)' }}>{c.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jamii-text)' }}>{c.name.split(' ').slice(0, 2).join(' ')}</div>
                  <div style={{ fontSize: 10, color: 'var(--jamii-text-muted)', marginTop: 2 }}>{c.members >= 1000 ? (c.members / 1000).toFixed(0) + 'K' : c.members}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--jamii-text-muted)' }}>DISCOVER</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setActiveCommunity(c)} style={{ background: 'var(--jamii-surface)', borderRadius: 20, border: '1px solid var(--jamii-border)', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ height: 60, background: c.cover, position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: -20, left: 16, width: 44, height: 44, borderRadius: 14, background: c.color, border: '2px solid var(--jamii-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
              </div>
              <div style={{ padding: '28px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginTop: 2 }}>{c.members.toLocaleString()} members · {c.category}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{c.description}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setJoined(j => ({ ...j, [c.id]: !j[c.id] })); }} style={{ marginLeft: 12, background: joined[c.id] ? 'var(--jamii-surface-2)' : 'var(--jamii-blue)', color: joined[c.id] ? 'var(--jamii-text)' : '#fff', border: joined[c.id] ? '1px solid var(--jamii-border)' : 'none', borderRadius: 20, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>{joined[c.id] ? '✓ Joined' : 'Join'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--jamii-surface)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>Create Community</h3>
            {[['Community Name', 'text', 'e.g. Nairobi Devs'], ['Slug / Handle', 'text', '@yourcomm'], ['Category', 'text', 'Tech, Sports, Music…'], ['Description', 'textarea', 'What is this community about?']].map(([label, type, ph]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--jamii-text-muted)' }}>{label}</div>
                {type === 'textarea'
                  ? <textarea placeholder={ph} rows={3} style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 12, padding: '10px 14px', color: 'var(--jamii-text)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  : <input placeholder={ph} style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 12, padding: '10px 14px', color: 'var(--jamii-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                }
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 16, color: 'var(--jamii-text)', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Cancel</button>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', background: 'var(--jamii-blue)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
