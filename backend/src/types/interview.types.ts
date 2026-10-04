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
} as const;

export type AnsweredViaType = (typeof AnsweredVia)[keyof typeof AnsweredVia];

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
}
