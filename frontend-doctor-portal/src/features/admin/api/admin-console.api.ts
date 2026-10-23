import { apiClient } from '../../../lib/api-client';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export const adminConsoleApi = {
  // Metric Catalog
  getMetricsCatalog: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/metrics-catalog');
    return res.data.data;
  },

  // Dashboards
  getOperationsOverview: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/overview', { params });
    return res.data.data;
  },

  getIntakeAnalytics: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/intake', { params });
    return res.data.data;
  },

  getLanguageVoiceAnalytics: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/language-voice', { params });
    return res.data.data;
  },

  getDocumentsAnalytics: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/documents', { params });
    return res.data.data;
  },

  getSummariesReviewAnalytics: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/summaries-review', { params });
    return res.data.data;
  },

  getAlertsOperationsAnalytics: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/analytics/alerts-operations', { params });
    return res.data.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/audit-logs', { params });
    return res.data.data;
  },

  verifyAuditChain: async () => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/audit-logs/verify-chain');
    return res.data.data;
  },

  getAccessReports: async (params?: Record<string, any>) => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/audit-logs/access-reports', { params });
    return res.data.data;
  },

  // System & Fleet Health
  getSystemHealth: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/system-health');
    return res.data.data;
  },

  getKioskFleet: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/kiosk-fleet');
    return res.data.data;
  },

  // Reports & Exports
  getReports: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/reports');
    return res.data.data;
  },

  queueReport: async (payload: {
    reportType: string;
    startDate: string;
    endDate: string;
    reportingTimezone?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/reports', payload);
    return res.data.data;
  },

  createExport: async (payload: {
    exportType: string;
    format: string;
    startDate: string;
    endDate: string;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/exports', payload);
    return res.data.data;
  },

  // Staff Administration
  getStaff: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/staff');
    return res.data.data;
  },

  createStaff: async (payload: {
    email: string;
    fullName: string;
    role: string;
    hospitalDepartment?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/staff', payload);
    return res.data.data;
  },

  updateStaffRole: async (staffId: string, role: string) => {
    const res = await apiClient.patch<ApiResponse<any>>(`/admin/staff/${staffId}/role`, { role });
    return res.data.data;
  },

  deactivateStaff: async (staffId: string) => {
    const res = await apiClient.post<ApiResponse<any>>(`/admin/staff/${staffId}/deactivate`);
    return res.data.data;
  },

  // Retention & Legal Hold
  getRetentionSettings: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/retention-settings');
    return res.data.data;
  },

  updateRetentionSetting: async (payload: { settingKey: string; settingValue: number }) => {
    const res = await apiClient.patch<ApiResponse<any>>('/admin/retention-settings', payload);
    return res.data.data;
  },

  placeLegalHold: async (payload: { scope: string; reason: string }) => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/legal-holds', payload);
    return res.data.data;
  },

  // Pilot Baselines
  getPilotBaselines: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/pilot/baselines');
    return res.data.data;
  },

  recordPilotBaseline: async (payload: {
    metricKey: string;
    baselineValue: number;
    unit: string;
    sourceDescription: string;
    measuredBy: string;
    sampleSize: number;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/pilot/baselines', payload);
    return res.data.data;
  },

  // Module 10: Production Deployment, Release Gates, Kill Switches & Safety
  getReleaseGates: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/release-gates');
    return res.data.data;
  },

  overrideReleaseGates: async (payload: { overriddenBy: string; role: string; justification: string }) => {
    const res = await apiClient.post<ApiResponse<any>>('/deployment/release-gates/override', payload);
    return res.data.data;
  },

  getFeatureFlags: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/flags');
    return res.data.data;
  },

  toggleFeatureFlag: async (key: string, payload: { enabled: boolean; reason: string; scope?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/deployment/flags/${key}/toggle`, payload);
    return res.data.data;
  },

  getIntakeStatus: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/intake/status');
    return res.data.data;
  },

  toggleIntakePause: async (payload: { paused: boolean; reason: string }) => {
    const res = await apiClient.post<ApiResponse<any>>('/deployment/intake/toggle-pause', payload);
    return res.data.data;
  },

  getRestoreDrills: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/restore-drills');
    return res.data.data;
  },

  recordRestoreDrill: async (payload: {
    status: 'SUCCESS' | 'FAILED';
    rpoMinutes: number;
    rtoMinutes: number;
    backupArchiveSha256: string;
    verifiedRecordsCount: number;
    notes?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/deployment/restore-drills', payload);
    return res.data.data;
  },

  getEnrolledKiosks: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/kiosks');
    return res.data.data;
  },

  enrollKiosk: async (payload: {
    deviceCode: string;
    hardwareSerial: string;
    operatingSystem: string;
    appVersion: string;
    facilityUnit: string;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>('/deployment/kiosks/enroll', payload);
    return res.data.data;
  },

  revokeKiosk: async (deviceCode: string, payload: { reason: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/deployment/kiosks/${deviceCode}/revoke`, payload);
    return res.data.data;
  },

  getAlertPipelineHealth: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/deployment/alert-pipeline/health');
    return res.data.data;
  },
};
