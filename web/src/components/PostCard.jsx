import React, { useState } from 'react';

const ICON = {
  heart: (filled) => filled ? '❤️' : '🤍',
  comment: '💬',
  repost: '🔁',
  save: (filled) => filled ? '🔖' : '🏷️',
  share: '↗',
  verified: '✓',
  more: '···',
};

export default function PostCard({ post, onUpdate }) {
  const [data, setData] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const toggle = (field, countField) => {
    setData(d => ({
      ...d,
      [field]: !d[field],
      [countField]: d[field] ? d[countField] - 1 : d[countField] + 1,
    }));
  };

  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n;

  return (
    <article style={{
      background: 'var(--jamii-surface)',
      borderBottom: '1px solid var(--jamii-border)',
      padding: '16px 16px 0',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: data.author.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff',
          }}>{data.author.initials}</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{data.author.name}</span>
            {data.author.verified && (
              <span style={{
                background: 'var(--jamii-blue)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>✓</span>
            )}
            <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>{data.author.username}</span>
            <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>·</span>
            <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>{data.time}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>···</button>
          </div>

          {/* Content */}
          <p style={{
            fontSize: 15, lineHeight: 1.6, marginBottom: 12,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {data.content.split(' ').map((word, i) =>
              word.startsWith('#') || word.startsWith('@')
                ? <span key={i} style={{ color: 'var(--jamii-blue)' }}>{word} </span>
                : word + ' '
            )}
          </p>

          {/* Thread indicator */}
          {data.isThread && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(42,171,238,0.1)', borderRadius: 20,
              padding: '4px 12px', marginBottom: 12, fontSize: 13,
              color: 'var(--jamii-blue)',
            }}>🧵 Thread</div>
          )}

          {/* Media */}
          {data.media && (
            <div style={{
              borderRadius: 16, overflow: 'hidden', marginBottom: 12,
              height: 220,
              background: data.media.value,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: 600,
              border: '1px solid var(--jamii-border)',
            }}>{data.media.label}</div>
          )}

          {/* Engagement bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '8px 0 12px',
            borderTop: '1px solid var(--jamii-border)',
            marginTop: 4,
          }}>
            {/* Comments */}
            <button
              onClick={() => setShowComments(s => !s)}
              style={btnStyle}
            >
              <span style={{ fontSize: 17 }}>💬</span>
              <span style={{ fontSize: 13, color: 'var(--jamii-text-muted)' }}>{fmt(data.comments)}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => toggle('reposted', 'reposts')}
              style={{ ...btnStyle, color: data.reposted ? '#00ba7c' : 'inherit' }}
            >
              <span style={{ fontSize: 17 }}>🔁</span>
              <span style={{ fontSize: 13, color: data.reposted ? '#00ba7c' : 'var(--jamii-text-muted)' }}>{fmt(data.reposts)}</span>
            </button>

            {/* Like */}
            <button
              onClick={() => toggle('liked', 'likes')}
              style={btnStyle}
            >
              <span style={{ fontSize: 17 }}>{data.liked ? '❤️' : '🤍'}</span>
              <span style={{ fontSize: 13, color: data.liked ? '#f91880' : 'var(--jamii-text-muted)' }}>{fmt(data.likes)}</span>
            </button>

            {/* Save */}
            <button
              onClick={() => toggle('saved', 'saves')}
              style={btnStyle}
            >
              <span style={{ fontSize: 17 }}>{data.saved ? '🔖' : '🏷️'}</span>
              <span style={{ fontSize: 13, color: data.saved ? 'var(--jamii-blue)' : 'var(--jamii-text-muted)' }}>{fmt(data.saves)}</span>
            </button>

            {/* Share */}
            <button style={{ ...btnStyle, marginLeft: 'auto' }}>
              <span style={{ fontSize: 17 }}>↗</span>
            </button>
          </div>

          {/* Comment input */}
          {showComments && (
            <div style={{
              borderTop: '1px solid var(--jamii-border)',
              paddingTop: 12, paddingBottom: 12,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--jamii-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0,
              }}>Me</div>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Post your reply..."
                style={{
                  flex: 1,
                  background: 'var(--jamii-surface-2)',
                  border: '1px solid var(--jamii-border)',
                  borderRadius: 20, padding: '8px 16px',
                  color: 'var(--jamii-text)', fontSize: 14, outline: 'none',
                }}
              />
              {commentText && (
                <button style={{
                  background: 'var(--jamii-blue)', color: '#fff',
                  border: 'none', borderRadius: 20, padding: '8px 16px',
                  fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}>Reply</button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: 5,
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--jamii-text)', padding: '6px 12px 6px 0',
  borderRadius: 20, transition: 'opacity 0.15s',
  flexShrink: 0,
};
