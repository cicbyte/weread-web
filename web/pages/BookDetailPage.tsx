import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, BookOpen, List, MessageSquare, Star, Download } from 'lucide-react';
import { wereadApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'reviews'>('info');
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookId) loadBookDetail();
  }, [bookId]);

  const loadBookDetail = async () => {
    try {
      const [bookData, chapterData, progressData] = await Promise.allSettled([
        wereadApi.bookInfo(bookId!),
        wereadApi.chapterInfo(bookId!),
        wereadApi.getProgress(bookId!),
      ]);

      if (bookData.status === 'fulfilled') setBook(bookData.value);
      if (chapterData.status === 'fulfilled') setChapters(chapterData.value?.chapters || []);
      if (progressData.status === 'fulfilled') setProgress(progressData.value?.book);
    } catch (err: any) {
      showToast(err.message || '获取书籍信息失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHighlights = async () => {
    try {
      const data = await wereadApi.bookmarkList(bookId!);
      setHighlights(data?.updated || []);
    } catch (err: any) {
      showToast(err.message || '获取笔记失败', 'error');
    }
  };

  const handleTabChange = (tab: 'info' | 'notes' | 'reviews') => {
    setActiveTab(tab);
    if (tab === 'notes' && highlights.length === 0) loadHighlights();
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('weread_token');
      const resp = await fetch(`/api/v1/notes/export?bookId=${bookId}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('导出失败');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book?.title || 'notes'}_笔记.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('导出成功', 'success');
    } catch (err: any) {
      showToast(err.message || '导出失败', 'error');
    } finally {
      setExporting(false);
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
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400">
        <ArrowLeft size={16} /> 返回
      </button>

      {/* 书籍头部 */}
      <div className="flex gap-5">
        <div className="w-28 h-40 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
          {book?.cover ? (
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <BookOpen size={36} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{book?.title || '-'}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{book?.author || '-'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {book?.category && <span className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{book.category}</span>}
            {book?.newRating > 0 && (
              <span className="text-xs bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                <Star size={10} /> {(book.newRating / 10).toFixed(1)}
              </span>
            )}
          </div>
          {progress && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-weread rounded-full" style={{ width: `${progress.progress || 0}%` }} />
              </div>
              <span className="text-xs text-slate-500">{progress.progress || 0}%</span>
            </div>
          )}
          {book?.intro && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 line-clamp-3">{book.intro}</p>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        {[
          { key: 'info', label: '目录', icon: List },
          { key: 'notes', label: '笔记', icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white dark:bg-slate-700 text-weread shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        <div className="flex items-center gap-1 px-2">
          {(['markdown', 'html', 'txt'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={exporting}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-weread hover:bg-weread/10 transition-colors disabled:opacity-50"
              title={`导出为 ${fmt.toUpperCase()}`}
            >
              <Download size={12} />
              {fmt === 'markdown' ? 'MD' : fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'info' && (
        <div className="space-y-1">
          {chapters.length > 0 ? chapters.map((ch: any, i: number) => (
            <div key={i} className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 mr-2">{ch.chapterIdx || i + 1}.</span>
              {ch.title}
            </div>
          )) : (
            <p className="text-center text-slate-400 py-8">暂无目录信息</p>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-3">
          {highlights.length > 0 ? highlights.map((h: any, i: number) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-4">
              <blockquote className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-weread pl-3">
                {h.markText}
              </blockquote>
              <div className="text-xs text-slate-400 mt-2">
                {h.createTime ? new Date(h.createTime * 1000).toLocaleDateString() : ''}
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-400 py-8">暂无笔记</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;
