// Module 7 — Doctor Review & Summary Dashboard Frontend Types

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

export interface VisitQueueEntryDTO {
  id: string;
  visitId: string;
  department: string;
  assignedDoctorId: string | null;
  queueStatus: QueueStatus;
  hasOpenAlert: boolean;
  readyAt: string | null;
  patientTokenOrName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  createdAt: string;
  updatedAt: string;
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
  resolvedAt: string;
}

export interface StatementEditDTO {
  id?: string;
  reviewId: string;
  originalStatementId: string;
  editedText: string;
  previousTextRef?: string | null;
  doctorId: string;
  createdAt: string;
}

export interface DoctorAddedStatementDTO {
  id?: string;
  reviewId: string;
  section: string;
  text: string;
  order: number;
  doctorId: string;
  createdAt: string;
}

export interface ReviewClaimDTO {
  id: string;
  visitId: string;
  claimedByDoctorId: string;
  claimedByDoctorName?: string | null;
  claimedAt: string;
  expiresAt: string;
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
  createdAt?: string;
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
  confirmedAt: string;
  attestationVersion: string;
  attestationText?: string | null;
  supersedesId?: string | null;
  amendmentReason?: string | null;
  statements: ConfirmedStatementDTO[];
  createdAt: string;
}

export interface WorkspaceVisitHeader {
  visitId: string;
  patientRegistrationNumber: string;
  patientAge?: number | null;
  patientGender?: string | null;
  preferredLanguage?: string | null;
  isCompanionAssisted: boolean;
  companionName?: string | null;
  companionRelationship?: string | null;
  department: string;
}

export interface WorkspaceAlertItem {
  id: string;
  severityTier: string;
  status: string;
  kioskLocation: string;
  ruleCode?: string | null;
  raisedAt: string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
}

export interface WorkspaceStatementItem {
  id: string;
  section: string;
  text: string;
  origin: string; // MODEL, CODE_TEMPLATE, PATIENT_QUOTE, DOCTOR_EDITED, DOCTOR_ADDED
  originalDraftText?: string | null;
  order: number;
  sources: Array<{
    sourceType: string;
    sourceRef: string;
    sourceItemId?: string | null;
  }>;
  isEdited: boolean;
  isDoctorAdded: boolean;
  isRemoved: boolean;
}

export interface WorkspaceSectionItem {
  section: string;
  order: number;
  statements: WorkspaceStatementItem[];
}

export interface WorkspaceSummaryPayload {
  id: string;
  version: number;
  status: string;
  generationMode: string; // LLM, TEMPLATE_FALLBACK
  modelId?: string | null;
  modelVersion?: string | null;
  isStale: boolean;
  newerVersionAvailable?: number | null;
  sections: WorkspaceSectionItem[];
}

export interface ReviewWorkspaceDTO {
  visitHeader: WorkspaceVisitHeader;
  alerts: WorkspaceAlertItem[];
  alertDisclaimer: string;
  summary: WorkspaceSummaryPayload | null;
  mustResolveItems: MustResolveItem[];
  unresolvedCount: number;
  passiveFlags: PassiveFlag[];
  reviewState: {
    reviewId: string | null;
    status: DoctorReviewStatus;
    baseSummaryVersion: number;
    resolutions: ReviewItemResolutionDTO[];
    statementEdits: StatementEditDTO[];
    doctorAddedStatements: DoctorAddedStatementDTO[];
    claim: ReviewClaimDTO | null;
  };
  policyVersion: string;
  attestation: {
    version: string;
    text: string;
  };
  rawViewAvailable: boolean;
}

export interface RawViewDTO {
  visitHeader: WorkspaceVisitHeader;
  alerts: WorkspaceAlertItem[];
  interviewAnswersBySection: Record<
    string,
    Array<{
      id: string;
      promptText: string;
      answerValue: any;
      answeredVia: string;
      languageUsed?: string;
      isCritical: boolean;
      isSkipped: boolean;
    }>
  >;
  validatedDocumentFields: Array<{
    id: string;
    documentId: string;
    documentType: string;
    fileName: string;
    fieldType: string;
    result: string;
    isCritical: boolean;
    matchedReferenceValue?: string | null;
    ocrConfidence: number;
    explanation?: string;
  }>;
}

export interface StatementSourceDetail {
  statementId: string;
  sources: Array<{
    sourceType: 'INTERVIEW' | 'DOCUMENT';
    sourceRef: string;
    interviewDetails?: {
      questionPrompt: string;
      answerValue: any;
      answeredVia: string;
      languageUsed?: string;
    };
    documentDetails?: {
      documentId: string;
      fileName: string;
      snippetRef?: string;
      rawExtractedValue?: string;
      matchedReferenceValue?: string;
      ocrConfidence?: number;
      verificationState?: string;
    };
  }>;
}
