// API 服务 - 与后端 GoFrame 通信

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
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

export interface HealthStatus {
  status: string;
  message: string;
}

export interface HealthCheckItem {
  name: string;
  status: string;
  error?: string;
}

export interface HealthDetail {
  status: string;
  message: string;
  checks: HealthCheckItem[];
  uptime: string;
  version: string;
}

export const healthApi = {
  check: () => request<HealthStatus>('/health'),

  detail: () => request<HealthDetail>('/health/detail'),

  version: () => request<{ version: string }>('/health/version'),
};
