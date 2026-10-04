import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  StartKioskSessionPayload,
  StartSessionResponseData,
  PatientProfileResponseData,
  ProfileCompletion,
  ConsentItem,
} from '../types/registration.types';

export const registrationApi = {
  startSession: async (payload: StartKioskSessionPayload): Promise<StartSessionResponseData> => {
    const res = await apiClient.post<ApiResponse<StartSessionResponseData>>('/kiosk/session/start', payload);
    return res.data.data!;
  },

  getSessionMe: async (): Promise<StartSessionResponseData> => {
    const res = await apiClient.get<ApiResponse<StartSessionResponseData>>('/kiosk/session/me');
    return res.data.data!;
  },

  endSession: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/kiosk/session/end');
    return res.data.data!;
  },

  getProfile: async (): Promise<PatientProfileResponseData> => {
    const res = await apiClient.get<ApiResponse<PatientProfileResponseData>>('/kiosk/profile');
    return res.data.data!;
  },

  updateProfile: async (
    data: Partial<StartKioskSessionPayload>
  ): Promise<PatientProfileResponseData> => {
    const res = await apiClient.patch<ApiResponse<PatientProfileResponseData>>('/kiosk/profile', data);
    return res.data.data!;
  },

  getCompletion: async (): Promise<ProfileCompletion> => {
    const res = await apiClient.get<ApiResponse<ProfileCompletion>>('/kiosk/profile/completion');
    return res.data.data!;
  },

  getConsents: async (): Promise<ConsentItem[]> => {
    const res = await apiClient.get<ApiResponse<ConsentItem[]>>('/consents');
    return res.data.data!;
  },

  updateConsent: async (
    type: string,
    data: { granted: boolean; grantedVia: 'patient' | 'companion' | 'staff_assisted'; version?: string }
  ): Promise<ConsentItem> => {
    const res = await apiClient.patch<ApiResponse<ConsentItem>>(`/consents/${type}`, data);
    return res.data.data!;
  },
};
