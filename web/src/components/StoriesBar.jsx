import React from 'react';
import { mockStories } from '../data/mockStories';

const INSTAGRAM_GRADIENT = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
const SEEN_GRADIENT = 'linear-gradient(45deg, #555 0%, #888 100%)';

export default function StoriesBar({ onStoryClick }) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '14px 16px',
      overflowX: 'auto',
      borderBottom: '1px solid var(--jamii-border)',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      flexShrink: 0,
    }}>
      {mockStories.map(story => (
        <button
          key={story.id}
          onClick={() => !story.isOwn && onStoryClick(story)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: story.isOwn ? 'default' : 'pointer',
            padding: 0,
            flexShrink: 0,
            width: 68,
          }}
        >
          <div style={{
            width: 62,
            height: 62,
            borderRadius: '50%',
            background: story.isOwn ? 'var(--jamii-border)' : story.seen ? SEEN_GRADIENT : INSTAGRAM_GRADIENT,
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--jamii-surface)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: story.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: story.isOwn ? 24 : 18,
                color: '#fff',
              }}>
                {story.initials}
              </div>
            </div>
            {story.isOwn && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 20,
                height: 20,
                background: 'var(--jamii-blue)',
                borderRadius: '50%',
                border: '2px solid var(--jamii-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1,
              }}>+</div>
            )}
          </div>
          <span style={{
            fontSize: 11,
            color: story.seen ? 'var(--jamii-text-muted)' : 'var(--jamii-text)',
            textAlign: 'center',
            maxWidth: 64,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {story.username}
          </span>
        </button>
      ))}
    </div>
  );
}
