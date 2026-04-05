import React, { useState } from 'react';
import { mockTrending } from '../data/mockFeed';
import { mockChats } from '../data/mockChats';

const CATEGORIES = ['All', 'People', 'Posts', 'Tags', 'Communities'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredPeople = mockChats.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Search header */}
      <div style={{
        padding: '16px', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--jamii-border)',
      }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Jamii"
            autoFocus
            style={{
              width: '100%', background: 'var(--jamii-surface-2)',
              border: '1.5px solid var(--jamii-border)', borderRadius: 24,
              padding: '12px 16px 12px 48px', color: 'var(--jamii-text)',
              fontSize: 16, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 20,
            }}>✕</button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
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

      {!query ? (
        <>
          {/* Trending */}
          <div style={{ padding: '20px 16px 8px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Trending on Jamii</h3>
            {mockTrending.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', borderBottom: '1px solid var(--jamii-border)', cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--jamii-text-muted)', marginBottom: 4 }}>#{i + 1} Trending</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--jamii-blue)' }}>{item.tag}</div>
                  <div style={{ fontSize: 13, color: 'var(--jamii-text-muted)', marginTop: 2 }}>{item.posts}</div>
                </div>
                <button style={{ background: 'none', border: '1.5px solid var(--jamii-border)', borderRadius: 20, padding: '6px 14px', color: 'var(--jamii-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Follow</button>
              </div>
            ))}
          </div>

          {/* Suggested people */}
          <div style={{ padding: '20px 16px 8px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Who to follow</h3>
            {mockChats.slice(0, 4).map(person => (
              <div key={person.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--jamii-border)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: person.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0,
                }}>{person.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{person.name}</div>
                  <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13 }}>{person.lastMessage?.slice(0, 40)}...</div>
                </div>
                <button style={{
                  background: 'var(--jamii-blue)', color: '#fff',
                  border: 'none', borderRadius: 20, padding: '8px 18px',
                  fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0,
                }}>Follow</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '16px' }}>
          <div style={{ color: 'var(--jamii-text-muted)', fontSize: 14, marginBottom: 16 }}>
            Results for "<strong style={{ color: 'var(--jamii-text)' }}>{query}</strong>"
          </div>
          {filteredPeople.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--jamii-text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>No results found</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Try a different search term</div>
            </div>
          ) : filteredPeople.map(person => (
            <div key={person.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--jamii-border)', cursor: 'pointer',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: person.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0,
              }}>{person.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{person.name}</div>
                <div style={{ color: 'var(--jamii-text-muted)', fontSize: 13 }}>{person.lastMessage?.slice(0, 50)}</div>
              </div>
              <button style={{
                background: 'none', border: '1.5px solid var(--jamii-blue)',
                color: 'var(--jamii-blue)', borderRadius: 20, padding: '6px 16px',
                fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0,
              }}>Follow</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}
