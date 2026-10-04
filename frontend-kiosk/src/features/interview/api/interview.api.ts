import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  InterviewSessionState,
  InterviewProgress,
  AnsweredViaType,
} from '../types/interview.types';

export const interviewApi = {
  /**
   * Start a new clinical interview session or resume existing active session for visit
   */
  async startInterview(templateId?: string): Promise<InterviewSessionState> {
    const res = await apiClient.post<ApiResponse<InterviewSessionState>>(
      '/api/v1/kiosk/interview/start',
      { templateId }
    );
    return res.data.data as InterviewSessionState;
  },

  /**
   * Get current question and session state
   */
  async getCurrentQuestion(): Promise<InterviewSessionState> {
    const res = await apiClient.get<ApiResponse<InterviewSessionState>>(
      '/api/v1/kiosk/interview/current-question'
    );
    return res.data.data as InterviewSessionState;
  },

  /**
   * Submit an answer to the current question
   */
  async submitAnswer(payload: {
    questionId: string;
    answerValue: any;
    answeredVia: AnsweredViaType;
    languageUsed?: string;
    isSkipped?: boolean;
  }): Promise<{
    recordedAnswer: any;
    nextQuestionId: string | null;
    isFinished: boolean;
    sessionState: InterviewSessionState | null;
  }> {
    const res = await apiClient.post<
      ApiResponse<{
        recordedAnswer: any;
        nextQuestionId: string | null;
        isFinished: boolean;
        sessionState: InterviewSessionState | null;
      }>
    >('/api/v1/kiosk/interview/answer', payload);
    return res.data.data as {
      recordedAnswer: any;
      nextQuestionId: string | null;
      isFinished: boolean;
      sessionState: InterviewSessionState | null;
    };
  },

  /**
   * Complete the interview session
   */
  async completeInterview(): Promise<{
    success: boolean;
    message: string;
    completedAt: string;
  }> {
    const res = await apiClient.post<
      ApiResponse<{ success: boolean; message: string; completedAt: string }>
    >('/api/v1/kiosk/interview/complete');
    return res.data.data as {
      success: boolean;
      message: string;
      completedAt: string;
    };
  },

  /**
   * Retrieve interview progress snapshot
   */
  async getProgress(): Promise<{
    progress: InterviewProgress;
    sessionStatus: string;
    currentSection: string | null;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        progress: InterviewProgress;
        sessionStatus: string;
        currentSection: string | null;
      }>
    >('/api/v1/kiosk/interview/progress');
    return res.data.data as {
      progress: InterviewProgress;
      sessionStatus: string;
      currentSection: string | null;
    };
  },
};
