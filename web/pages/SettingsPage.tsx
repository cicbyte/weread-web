import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Clock, Loader2, Trash2, Plus, User, LogOut, RefreshCw, Info, BookOpen, Camera, Pencil, Check, X } from 'lucide-react';
import { authApi, syncApi, proxyImageUrl, SERVER_URL, healthApi } from '../services/apiService';
import { useToast } from '../components/Toast';

type SettingsTab = 'profile' | 'keys' | 'sync' | 'about';

const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [binding, setBinding] = useState(false);
  const [switching, setSwitching] = useState(false);

  // 昵称编辑
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  // 头像上传
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [appVersion, setAppVersion] = useState('-');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, keysData, configData, historyData] = await Promise.allSettled([
        authApi.profile(),
        authApi.listKeys(),
        syncApi.getConfig(),
        syncApi.history(1, 10),
      ]);
      if (profileData.status === 'fulfilled') setProfile(profileData.value);
      if (keysData.status === 'fulfilled') setKeys(keysData.value?.keys || []);
      if (configData.status === 'fulfilled') setSyncConfig(configData.value);
      if (historyData.status === 'fulfilled') setSyncHistory(historyData.value?.list || []);
    } catch {
    } finally {
      setLoading(false);
    }
    healthApi.detail().then(d => setAppVersion(d.version || '-')).catch(() => {});
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

  const handleSwitchUser = async () => {
    setSwitching(true);
    try {
      const loginData = await authApi.login(newKey.trim());
      localStorage.setItem('weread_token', loginData.token);
      localStorage.setItem('weread_vid', loginData.vid);
      showToast('切换成功，页面即将刷新', 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      showToast(err.message || '切换失败', 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('weread_token');
    localStorage.removeItem('weread_vid');
    navigate('/login');
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

  const handleStartEditNickname = () => {
    setNickname(profile?.nickname || '');
    setEditingNickname(true);
    setTimeout(() => nicknameInputRef.current?.focus(), 50);
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    setSavingNickname(true);
    try {
      const result = await authApi.updateProfile(nickname.trim());
      setProfile({ ...profile, nickname: result.nickname });
      setEditingNickname(false);
      showToast('昵称已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('图片不能超过 2MB', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await authApi.updateProfile(profile?.nickname || '用户', file);
      setProfile({ ...profile, avatarUrl: result.avatarUrl });
      showToast('头像已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '上传失败', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-weread animate-spin" />
      </div>
    );
  }

  const navItems = [
    { key: 'profile' as SettingsTab, label: '用户信息', icon: User },
    { key: 'keys' as SettingsTab, label: 'API Key', icon: Key },
    { key: 'sync' as SettingsTab, label: '同步设置', icon: Clock },
    { key: 'about' as SettingsTab, label: '关于', icon: Info },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* 左侧导航 */}
      <div className="w-full md:w-56 flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5 px-2">设置</h2>
        <nav className="flex flex-col space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${
                activeTab === key
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-weread ring-1 ring-gray-100 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 min-h-[500px]">

        {/* 用户信息 */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">用户信息</h3>

            <div className="flex items-center gap-6">
              {/* 头像 */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-weread to-weread-dark shadow-lg shadow-weread/20">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl.startsWith('/') ? `${SERVER_URL}${profile.avatarUrl}` : proxyImageUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {profile?.nickname?.[0] || '?'}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-2xl transition-colors cursor-pointer"
                >
                  <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* 昵称 + VID */}
              <div className="flex-1 min-w-0">
                {editingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nicknameInputRef}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                      className="px-3 py-1.5 rounded-lg border border-weread/30 text-lg font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-weread/30 outline-none"
                      maxLength={20}
                    />
                    <button onClick={handleSaveNickname} disabled={savingNickname} className="p-1.5 rounded-lg text-weread hover:bg-weread/10 transition-colors">
                      {savingNickname ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button onClick={() => setEditingNickname(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">{profile?.nickname || '未知用户'}</span>
                    <button onClick={handleStartEditNickname} className="p-1 rounded text-slate-400 hover:text-weread hover:bg-weread/10 transition-colors">
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <div className="text-sm text-slate-400 mt-1">VID: {profile?.vid || '-'}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">退出登录</div>
                  <div className="text-sm text-slate-400">退出当前账号并返回登录页</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut size={14} /> 退出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key 管理 */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">API Key 管理</h3>

            <div className="flex gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="输入 API Key"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 outline-none"
              />
              <button
                onClick={handleBindKey}
                disabled={binding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-weread hover:bg-weread-dark text-white text-sm transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> 绑定
              </button>
              <button
                onClick={handleSwitchUser}
                disabled={switching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={switching ? 'animate-spin' : ''} />
                {switching ? '切换中...' : '切换用户'}
              </button>
            </div>

            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      wrk-****{key.id}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        key.isActive
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-600'
                          : 'bg-gray-100 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {key.isActive ? '有效' : '无效'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">创建于 {key.createdAt}</div>
                  </div>
                  <button onClick={() => handleDeleteKey(key.id)} className="text-red-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {keys.length === 0 && (
                <div className="text-center py-10">
                  <Key size={28} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">暂无 API Key</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 同步设置 */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">同步设置</h3>

            {syncConfig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">自动同步</div>
                    <div className="text-sm text-slate-400 mt-0.5">开启后按设定频率自动同步数据</div>
                  </div>
                  <button
                    onClick={() => handleUpdateConfig('enabled', syncConfig.enabled ? 0 : 1)}
                    className={`w-12 h-7 rounded-full transition-colors ${syncConfig.enabled ? 'bg-weread' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${syncConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">同步频率</div>
                    <div className="text-sm text-slate-400 mt-0.5">设置自动同步的时间间隔</div>
                  </div>
                  <select
                    value={syncConfig.frequency}
                    onChange={(e) => handleUpdateConfig('frequency', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                  >
                    <option value="hourly">每小时</option>
                    <option value="every6h">每 6 小时</option>
                    <option value="every12h">每 12 小时</option>
                    <option value="daily">每日</option>
                    <option value="weekly">每周</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">同步范围</div>
                    <div className="text-sm text-slate-400 mt-0.5">选择需要同步的数据类型</div>
                  </div>
                  <select
                    value={syncConfig.syncScope}
                    onChange={(e) => handleUpdateConfig('syncScope', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                  >
                    <option value="full">全量</option>
                    <option value="shelf">仅书架</option>
                    <option value="notes">仅笔记</option>
                    <option value="progress">仅进度</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <Clock size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">暂无同步配置</p>
              </div>
            )}

            {syncHistory.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3">同步日志</h4>
                <div className="space-y-2">
                  {syncHistory.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 dark:text-slate-300">{log.syncType}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          log.status === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-600' :
                          log.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
                          'bg-red-50 dark:bg-red-950/30 text-red-600'
                        }`}>{log.status}</span>
                      </div>
                      <span className="text-xs text-slate-400">{log.itemsCount} 条 · {log.finishedAt || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 关于 */}
        {activeTab === 'about' && (
          <div className="text-center py-12">
            <img src="/favicon.svg" alt="" className="w-20 h-20 mx-auto mb-5 shadow-xl shadow-weread/20 rounded-2xl" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">WeRead Web</h3>
            <p className="text-sm text-slate-400 mb-8">微信读书增强平台</p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-weread">{appVersion}</div>
                <div className="text-xs text-slate-400 mt-1">版本</div>
              </div>
              <div className="w-px bg-gray-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">React + GoFrame</div>
                <div className="text-xs text-slate-400 mt-1">技术栈</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
