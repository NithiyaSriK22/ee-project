// Module 7 — Doctor Review & Summary Dashboard Types

export const QueueStatuses = {
  WAITING: 'WAITING',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  IN_CONSULTATION: 'IN_CONSULTATION',
  COMPLETED: 'COMPLETED',
} as const;
export type QueueStatus = (typeof QueueStatuses)[keyof typeof QueueStatuses];

export const DoctorReviewStatuses = {
  IN_REVIEW: 'IN_REVIEW',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  AMENDED: 'AMENDED',
} as const;
export type DoctorReviewStatus = (typeof DoctorReviewStatuses)[keyof typeof DoctorReviewStatuses];

export const ResolutionTypes = {
  VERIFIED_AGAINST_SOURCE: 'VERIFIED_AGAINST_SOURCE',
  CORRECTED: 'CORRECTED',
  MARKED_NOT_AVAILABLE: 'MARKED_NOT_AVAILABLE',
  DEFER_TO_CONSULTATION: 'DEFER_TO_CONSULTATION',
} as const;
export type ResolutionType = (typeof ResolutionTypes)[keyof typeof ResolutionTypes];

export const ConfirmedOrigins = {
  AI_CONFIRMED_UNCHANGED: 'AI_CONFIRMED_UNCHANGED',
  DOCTOR_EDITED: 'DOCTOR_EDITED',
  DOCTOR_ADDED: 'DOCTOR_ADDED',
  CODE_PLACEHOLDER_RESOLVED: 'CODE_PLACEHOLDER_RESOLVED',
  TO_CLARIFY: 'TO_CLARIFY',
} as const;
export type ConfirmedOrigin = (typeof ConfirmedOrigins)[keyof typeof ConfirmedOrigins];

export const RejectionReasons = {
  INACCURATE: 'INACCURATE',
  INCOMPLETE: 'INCOMPLETE',
  WRONG_PATIENT_DATA: 'WRONG_PATIENT_DATA',
  OTHER: 'OTHER',
} as const;
export type RejectionReason = (typeof RejectionReasons)[keyof typeof RejectionReasons];

export const MustResolveItemTypes = {
  DOCUMENT_FIELD: 'DOCUMENT_FIELD',
  INTERVIEW_ANSWER: 'INTERVIEW_ANSWER',
  CONFLICT_MARKER: 'CONFLICT_MARKER',
  ALERT: 'ALERT',
} as const;
export type MustResolveItemType = (typeof MustResolveItemTypes)[keyof typeof MustResolveItemTypes];

export const DoctorReviewAuditEvents = {
  QUEUE_VISIT_CLAIMED: 'QUEUE_VISIT_CLAIMED',
  QUEUE_VISIT_RELEASED: 'QUEUE_VISIT_RELEASED',
  SUMMARY_VIEWED: 'SUMMARY_VIEWED',
  RAW_VIEW_OPENED: 'RAW_VIEW_OPENED',
  SOURCE_OPENED: 'SOURCE_OPENED',
  REVIEW_STARTED: 'REVIEW_STARTED',
  ITEM_RESOLVED: 'ITEM_RESOLVED',
  STATEMENT_EDITED: 'STATEMENT_EDITED',
  STATEMENT_ADDED: 'STATEMENT_ADDED',
  STATEMENT_REMOVED: 'STATEMENT_REMOVED',
  SUMMARY_REJECTED: 'SUMMARY_REJECTED',
  REGENERATION_REQUESTED: 'REGENERATION_REQUESTED',
  SUMMARY_CONFIRMED: 'SUMMARY_CONFIRMED',
  RECORD_AMENDED: 'RECORD_AMENDED',
  OUT_OF_QUEUE_ACCESS: 'OUT_OF_QUEUE_ACCESS',
  REVIEW_TAKEN_OVER: 'REVIEW_TAKEN_OVER',
} as const;
export type DoctorReviewAuditEvent = (typeof DoctorReviewAuditEvents)[keyof typeof DoctorReviewAuditEvents];

export interface VisitQueueEntryDTO {
  id: string;
  visitId: string;
  department: string;
  assignedDoctorId: string | null;
  assignedDoctorName?: string | null;
  queueStatus: QueueStatus;
  hasOpenAlert: boolean;
  readyAt: Date | string | null;
  patientTokenOrName: string;
  patientName?: string | null;
  patientRegistrationNumber?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  chiefComplaint?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DashboardStatsDTO {
  patientsInQueue: {
    count: number;
    label: string;
    subtext: string;
    avgIntakeMinutes: number;
  };
  pendingReviews: {
    count: number;
    label: string;
    subtext: string;
    footer: string;
  };
  redFlagAlerts: {
    count: number;
    label: string;
    subtext: string;
    footer: string;
  };
  confirmedRecords: {
    count: number;
    label: string;
    subtext: string;
    footer: string;
  };
}

export interface MustResolveItem {
  itemRef: string;
  itemType: MustResolveItemType;
  title: string;
  description: string;
  sourceType: 'DOCUMENT' | 'INTERVIEW' | 'ALERT' | 'SUMMARY_CONFLICT';
  sourceRef: string;
  sourceSnippetRef?: string | null;
  rawExtractedValue?: string | null;
  matchedReferenceValue?: string | null;
  ocrConfidence?: number | null;
  verificationState?: string | null;
  sourceHash: string;
  isResolved: boolean;
  resolution?: ReviewItemResolutionDTO | null;
}

export interface PassiveFlag {
  itemRef: string;
  title: string;
  description: string;
  sourceType: 'DOCUMENT' | 'INTERVIEW';
  sourceRef: string;
  verificationState?: string;
}

export interface ReviewItemResolutionDTO {
  id?: string;
  reviewId: string;
  itemRef: string;
  itemType: MustResolveItemType;
  resolutionType: ResolutionType;
  correctedValue?: string | null;
  sourceHash?: string | null;
  viewedSource: boolean;
  doctorId: string;
  resolvedAt: Date | string;
}

export interface StatementEditDTO {
  id?: string;
  reviewId: string;
  originalStatementId: string;
  editedText: string;
  previousTextRef?: string | null;
  section?: string;
  doctorId: string;
  editedBy?: string;
  createdAt?: Date | string;
}

export interface DoctorAddedStatementDTO {
  id?: string;
  reviewId: string;
  section: string;
  text: string;
  order: number;
  doctorId: string;
  createdAt: Date | string;
}

export interface ReviewClaimDTO {
  id: string;
  visitId: string;
  claimedByDoctorId: string;
  claimedByDoctorName?: string | null;
  claimedAt: Date | string;
  expiresAt: Date | string;
}

export interface ConfirmedStatementDTO {
  id?: string;
  recordId?: string;
  section: string;
  text: string;
  origin: ConfirmedOrigin;
  order: number;
  aiStatementId?: string | null;
  resolutionType?: string | null;
  sourceRefs?: any;
  createdAt?: Date | string;
}

export interface ConfirmedRecordDTO {
  id: string;
  visitId: string;
  version: number;
  basedOnSummaryId?: string | null;
  summaryVersion: number;
  reviewPolicyVersion: string;
  confirmedByDoctorId: string;
  confirmedByDoctorName?: string | null;
  confirmedAt: Date | string;
  attestationVersion: string;
  attestationText?: string | null;
  supersedesId?: string | null;
  amendmentReason?: string | null;
  statements: ConfirmedStatementDTO[];
  createdAt: Date | string;
}

export interface ReviewPolicyConfig {
  version: string;
  name: string;
  isActive: boolean;
  gateOnCriticalUnverifiedDocumentFields: boolean;
  gateOnCriticalUnreadableDocumentFields: boolean;
  gateOnCriticalMismatchDocumentFields: boolean;
  gateOnCriticalDeclinedAnswers: boolean;
  gateOnConflictMarkers: boolean;
  gateOnUnacknowledgedOpenAlerts: boolean;
  attestationVersion: string;
  attestationText: string;
}
