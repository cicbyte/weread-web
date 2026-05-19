import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Search, StickyNote,
  BarChart3, Compass, Settings, Sun, Moon, LogOut, Menu, X,
  ChevronLeft, ChevronRight, ChevronDown, Home
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

const breadcrumbMap: Record<string, string> = {
  '/': '仪表盘',
  '/bookshelf': '书架',
  '/search': '搜索',
  '/notes': '笔记',
  '/stats': '统计',
  '/discover': '发现',
  '/settings': '设置',
};

function getBreadcrumb(pathname: string): string {
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
  if (pathname.startsWith('/book/')) return '书籍详情';
  return '';
}

interface LayoutProps {
  isDarkMode: boolean;
  toggleDark: () => void;
}

const Layout: React.FC<LayoutProps> = ({ isDarkMode, toggleDark }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('weread_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('weread_sidebar_collapsed', String(next));
  };

  const handleLogout = () => {
    localStorage.removeItem('weread_token');
    localStorage.removeItem('weread_vid');
    navigate('/login');
  };

  const breadcrumb = getBreadcrumb(location.pathname);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-30 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-all duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center border-b border-gray-100 dark:border-slate-800 h-14 ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-weread to-weread-dark rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <BookOpen size={20} />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">WeRead Plus</h1>
                <p className="text-[10px] text-slate-400 whitespace-nowrap">微信读书增强平台</p>
              </div>
            )}
          </div>

          {/* 导航 */}
          <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-weread/10 text-weread dark:bg-weread/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </nav>

          {/* 底部：收缩按钮 */}
          <div className={`border-t border-gray-100 dark:border-slate-800 ${collapsed ? 'px-2 py-2' : 'px-3 py-3'}`}>
            <button
              onClick={toggleCollapse}
              className={`flex items-center rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 w-full transition-colors ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'}`}
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} />收起</>}
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* 移动端菜单按钮 */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu size={20} className="text-slate-600 dark:text-slate-400" />
            </button>

            {/* 面包屑 */}
            <nav className="flex items-center gap-2 text-sm">
              <Home size={14} className="text-slate-400" />
              <span className="text-slate-400">/</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{breadcrumb}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={isDarkMode ? '切换浅色模式' : '切换深色模式'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
