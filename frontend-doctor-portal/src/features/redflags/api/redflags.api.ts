import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  RedFlagAlert,
  RedFlagRule,
  RuleTestSuiteResult,
} from '../types/redflags.types';

export const redflagsApi = {
  // Alerts
  async getAlerts(params?: { status?: string; severityTier?: string }): Promise<RedFlagAlert[]> {
    const res = await apiClient.get<ApiResponse<RedFlagAlert[]>>('/triage/alerts', { params });
    return res.data.data as RedFlagAlert[];
  },

  async getAlertById(id: string): Promise<RedFlagAlert> {
    const res = await apiClient.get<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}`);
    return res.data.data as RedFlagAlert;
  },

  async acknowledgeAlert(id: string, note?: string): Promise<RedFlagAlert> {
    const res = await apiClient.post<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}/acknowledge`, { note });
    return res.data.data as RedFlagAlert;
  },

  async startAssessment(id: string, note?: string): Promise<RedFlagAlert> {
    const res = await apiClient.post<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}/start-assessment`, { note });
    return res.data.data as RedFlagAlert;
  },

  async resolveAlert(id: string, payload: { resolutionType: string; resolutionNote?: string }): Promise<RedFlagAlert> {
    const res = await apiClient.post<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}/resolve`, payload);
    return res.data.data as RedFlagAlert;
  },

  async escalateAlert(id: string, reason?: string): Promise<RedFlagAlert> {
    const res = await apiClient.post<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}/escalate`, { reason });
    return res.data.data as RedFlagAlert;
  },

  async dismissAlert(id: string, payload: { dismissalReason: string; note?: string }): Promise<RedFlagAlert> {
    const res = await apiClient.post<ApiResponse<RedFlagAlert>>(`/triage/alerts/${id}/dismiss`, payload);
    return res.data.data as RedFlagAlert;
  },

  // Rules
  async getRules(): Promise<RedFlagRule[]> {
    const res = await apiClient.get<ApiResponse<RedFlagRule[]>>('/admin/redflag-rules');
    return res.data.data as RedFlagRule[];
  },

  async getRuleById(id: string): Promise<RedFlagRule> {
    const res = await apiClient.get<ApiResponse<RedFlagRule>>(`/admin/redflag-rules/${id}`);
    return res.data.data as RedFlagRule;
  },

  async createRule(payload: any): Promise<RedFlagRule> {
    const res = await apiClient.post<ApiResponse<RedFlagRule>>('/admin/redflag-rules', payload);
    return res.data.data as RedFlagRule;
  },

  async updateRule(id: string, payload: any): Promise<RedFlagRule> {
    const res = await apiClient.patch<ApiResponse<RedFlagRule>>(`/admin/redflag-rules/${id}`, payload);
    return res.data.data as RedFlagRule;
  },

  async submitRuleForReview(id: string): Promise<RedFlagRule> {
    const res = await apiClient.post<ApiResponse<RedFlagRule>>(`/admin/redflag-rules/${id}/submit-review`);
    return res.data.data as RedFlagRule;
  },

  async approveRule(id: string): Promise<RedFlagRule> {
    const res = await apiClient.post<ApiResponse<RedFlagRule>>(`/admin/redflag-rules/${id}/approve`);
    return res.data.data as RedFlagRule;
  },

  async retireRule(id: string): Promise<RedFlagRule> {
    const res = await apiClient.post<ApiResponse<RedFlagRule>>(`/admin/redflag-rules/${id}/retire`);
    return res.data.data as RedFlagRule;
  },

  async runRuleTests(id: string): Promise<RuleTestSuiteResult> {
    const res = await apiClient.post<ApiResponse<RuleTestSuiteResult>>(`/admin/redflag-rules/${id}/run-tests`);
    return res.data.data as RuleTestSuiteResult;
  },
};
