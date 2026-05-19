import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Search as SearchIcon } from 'lucide-react';
import { wereadApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

type TabKey = 'all' | 'reading' | 'finished' | 'discover';

const BookshelfPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [recommend, setRecommend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadShelf();
  }, []);

  const loadShelf = async () => {
    try {
      const data = await wereadApi.shelfSync();
      setBooks(data.books || []);
    } catch (err: any) {
      showToast(err.message || '获取书架失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommend = async () => {
    if (recommend.length > 0) return;
    try {
      const data = await wereadApi.recommend(20);
      setRecommend(data?.books || []);
    } catch (err: any) {
      showToast(err.message || '获取推荐失败', 'error');
    }
  };

  const handleTabChange = (key: TabKey) => {
    setFilter(key);
    if (key === 'discover') loadRecommend();
  };

  const filteredBooks = books.filter((b: any) => {
    if (search && !b.title?.includes(search) && !b.author?.includes(search)) return false;
    if (filter === 'reading') return b.finishReading !== 1;
    if (filter === 'finished') return b.finishReading === 1;
    return true;
  });

  const displayBooks = filter === 'discover' ? recommend : filteredBooks;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: `全部 (${books.length})` },
    { key: 'reading', label: '在读' },
    { key: 'finished', label: '读完' },
    { key: 'discover', label: '推荐' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">书架</h2>
        {filter !== 'discover' && (
          <div className="relative w-48 sm:w-56">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书名或作者..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 border-0 text-sm focus:ring-2 focus:ring-weread/30 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* 标签 */}
      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              filter === key
                ? 'bg-weread text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 书籍网格 */}
      {displayBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayBooks.map((book: any) => (
            <div
              key={book.bookId}
              onClick={() => navigate(`/book/${book.bookId}`)}
              className="group bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <div className="relative overflow-hidden">
                <img
                  src={book.cover ? proxyImageUrl(book.cover) : undefined}
                  alt={book.title}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {!book.cover && (
                  <div className="w-full aspect-[3/4] flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                    <BookOpen size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                {book.finishReading === 1 && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">已读完</span>
                )}
              </div>
              <div className="p-3 pb-4">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{book.title}</div>
                <div className="mt-1.5 text-xs text-slate-400 truncate">{book.author}</div>
                {book.reason && (
                  <div className="text-xs text-weread mt-1.5 truncate">{book.reason}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {filter === 'discover' ? '暂无推荐' : search ? '未找到匹配的书籍' : '书架为空，请先同步数据'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookshelfPage;
