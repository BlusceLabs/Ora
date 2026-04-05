import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockChats } from '../data/mockChats';
import { mockStories } from '../data/mockStories';
import StoriesBar from '../components/StoriesBar';
import StoryViewer from '../components/StoryViewer';

export function Sidebar() {
  const navigate = useNavigate();
  const [activeStory, setActiveStory] = useState(null);

  const storiesWithItems = mockStories.filter(s => !s.isOwn && s.items.length > 0);

  return (
    <>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--jamii-border)', flexShrink: 0 }}>
          <button onClick={() => navigate('/settings')} style={{ color: 'var(--jamii-text-muted)', fontSize: 24 }}>☰</button>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Jamii</h2>
        </div>

        {/* Stories bar */}
        <StoriesBar onStoryClick={setActiveStory} />

        {/* Search */}
        <div style={{ padding: 12, flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search"
            style={{
              width: '100%',
              background: 'var(--jamii-surface-2)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 20,
              color: 'var(--jamii-text)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {mockChats.map(chat => (
            <Link
              to={`/chats/${chat.id}`}
              key={chat.id}
              style={{ display: 'flex', padding: '12px 16px', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
              className="chat-item"
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: chat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, color: '#fff', position: 'relative', flexShrink: 0 }}>
                {chat.initials}
                {chat.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, background: '#34c759', borderRadius: '50%', border: '3px solid var(--jamii-surface)' }} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{chat.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--jamii-text-muted)', flexShrink: 0 }}>{chat.timestamp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--jamii-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</span>
                  {chat.unread > 0 && (
                    <span style={{ background: 'var(--jamii-blue)', color: '#fff', fontSize: 12, fontWeight: 'bold', padding: '2px 8px', borderRadius: 12, flexShrink: 0, marginLeft: 8 }}>{chat.unread}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Full-screen Story Viewer */}
      {activeStory && (
        <StoryViewer
          story={activeStory}
          allStories={storiesWithItems}
          onClose={() => setActiveStory(null)}
        />
      )}
    </>
  );
}

export default function ChatListPage() {
  return (
    <div className="two-column-layout">
      <Sidebar />
      <div className="main-content hide-on-mobile flex-center" style={{ color: 'var(--jamii-text-muted)' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: 20 }}>Select a chat to start messaging</div>
      </div>
    </div>
  );
}
