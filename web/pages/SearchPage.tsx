import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, BookOpen } from 'lucide-react';
import { wereadApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const SearchPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await wereadApi.searchBooks(keyword.trim());
      const books = data?.results?.[0]?.books || [];
      setResults(books.map((b: any) => ({
        bookId: b.bookInfo?.bookId,
        title: b.bookInfo?.title,
        author: b.bookInfo?.author,
        cover: b.bookInfo?.cover,
        rating: b.newRating,
        readingCount: b.readingCount,
      })));
    } catch (err: any) {
      showToast(err.message || '搜索失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">搜索书籍</h2>

      <form onSubmit={handleSearch} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入书名、作者..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 focus:border-weread outline-none"
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={28} className="text-weread animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((book) => (
            <div
              key={book.bookId}
              onClick={() => navigate(`/book/${book.bookId}`)}
              className="flex gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-22 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={20} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{book.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{book.author}</div>
                <div className="flex items-center gap-2 mt-2">
                  {book.rating > 0 && (
                    <span className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 px-1.5 py-0.5 rounded">
                      {(book.rating / 10).toFixed(1)}分
                    </span>
                  )}
                  {book.readingCount > 0 && (
                    <span className="text-xs text-slate-400">{(book.readingCount / 1000).toFixed(0)}k人在读</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          未找到相关书籍
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          输入关键词搜索微信读书书城
        </div>
      )}
    </div>
  );
};

export default SearchPage;
