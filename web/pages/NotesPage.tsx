import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, ArrowLeft, Download, FileText, FileCode } from 'lucide-react';
import { wereadApi, proxyImageUrl, SERVER_URL } from '../services/apiService';
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
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('weread_token');
      const resp = await fetch(`${SERVER_URL}/api/v1/notes/export?bookId=${selectedBook}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('导出失败');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBookInfo?.title || 'notes'}_笔记.${format === 'markdown' ? 'md' : format}`;
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

  const selectedBookInfo = notebooks.find((b: any) => b.bookId === selectedBook)?.book;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">笔记中心</h2>

      {selectedBook ? (
        <div className="space-y-5">
          {/* 返回 + 书籍信息 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <button
              onClick={() => { setSelectedBook(null); setHighlights([]); setReviews([]); }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-weread mb-3 transition-colors"
            >
              <ArrowLeft size={14} /> 返回笔记本列表
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {selectedBookInfo?.cover ? (
                  <img src={proxyImageUrl(selectedBookInfo.cover)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={16} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-200">{selectedBookInfo?.title || '-'}</div>
                <div className="text-xs text-slate-400 mt-0.5">{selectedBookInfo?.author || ''}</div>
              </div>
              <div className="relative">
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
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg py-1 min-w-[140px]">
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

          {loadingNotes ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="text-weread animate-spin" /></div>
          ) : (
            <div className="space-y-5">
              {/* 划线 */}
              {highlights.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">划线 ({highlights.length})</h3>
                  <div className="space-y-3">
                    {highlights.map((h: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-400 mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}.</span>
                          <blockquote className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-weread pl-3 leading-relaxed">
                            {h.markText}
                          </blockquote>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 想法 */}
              {reviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">想法 ({reviews.length})</h3>
                  <div className="space-y-3">
                    {reviews.map((r: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="text-xs text-slate-400 mr-1">{i + 1}.</span>{r.content}
                        </p>
                        {r.abstract && (
                          <blockquote className="mt-3 text-xs text-slate-400 border-l-2 border-gray-200 dark:border-slate-700 pl-3 leading-relaxed">
                            {r.abstract}
                          </blockquote>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {highlights.length === 0 && reviews.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <BookOpen size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400">暂无笔记</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {notebooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {notebooks.map((nb: any) => (
                <div
                  key={nb.bookId}
                  onClick={() => loadBookNotes(nb.bookId)}
                  className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-400">暂无笔记数据</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotesPage;
