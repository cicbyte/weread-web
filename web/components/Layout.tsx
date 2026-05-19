import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Search, StickyNote,
  Settings, Sun, Moon, LogOut, Menu, Loader2,
  PanelLeftClose, PanelLeftOpen, Home
} from 'lucide-react';
import { wereadApi, proxyImageUrl } from '../services/apiService';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/bookshelf', icon: BookOpen, label: '书架' },
  { path: '/notes', icon: StickyNote, label: '笔记' },
  { path: '/settings', icon: Settings, label: '设置' },
];

const breadcrumbMap: Record<string, string> = {
  '/': '仪表盘',
  '/bookshelf': '书架',
  '/notes': '笔记',
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

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchWrapRef = useRef<HTMLDivElement>(null);

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

  // 搜索防抖
  const handleSearchInput = (value: string) => {
    setSearchKeyword(value);
    clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await wereadApi.searchBooks(value.trim(), 8);
        const books = (data?.results?.[0]?.books || []).map((b: any) => ({
          bookId: b.bookInfo?.bookId,
          title: b.bookInfo?.title,
          author: b.bookInfo?.author,
          cover: b.bookInfo?.cover,
          rating: b.newRating,
        }));
        setSearchResults(books);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleSelectBook = (bookId: string) => {
    setSearchOpen(false);
    setSearchKeyword('');
    setSearchResults([]);
    navigate(`/book/${bookId}`);
  };

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

          {/* 底部留白 */}
          <div className="h-2" />
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            {/* 收缩/展开侧边栏 */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

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

          {/* 全局搜索框 + 下拉结果 */}
          <div ref={searchWrapRef} className="hidden sm:flex flex-1 max-w-md mx-4 relative">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchKeyword.trim()) setSearchOpen(true); }}
                placeholder="搜索书籍..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 focus:border-weread outline-none transition-colors"
              />
            </div>

            {/* 搜索结果下拉 */}
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg max-h-96 overflow-y-auto z-50">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="text-weread animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((book) => (
                      <div
                        key={book.bookId}
                        onClick={() => handleSelectBook(book.bookId)}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="w-8 h-11 flex-shrink-0 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
                          {book.cover ? (
                            <img src={proxyImageUrl(book.cover)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen size={12} className="text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{book.title}</div>
                          <div className="text-xs text-slate-400">{book.author}</div>
                        </div>
                        {book.rating > 0 && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 px-1.5 py-0.5 rounded flex-shrink-0">
                            {(book.rating / 10).toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">未找到相关书籍</div>
                )}
              </div>
            )}
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
