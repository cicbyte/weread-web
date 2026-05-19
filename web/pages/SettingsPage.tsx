import React, { useState, useEffect } from 'react';
import { Key, Clock, Loader2, Trash2, Plus } from 'lucide-react';
import { authApi, syncApi } from '../services/apiService';
import { useToast } from '../components/Toast';

const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysData, configData, historyData] = await Promise.allSettled([
        authApi.listKeys(),
        syncApi.getConfig(),
        syncApi.history(1, 10),
      ]);
      if (keysData.status === 'fulfilled') setKeys(keysData.value?.keys || []);
      if (configData.status === 'fulfilled') setSyncConfig(configData.value);
      if (historyData.status === 'fulfilled') setSyncHistory(historyData.value?.list || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleBindKey = async () => {
    if (!newKey.trim()) return;
    setBinding(true);
    try {
      await authApi.bindKey(newKey.trim());
      showToast('绑定成功', 'success');
      setNewKey('');
      loadData();
    } catch (err: any) {
      showToast(err.message || '绑定失败', 'error');
    } finally {
      setBinding(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    try {
      await authApi.deleteKey(id);
      showToast('已删除', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const handleUpdateConfig = async (field: string, value: any) => {
    try {
      await syncApi.updateConfig({ [field]: value });
      setSyncConfig({ ...syncConfig, [field]: value });
      showToast('已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error');
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
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">设置</h2>

      {/* API Key 管理 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-weread" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">API Key 管理</h3>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="输入新的 API Key"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 outline-none"
          />
          <button
            onClick={handleBindKey}
            disabled={binding}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-weread hover:bg-weread-dark text-white text-sm transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> 绑定
          </button>
        </div>

        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  wrk-****{key.id} · {key.isActive ? '有效' : '无效'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">创建于 {key.createdAt}</div>
              </div>
              <button onClick={() => handleDeleteKey(key.id)} className="text-red-400 hover:text-red-500 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {keys.length === 0 && <p className="text-sm text-slate-400 text-center py-4">暂无 API Key</p>}
        </div>
      </div>

      {/* 同步配置 */}
      {syncConfig && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-weread" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">同步设置</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-700 dark:text-slate-300">自动同步</label>
              <button
                onClick={() => handleUpdateConfig('enabled', syncConfig.enabled ? 0 : 1)}
                className={`w-10 h-6 rounded-full transition-colors ${syncConfig.enabled ? 'bg-weread' : 'bg-gray-300 dark:bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${syncConfig.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            <div>
              <label className="text-sm text-slate-700 dark:text-slate-300 block mb-1">同步频率</label>
              <select
                value={syncConfig.frequency}
                onChange={(e) => handleUpdateConfig('frequency', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              >
                <option value="hourly">每小时</option>
                <option value="every6h">每 6 小时</option>
                <option value="every12h">每 12 小时</option>
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-700 dark:text-slate-300 block mb-1">同步范围</label>
              <select
                value={syncConfig.syncScope}
                onChange={(e) => handleUpdateConfig('syncScope', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              >
                <option value="full">全量</option>
                <option value="shelf">仅书架</option>
                <option value="notes">仅笔记</option>
                <option value="progress">仅进度</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 同步日志 */}
      {syncHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">同步日志</h3>
          <div className="space-y-2">
            {syncHistory.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm">
                <div>
                  <span className="text-slate-700 dark:text-slate-300">{log.syncType}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    log.status === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-600' :
                    log.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
                    'bg-red-50 dark:bg-red-950/30 text-red-600'
                  }`}>{log.status}</span>
                </div>
                <div className="text-xs text-slate-400">{log.itemsCount} 条 · {log.finishedAt || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
