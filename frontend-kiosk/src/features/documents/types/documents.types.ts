export const DocumentTypes = {
  PRESCRIPTION: 'PRESCRIPTION',
  LAB_REPORT: 'LAB_REPORT',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  OTHER: 'OTHER',
} as const;

export type DocumentType = (typeof DocumentTypes)[keyof typeof DocumentTypes];

export const DocumentTypeLabels: Record<DocumentType, { label: string; description: string; icon: string }> = {
  PRESCRIPTION: {
    label: 'Doctor Prescription',
    description: 'Past or current doctor prescription slips with medicines',
    icon: 'FileText',
  },
  LAB_REPORT: {
    label: 'Lab Diagnostic Report',
    description: 'Blood test, urine test, or pathology investigation report',
    icon: 'Activity',
  },
  DISCHARGE_SUMMARY: {
    label: 'Hospital Discharge Summary',
    description: 'Summary paper from previous hospital admission or surgery',
    icon: 'Clipboard',
  },
  OTHER: {
    label: 'Other Medical Record',
    description: 'Any other medical document, vaccination card, or slip',
    icon: 'Files',
  },
};

export interface ValidatedFieldItem {
  id: string;
  fieldType: string;
  isCritical: boolean;
  result: 'VERIFIED' | 'UNVERIFIED' | 'UNREADABLE' | 'MISMATCH_FLAGGED';
  evalState: 'MATCH' | 'MISMATCH' | 'UNKNOWN';
  matchedReferenceValue?: string | null;
  matchScore?: number | null;
  ocrConfidence: number;
  explanation: string;
  formularyVersion: string;
  evaluatedAt: string;
}

export interface UploadedDocumentItem {
  id: string;
  visitId: string;
  documentType: DocumentType;
  fileName: string;
  ocrStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  overallStatus: 'PENDING_VALIDATION' | 'FULLY_VERIFIED' | 'NEEDS_PHYSICIAN_REVIEW' | 'PARTIALLY_VERIFIED' | 'EXTRACTION_FAILED';
  uploadedAt: string;
  rawFieldsCount?: number;
  validatedFieldsCount?: number;
  fields?: ValidatedFieldItem[];
}

export interface DocumentUploadResponse {
  document: UploadedDocumentItem;
  ocrResult: {
    success: boolean;
    fieldsExtracted: number;
    errorMessage?: string;
  };
  validationSummary?: {
    overallStatus: string;
    verifiedCount: number;
    unverifiedCount: number;
    unreadableCount: number;
    mismatchFlaggedCount: number;
    structuredExplanation: {
      summaryText: string;
      verifiedSummary: string[];
      flaggedSummary: string[];
      unverifiedSummary: string[];
      unreadableSummary: string[];
    };
  } | null;
}
