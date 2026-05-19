import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { wereadApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const formatTime = (seconds: number): string => {
  if (!seconds) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  return `${m}分钟`;
};

const StatsPage: React.FC = () => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<string>('monthly');
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

      {stats ? (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '阅读天数', value: stats.readDays || 0, unit: '天' },
              { label: '总时长', value: formatTime(stats.totalReadTime || 0), unit: '' },
              { label: '日均时长', value: formatTime(stats.dayAverageReadTime || 0), unit: '' },
              { label: '环比变化', value: `${(stats.compare || 0) >= 0 ? '+' : ''}${((stats.compare || 0) * 100).toFixed(0)}%`, unit: '' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}{unit}</div>
              </div>
            ))}
          </div>

          {/* 分类偏好 */}
          {stats.preferCategory?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">分类偏好</h3>
              <div className="space-y-3">
                {stats.preferCategory.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600 dark:text-slate-400 truncate">{cat.categoryTitle}</div>
                    <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-weread rounded-full" style={{ width: `${(cat.val || 0) * 100}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 w-16 text-right">{formatTime(cat.readingTime || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 读书排行 */}
          {stats.readLongest?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">读书排行</h3>
              <div className="space-y-3">
                {stats.readLongest.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? 'bg-weread text-white' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                    }`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.book?.title || '-'}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 whitespace-nowrap">{formatTime(item.readTime || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 偏好时段 */}
          {stats.preferTimeWord && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">偏好时段</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{stats.preferTimeWord}</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">暂无统计数据</p>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
