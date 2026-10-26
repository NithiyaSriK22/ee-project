export const DocumentTypes = {
  PRESCRIPTION: 'PRESCRIPTION',
  CLINICAL_NOTES: 'CLINICAL_NOTES',
  LAB_REPORT: 'LAB_REPORT',
  ULTRASOUND: 'ULTRASOUND',
  XRAY_CT_MRI: 'XRAY_CT_MRI',
  OTHER: 'OTHER',
} as const;

export type DocumentType = (typeof DocumentTypes)[keyof typeof DocumentTypes];

export const DocumentTypeLabels: Record<
  DocumentType,
  { label: string; description: string; icon: string; isImaging?: boolean; requiresScanMeta?: boolean }
> = {
  PRESCRIPTION: {
    label: 'Prescription',
    description: 'Doctor prescription slips, Rx notes, and medication lists',
    icon: 'FileText',
    isImaging: false,
    requiresScanMeta: false,
  },
  CLINICAL_NOTES: {
    label: 'Clinical Notes / Medical Records',
    description: 'Doctor consultation notes, discharge summaries, or clinical history',
    icon: 'Clipboard',
    isImaging: false,
    requiresScanMeta: false,
  },
  LAB_REPORT: {
    label: 'Laboratory Report',
    description: 'Blood tests, pathology, biochemistry, or urine test reports',
    icon: 'Activity',
    isImaging: false,
    requiresScanMeta: true,
  },
  ULTRASOUND: {
    label: 'Ultrasound / Scan Images',
    description: 'Sonography, abdominal scans, obstetric scans, or doppler studies',
    icon: 'Image',
    isImaging: true,
    requiresScanMeta: true,
  },
  XRAY_CT_MRI: {
    label: 'X-ray / CT / MRI Images',
    description: 'Radiology films, chest X-rays, CT scans, and MRI slice images',
    icon: 'Film',
    isImaging: true,
    requiresScanMeta: true,
  },
  OTHER: {
    label: 'Other Medical Document',
    description: 'Vaccination certificates, health cards, or other healthcare records',
    icon: 'Files',
    isImaging: false,
    requiresScanMeta: false,
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
  summary?: any;
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
