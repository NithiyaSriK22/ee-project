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

export const SectionLabels: Record<InterviewSection, { title: string; subtitle: string; icon: string }> = {
  CHIEF_COMPLAINT: {
    title: 'Primary Symptoms & Concern',
    subtitle: 'Tell us the main reason for your hospital visit today',
    icon: 'Activity',
  },
  PRESENT_ILLNESS_HISTORY: {
    title: 'History of Current Illness',
    subtitle: 'Details about when and how symptoms developed',
    icon: 'Clock',
  },
  PAST_MEDICAL_HISTORY: {
    title: 'Past Medical History',
    subtitle: 'Known conditions, previous surgeries, or hospitalizations',
    icon: 'FileText',
  },
  MEDICATIONS: {
    title: 'Current Medications',
    subtitle: 'Prescribed medicines, tablets, or injections you are taking',
    icon: 'Pill',
  },
  ALLERGIES: {
    title: 'Allergies & Sensitivities',
    subtitle: 'Any reactions to medicines, foods, or substances',
    icon: 'AlertTriangle',
  },
  LIFESTYLE: {
    title: 'Lifestyle & Habits',
    subtitle: 'Daily routines, diet, smoking, or alcohol habits',
    icon: 'Heart',
  },
  FAMILY_HISTORY: {
    title: 'Family Medical History',
    subtitle: 'Health conditions running in your immediate family',
    icon: 'Users',
  },
};

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

export const AnsweredVia = {
  VOICE: 'voice',
  TOUCH: 'touch',
  STAFF_ASSISTED: 'staff_assisted',
  COMPANION_ASSISTED: 'companion_assisted',
} as const;

export type AnsweredViaType = (typeof AnsweredVia)[keyof typeof AnsweredVia];

export interface QuestionOption {
  label: string;
  value: string;
  code?: string;
  subPrompt?: string;
}

export interface InterviewQuestionItem {
  id: string;
  questionCode?: string;
  section: InterviewSection;
  promptText: string;
  promptAudioHint?: string;
  questionType: QuestionType;
  answerOptions?: Array<string | QuestionOption>;
  isCritical: boolean;
  isRequired: boolean;
  order: number;
  isAnswered?: boolean;
}

export interface InterviewAnswerItem {
  id: string;
  questionId: string;
  section?: InterviewSection;
  promptText?: string;
  answerValue: any;
  answeredVia: AnsweredViaType;
  languageUsed: string;
  isCritical: boolean;
  isSkipped: boolean;
  answeredAt: string;
}

export interface InterviewProgress {
  totalQuestions: number;
  answeredCount: number;
  currentQuestionIndex: number;
  percentage: number;
  completionPercentage?: number;
  isComplete: boolean;
}

export interface InterviewSessionState {
  session: {
    id: string;
    visitId: string;
    patientId: string;
    templateId: string;
    templateVersion: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    startedAt: string;
    completedAt?: string | null;
  };
  template: {
    id: string;
    name: string;
    description?: string;
    version: string;
    totalQuestions: number;
  };
  currentQuestion: InterviewQuestionItem | null;
  allQuestions: InterviewQuestionItem[];
  answers: InterviewAnswerItem[];
  progress: InterviewProgress;
}
