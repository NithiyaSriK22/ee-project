export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptimeSeconds: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}
