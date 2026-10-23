import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '../../../types/api.types';
import {
  DocumentUploadResponse,
  UploadedDocumentItem,
  DocumentType,
} from '../types/documents.types';

export const documentsApi = {
  /**
   * Uploads and triggers automated OCR extraction & validation gate
   */
  async uploadDocument(payload: {
    fileBase64: string;
    fileName: string;
    mimeType: string;
    documentType: DocumentType;
  }): Promise<DocumentUploadResponse> {
    const res = await apiClient.post<ApiResponse<DocumentUploadResponse>>(
      '/kiosk/documents/upload',
      payload
    );
    return res.data.data as DocumentUploadResponse;
  },

  /**
   * Retrieves all digitized documents for the active visit
   */
  async listVisitDocuments(): Promise<UploadedDocumentItem[]> {
    const res = await apiClient.get<ApiResponse<UploadedDocumentItem[]>>(
      '/kiosk/documents'
    );
    return res.data.data as UploadedDocumentItem[];
  },

  /**
   * Retrieves status of an individual document
   */
  async getDocumentStatus(id: string): Promise<UploadedDocumentItem> {
    const res = await apiClient.get<ApiResponse<UploadedDocumentItem>>(
      `/kiosk/documents/${id}/status`
    );
    return res.data.data as UploadedDocumentItem;
  },

  /**
   * Retrieves validated fields for an individual document
   */
  async getValidatedFields(id: string): Promise<UploadedDocumentItem> {
    const res = await apiClient.get<ApiResponse<UploadedDocumentItem>>(
      `/kiosk/documents/${id}/validated-fields`
    );
    return res.data.data as UploadedDocumentItem;
  },

  /**
   * Triggers deterministic revalidation
   */
  async revalidateDocument(id: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(
      `/kiosk/documents/${id}/revalidate`
    );
    return res.data.data;
  },
};
