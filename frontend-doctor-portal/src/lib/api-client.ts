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

// Interceptor: inject authorization token and request ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('medikiosk_doctor_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const errorResponse = error.response?.data;
    const standardMessage = errorResponse?.error?.message || error.message || 'An error occurred with the clinical server';
    return Promise.reject({
      code: errorResponse?.error?.code || 'NETWORK_ERROR',
      message: standardMessage,
      details: errorResponse?.error?.details || [],
      status: error.response?.status || 500,
    });
  }
);
