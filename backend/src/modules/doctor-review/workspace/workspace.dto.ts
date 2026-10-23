import {
  MustResolveItem,
  PassiveFlag,
  ReviewItemResolutionDTO,
  StatementEditDTO,
  DoctorAddedStatementDTO,
  DoctorReviewStatus,
  ReviewClaimDTO,
} from '../doctor-review.types.js';

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
  raisedAt: Date | string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | string | null;
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
  providerId?: string | null;
  isMock?: boolean;
  safetyLabel?: string | null;
  modelId?: string | null;
  modelVersion?: string | null;
  isStale: boolean;
  newerVersionAvailable?: number | null;
  sections: WorkspaceSectionItem[];
}

export interface ConfidentialSensitiveResponseItem {
  id: string;
  questionId: string;
  section: string;
  promptText: string;
  answerValue: any;
  verbatimDisplay: string;
  provenance: string;
  isDeferredToDoctor: boolean;
  sensitivityLevel: string;
  visibilityScope: string;
}

export interface ReviewWorkspaceDTO {
  visitHeader: WorkspaceVisitHeader;
  alerts: WorkspaceAlertItem[];
  alertDisclaimer: string;
  summary: WorkspaceSummaryPayload | null;
  mustResolveItems: MustResolveItem[];
  unresolvedCount: number;
  passiveFlags: PassiveFlag[];
  confidentialSensitiveResponses?: ConfidentialSensitiveResponseItem[];
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
  timelineAvailable?: boolean;
  failedDocuments?: Array<{
    id: string;
    fileName: string;
    documentType: string;
    ocrStatus: string;
    ocrErrorMessage?: string | null;
    uploadedAt: string;
    missingFields?: string[];
    extractedTextSnippet?: string | null;
    confidence?: number;
    unverifiedNotice?: string;
  }>;
  longitudinalDiff?: {
    hasPriorVisit: boolean;
    priorVisitDate: string | null;
    totalChanges: number;
  };
}


export interface RawViewDTO {
  visitHeader: WorkspaceVisitHeader;
  alerts: WorkspaceAlertItem[];
  confidentialSensitiveResponses?: ConfidentialSensitiveResponseItem[];
  interviewAnswersBySection: Record<string, Array<{
    id: string;
    promptText: string;
    answerValue: any;
    answeredVia: string;
    languageUsed?: string;
    isCritical: boolean;
    isSkipped: boolean;
    provenance?: string;
    isDeferredToDoctor?: boolean;
  }>>;
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

