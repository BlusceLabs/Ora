import React, { useState, useEffect, useRef, useCallback } from 'react';

const STORY_DURATION = 5000;

export default function StoryViewer({ story, allStories, onClose }) {
  const storyList = allStories.filter(s => !s.isOwn && s.items.length > 0);
  const storyIndex = storyList.findIndex(s => s.id === story.id);

  const [currentStory, setCurrentStory] = useState(storyIndex);
  const [currentItem, setCurrentItem] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  const intervalRef = useRef(null);
  const holdRef = useRef(null);

  const activeStory = storyList[currentStory];
  const totalItems = activeStory?.items.length || 1;

  const goNext = useCallback(() => {
    setProgress(0);
    if (currentItem < totalItems - 1) {
      setCurrentItem(i => i + 1);
    } else if (currentStory < storyList.length - 1) {
      setCurrentStory(s => s + 1);
      setCurrentItem(0);
    } else {
      onClose();
    }
  }, [currentItem, totalItems, currentStory, storyList.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (currentItem > 0) {
      setCurrentItem(i => i - 1);
    } else if (currentStory > 0) {
      setCurrentStory(s => s - 1);
      setCurrentItem(0);
    }
  }, [currentItem, currentStory]);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + (100 / (STORY_DURATION / 100));
      });
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [paused, goNext, currentItem, currentStory]);

  const handleMouseDown = () => {
    holdRef.current = setTimeout(() => setPaused(true), 150);
  };
  const handleMouseUp = () => {
    clearTimeout(holdRef.current);
    setPaused(false);
  };
  const handleTap = (e) => {
    const x = e.clientX || (e.touches?.[0]?.clientX ?? 0);
    const half = window.innerWidth / 2;
    if (x < half) goPrev(); else goNext();
  };

  if (!activeStory) return null;
  const item = activeStory.items[currentItem];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        height: '100%',
        maxHeight: 900,
        overflow: 'hidden',
        borderRadius: window.innerWidth > 500 ? 12 : 0,
      }}>
        {/* Story background */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: item?.bg || '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={(e) => { handleMouseUp(); handleTap(e); }}
          onClick={handleTap}
        >
          {item?.text && (
            <p style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              textAlign: 'center',
              padding: '0 32px',
              lineHeight: 1.5,
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
              whiteSpace: 'pre-line',
              pointerEvents: 'none',
              userSelect: 'none',
            }}>{item.text}</p>
          )}
        </div>

        {/* Top gradient overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Progress bars */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          display: 'flex', gap: 4,
          pointerEvents: 'none',
        }}>
          {activeStory.items.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2.5, borderRadius: 2,
              background: 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: '#fff',
                width: i < currentItem ? '100%' : i === currentItem ? `${progress}%` : '0%',
                transition: i === currentItem ? 'none' : 'none',
                borderRadius: 2,
              }} />
            </div>
          ))}
        </div>

        {/* User info header */}
        <div style={{
          position: 'absolute', top: 28, left: 12, right: 48,
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: activeStory.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff',
            border: '2px solid #fff',
            flexShrink: 0,
          }}>{activeStory.initials}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{activeStory.username}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{item?.time}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 28, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 22, lineHeight: 1,
            padding: 4, zIndex: 10,
          }}>✕</button>

        {/* Prev / Next tap zones — invisible */}
        <div style={{ position: 'absolute', inset: 0, top: 80, bottom: 100, display: 'flex' }}>
          <div style={{ flex: 1 }} onClick={goPrev} />
          <div style={{ flex: 1 }} onClick={goNext} />
        </div>

        {/* Reply bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            placeholder={`Reply to ${activeStory.username}...`}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.45)',
              borderRadius: 24,
              padding: '10px 18px',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              backdropFilter: 'blur(8px)',
            }}
          />
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 22, padding: 4,
          }}>♥</button>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 22, padding: 4,
          }}>➤</button>
        </div>
      </div>
    </div>
  );
}
