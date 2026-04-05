import React, { useState } from 'react';
import { mockFeedPosts } from '../data/mockFeed';
import PostCard from '../components/PostCard';

const PROFILE = {
  name: 'You',
  username: '@you',
  initials: 'Me',
  color: '#2AABEE',
  bio: '✨ Building the future with BlusceLabs · Jamii believer · Messaging-first super-app',
  website: 'bluscelabs.com',
  location: 'Global',
  joined: 'Joined January 2025',
  following: 312,
  followers: 8400,
  verified: false,
  banner: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
};

const TABS = ['Posts', 'Replies', 'Media', 'Likes', 'Saves'];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Banner */}
      <div style={{ height: 140, background: PROFILE.banner, position: 'relative', flexShrink: 0 }}>
        <div style={{
          position: 'absolute', bottom: -40, left: 20,
          width: 80, height: 80, borderRadius: '50%',
          background: PROFILE.color, border: '4px solid var(--jamii-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 28, color: '#fff',
        }}>{PROFILE.initials}</div>
      </div>

      {/* Profile info */}
      <div style={{ padding: '50px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 10 }}>
          <button style={{
            background: 'none', border: '1.5px solid var(--jamii-border)',
            color: 'var(--jamii-text)', borderRadius: 20, padding: '8px 20px',
            fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }} onClick={() => setEditMode(e => !e)}>
            {editMode ? 'Save' : 'Edit Profile'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{PROFILE.name}</h1>
          {PROFILE.verified && (
            <span style={{ background: 'var(--jamii-blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>✓</span>
          )}
        </div>
        <div style={{ color: 'var(--jamii-text-muted)', fontSize: 15, marginBottom: 12 }}>{PROFILE.username}</div>

        <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>{PROFILE.bio}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: 'var(--jamii-text-muted)', marginBottom: 14 }}>
          {PROFILE.location && <span>📍 {PROFILE.location}</span>}
          {PROFILE.website && <span style={{ color: 'var(--jamii-blue)' }}>🔗 {PROFILE.website}</span>}
          <span>📅 {PROFILE.joined}</span>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jamii-text)' }}>
            <strong>{PROFILE.following.toLocaleString()}</strong>
            <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}> Following</span>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jamii-text)' }}>
            <strong>{PROFILE.followers.toLocaleString()}</strong>
            <span style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}> Followers</span>
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 20,
          padding: '16px', background: 'var(--jamii-surface-2)',
          borderRadius: 16, border: '1px solid var(--jamii-border)',
        }}>
          {[
            { label: 'Posts', value: '47' },
            { label: 'Views', value: '142K' },
            { label: 'Likes', value: '8.2K' },
            { label: 'Reposts', value: '1.4K' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{stat.value}</div>
              <div style={{ color: 'var(--jamii-text-muted)', fontSize: 12 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--jamii-border)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(23,33,43,0.95)', backdropFilter: 'blur(16px)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: '0 0 auto', padding: '14px 20px', background: 'none', border: 'none',
            cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 500, fontSize: 14,
            color: activeTab === tab ? 'var(--jamii-text)' : 'var(--jamii-text-muted)',
            position: 'relative', whiteSpace: 'nowrap',
          }}>
            {tab}
            {activeTab === tab && (
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 3, background: 'var(--jamii-blue)', borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {/* Posts */}
      {activeTab === 'Posts' && mockFeedPosts.slice(0, 3).map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {activeTab !== 'Posts' && (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: 'var(--jamii-text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            {activeTab === 'Media' ? '🖼️' : activeTab === 'Likes' ? '❤️' : activeTab === 'Saves' ? '🔖' : '💬'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>No {activeTab.toLowerCase()} yet</div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
