import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from '../config/api.config';
import { ApiResponse } from '../types/api.types';

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject correlation headers / session token if available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Generate a client-side request correlation ID if not present
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = `kiosk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract standardized payload and format errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const errorResponse = error.response?.data;
    const standardMessage = errorResponse?.error?.message || error.message || 'An error occurred connecting to the kiosk server';
    return Promise.reject({
      code: errorResponse?.error?.code || 'NETWORK_ERROR',
      message: standardMessage,
      details: errorResponse?.error?.details || [],
      status: error.response?.status || 500,
    });
  }
);
