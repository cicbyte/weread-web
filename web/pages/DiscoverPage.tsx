import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Loader2, BookOpen } from 'lucide-react';
import { wereadApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

const DiscoverPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [recommend, setRecommend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommend();
  }, []);

  const loadRecommend = async () => {
    try {
      const data = await wereadApi.recommend(20);
      setRecommend(data?.books || []);
    } catch (err: any) {
      showToast(err.message || '获取推荐失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">发现推荐</h2>

      {recommend.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {recommend.map((book: any) => (
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
                    <BookOpen size={32} className="text-slate-300" />
                  </div>
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
            <Compass size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">暂无推荐</p>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
