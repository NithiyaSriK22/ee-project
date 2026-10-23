export const InterviewSections = {
  CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
  PRESENT_ILLNESS_HISTORY: 'PRESENT_ILLNESS_HISTORY',
  PAST_MEDICAL_HISTORY: 'PAST_MEDICAL_HISTORY',
  MEDICATIONS: 'MEDICATIONS',
  ALLERGIES: 'ALLERGIES',
  LIFESTYLE: 'LIFESTYLE',
  FAMILY_HISTORY: 'FAMILY_HISTORY',
} as const;

export type InterviewSectionType = (typeof InterviewSections)[keyof typeof InterviewSections];

export const QuestionTypes = {
  YES_NO: 'YES_NO',
  YES_NO_WITH_DETAIL: 'YES_NO_WITH_DETAIL',
  FREE_TEXT: 'FREE_TEXT',
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTI_CHOICE: 'MULTI_CHOICE',
  NUMERIC: 'NUMERIC',
  DATE: 'DATE',
  DURATION: 'DURATION',
} as const;

export type QuestionType = (typeof QuestionTypes)[keyof typeof QuestionTypes];

export const TemplateStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  PUBLISHED: 'PUBLISHED',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type TemplateStatusType = (typeof TemplateStatus)[keyof typeof TemplateStatus];

export const InterviewSessionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;

export type InterviewSessionStatusType =
  (typeof InterviewSessionStatus)[keyof typeof InterviewSessionStatus];

export const AnsweredVia = {
  VOICE: 'voice',
  TOUCH: 'touch',
  STAFF_ASSISTED: 'staff_assisted',
  COMPANION_ASSISTED: 'companion_assisted',
  GUARDIAN: 'guardian',
  SURROGATE: 'surrogate',
  PATIENT: 'patient',
} as const;

export type AnsweredViaType = (typeof AnsweredVia)[keyof typeof AnsweredVia];

export const SensitivityLevels = {
  NORMAL: 'NORMAL',
  SENSITIVE: 'SENSITIVE',
  HIGHLY_SENSITIVE: 'HIGHLY_SENSITIVE',
} as const;

export type SensitivityLevel = (typeof SensitivityLevels)[keyof typeof SensitivityLevels];

export const VisibilityScopes = {
  STAFF_VISIBLE: 'STAFF_VISIBLE',
  CLINICAL_STAFF: 'CLINICAL_STAFF',
  DOCTOR_ONLY: 'DOCTOR_ONLY',
} as const;

export type VisibilityScope = (typeof VisibilityScopes)[keyof typeof VisibilityScopes];

export const SurrogateReasons = {
  PATIENT_UNWELL: 'PATIENT_UNWELL',
  COGNITIVE_IMPAIRMENT: 'COGNITIVE_IMPAIRMENT',
  PHYSICAL_DISABILITY: 'PHYSICAL_DISABILITY',
  LANGUAGE_BARRIER: 'LANGUAGE_BARRIER',
  REFUSED_DEVICE: 'REFUSED_DEVICE',
  OTHER: 'OTHER',
} as const;

export type SurrogateReason = (typeof SurrogateReasons)[keyof typeof SurrogateReasons];

export const GuardianRelationships = {
  PARENT: 'PARENT',
  LEGAL_GUARDIAN: 'LEGAL_GUARDIAN',
  SIBLING: 'SIBLING',
  SPOUSE: 'SPOUSE',
  OTHER: 'OTHER',
} as const;

export type GuardianRelationship = (typeof GuardianRelationships)[keyof typeof GuardianRelationships];

export const AnswerStatus = {
  ANSWERED: 'ANSWERED',
  SKIPPED: 'SKIPPED',
  DEFERRED_TO_DOCTOR: 'DEFERRED_TO_DOCTOR',
} as const;

export type AnswerStatusType = (typeof AnswerStatus)[keyof typeof AnswerStatus];

export interface QuestionGatingMetadata {
  sensitivityLevel?: SensitivityLevel;
  visibilityScope?: VisibilityScope;
  ageMin?: number;
  ageMax?: number;
  sexApplicability?: 'ALL' | 'MALE' | 'FEMALE' | 'INTERSEX' | 'OTHER';
  pregnancyGated?: boolean;
  audioAllowedInPublic?: boolean;
  aiSummarizationAllowed?: boolean;
  carryForwardAllowed?: boolean;
}

export interface GuardianDetails {
  guardianName: string;
  guardianRelationship: GuardianRelationship | string;
  guardianPhone?: string;
  guardianConsentVerified: boolean;
  minorAssentObtained?: boolean;
  verifiedAt: Date | string;
}

export interface SurrogateDetails {
  surrogateName: string;
  surrogateRelationship: string;
  surrogatePhone?: string;
  reason: SurrogateReason;
  acuteDistressNoted?: boolean;
  verifiedAt: Date | string;
}

export interface BranchingRule {
  trigger_condition: {
    answer?: string | number | boolean | string[];
    operator?: 'EQUALS' | 'CONTAINS' | 'NOT_EQUALS' | 'GREATER_THAN';
  };
  next_question_id: string;
}

export interface QuestionAnswerOption {
  label: string;
  value: string;
  subPrompt?: string;
}

export interface StructuredAnswerValue {
  value: string | number | boolean | string[];
  detail?: string;
  unit?: string;
  status?: AnswerStatusType;
  deferralReason?: string;
}

