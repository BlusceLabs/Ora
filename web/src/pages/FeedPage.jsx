import React, { useState } from 'react';
import { mockFeedPosts } from '../data/mockFeed';
import { mockStories } from '../data/mockStories';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';
import StoryViewer from '../components/StoryViewer';
import CreatePostModal from '../components/CreatePostModal';

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('foryou');
  const [activeStory, setActiveStory] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [posts, setPosts] = useState(mockFeedPosts);
  const storiesWithItems = mockStories.filter(s => !s.isOwn && s.items.length > 0);

  const handlePost = ({ text }) => {
    const newPost = {
      id: 'p' + Date.now(),
      author: { name: 'You', username: '@you', initials: 'Me', color: '#2AABEE', verified: false },
      time: 'now',
      content: text,
      hashtags: [],
      likes: 0, comments: 0, reposts: 0, saves: 0,
      liked: false, saved: false, reposted: false,
      media: null,
    };
    setPosts(p => [newPost, ...p]);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Feed tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--jamii-border)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.92)', backdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        {[
          { id: 'foryou', label: 'For You' },
          { id: 'following', label: 'Following' },
          { id: 'live', label: '🔴 Live' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 700 : 500,
            color: activeTab === tab.id ? 'var(--jamii-text)' : 'var(--jamii-text-muted)',
            fontSize: 15, position: 'relative', transition: 'color 0.2s',
          }}>
            {tab.label}
            {activeTab === tab.id && (
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: 48, height: 3, background: 'var(--jamii-blue)', borderRadius: 2,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Stories */}
      <StoriesBar onStoryClick={setActiveStory} />

      {/* Create post quick-bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--jamii-border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--jamii-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
        }}>Me</div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            flex: 1, background: 'var(--jamii-surface-2)',
            border: '1px solid var(--jamii-border)', borderRadius: 24,
            padding: '12px 18px', textAlign: 'left',
            color: 'var(--jamii-text-muted)', fontSize: 16, cursor: 'pointer',
          }}>What's happening?</button>
        <button onClick={() => setShowCreate(true)} style={{
          background: 'none', border: 'none', color: 'var(--jamii-blue)', fontSize: 22, cursor: 'pointer',
        }}>🖼️</button>
      </div>

      {/* Posts */}
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Bottom padding for nav */}
      <div style={{ height: 80 }} />

      {/* Story viewer */}
      {activeStory && (
        <StoryViewer story={activeStory} allStories={storiesWithItems} onClose={() => setActiveStory(null)} />
      )}

      {/* Create post modal */}
      {showCreate && (
        <CreatePostModal onClose={() => setShowCreate(false)} onPost={handlePost} />
      )}
    </div>
  );
}
