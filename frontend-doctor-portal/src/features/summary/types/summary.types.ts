export type SummarySectionType =
  | 'CHIEF_COMPLAINT'
  | 'HISTORY_OF_PRESENT_ILLNESS'
  | 'PAST_MEDICAL_HISTORY'
  | 'MEDICATIONS_AND_ALLERGIES'
  | 'FAMILY_AND_PERSONAL_HISTORY'
  | 'REVIEW_OF_SYSTEMS'
  | 'PRIOR_INVESTIGATIONS';

export type StatementOrigin = 'MODEL' | 'CODE_TEMPLATE' | 'PATIENT_QUOTE';
export type GenerationMode = 'LLM' | 'TEMPLATE_FALLBACK';
export type SummaryStatus = 'DRAFT_GENERATED' | 'PENDING_DOCTOR_REVIEW' | 'STALE' | 'FAILED';

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
  generatedAt: string;
  supersededBy?: string | null;
  createdAt: string;
  updatedAt: string;
  safetyLabel: string;
  sections: SummarySectionDto[];
}
