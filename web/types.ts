// 通用类型定义

export interface HealthStatus {
  status: string;
  message: string;
}

export interface HealthDetail {
  status: string;
  message: string;
  checks?: Array<{
    name: string;
    status: string;
    error?: string;
  }>;
  uptime?: string;
  version?: string;
}
