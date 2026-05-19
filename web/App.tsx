import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BookOpen, Activity, Clock, Server, CheckCircle, XCircle, Loader2, Sun, Moon } from 'lucide-react';
import { useToast } from './components/Toast';
import { healthApi, HealthDetail } from './services/apiService';

const DashboardPage: React.FC<{ isDarkMode: boolean; toggleDark: () => void }> = ({ isDarkMode, toggleDark }) => {
  const { showToast } = useToast();
  const [health, setHealth] = useState<HealthDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthApi.detail()
      .then(setHealth)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-wechat to-wechat-dark rounded-2xl flex items-center justify-center text-white shadow-xl">
          <BookOpen size={36} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">WeRead Web</h1>
        <p className="text-slate-500 dark:text-slate-400">微信读书增强平台</p>
        <button
          onClick={toggleDark}
          className="mt-4 p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={20} className="text-wechat" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">系统状态</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={32} className="text-wechat animate-spin" />
          </div>
        ) : health ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl">
              {health.status === 'ok' ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <XCircle size={24} className="text-red-500" />
              )}
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">
                  {health.status === 'ok' ? '系统正常运行' : '系统异常'}
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">{health.message}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                  <Clock size={14} /> 运行时长
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">{health.uptime || '-'}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm mb-1">
                  <Server size={14} /> 版本
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">{health.version || '-'}</div>
              </div>
            </div>

            {/* Check Items */}
            {health.checks && health.checks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">检查项</h3>
                {health.checks.map((check, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      {check.status === 'ok' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <XCircle size={16} className="text-red-500" />
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300">{check.name}</span>
                    </div>
                    <span className={`text-xs font-medium ${check.status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            无法获取系统状态
          </div>
        )}
      </div>
    </div>
  );
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
    <div className="h-screen bg-[#F7F7F7] dark:bg-slate-950 transition-colors duration-300 overflow-y-auto">
      <div className="p-4 md:p-6">
        <Routes>
          <Route path="/" element={<DashboardPage isDarkMode={isDarkMode} toggleDark={() => setIsDarkMode(!isDarkMode)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
