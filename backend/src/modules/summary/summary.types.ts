// Module 5 — AI Clinical Summarization Engine Types

export const SummarySections = {
  CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
  HISTORY_OF_PRESENT_ILLNESS: 'HISTORY_OF_PRESENT_ILLNESS',
  PAST_MEDICAL_HISTORY: 'PAST_MEDICAL_HISTORY',
  MEDICATIONS_AND_ALLERGIES: 'MEDICATIONS_AND_ALLERGIES',
  FAMILY_AND_PERSONAL_HISTORY: 'FAMILY_AND_PERSONAL_HISTORY',
  REVIEW_OF_SYSTEMS: 'REVIEW_OF_SYSTEMS',
  PRIOR_INVESTIGATIONS: 'PRIOR_INVESTIGATIONS',
} as const;

export type SummarySectionType = (typeof SummarySections)[keyof typeof SummarySections];

export const SummaryItemStatuses = {
  ANSWERED: 'ANSWERED',
  SKIPPED: 'SKIPPED',
  DECLINED: 'DECLINED',
  NOT_ANSWERED: 'NOT_ANSWERED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  UNREADABLE: 'UNREADABLE',
  MISMATCH_FLAGGED: 'MISMATCH_FLAGGED',
} as const;

export type SummaryItemStatus = (typeof SummaryItemStatuses)[keyof typeof SummaryItemStatuses];

export const StatementOrigins = {
  MODEL: 'MODEL',
  CODE_TEMPLATE: 'CODE_TEMPLATE',
  PATIENT_QUOTE: 'PATIENT_QUOTE',
} as const;

export type StatementOrigin = (typeof StatementOrigins)[keyof typeof StatementOrigins];

export const GenerationModes = {
  LLM: 'LLM',
  TEMPLATE_FALLBACK: 'TEMPLATE_FALLBACK',
} as const;

export type GenerationMode = (typeof GenerationModes)[keyof typeof GenerationModes];

export const SummaryStatuses = {
  DRAFT_GENERATED: 'DRAFT_GENERATED',
  PENDING_DOCTOR_REVIEW: 'PENDING_DOCTOR_REVIEW',
  STALE: 'STALE',
  FAILED: 'FAILED',
} as const;

export type SummaryStatus = (typeof SummaryStatuses)[keyof typeof SummaryStatuses];

export const SummaryPromptStatuses = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type SummaryPromptStatus = (typeof SummaryPromptStatuses)[keyof typeof SummaryPromptStatuses];

export const SummaryJobStatuses = {
  PENDING: 'PENDING',
  GENERATING: 'GENERATING',
  READY: 'READY',
  FAILED: 'FAILED',
  STALE: 'STALE',
} as const;

export type SummaryJobStatus = (typeof SummaryJobStatuses)[keyof typeof SummaryJobStatuses];

export interface SummaryInputItem {
  itemId: string; // e.g. "itm_001"
  section: SummarySectionType;
  label: string;
  value: string;
  sourceType: 'INTERVIEW' | 'DOCUMENT';
  sourceRef: string; // e.g. "q_chest_pain" or "doc_3_field_2"
  status: SummaryItemStatus;
  isCritical: boolean;
  rawText?: string;
  itemKey?: string; // standardized semantic key for conflict detection (e.g., 'allergy_penicillin')
  metadata?: Record<string, unknown>;
}

export interface DetectedConflict {
  itemKey: string;
  section: SummarySectionType;
  interviewItem?: SummaryInputItem;
  documentItem?: SummaryInputItem;
  conflictMessage: string;
}

export interface AssembledSummaryInput {
  visitId: string;
  patientAge?: number;
  patientGender?: string;
  preferredLanguage?: string;
  inputHash: string;
  items: SummaryInputItem[];
  conflicts: DetectedConflict[];
  formularyVersionRefs: string[];
  assembledAt: string;
}

export interface ModelStructuredStatement {
  text: string;
  source_item_ids: string[];
}

export interface ModelStructuredSection {
  section: SummarySectionType;
  statements: ModelStructuredStatement[];
}

export interface ModelStructuredOutput {
  sections: ModelStructuredSection[];
}

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
  unsupportedClaimsCount: number;
  diagnosisClaimsCount: number;
  uncertainAsFactCount: number;
  absenceAsNegativeCount: number;
  conflictSilentResolutionCount: number;
  validatedAt: string;
}

export interface StatementSourceDto {
  id?: string;
  sourceType: string;
  sourceRef: string;
  sourceItemId?: string | null;
}

export interface SummaryStatementDto {
  id?: string;
  text: string;
  origin: StatementOrigin;
  order: number;
  sources: StatementSourceDto[];
}

export interface SummarySectionDto {
  id?: string;
  section: SummarySectionType;
  order: number;
  statements: SummaryStatementDto[];
}

export interface ClinicalSummaryDto {
  id: string;
  visitId: string;
  patientId?: string | null;
  version: number;
  status: SummaryStatus;
  generationMode: GenerationMode;
  modelId?: string | null;
  modelVersion?: string | null;
  promptTemplateVersion?: string | null;
  inputHash: string;
  formularyVersionRefs: string[];
  validationOutcome?: ValidationOutcome | null;
  generatedAt: Date | string;
  supersededBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  safetyLabel: string;
  sections: SummarySectionDto[];
}

export interface SummaryPromptTemplateDto {
  id: string;
  version: string;
  status: SummaryPromptStatus;
  systemPrompt: string;
  outputSchemaVersion: string;
  createdBy?: string | null;
  reviewedBy?: string | null;
  activatedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EvaluationMetrics {
  unsupportedClaimsCount: number;
  diagnosisClaimsCount: number;
  uncertainAsFactCount: number;
  absenceAsNegativeCount: number;
  conflictSilentResolutionCount: number;
}

export interface EvaluationCaseResult {
  caseId: string;
  name: string;
  passed: boolean;
  errors: string[];
  metrics: EvaluationMetrics;
}

export interface EvaluationRunDto {
  id: string;
  promptTemplateId?: string | null;
  promptVersion: string;
  modelId: string;
  passed: boolean;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  metrics: EvaluationMetrics;
  executedAt: Date | string;
  executedBy?: string | null;
  caseResults?: EvaluationCaseResult[];
}
