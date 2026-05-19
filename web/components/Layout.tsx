import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Search, StickyNote,
  BarChart3, Compass, Settings, Sun, Moon, LogOut, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/bookshelf', icon: BookOpen, label: '书架' },
  { path: '/search', icon: Search, label: '搜索' },
  { path: '/notes', icon: StickyNote, label: '笔记' },
  { path: '/stats', icon: BarChart3, label: '统计' },
  { path: '/discover', icon: Compass, label: '发现' },
  { path: '/settings', icon: Settings, label: '设置' },
];

interface LayoutProps {
  isDarkMode: boolean;
  toggleDark: () => void;
}

const Layout: React.FC<LayoutProps> = ({ isDarkMode, toggleDark }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('weread_token');
    localStorage.removeItem('weread_vid');
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-56 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-slate-800">
            <div className="w-9 h-9 bg-gradient-to-br from-weread to-weread-dark rounded-lg flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">WeRead Plus</h1>
              <p className="text-[10px] text-slate-400">微信读书增强平台</p>
            </div>
          </div>

          {/* 导航 */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-weread/10 text-weread dark:bg-weread/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* 底部操作 */}
          <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-800 space-y-1">
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 w-full transition-colors"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {isDarkMode ? '浅色模式' : '深色模式'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 w-full transition-colors"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        {/* 移动端顶栏 */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">WeRead Plus</h1>
        </div>
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
