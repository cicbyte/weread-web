import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Search as SearchIcon } from 'lucide-react';
import { wereadApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

const BookshelfPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reading' | 'finished' | 'unread'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadShelf();
  }, []);

  const loadShelf = async () => {
    try {
      const data = await wereadApi.shelfSync();
      setBooks(data.books || []);
      setAlbums(data.albums || []);
    } catch (err: any) {
      showToast(err.message || '获取书架失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter((b: any) => {
    if (search && !b.title?.includes(search) && !b.author?.includes(search)) return false;
    if (filter === 'reading') return b.finishReading !== 1;
    if (filter === 'finished') return b.finishReading === 1;
    return true;
  });

  const tabs = [
    { key: 'all', label: `全部 (${books.length})` },
    { key: 'reading', label: '在读' },
    { key: 'finished', label: '读完' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">书架</h2>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索书名或作者..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 focus:border-weread outline-none"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-white dark:bg-slate-700 text-weread shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 书籍网格 */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredBooks.map((book: any) => (
            <div
              key={book.bookId}
              onClick={() => navigate(`/book/${book.bookId}`)}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="aspect-[3/4] bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                {book.cover ? (
                  <img src={proxyImageUrl(book.cover)} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <BookOpen size={32} />
                  </div>
                )}
                {book.finishReading === 1 && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">已读完</span>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{book.title}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{book.author}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">{search ? '未找到匹配的书籍' : '书架为空，请先同步数据'}</p>
        </div>
      )}
    </div>
  );
};

export default BookshelfPage;
