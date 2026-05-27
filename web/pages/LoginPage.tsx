import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import { authApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const LoginPage: React.FC<{ isDarkMode: boolean; toggleDark: () => void }> = ({ isDarkMode, toggleDark }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      showToast('请输入 API Key', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(apiKey.trim());
      localStorage.setItem('weread_token', res.token);
      localStorage.setItem('weread_vid', res.vid);
      showToast('登录成功', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || '登录失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="" className="w-16 h-16 mx-auto mb-4 shadow-lg rounded-2xl" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">WeRead Web</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">微信读书增强平台</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              微信读书 API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="wrk-xxxxxxxx"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-weread/30 focus:border-weread outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-weread hover:bg-weread-dark text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? '验证中...' : '登录'}
          </button>

          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            API Key 从微信读书 Skill 获取，格式为 wrk-xxxx
          </p>

          <a
            href="https://weread.qq.com/r/weread-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-weread hover:text-weread-dark transition-colors"
          >
            <ExternalLink size={12} />
            前往微信读书获取 API Key
          </a>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={toggleDark}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {isDarkMode ? '切换浅色模式' : '切换深色模式'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
