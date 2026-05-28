import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, BookOpen, List, MessageSquare, Star, Download, FileText, FileCode } from 'lucide-react';
import { wereadApi, proxyImageUrl, SERVER_URL } from '../services/apiService';
import { useToast } from '../components/Toast';

const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'reviews'>('info');
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
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
    if (tab === 'reviews' && reviews.length === 0) loadReviews();
  };

  const loadReviews = async () => {
    try {
      const data = await wereadApi.reviewList(bookId!, 0);
      setReviews(data?.reviews?.map((r: any) => ({ ...r.review, ...r.review.review, likesCount: r.review.likesCount, commentsCount: r.review.commentsCount })) || []);
    } catch {
      // ignore
    }
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('weread_token');
      const resp = await fetch(`${SERVER_URL}/api/v1/notes/export?bookId=${bookId}&format=${format}`, {
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
            <img src={proxyImageUrl(book.cover)} alt={book.title} className="w-full h-full object-cover" />
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
          <div className="relative mt-3">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {exporting ? '导出中...' : '导出笔记'}
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg py-1 min-w-[140px]">
                  {([
                    { fmt: 'markdown', label: 'Markdown', icon: FileCode },
                    { fmt: 'html', label: 'HTML', icon: FileText },
                    { fmt: 'txt', label: '纯文本', icon: FileText },
                  ] as const).map(({ fmt, label, icon: Icon }) => (
                    <button
                      key={fmt}
                      onClick={() => { handleExport(fmt); setShowExportMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Icon size={14} className="text-slate-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        {[
          { key: 'info', label: '目录', icon: List },
          { key: 'notes', label: '笔记', icon: MessageSquare },
          { key: 'reviews', label: '点评', icon: Star },
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
              <div className="flex items-start gap-2">
                <span className="text-xs text-slate-400 mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}.</span>
                <blockquote className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-weread pl-3">
                  {h.markText}
                </blockquote>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {h.createTime ? new Date(h.createTime * 1000).toLocaleDateString() : ''}
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-400 py-8">暂无笔记</p>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length > 0 ? reviews.map((r: any, i: number) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                {r.author?.avatar && (
                  <img src={r.author.avatar} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.author?.name || '匿名'}</span>
                {r.star > 0 && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 px-1.5 py-0.5 rounded">
                    {'★'.repeat(Math.round(r.star / 20))}
                  </span>
                )}
                {r.isFinish === 1 && <span className="text-xs text-green-600">已读完</span>}
                {(r.likesCount > 0 || r.commentsCount > 0) && (
                  <span className="ml-auto text-xs text-slate-400">
                    {r.likesCount > 0 && `${r.likesCount}赞`}
                    {r.likesCount > 0 && r.commentsCount > 0 && ' · '}
                    {r.commentsCount > 0 && `${r.commentsCount}评`}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{r.content}</p>
            </div>
          )) : (
            <p className="text-center text-slate-400 py-8">暂无点评</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;
