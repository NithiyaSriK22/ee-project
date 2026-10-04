export const InterviewSections = {
  CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
  PRESENT_ILLNESS_HISTORY: 'PRESENT_ILLNESS_HISTORY',
  PAST_MEDICAL_HISTORY: 'PAST_MEDICAL_HISTORY',
  MEDICATIONS: 'MEDICATIONS',
  ALLERGIES: 'ALLERGIES',
  LIFESTYLE: 'LIFESTYLE',
  FAMILY_HISTORY: 'FAMILY_HISTORY',
} as const;

export type InterviewSection = (typeof InterviewSections)[keyof typeof InterviewSections];

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

export interface AdminQuestion {
  id: string;
  template_id: string;
  section: InterviewSection;
  prompt_text: string;
  prompt_audio_hint?: string | null;
  question_type: QuestionType;
  answer_options?: any;
  is_critical: boolean;
  is_required: boolean;
  order: number;
  branching_logic?: any;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminTemplate {
  id: string;
  name: string;
  description?: string | null;
  applicable_visit_type: string;
  status: TemplateStatusType;
  version: string;
  language_variants_ready: boolean;
  change_summary?: string | null;
  created_by?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  questions: AdminQuestion[];
}
