import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockChats } from '../data/mockChats';
import ChatListPage from './ChatListPage';

export default function ChatViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chat = mockChats.find(c => c.id === id);
  const [messages, setMessages] = useState(chat ? chat.messages : []);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chat) setMessages(chat.messages);
  }, [id, chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat) return <div className="two-column-layout"><div className="hide-on-mobile" style={{width: 360, borderRight: '1px solid var(--jamii-border)'}}><ChatListPage /></div><div className="main-content flex-center" style={{color:'var(--jamii-text-muted)'}}>Chat not found</div></div>;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages([...messages, { id: Date.now(), text, time: 'Now', isMe: true }]);
    setText('');
  };

  return (
    <div className="two-column-layout">
      <div className="hide-on-mobile" style={{ height: '100%', width: 360, borderRight: '1px solid var(--jamii-border)', overflowY: 'auto', flexShrink: 0 }}><ChatListPage /></div>
      <div className="main-content">
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--jamii-surface)', borderBottom: '1px solid var(--jamii-border)', height: 60 }}>
          <button className="hide-on-desktop" onClick={() => navigate('/chats')} style={{ color: 'var(--jamii-blue)', fontSize: 24, marginRight: 8, display: window.innerWidth > 768 ? 'none' : 'block' }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: chat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
            {chat.initials}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{chat.name}</div>
            <div style={{ fontSize: 13, color: chat.online ? '#2AABEE' : 'var(--jamii-text-muted)' }}>{chat.online ? 'online' : 'last seen recently'}</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ alignSelf: msg.isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', background: msg.isMe ? 'var(--jamii-blue)' : 'var(--jamii-surface)', padding: '8px 12px', borderRadius: msg.isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15 }}>{msg.text}</span>
              <span style={{ fontSize: 11, color: msg.isMe ? 'rgba(255,255,255,0.7)' : 'var(--jamii-text-muted)', alignSelf: 'flex-end', marginTop: 4 }}>{msg.time}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ padding: '16px', background: 'var(--jamii-surface)', display: 'flex', gap: 12 }}>
          <input 
            type="text" 
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write a message..." 
            style={{ flex: 1, background: 'var(--jamii-surface-2)', border: 'none', padding: '12px 16px', borderRadius: 24, color: 'var(--jamii-text)', outline: 'none' }}
          />
          <button type="submit" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--jamii-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
