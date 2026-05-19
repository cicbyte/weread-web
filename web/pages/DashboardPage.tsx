import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, TrendingUp, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { wereadApi, syncApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const formatTime = (seconds: number): string => {
  if (!seconds) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  return `${m}分钟`;
};

const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await wereadApi.readDataDetail('monthly');
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
      // 未同步过，忽略
    }
  };

  useEffect(() => {
    Promise.all([loadStats(), loadSyncStatus()]).finally(() => setLoading(false));
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">仪表盘</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-weread hover:bg-weread-dark text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? '同步中...' : '同步数据'}
        </button>
      </div>

      {/* 同步状态 */}
      {syncStatus && syncStatus.status !== 'never' && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${
          syncStatus.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' :
          syncStatus.status === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' :
          'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
        }`}>
          上次同步：{syncStatus.status === 'success' ? `成功 · ${syncStatus.itemsCount} 条` :
            syncStatus.status === 'running' ? '进行中...' : `失败 · ${syncStatus.errorMsg || '未知错误'}`}
        </div>
      )}

      {/* 核心指标卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
              <Calendar size={14} /> 阅读天数
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.readDays || 0}</div>
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
              <BookOpen size={14} /> 对比
            </div>
            <div className={`text-2xl font-bold ${(stats.compare || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {(stats.compare || 0) >= 0 ? '+' : ''}{((stats.compare || 0) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* 读书排行 */}
      {stats?.readLongest?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">读书排行</h3>
          <div className="space-y-3">
            {stats.readLongest.slice(0, 10).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx < 3 ? 'bg-weread text-white' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                }`}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.book?.title || item.albumInfo?.name || '-'}
                  </div>
                  <div className="text-xs text-slate-400">{item.book?.author || item.albumInfo?.authorName || '-'}</div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatTime(item.readTime || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无数据提示 */}
      {!stats && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">暂无阅读数据</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">点击右上角「同步数据」获取微信读书数据</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
