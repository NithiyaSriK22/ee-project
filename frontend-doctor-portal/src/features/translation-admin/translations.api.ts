import { apiClient } from '../../lib/api-client';
import { ApiResponse } from '../../types/api.types';
import {
  SupportedLanguage,
  QuestionTranslation,
  OptionTranslation,
  TranslationCoverageReport,
  KioskHelpArticle,
} from './types';

export const translationsApi = {
  async getLanguages() {
    const res = await apiClient.get<ApiResponse<SupportedLanguage[]>>('/admin/languages');
    return res.data.data || [];
  },

  async updateLanguage(code: string, updates: Partial<SupportedLanguage>) {
    const res = await apiClient.patch<ApiResponse<SupportedLanguage>>(`/admin/languages/${code}`, updates);
    return res.data.data;
  },

  async getTranslations(params?: { lang?: string; type?: 'question' | 'option'; status?: string }) {
    const query = new URLSearchParams();
    if (params?.lang) query.append('lang', params.lang);
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);

    const res = await apiClient.get<ApiResponse<(QuestionTranslation | OptionTranslation)[]>>(
      `/admin/translations?${query.toString()}`
    );
    return res.data.data || [];
  },

  async createTranslation(data: {
    type: 'question' | 'option';
    language: string;
    questionCode?: string;
    optionCode?: string;
    templateVersion?: string;
    promptText?: string;
    label?: string;
    spokenSynonyms?: string[];
    helpText?: string;
  }) {
    const res = await apiClient.post<ApiResponse<QuestionTranslation | OptionTranslation>>('/admin/translations', data);
    return res.data.data;
  },

  async submitForReview(id: string) {
    const res = await apiClient.post<ApiResponse<any>>(`/admin/translations/${id}/submit-review`);
    return res.data.data;
  },

  async approveTranslation(id: string, note?: string) {
    const res = await apiClient.post<ApiResponse<any>>(`/admin/translations/${id}/approve`, { note });
    return res.data.data;
  },

  async retireTranslation(id: string) {
    const res = await apiClient.post<ApiResponse<any>>(`/admin/translations/${id}/retire`);
    return res.data.data;
  },

  async getCoverage(lang: string, templateVersion?: string) {
    const query = new URLSearchParams({ lang });
    if (templateVersion) query.append('templateVersion', templateVersion);

    const res = await apiClient.get<ApiResponse<TranslationCoverageReport>>(
      `/admin/translations/coverage?${query.toString()}`
    );
    return res.data.data;
  },

  async createHelpArticle(data: { topic: string; language: string; title: string; body: string }) {
    const res = await apiClient.post<ApiResponse<KioskHelpArticle>>('/admin/help-articles', data);
    return res.data.data;
  },

  async translateTextForDoctor(text: string, sourceLang: string, targetLang: string = 'en') {
    const res = await apiClient.post<ApiResponse<{
      originalText: string;
      translatedText: string;
      disclaimer: string;
      sourceLanguage: string;
      targetLanguage: string;
    }>>('/doctor/translate-text', { text, sourceLang, targetLang });
    return res.data.data;
  },
};
