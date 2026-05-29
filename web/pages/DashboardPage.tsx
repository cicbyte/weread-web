import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, TrendingUp, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { wereadApi, syncApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

const formatTime = (seconds: number): string => {
  if (!seconds) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  return `${m}分钟`;
};

const COLORS = ['#07C160', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const modes = [
  { key: 'weekly', label: '本周' },
  { key: 'monthly', label: '本月' },
  { key: 'annually', label: '今年' },
  { key: 'overall', label: '总计' },
];

function formatTimeLabel(ts: number, mode: string): string {
  const d = new Date(ts * 1000);
  if (mode === 'overall') return `${d.getFullYear()}`;
  if (mode === 'annually') return `${d.getMonth() + 1}月`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('annually');
  const [stats, setStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await wereadApi.readDataDetail(mode);
      setStats(data);
    } catch (err: any) {
      showToast(err.message || '获取统计数据失败', 'error');
    }
  };

  const loadSyncStatus = async () => {
    try {
      const data = await syncApi.status();
      setSyncStatus(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setLoading(true);
    loadStats().finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.trigger('full');
      showToast('同步已触发，数据将在后台更新', 'success');
      loadSyncStatus();
    } catch (err: any) {
      showToast(err.message || '同步失败', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">暂无统计数据</p>
      </div>
    );
  }

  const hasData = (stats.totalReadTime > 0) || (stats.readDays > 0);
  const readStatItems = stats.readStat || [];
  const readLongest = stats.readLongest || [];
  const preferBooksWithInfo = (stats.preferBooks || []).filter((b: any) => b.bookInfo);
  const categoryData = (stats.preferCategory || [])
    .filter((c: any) => c.readingTime > 0)
    .map((c: any) => ({
      name: c.categoryTitle || '其他',
      hours: Math.round(c.readingTime / 360) / 10,
    }));
  const timeEntries = Object.entries(stats.readTimes || {})
    .map(([ts, val]) => ({
      ts: Number(ts),
      value: val as number,
      label: formatTimeLabel(Number(ts), mode),
    }))
    .sort((a, b) => a.ts - b.ts);

  return (
    <div className="space-y-6">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">仪表盘</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {modes.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === key ? 'bg-white dark:bg-slate-700 text-weread shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-weread hover:bg-weread-dark text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '同步中...' : '同步'}
          </button>
        </div>
      </div>

      {/* 同步状态 — 仅在进行中或失败时展示，成功时隐藏 */}
      {syncStatus && syncStatus.status !== 'never' && syncStatus.status !== 'success' && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${
          syncStatus.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' :
          'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
        }`}>
          {syncStatus.status === 'running' ? '同步进行中...' : `上次同步失败 · ${syncStatus.errorMsg || '未知错误'}`}
        </div>
      )}

      {/* 无数据提示 */}
      {!hasData && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">该时段暂无阅读记录，试试切换到「今年」或「总计」</p>
        </div>
      )}

      {/* readStat 摘要 */}
      {readStatItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {readStatItems.map((s: any) => (
            <div key={s.stat} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{s.stat}</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.counts}</div>
            </div>
          ))}
        </div>
      )}

      {/* 核心指标 */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <Calendar size={14} /> 阅读天数
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.readDays || 0} <span className="text-base font-normal text-slate-400">天</span></div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <Clock size={14} /> 总时长
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatTime(stats.totalReadTime || 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <TrendingUp size={14} /> 日均时长
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatTime(stats.dayAverageReadTime || 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <BookOpen size={14} /> 环比
            </div>
            <div className={`text-2xl font-bold ${(stats.compare || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stats.compare != null ? `${stats.compare >= 0 ? '+' : ''}${(stats.compare * 100).toFixed(0)}%` : '-'}
            </div>
          </div>
        </div>
      )}

      {/* 偏好分析 */}
      {stats.preferCategoryWord && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">偏好分析</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{stats.preferCategoryWord}</p>
          {stats.readDistributionWord && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stats.readDistributionWord}</p>}
        </div>
      )}

      {/* 阅读趋势图 */}
      {timeEntries.length > 0 && timeEntries.some(e => e.value > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">阅读趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeEntries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${Math.round(v / 3600)}h`} />
              <Tooltip formatter={(value: number) => [formatTime(value), '阅读时长']} />
              <Bar dataKey="value" fill="#07C160" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 分类偏好 */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">分类偏好</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}h`, '阅读时长']} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {categoryData.map((_: any, idx: number) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 读书排行 */}
      {readLongest.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">读书排行</h3>
          <div className="space-y-3">
            {readLongest.slice(0, 10).map((item: any, idx: number) => (
              <div
                key={idx}
                onClick={() => item.book?.bookId && navigate(`/book/${item.book.bookId}`)}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx < 3 ? 'bg-weread text-white' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                }`}>{idx + 1}</span>
                <div className="w-8 h-11 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden">
                  {item.book?.cover ? (
                    <img src={proxyImageUrl(item.book.cover)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={12} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.book?.title || '-'}</div>
                  <div className="text-xs text-slate-400">{item.book?.author || ''}</div>
                </div>
                <div className="text-sm text-slate-500 whitespace-nowrap">{formatTime(item.readTime || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 偏好书籍标签 */}
      {preferBooksWithInfo.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">阅读标签</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {preferBooksWithInfo.map((item: any) => (
              <div
                key={item.type}
                onClick={() => navigate(`/book/${item.bookInfo.bookId}`)}
                className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <img src={proxyImageUrl(item.bookInfo.cover)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-weread font-medium mb-0.5">{item.title}</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.bookInfo.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.bookInfo.author}</div>
                  {item.reason && <div className="text-xs text-slate-400 mt-1">{item.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
