import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  VisitQueueEntryDTO,
  ReviewWorkspaceDTO,
  RawViewDTO,
  ReviewClaimDTO,
  ReviewItemResolutionDTO,
  StatementEditDTO,
  DoctorAddedStatementDTO,
  ConfirmedRecordDTO,
  StatementSourceDetail,
  DashboardStatsDTO,
} from '../types/doctor-review.types';

export const DoctorReviewApi = {
  // Queue operations
  async getQueue(
    options?:
      | { department?: string; scope?: 'my_queue' | 'unassigned' | 'all'; assignedDoctorId?: string }
      | string
  ): Promise<VisitQueueEntryDTO[]> {
    let params: Record<string, any> = {};
    if (typeof options === 'string') {
      params = { department: options };
    } else if (options) {
      params = { ...options };
    }
    const res = await apiClient.get<ApiResponse<VisitQueueEntryDTO[]>>('/doctor/queue', { params });
    return (res.data.data || []) as VisitQueueEntryDTO[];
  },

  async reassignVisit(visitId: string, payload: { newDoctorId: string; reason?: string }): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/doctor/queue/${visitId}/reassign`, payload);
    return res.data.data;
  },

  async getDoctors(): Promise<Array<{ id: string; fullName?: string; doctor_name?: string; department_name?: string; specialization?: string }>> {
    const res = await apiClient.get<ApiResponse<any[]>>('/doctor/doctors');
    return (res.data.data || []);
  },

  async claimVisit(visitId: string, outOfQueueReason?: string): Promise<ReviewClaimDTO> {
    const res = await apiClient.post<ApiResponse<ReviewClaimDTO>>(`/doctor/queue/${visitId}/claim`, {
      outOfQueueReason,
    });
    return res.data.data as ReviewClaimDTO;
  },

  async releaseVisit(visitId: string): Promise<void> {
    await apiClient.post(`/doctor/queue/${visitId}/release`);
  },

  // Workspace and raw view
  async getWorkspace(visitId: string, outOfQueueReason?: string): Promise<ReviewWorkspaceDTO> {
    const params = outOfQueueReason ? { outOfQueueReason } : {};
    const res = await apiClient.get<ApiResponse<ReviewWorkspaceDTO>>(`/doctor/visits/${visitId}/workspace`, {
      params,
    });
    return res.data.data as ReviewWorkspaceDTO;
  },

  async getRawView(visitId: string, outOfQueueReason?: string): Promise<RawViewDTO> {
    const params = outOfQueueReason ? { outOfQueueReason } : {};
    const res = await apiClient.get<ApiResponse<RawViewDTO>>(`/doctor/visits/${visitId}/raw-view`, {
      params,
    });
    return res.data.data as RawViewDTO;
  },

  async startReview(
    visitId: string,
    outOfQueueReason?: string
  ): Promise<{ reviewId: string; status: string; baseSummaryVersion: number }> {
    const res = await apiClient.post<ApiResponse<any>>(`/doctor/visits/${visitId}/review/start`, {
      outOfQueueReason,
    });
    return res.data.data as { reviewId: string; status: string; baseSummaryVersion: number };
  },

  // Item resolutions & edits
  async saveResolution(
    reviewId: string,
    payload: {
      itemRef: string;
      itemType?: string;
      resolutionType: string;
      correctedValue?: string | null;
      viewedSource?: boolean;
    }
  ): Promise<ReviewItemResolutionDTO> {
    const res = await apiClient.post<ApiResponse<ReviewItemResolutionDTO>>(
      `/doctor/reviews/${reviewId}/resolutions`,
      payload
    );
    return res.data.data as ReviewItemResolutionDTO;
  },

  async editStatement(
    reviewId: string,
    statementId: string,
    editedText: string
  ): Promise<StatementEditDTO> {
    const res = await apiClient.patch<ApiResponse<StatementEditDTO>>(
      `/doctor/reviews/${reviewId}/statements/${statementId}`,
      { editedText }
    );
    return res.data.data as StatementEditDTO;
  },

  async addStatement(
    reviewId: string,
    section: string,
    statementText: string
  ): Promise<DoctorAddedStatementDTO> {
    const res = await apiClient.post<ApiResponse<DoctorAddedStatementDTO>>(
      `/doctor/reviews/${reviewId}/statements`,
      { section, statementText }
    );
    return res.data.data as DoctorAddedStatementDTO;
  },

  async removeStatement(reviewId: string, statementId: string): Promise<void> {
    await apiClient.delete(`/doctor/reviews/${reviewId}/statements/${statementId}`);
  },

  async rejectSummary(
    reviewId: string,
    payload: { rejectionReason: string; rejectionNote?: string }
  ): Promise<void> {
    await apiClient.post(`/doctor/reviews/${reviewId}/reject`, payload);
  },

  async requestRegeneration(
    reviewId: string,
    justification?: string
  ): Promise<{ message: string; version: number }> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/doctor/reviews/${reviewId}/request-regeneration`,
      { justification }
    );
    return res.data.data as { message: string; version: number };
  },

  async confirmReview(
    reviewId: string,
    attestationAccepted: boolean,
    attestationVersion: string = 'ATTEST-v1.0.0'
  ): Promise<ConfirmedRecordDTO> {
    const res = await apiClient.post<ApiResponse<ConfirmedRecordDTO>>(
      `/doctor/reviews/${reviewId}/confirm`,
      { attestationAccepted, attestationVersion }
    );
    return res.data.data as ConfirmedRecordDTO;
  },

  // Confirmed records & amendments
  async getConfirmedRecordByVisit(visitId: string): Promise<ConfirmedRecordDTO> {
    const res = await apiClient.get<ApiResponse<ConfirmedRecordDTO>>(
      `/doctor/visits/${visitId}/confirmed-record`
    );
    return res.data.data as ConfirmedRecordDTO;
  },

  async getConfirmedRecordById(id: string): Promise<ConfirmedRecordDTO> {
    const res = await apiClient.get<ApiResponse<ConfirmedRecordDTO>>(`/doctor/confirmed-records/${id}`);
    return res.data.data as ConfirmedRecordDTO;
  },

  async getConfirmedRecordVersions(id: string): Promise<ConfirmedRecordDTO[]> {
    const res = await apiClient.get<ApiResponse<ConfirmedRecordDTO[]>>(
      `/doctor/confirmed-records/${id}/versions`
    );
    return (res.data.data || []) as ConfirmedRecordDTO[];
  },

  async amendRecord(
    id: string,
    payload: {
      amendmentReason: string;
      updatedStatements?: Array<{
        id?: string;
        section: string;
        text: string;
        origin?: string;
        order?: number;
      }>;
    }
  ): Promise<ConfirmedRecordDTO> {
    const res = await apiClient.post<ApiResponse<ConfirmedRecordDTO>>(
      `/doctor/confirmed-records/${id}/amend`,
      payload
    );
    return res.data.data as ConfirmedRecordDTO;
  },

  // Provenance & document snippet
  async getStatementSources(statementId: string): Promise<StatementSourceDetail> {
    const res = await apiClient.get<ApiResponse<StatementSourceDetail>>(
      `/doctor/statements/${statementId}/sources`
    );
    return res.data.data as StatementSourceDetail;
  },

  async getDocumentSnippet(
    documentId: string,
    snippetRef?: string
  ): Promise<{
    documentId: string;
    signedUrl: string;
    expiresAt: string;
    snippetCropCoordinates: { x: number; y: number; width: number; height: number };
    snippetRef: string;
    fileName: string;
    mimeType?: string;
  }> {
    const params = snippetRef ? { snippetRef } : {};
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/documents/${documentId}/snippet`, {
      params,
    });
    return res.data.data as {
      documentId: string;
      signedUrl: string;
      expiresAt: string;
      snippetCropCoordinates: { x: number; y: number; width: number; height: number };
      snippetRef: string;
      fileName: string;
      mimeType?: string;
    };
  },

  // Medical Records & AI Summaries (Patient-Doctor Portal Integration)
  async getMedicalRecords(visitId: string): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/visits/${visitId}/medical-records`);
    return (res.data.data || []) as any[];
  },

  async getIndividualSummary(documentId: string): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/documents/${documentId}/summary`);
    return res.data.data;
  },

  async getCombinedSummary(visitId: string, regenerate = false): Promise<any> {
    const params = regenerate ? { regenerate: 'true' } : {};
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/visits/${visitId}/combined-summary`, { params });
    return res.data.data;
  },

  async regenerateCombinedSummary(visitId: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/doctor/visits/${visitId}/combined-summary/regenerate`);
    return res.data.data;
  },

  async approveCombinedSummary(visitId: string, notes?: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/doctor/visits/${visitId}/combined-summary/approve`, { notes });
    return res.data.data;
  },

  async getDashboardStats(department?: string): Promise<DashboardStatsDTO> {
    const params = department ? { department } : {};
    const res = await apiClient.get<ApiResponse<DashboardStatsDTO>>('/doctor/dashboard/stats', { params });
    return res.data.data as DashboardStatsDTO;
  },

  async createQuickNote(payload: { patientId?: string; visitId?: string; note: string }): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/doctor/quick-note', payload);
    return res.data.data;
  },
};
