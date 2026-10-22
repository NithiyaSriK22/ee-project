import { apiClient } from '../../../lib/api-client';
import { ClinicalSummaryDto } from '../types/summary.types';

export const SummaryApi = {
  /**
   * Retrieves the latest clinical summary draft for a visit
   */
  async getLatestSummary(visitId: string): Promise<ClinicalSummaryDto> {
    const res = await apiClient.get<{ success: boolean; data: ClinicalSummaryDto }>(
      `/summary/visits/${visitId}`
    );
    return res.data.data;
  },

  /**
   * Retrieves all historical versions for a visit
   */
  async getSummaryVersions(visitId: string): Promise<ClinicalSummaryDto[]> {
    const res = await apiClient.get<{ success: boolean; data: ClinicalSummaryDto[] }>(
      `/summary/visits/${visitId}/versions`
    );
    return res.data.data;
  },

  /**
   * Retrieves a specific summary by immutable ID
   */
  async getSummaryById(summaryId: string): Promise<ClinicalSummaryDto> {
    const res = await apiClient.get<{ success: boolean; data: ClinicalSummaryDto }>(
      `/summary/${summaryId}`
    );
    return res.data.data;
  },

  /**
   * Requests on-demand re-assembly and generation of the summary draft
   */
  async regenerateSummary(visitId: string, reason?: string): Promise<ClinicalSummaryDto> {
    const res = await apiClient.post<{ success: boolean; data: ClinicalSummaryDto }>(
      `/summary/visits/${visitId}/regenerate`,
      { reason }
    );
    return res.data.data;
  },
};
