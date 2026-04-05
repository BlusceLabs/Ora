import React, { useState, useRef } from 'react';

const MAX_CHARS = 25000;
const FREE_LIMIT = 280;

export default function CreatePostModal({ onClose, onPost }) {
  const [text, setText] = useState('');
  const [tab, setTab] = useState('post');
  const textareaRef = useRef(null);
  const remaining = FREE_LIMIT - text.length;
  const overLimit = text.length > FREE_LIMIT;
  const isPremium = false;
  const limit = isPremium ? MAX_CHARS : FREE_LIMIT;

  const handlePost = () => {
    if (text.trim()) {
      onPost?.({ text });
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '5vh',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--jamii-surface)',
        borderRadius: 20, width: '100%', maxWidth: 600,
        margin: '0 16px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--jamii-border)',
        }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--jamii-text)', fontSize: 22, cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {['post', 'thread', 'poll'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14, textTransform: 'capitalize',
                background: tab === t ? 'var(--jamii-blue)' : 'var(--jamii-surface-2)',
                color: tab === t ? '#fff' : 'var(--jamii-text-muted)',
              }}>{t}</button>
            ))}
          </div>
          <button
            onClick={handlePost}
            disabled={!text.trim() || text.length > limit}
            style={{
              background: text.trim() && text.length <= limit ? 'var(--jamii-blue)' : 'rgba(42,171,238,0.4)',
              color: '#fff', border: 'none', borderRadius: 20,
              padding: '8px 20px', fontWeight: 700, fontSize: 15, cursor: text.trim() ? 'pointer' : 'default',
            }}
          >Post</button>
        </div>

        {/* Compose area */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--jamii-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
          }}>Me</div>
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's happening on Jamii?"
              autoFocus
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: 'var(--jamii-text)', fontSize: 18, lineHeight: 1.6,
                resize: 'none', minHeight: 120, boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {/* Hashtag / mention suggestions area */}
            {text.includes('#') && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {['#Jamii','#SuperApp','#BuildInPublic','#Tech'].map(tag => (
                  <button key={tag} onClick={() => setText(t => t + tag + ' ')} style={{
                    background: 'rgba(42,171,238,0.15)', color: 'var(--jamii-blue)',
                    border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                  }}>{tag}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '12px 20px', borderTop: '1px solid var(--jamii-border)',
        }}>
          {['🖼️','🎬','📊','😊','📍','🔗'].map((icon, i) => (
            <button key={i} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--jamii-blue)',
            }}>{icon}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Char counter */}
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="none" stroke="var(--jamii-border)" strokeWidth="2.5" />
                <circle cx="14" cy="14" r="11" fill="none"
                  stroke={overLimit ? '#f4212e' : remaining <= 20 ? '#ffd400' : 'var(--jamii-blue)'}
                  strokeWidth="2.5"
                  strokeDasharray={`${Math.min(text.length / limit, 1) * 69.1} 69.1`}
                  strokeLinecap="round"
                  transform="rotate(-90 14 14)"
                />
              </svg>
              {remaining <= 20 && (
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: overLimit ? '#f4212e' : 'var(--jamii-text-muted)',
                }}>{remaining}</span>
              )}
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--jamii-border)' }} />
            <button style={{
              background: 'none', border: '1.5px solid var(--jamii-blue)',
              color: 'var(--jamii-blue)', borderRadius: 20, padding: '4px 14px',
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>+ Add</button>
          </div>
        </div>

        {/* Audience selector */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
          {['Everyone', 'Following', 'Mentions'].map(a => (
            <button key={a} style={{
              background: 'var(--jamii-surface-2)', border: '1px solid var(--jamii-border)',
              color: 'var(--jamii-text-muted)', borderRadius: 20, padding: '4px 12px',
              cursor: 'pointer', fontSize: 12,
            }}>🌍 {a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
