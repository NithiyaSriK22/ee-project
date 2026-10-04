import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import { AdminTemplate, AdminQuestion } from '../types/template-admin.types';

export const templateAdminApi = {
  async listTemplates(): Promise<AdminTemplate[]> {
    const res = await apiClient.get<ApiResponse<AdminTemplate[]>>(
      '/api/v1/admin/interview-templates'
    );
    return res.data.data as AdminTemplate[];
  },

  async getTemplateById(id: string): Promise<AdminTemplate> {
    const res = await apiClient.get<ApiResponse<AdminTemplate>>(
      `/api/v1/admin/interview-templates/${id}`
    );
    return res.data.data as AdminTemplate;
  },

  async createTemplate(payload: {
    name: string;
    description?: string;
    applicableVisitType?: string;
    version?: string;
    changeSummary?: string;
  }): Promise<AdminTemplate> {
    const res = await apiClient.post<ApiResponse<AdminTemplate>>(
      '/api/v1/admin/interview-templates',
      payload
    );
    return res.data.data as AdminTemplate;
  },

  async submitForReview(id: string): Promise<AdminTemplate> {
    const res = await apiClient.post<ApiResponse<AdminTemplate>>(
      `/api/v1/admin/interview-templates/${id}/review`
    );
    return res.data.data as AdminTemplate;
  },

  async publishTemplate(id: string): Promise<AdminTemplate> {
    const res = await apiClient.post<ApiResponse<AdminTemplate>>(
      `/api/v1/admin/interview-templates/${id}/publish`
    );
    return res.data.data as AdminTemplate;
  },

  async retireTemplate(id: string): Promise<AdminTemplate> {
    const res = await apiClient.post<ApiResponse<AdminTemplate>>(
      `/api/v1/admin/interview-templates/${id}/retire`
    );
    return res.data.data as AdminTemplate;
  },

  async addQuestion(
    templateId: string,
    payload: {
      section: string;
      promptText: string;
      promptAudioHint?: string;
      questionType: string;
      answerOptions?: any;
      isCritical?: boolean;
      isRequired?: boolean;
      order?: number;
      branchingLogic?: any;
    }
  ): Promise<AdminQuestion> {
    const res = await apiClient.post<ApiResponse<AdminQuestion>>(
      `/api/v1/admin/interview-templates/${templateId}/questions`,
      payload
    );
    return res.data.data as AdminQuestion;
  },

  async archiveQuestion(questionId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/api/v1/admin/interview-questions/${questionId}`
    );
    return res.data.data as { success: boolean; message: string };
  },
};
