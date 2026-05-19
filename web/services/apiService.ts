const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('weread_token');
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('weread_token');
      localStorage.removeItem('weread_vid');
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || '请求失败');
  }

  const json: ApiResponse<T> = await response.json();
  if (json.code !== 0) {
    throw new Error(json.message || '请求失败');
  }
  return json.data;
}

// 代理请求 — 代理接口返回微信读书原始 JSON（无 code/data 包装）
async function proxyRequest<T>(params: Record<string, unknown>): Promise<T> {
  const url = `${API_BASE_URL}/weread/proxy`;
  const token = localStorage.getItem('weread_token');
  const config: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('weread_token');
      localStorage.removeItem('weread_vid');
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}

// 认证 API
export const authApi = {
  login: (apiKey: string) =>
    request<{ token: string; vid: string; expire: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),

  profile: () =>
    request<{ vid: string; nickname: string; avatarUrl: string; createdAt: string }>('/auth/profile'),

  listKeys: () =>
    request<{ keys: Array<{ id: number; isActive: number; createdAt: string; lastUsed?: string }> }>('/auth/keys'),

  bindKey: (apiKey: string) =>
    request<{ msg: string }>('/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),

  deleteKey: (id: number) =>
    request<{ msg: string }>(`/auth/keys/${id}`, { method: 'DELETE' }),
};

// 代理 API - 转发到微信读书
export const wereadApi = {
  proxy: (params: Record<string, unknown>) =>
    proxyRequest<unknown>(params),

  searchBooks: (keyword: string, count = 15) =>
    wereadApi.proxy({ api_name: '/store/search', keyword, scope: 10, count }) as Promise<any>,

  bookInfo: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/info', bookId }) as Promise<any>,

  chapterInfo: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/chapterinfo', bookId }) as Promise<any>,

  getProgress: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/getprogress', bookId }) as Promise<any>,

  shelfSync: () =>
    wereadApi.proxy({ api_name: '/shelf/sync' }) as Promise<any>,

  readDataDetail: (mode = 'monthly', baseTime = 0) =>
    wereadApi.proxy({ api_name: '/readdata/detail', mode, baseTime }) as Promise<any>,

  notebooks: (count = 20, lastSort = 0) =>
    wereadApi.proxy({ api_name: '/user/notebooks', count, ...(lastSort ? { lastSort } : {}) }) as Promise<any>,

  bookmarkList: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/bookmarklist', bookId }) as Promise<any>,

  reviewListMine: (bookId: string, synckey = 0, count = 20) =>
    wereadApi.proxy({ api_name: '/review/list/mine', bookid: bookId, synckey, count }) as Promise<any>,

  bestBookmarks: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/bestbookmarks', bookId }) as Promise<any>,

  reviewList: (bookId: string, reviewListType = 0, count = 20, maxIdx = 0) =>
    wereadApi.proxy({ api_name: '/review/list', bookId, reviewListType, count, maxIdx }) as Promise<any>,

  recommend: (count = 12) =>
    wereadApi.proxy({ api_name: '/book/recommend', count }) as Promise<any>,

  similar: (bookId: string) =>
    wereadApi.proxy({ api_name: '/book/similar', bookId }) as Promise<any>,
};

// 同步 API
export const syncApi = {
  trigger: (syncScope = 'full') =>
    request<{ logId: number; msg: string }>('/sync/trigger', {
      method: 'POST',
      body: JSON.stringify({ syncScope }),
    }),

  status: () =>
    request<{ id: number; syncType: string; status: string; startedAt: string; finishedAt: string; itemsCount: number; errorMsg?: string }>('/sync/status'),

  history: (page = 1, size = 20) =>
    request<{ total: number; page: number; size: number; list: any[] }>(`/sync/history?page=${page}&size=${size}`),

  getConfig: () =>
    request<{ enabled: number; frequency: string; syncScope: string; syncTime: string }>('/sync/config'),

  updateConfig: (config: Partial<{ enabled: number; frequency: string; syncScope: string; syncTime: string }>) =>
    request<{ msg: string }>('/sync/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
};

// 健康 API
export const healthApi = {
  detail: () => request<{
    status: string;
    message: string;
    checks: Array<{ name: string; status: string; error?: string }>;
    uptime: string;
    version: string;
  }>('/health/detail'),
};

// 图片代理 — 通过本地缓存，避免每次请求 CDN
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  return `${API_BASE_URL}/image/proxy?url=${encodeURIComponent(url)}`;
}