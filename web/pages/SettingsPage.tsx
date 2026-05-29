import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Clock, Loader2, Trash2, Plus, User, LogOut, RefreshCw, Info, BookOpen, Camera, Pencil, Check, X, ExternalLink, Github, Server, Code2, Heart, Eye, EyeOff, Zap, Timer, Layers, Activity, Shield } from 'lucide-react';
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
  const [showVid, setShowVid] = useState(false);

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

  const maskVid = (vid: string) => {
    if (!vid) return '-';
    if (vid.length <= 10) return '•'.repeat(vid.length);
    return `${vid.slice(0, 6)}${'•'.repeat(Math.min(vid.length - 10, 8))}${vid.slice(-4)}`;
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left cursor-pointer ${
                activeTab === key
                  ? 'bg-weread text-white shadow-md shadow-weread/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 min-h-[500px]">

        {/* ===== 用户信息 ===== */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {/* 头像 + 基本信息主卡片 */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              {/* 顶部渐变装饰条 */}
              <div className="h-24 bg-gradient-to-br from-weread/20 via-weread/10 to-transparent" />
              {/* 用户信息内容 */}
              <div className="px-6 pb-6 -mt-10">
                <div className="flex items-end gap-5">
                  {/* 头像 */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-weread to-weread-dark shadow-lg shadow-weread/25 ring-4 ring-white dark:ring-slate-900">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl.startsWith('/') ? `${SERVER_URL}${profile.avatarUrl}` : proxyImageUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
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
                  <div className="flex-1 min-w-0 pb-1">
                    {editingNickname ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={nicknameInputRef}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                          className="px-3 py-1.5 rounded-lg border border-weread/30 text-lg font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-weread/30 outline-none"
                          maxLength={20}
                        />
                        <button onClick={handleSaveNickname} disabled={savingNickname} className="p-1.5 rounded-lg text-weread hover:bg-weread/10 transition-colors cursor-pointer">
                          {savingNickname ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={() => setEditingNickname(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">{profile?.nickname || '未知用户'}</span>
                        <button onClick={handleStartEditNickname} className="p-1 rounded text-slate-400 hover:text-weread hover:bg-weread/10 transition-colors cursor-pointer">
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                      <span className="font-mono text-xs">VID: {showVid ? (profile?.vid || '-') : maskVid(profile?.vid || '')}</span>
                      <button onClick={() => setShowVid(!showVid)} className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                        {showVid ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 退出登录 */}
            <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center flex-shrink-0">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">退出登录</div>
                  <div className="text-sm text-slate-400 mt-0.5">退出当前账号并返回登录页</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                退出
              </button>
            </div>
          </div>
        )}

        {/* ===== API Key 管理 ===== */}
        {activeTab === 'keys' && (
          <div className="space-y-5">
            {/* 绑定新 Key */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-weread/10 flex items-center justify-center">
                  <Plus size={16} className="text-weread" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">绑定新 Key</div>
                  <div className="text-xs text-slate-400">输入微信读书的 API Key 以绑定账号</div>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="输入 API Key（wrk-...）"
                  className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-weread/30 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors"
                />
                <button
                  onClick={handleBindKey}
                  disabled={binding}
                  className="flex items-center gap-1.5 px-5 h-10 rounded-xl bg-weread hover:bg-weread-dark text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {binding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  绑定
                </button>
              </div>
              <button
                onClick={handleSwitchUser}
                disabled={switching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={switching ? 'animate-spin' : ''} />
                {switching ? '切换中...' : '切换用户'}
              </button>
            </div>

            {/* Key 列表 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">已绑定的 Key</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-400">{keys.length}</span>
              </div>
              {keys.map((key) => (
                <div key={key.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-default ${
                  key.isActive
                    ? 'bg-white dark:bg-slate-900 border-green-200 dark:border-green-900/50 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      key.isActive ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-100 dark:bg-slate-800'
                    }`}>
                      <Key size={16} className={key.isActive ? 'text-green-500' : 'text-slate-400'} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">
                        wrk-****{key.id}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">创建于 {key.createdAt}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      key.isActive
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600'
                        : 'bg-gray-100 dark:bg-slate-700 text-slate-400'
                    }`}>
                      {key.isActive ? '有效' : '无效'}
                    </span>
                    <button onClick={() => handleDeleteKey(key.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {keys.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Key size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">暂无 API Key</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">在上方输入框绑定你的第一个 Key</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 同步设置 ===== */}
        {activeTab === 'sync' && (
          <div className="space-y-5">
            {syncConfig ? (
              <div className="space-y-3">
                {/* 自动同步 */}
                <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${syncConfig.enabled ? 'bg-weread/10' : 'bg-gray-100 dark:bg-slate-800'}`}>
                      <Zap size={18} className={syncConfig.enabled ? 'text-weread' : 'text-slate-400'} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">自动同步</div>
                      <div className="text-sm text-slate-400 mt-0.5">{syncConfig.enabled ? '已开启，将按频率自动同步' : '已关闭'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateConfig('enabled', syncConfig.enabled ? 0 : 1)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${syncConfig.enabled ? 'bg-weread' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${syncConfig.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* 同步频率 */}
                <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                      <Timer size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">同步频率</div>
                      <div className="text-sm text-slate-400 mt-0.5">设置自动同步的时间间隔</div>
                    </div>
                  </div>
                  <select
                    value={syncConfig.frequency}
                    onChange={(e) => handleUpdateConfig('frequency', e.target.value)}
                    className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-weread/30"
                  >
                    <option value="hourly">每小时</option>
                    <option value="every6h">每 6 小时</option>
                    <option value="every12h">每 12 小时</option>
                    <option value="daily">每日</option>
                    <option value="weekly">每周</option>
                  </select>
                </div>

                {/* 同步范围 */}
                <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                      <Layers size={18} className="text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">同步范围</div>
                      <div className="text-sm text-slate-400 mt-0.5">选择需要同步的数据类型</div>
                    </div>
                  </div>
                  <select
                    value={syncConfig.syncScope}
                    onChange={(e) => handleUpdateConfig('syncScope', e.target.value)}
                    className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-weread/30"
                  >
                    <option value="full">全量</option>
                    <option value="shelf">仅书架</option>
                    <option value="notes">仅笔记</option>
                    <option value="progress">仅进度</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">暂无同步配置</p>
              </div>
            )}

            {/* 同步日志 */}
            {syncHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">同步日志</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-400">{syncHistory.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm divide-y divide-gray-50 dark:divide-slate-800">
                  {syncHistory.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between px-5 py-3.5 first:rounded-t-2xl last:rounded-b-2xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          log.status === 'success' ? 'bg-green-500' :
                          log.status === 'running' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{log.syncType}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          log.status === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-600' :
                          log.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600' :
                          'bg-red-50 dark:bg-red-950/30 text-red-600'
                        }`}>{log.status}</span>
                      </div>
                      <span className="text-xs text-slate-400">{log.itemsCount} 条 &middot; {log.finishedAt || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 关于 ===== */}
        {activeTab === 'about' && (
          <div className="space-y-5">
            {/* 产品信息卡片 */}
            <div className="relative overflow-hidden p-6 bg-gradient-to-br from-weread via-weread to-weread-dark rounded-2xl shadow-lg shadow-weread/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 p-2">
                  <img src="/favicon.svg" alt="WeRead Web" className="w-12 h-12" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-2xl font-bold text-white">WeRead Web</h4>
                  <p className="text-sm text-white/70 mt-0.5">微信读书辅助平台</p>
                </div>
              </div>
            </div>

            {/* 信息网格 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-weread/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-weread" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">版本</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{appVersion}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                  <Code2 size={18} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">技术栈</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">React + GoFrame</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">开源协议</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">MIT License</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                  <Heart size={18} className="text-rose-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">作者</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">cicbyte</div>
                </div>
              </div>
            </div>

            {/* GitHub 链接 */}
            <a
              href="https://github.com/cicbyte/weread-web"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:border-weread/30 dark:hover:border-weread/20 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
                  <Github size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">GitHub</div>
                  <div className="text-xs text-slate-400">查看源码 · 提交 Issue · Star</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-weread transition-colors" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
