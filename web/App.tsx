import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookshelfPage from './pages/BookshelfPage';
import SearchPage from './pages/SearchPage';
import BookDetailPage from './pages/BookDetailPage';
import NotesPage from './pages/NotesPage';
import DiscoverPage from './pages/DiscoverPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('weread_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('weread_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('weread_dark_mode', String(isDarkMode));
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage isDarkMode={isDarkMode} toggleDark={() => setIsDarkMode(!isDarkMode)} />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout isDarkMode={isDarkMode} toggleDark={() => setIsDarkMode(!isDarkMode)} />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="bookshelf" element={<BookshelfPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="book/:bookId" element={<BookDetailPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </BrowserRouter>
);

export default App;
