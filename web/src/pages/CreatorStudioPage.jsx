import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATS = [
  { label: 'Followers', value: '12.4K', change: '+8.2%', icon: '👥', positive: true },
  { label: 'Total Views', value: '284K', change: '+21.5%', icon: '👁️', positive: true },
  { label: 'Engagement', value: '6.8%', change: '+1.1%', icon: '💬', positive: true },
  { label: 'Revenue', value: 'KES 14,820', change: '+34%', icon: '💰', positive: true },
];

const CONTENT_ITEMS = [
  { id: 1, type: 'Post', title: 'Building Jamii from scratch 🧵', views: 18420, likes: 1203, date: 'Apr 4', status: 'live', thumbnail: '📝' },
  { id: 2, type: 'Reel', title: 'Nairobi night time-lapse', views: 52100, likes: 4820, date: 'Apr 3', status: 'live', thumbnail: '🎬' },
  { id: 3, type: 'Space', title: 'Startup Funding in Africa', views: 2840, likes: 312, date: 'Apr 2', status: 'ended', thumbnail: '🎙️' },
  { id: 4, type: 'Post', title: 'The future of African tech', views: 9340, likes: 780, date: 'Apr 1', status: 'live', thumbnail: '🌍' },
  { id: 5, type: 'Reel', title: 'Product demo — Jamii Spaces', views: 31200, likes: 2890, date: 'Mar 30', status: 'live', thumbnail: '🎥' },
];

const MONETIZATION = [
  { name: 'Creator Fund', description: 'Earn based on views and engagement', enabled: true, earnings: 'KES 6,420 / mo' },
  { name: 'Subscriptions', description: 'Paid monthly access to exclusive content', enabled: true, earnings: 'KES 5,200 / mo (26 subs)' },
  { name: 'Tips', description: 'Let fans tip you directly', enabled: false, earnings: null },
  { name: 'Shop Affiliate', description: 'Earn commissions on Jamii Shop sales', enabled: false, earnings: null },
];

const TOOLS = [
  { icon: '📊', label: 'Analytics', desc: 'Deep dive into your performance', color: '#2AABEE', path: null },
  { icon: '📅', label: 'Schedule', desc: 'Queue posts and reels', color: '#9b59b6', path: null },
  { icon: '🎨', label: 'Media Kit', desc: 'Your creator profile for brands', color: '#e67e22', path: null },
  { icon: '🤝', label: 'Collabs', desc: 'Find creators to collab with', color: '#2ecc40', path: null },
];

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', background: i === data.length - 1 ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)', borderRadius: '6px 6px 0 0', height: `${(d.v / max) * 64}px`, minHeight: 4, transition: 'height 0.5s' }} />
          <span style={{ fontSize: 10, color: 'var(--jamii-text-muted)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const weeklyData = [
  { label: 'Mon', v: 4200 }, { label: 'Tue', v: 6800 }, { label: 'Wed', v: 5100 },
  { label: 'Thu', v: 9200 }, { label: 'Fri', v: 12400 }, { label: 'Sat', v: 8700 }, { label: 'Sun', v: 14200 },
];

export default function CreatorStudioPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [monetization, setMonetization] = useState(MONETIZATION);

  const toggleMonetize = (name) => setMonetization(m => m.map(i => i.name === name ? { ...i, enabled: !i.enabled } : i));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Creator Studio</h2>
            <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 2 }}>Grow your audience. Monetize your content.</div>
          </div>
          <button style={{ background: 'var(--jamii-blue)', border: 'none', borderRadius: 20, padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Create Content
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginLeft: -20, paddingLeft: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['overview', 'content', 'monetization', 'tools'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
              color: tab === t ? 'var(--jamii-text)' : 'var(--jamii-text-muted)',
              borderBottom: tab === t ? '2px solid var(--jamii-blue)' : '2px solid transparent',
              textTransform: 'capitalize',
            }}>
              {t === 'overview' ? 'Overview' : t === 'content' ? 'My Content' : t === 'monetization' ? 'Monetize' : 'Tools'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>

        {/* Overview tab */}
        {tab === 'overview' && (
          <>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
              {STATS.map(stat => (
                <div key={stat.label} style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', border: '1px solid var(--jamii-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>{stat.label}</span>
                    <span style={{ fontSize: 22 }}>{stat.icon}</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: stat.positive ? '#2ecc40' : '#ff4136', fontWeight: 600 }}>
                    {stat.change} vs last week
                  </div>
                </div>
              ))}
            </div>

            {/* Views chart */}
            <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', border: '1px solid var(--jamii-border)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>Views this week</h3>
                <span style={{ color: 'var(--jamii-blue)', fontWeight: 700, fontSize: 14 }}>61,600 total</span>
              </div>
              <BarChart data={weeklyData} />
            </div>

            {/* Top content preview */}
            <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', border: '1px solid var(--jamii-border)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>Top Content</h3>
                <button onClick={() => setTab('content')} style={{ background: 'none', border: 'none', color: 'var(--jamii-blue)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>View all</button>
              </div>
              {CONTENT_ITEMS.slice(0, 3).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--jamii-border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--jamii-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{item.thumbnail}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginTop: 3 }}>{item.type} · {item.date}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.views.toLocaleString()} views</div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>❤️ {item.likes.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Audience insights */}
            <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', border: '1px solid var(--jamii-border)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Audience Insights</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Top Location', value: 'Nairobi, KE', icon: '📍' },
                  { label: 'Best Post Time', value: '7pm – 10pm', icon: '⏰' },
                  { label: 'Age Range', value: '18–34 (68%)', icon: '👤' },
                  { label: 'Top Content Type', value: 'Reels', icon: '🎬' },
                ].map(insight => (
                  <div key={insight.label} style={{ padding: '14px', background: 'var(--jamii-surface-2)', borderRadius: 14 }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{insight.icon}</div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginBottom: 4 }}>{insight.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{insight.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Content tab */}
        {tab === 'content' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {['All', 'Posts', 'Reels', 'Spaces'].map(f => (
                <button key={f} style={{ padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', background: f === 'All' ? 'var(--jamii-blue)' : 'var(--jamii-surface)', color: f === 'All' ? '#fff' : 'var(--jamii-text-muted)', fontWeight: 600, fontSize: 13 }}>{f}</button>
              ))}
            </div>
            {CONTENT_ITEMS.map(item => (
              <div key={item.id} style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '16px 20px', marginBottom: 12, border: '1px solid var(--jamii-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--jamii-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{item.thumbnail}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: item.type === 'Reel' ? '#9b59b6' : item.type === 'Space' ? '#2AABEE' : 'var(--jamii-surface-2)', color: (item.type === 'Reel' || item.type === 'Space') ? '#fff' : 'var(--jamii-text-muted)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{item.type}</span>
                    <span style={{ color: item.status === 'live' ? '#2ecc40' : 'var(--jamii-text-muted)', fontSize: 12, fontWeight: 600 }}>● {item.status}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginTop: 4 }}>👁️ {item.views.toLocaleString()} views · ❤️ {item.likes.toLocaleString()} · {item.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button style={{ background: 'var(--jamii-surface-2)', border: 'none', borderRadius: 20, padding: '6px 14px', color: 'var(--jamii-text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Edit</button>
                  <button style={{ background: 'rgba(255,65,54,0.15)', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#ff4136', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Monetization tab */}
        {tab === 'monetization' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, #2AABEE22, #2AABEE44)', border: '1px solid rgba(42,171,238,0.4)', borderRadius: 20, padding: '24px', marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Total Earnings This Month</h3>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--jamii-blue)', marginBottom: 8 }}>KES 11,620</div>
              <div style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>Payout on the 1st · Next: May 1, 2026</div>
              <button style={{ marginTop: 16, background: 'var(--jamii-blue)', border: 'none', borderRadius: 20, padding: '10px 24px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Request Payout</button>
            </div>

            {monetization.map(item => (
              <div key={item.name} style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', marginBottom: 14, border: '1px solid var(--jamii-border)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{item.name}</span>
                    {item.enabled && <span style={{ background: '#2ecc4022', color: '#2ecc40', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Active</span>}
                  </div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 14, marginBottom: item.earnings ? 8 : 0 }}>{item.description}</div>
                  {item.earnings && <div style={{ fontWeight: 700, color: '#2ecc40', fontSize: 15 }}>📈 {item.earnings}</div>}
                </div>
                <button
                  onClick={() => toggleMonetize(item.name)}
                  style={{ width: 52, height: 28, borderRadius: 14, background: item.enabled ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginTop: 4 }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: item.enabled ? 27 : 3, transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Tools tab */}
        {tab === 'tools' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              {TOOLS.map(tool => (
                <div key={tool.label} style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '24px', border: '1px solid var(--jamii-border)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: tool.color + '22', border: `2px solid ${tool.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>{tool.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{tool.label}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13 }}>{tool.desc}</div>
                </div>
              ))}
            </div>

            {/* Resources */}
            <div style={{ background: 'var(--jamii-surface)', borderRadius: 20, padding: '20px', border: '1px solid var(--jamii-border)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Creator Resources</h3>
              {[
                { title: 'Creator Guidelines', desc: 'Community rules for creators', icon: '📜' },
                { title: 'Creator Academy', desc: 'Free courses to grow your audience', icon: '🎓' },
                { title: 'Brand Deals Hub', desc: 'Connect with brands looking for creators', icon: '🤝' },
              ].map(r => (
                <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--jamii-border)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 24 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                    <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>{r.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--jamii-text-muted)' }}>→</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
