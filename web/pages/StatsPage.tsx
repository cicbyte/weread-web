import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { wereadApi, proxyImageUrl } from '../services/apiService';
import { useToast } from '../components/Toast';

const formatTime = (seconds: number): string => {
  if (!seconds) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  return `${m}分钟`;
};

const COLORS = ['#07C160', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const StatsPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<string>('annually');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [mode]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await wereadApi.readDataDetail(mode);
      setStats(data);
    } catch (err: any) {
      showToast(err.message || '获取统计数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { key: 'weekly', label: '本周' },
    { key: 'monthly', label: '本月' },
    { key: 'annually', label: '今年' },
    { key: 'overall', label: '总计' },
  ];

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

  // readStat 摘要卡片
  const readStatItems = (stats.readStat || []).map((s: any) => ({
    label: s.stat,
    value: s.counts,
  }));

  // 核心指标
  const coreMetrics = [
    { label: '阅读天数', value: `${stats.readDays || 0}`, unit: '天' },
    { label: '总时长', value: formatTime(stats.totalReadTime || 0), unit: '' },
    { label: '日均时长', value: formatTime(stats.dayAverageReadTime || 0), unit: '' },
    {
      label: '环比变化',
      value: stats.compare != null ? `${stats.compare >= 0 ? '+' : ''}${(stats.compare * 100).toFixed(0)}%` : '-',
      unit: '',
      color: stats.compare >= 0 ? 'text-green-600' : 'text-red-500',
    },
  ];

  // 分类偏好
  const categoryData = (stats.preferCategory || [])
    .filter((c: any) => c.readingTime > 0)
    .map((c: any) => ({
      name: c.categoryTitle || '其他',
      hours: Math.round(c.readingTime / 360) / 10,
      count: c.readingCount || 0,
    }));

  // 时间趋势（readTimes）
  const timeEntries = Object.entries(stats.readTimes || {})
    .map(([ts, val]) => ({
      ts: Number(ts),
      value: val as number,
      label: formatTimeLabel(Number(ts), mode),
    }))
    .sort((a, b) => a.ts - b.ts);

  // 读书排行
  const readLongest = stats.readLongest || [];

  // 偏好书籍（带 bookInfo 的）
  const preferBooksWithInfo = (stats.preferBooks || []).filter((b: any) => b.bookInfo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">阅读统计</h2>
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
      </div>

      {!hasData && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">该时段暂无阅读记录，试试切换到「今年」或「总计」查看</p>
        </div>
      )}

      {/* readStat 摘要 */}
      {readStatItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {readStatItems.map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coreMetrics.map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color || 'text-slate-800 dark:text-slate-100'}`}>{value}{unit}</div>
          </div>
        ))}
      </div>

      {/* 偏好分析文字 */}
      {stats.preferCategoryWord && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">偏好分析</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{stats.preferCategoryWord}</p>
          {stats.readDistributionWord && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stats.readDistributionWord}</p>}
        </div>
      )}

      {/* 时间趋势图 */}
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

      {/* 分类偏好图表 */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">分类偏好</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number, name: string) => {
                if (name === 'hours') return [`${value}h`, '阅读时长'];
                return [value, name];
              }} />
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
            {readLongest.map((item: any, idx: number) => (
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

      {/* 偏好书籍 */}
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

function formatTimeLabel(ts: number, mode: string): string {
  const d = new Date(ts * 1000);
  if (mode === 'overall') {
    return `${d.getFullYear()}`;
  }
  if (mode === 'annually') {
    return `${d.getMonth() + 1}月`;
  }
  if (mode === 'monthly') {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  // weekly
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default StatsPage;
