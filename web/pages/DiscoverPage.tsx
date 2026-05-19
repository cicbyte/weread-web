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
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">发现推荐</h2>

      {recommend.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommend.map((book: any) => (
            <div
              key={book.bookId}
              onClick={() => navigate(`/book/${book.bookId}`)}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="aspect-[3/4] bg-gray-100 dark:bg-slate-800 relative overflow-hidden">
                {book.cover ? (
                  <img src={proxyImageUrl(book.cover)} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <BookOpen size={32} />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{book.title}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{book.author}</div>
                {book.reason && (
                  <div className="text-xs text-weread mt-1 truncate">{book.reason}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <Compass size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 dark:text-slate-400">暂无推荐</p>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
