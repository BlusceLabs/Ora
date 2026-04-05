import React, { useState } from 'react';

const CATEGORIES = ['All', 'Fashion', 'Electronics', 'Beauty', 'Food', 'Art', 'Books'];

const PRODUCTS = [
  { id: 1, name: 'Jamii Hoodie', seller: '@bluscelabs', price: 2800, currency: 'KES', category: 'Fashion', emoji: '👕', rating: 4.8, reviews: 214, badge: 'Top Seller' },
  { id: 2, name: 'Wireless Earbuds', seller: '@techzone_ke', price: 3500, currency: 'KES', category: 'Electronics', emoji: '🎧', rating: 4.6, reviews: 98, badge: null },
  { id: 3, name: 'Shea Butter Set', seller: '@naturalglow', price: 950, currency: 'KES', category: 'Beauty', emoji: '🧴', rating: 4.9, reviews: 341, badge: 'Best Rated' },
  { id: 4, name: 'Pilau Mix (1kg)', seller: '@mombasa_spices', price: 320, currency: 'KES', category: 'Food', emoji: '🌶️', rating: 4.7, reviews: 512, badge: null },
  { id: 5, name: 'Digital Art Print', seller: '@artbyamina', price: 1200, currency: 'KES', category: 'Art', emoji: '🖼️', rating: 5.0, reviews: 47, badge: 'New' },
  { id: 6, name: 'Nairobi Noir (Novel)', seller: '@kenyareads', price: 650, currency: 'KES', category: 'Books', emoji: '📖', rating: 4.5, reviews: 180, badge: null },
  { id: 7, name: 'Batik Wrap Dress', seller: '@africanstyle', price: 2200, currency: 'KES', category: 'Fashion', emoji: '👗', rating: 4.7, reviews: 127, badge: null },
  { id: 8, name: 'Solar Power Bank', seller: '@greentech_ke', price: 4800, currency: 'KES', category: 'Electronics', emoji: '🔋', rating: 4.4, reviews: 63, badge: 'Eco Pick' },
];

const FEATURED = [
  { label: 'Flash Sale', sub: 'Up to 40% off today', color: '#ff4136', emoji: '⚡' },
  { label: 'Creator Market', sub: 'Support local creators', color: '#2AABEE', emoji: '🎨' },
  { label: 'Fresh Picks', sub: 'New arrivals this week', color: '#2ecc40', emoji: '✨' },
];

function Stars({ rating }) {
  return (
    <span style={{ color: '#f5a623', fontSize: 12 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
      <span style={{ color: 'var(--jamii-text-muted)', marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

export default function ShopPage() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const filtered = PRODUCTS.filter(p => {
    if (category !== 'All' && p.category !== category) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const addToCart = (id) => setCart(c => c.includes(id) ? c : [...c, id]);
  const toggleWishlist = (id) => setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Jamii Shop</h2>
            <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 2 }}>Support creators. Shop local.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{ background: 'var(--jamii-surface-2)', border: 'none', borderRadius: 20, padding: '8px 16px', color: 'var(--jamii-text)', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              🛒 {cart.length > 0 && <span style={{ background: 'var(--jamii-blue)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cart.length}</span>}
              Cart
            </button>
            <button style={{ background: 'var(--jamii-blue)', border: 'none', borderRadius: 20, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              + Sell
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search products, sellers..."
            style={{ width: '100%', background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)', borderRadius: 20, padding: '10px 16px 10px 42px', color: 'var(--jamii-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 14 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: category === c ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)',
              color: category === c ? '#fff' : 'var(--jamii-text-muted)', fontWeight: 600, fontSize: 13,
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 900, margin: '0 auto' }}>
        {/* Featured banners */}
        {category === 'All' && !query && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FEATURED.map(f => (
              <div key={f.label} style={{
                flexShrink: 0, minWidth: 200, borderRadius: 20, padding: '20px',
                background: `linear-gradient(135deg, ${f.color}22, ${f.color}44)`,
                border: `1px solid ${f.color}55`, cursor: 'pointer',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{f.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{f.label}</div>
                <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13, marginTop: 4 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Section label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>
            {category === 'All' ? 'Popular Products' : category}
            <span style={{ color: 'var(--jamii-text-muted)', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({filtered.length})</span>
          </h3>
          <button style={{ background: 'none', border: 'none', color: 'var(--jamii-blue)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Filter ↕</button>
        </div>

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(product => (
            <div key={product.id} style={{
              background: 'var(--jamii-surface)', borderRadius: 20, overflow: 'hidden',
              border: '1px solid var(--jamii-border)', cursor: 'pointer', transition: 'transform 0.2s',
            }}>
              {/* Product image area */}
              <div style={{ position: 'relative', height: 140, background: 'var(--jamii-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 56 }}>{product.emoji}</span>
                {product.badge && (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#ff4136', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{product.badge}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(23,33,43,0.7)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {wishlist.includes(product.id) ? '❤️' : '🤍'}
                </button>
              </div>

              {/* Product info */}
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
                <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12, marginBottom: 6 }}>{product.seller}</div>
                <Stars rating={product.rating} />
                <div style={{ color: 'var(--jamii-text-muted)', fontSize: 11, marginBottom: 10 }}> ({product.reviews} reviews)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--jamii-blue)' }}>
                    {product.currency} {product.price.toLocaleString()}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); addToCart(product.id); }}
                    style={{
                      background: cart.includes(product.id) ? '#2ecc40' : 'var(--jamii-blue)',
                      color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px',
                      fontWeight: 700, cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    {cart.includes(product.id) ? '✓ Added' : '+ Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--jamii-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No products found</div>
            <div style={{ fontSize: 14 }}>Try a different search or category</div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>
    </div>
  );
}
