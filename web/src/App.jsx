import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ChatListPage from './pages/ChatListPage';
import ChatViewPage from './pages/ChatViewPage';
import SettingsPage from './pages/SettingsPage';
import FeedPage from './pages/FeedPage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AppShell from './components/AppShell';

function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<AuthPage />} />

          <Route path="/feed" element={<AppLayout><FeedPage /></AppLayout>} />
          <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />
          <Route path="/notifications" element={<AppLayout><NotificationsPage /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
          <Route path="/chats" element={<AppLayout><ChatListPage /></AppLayout>} />
          <Route path="/chats/:id" element={<AppLayout><ChatViewPage /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
