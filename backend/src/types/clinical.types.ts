// MediKiosk - Foundation Clinical Types (Source of truth for Discriminated Unions)

export type ClinicalFieldStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNREADABLE';

export type UserRole =
  | 'PATIENT'
  | 'COMPANION'
  | 'STAFF_ATTENDANT'
  | 'DOCTOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type ReviewStatus =
  | 'DRAFT_GENERATED'
  | 'PENDING_DOCTOR_REVIEW'
  | 'DOCTOR_CONFIRMED'
  | 'DOCTOR_REJECTED_REGENERATED';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FieldProvenance {
  sourceType: 'INTERVIEW_ANSWER' | 'DOCUMENT_SNIPPET' | 'DOCTOR_EDIT';
  sourceReference: string;
  confidenceScore: number;
  validationCheckApplied?: 'FORMULARY_MATCH' | 'DOSAGE_PATTERN_MATCH' | 'DATE_FORMAT_MATCH' | 'OCR_CONFIDENCE_THRESHOLD';
  status: ClinicalFieldStatus;
  extractedAt: string;
}
