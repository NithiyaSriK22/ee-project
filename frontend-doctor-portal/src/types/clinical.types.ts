export type ClinicalFieldStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNREADABLE';

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
  validationCheckApplied?: string;
  status: ClinicalFieldStatus;
  extractedAt: string;
}

export interface PatientQueueItem {
  id: string;
  hospitalNumber: string;
  patientName: string;
  age: number;
  gender: string;
  triagePriority: 'NORMAL' | 'URGENT' | 'EMERGENCY_RED_FLAG';
  interviewCompletedAt: string;
  reviewStatus: ReviewStatus;
}
