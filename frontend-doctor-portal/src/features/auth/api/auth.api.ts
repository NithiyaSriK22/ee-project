import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  LoginPayload,
  LoginResponseData,
  StaffUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  AuthTokens,
} from '../types/auth.types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const res = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', payload);
    return res.data.data!;
  },

  logout: async (refreshToken?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/logout', {
      refreshToken,
    });
    return res.data.data!;
  },

  getMe: async (): Promise<StaffUser> => {
    const res = await apiClient.get<ApiResponse<StaffUser>>('/auth/me');
    return res.data.data!;
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
    return res.data.data!;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/change-password', payload);
    return res.data.data!;
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/forgot-password', payload);
    return res.data.data!;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/reset-password', payload);
    return res.data.data!;
  },
};
