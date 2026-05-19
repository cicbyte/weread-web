import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2 } from 'lucide-react';
import { wereadApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

const NotesPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      const data = await wereadApi.notebooks(50);
      setNotebooks(data?.books || []);
    } catch (err: any) {
      showToast(err.message || '获取笔记本失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBookNotes = async (bookId: string) => {
    setSelectedBook(bookId);
    setLoadingNotes(true);
    try {
      const [hlData, rvData] = await Promise.allSettled([
        wereadApi.bookmarkList(bookId),
        wereadApi.reviewListMine(bookId),
      ]);
      if (hlData.status === 'fulfilled') {
        setHighlights(hlData.value?.updated || []);
      }
      if (rvData.status === 'fulfilled') {
        setReviews(rvData.value?.reviews?.map((r: any) => r.review) || []);
      }
    } catch (err: any) {
      showToast(err.message || '获取笔记失败', 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  const selectedBookInfo = notebooks.find((b: any) => b.bookId === selectedBook)?.book;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">笔记中心</h2>

      {selectedBook ? (
        <div>
          <button onClick={() => { setSelectedBook(null); setHighlights([]); setReviews([]); }}
            className="text-sm text-weread hover:underline mb-3">← 返回笔记本列表</button>
          <div className="flex items-center gap-3 mb-4">
            {selectedBookInfo?.cover && (
              <img src={proxyImageUrl(selectedBookInfo.cover)} alt="" className="w-10 h-14 rounded object-cover" />
            )}
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{selectedBookInfo?.title || '-'}</div>
              <div className="text-xs text-slate-400">{selectedBookInfo?.author || ''}</div>
            </div>
          </div>

          {loadingNotes ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="text-weread animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {/* 划线 */}
              {highlights.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">划线 ({highlights.length})</h3>
                  <div className="space-y-2">
                    {highlights.map((h: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
                        <blockquote className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-weread pl-3">
                          {h.markText}
                        </blockquote>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 想法 */}
              {reviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">想法 ({reviews.length})</h3>
                  <div className="space-y-2">
                    {reviews.map((r: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300">💡 {r.content}</p>
                        {r.abstract && (
                          <p className="text-xs text-slate-400 mt-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">{r.abstract}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {highlights.length === 0 && reviews.length === 0 && (
                <p className="text-center text-slate-400 py-8">暂无笔记</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notebooks.map((nb: any) => (
            <div
              key={nb.bookId}
              onClick={() => loadBookNotes(nb.bookId)}
              className="flex gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {nb.book?.cover ? (
                  <img src={proxyImageUrl(nb.book.cover)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={16} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{nb.book?.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{nb.book?.author}</div>
                <div className="flex gap-3 mt-2 text-xs text-slate-400">
                  {nb.noteCount > 0 && <span>划线 {nb.noteCount}</span>}
                  {nb.reviewCount > 0 && <span>想法 {nb.reviewCount}</span>}
                  <span>进度 {nb.readingProgress || 0}%</span>
                </div>
              </div>
            </div>
          ))}
          {notebooks.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">暂无笔记数据</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotesPage;
