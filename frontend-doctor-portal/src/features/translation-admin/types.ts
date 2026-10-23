export type ContentLifecycleStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RETIRED';

export type UiStatus = 'READY' | 'PARTIAL' | 'DISABLED';
export type VoiceStatus = 'SUPPORTED' | 'UNTESTED' | 'UNSUPPORTED';

export interface SupportedLanguage {
  id: string;
  code: string;
  displayName: string;
  textDirection: 'ltr' | 'rtl';
  uiStatus: UiStatus;
  voiceInputStatus: VoiceStatus;
  voiceOutputStatus: VoiceStatus;
  enabled: boolean;
}

export interface QuestionTranslation {
  id: string;
  questionCode: string;
  language: string;
  templateVersion: string;
  promptText: string;
  audioPromptUrl?: string;
  helpText?: string;
  version: number;
  status: ContentLifecycleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptionTranslation {
  id: string;
  optionCode: string;
  language: string;
  label: string;
  spokenSynonyms: string[];
  version: number;
  status: ContentLifecycleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationReview {
  id: string;
  itemRef: string;
  language: string;
  reviewerId: string;
  reviewedAt: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}

export interface TranslationCoverageReport {
  language: string;
  templateVersion: string;
  totalQuestions: number;
  approvedQuestions: number;
  questionCoveragePct: number;
  totalOptions: number;
  approvedOptions: number;
  optionCoveragePct: number;
  uiStringsApproved: boolean;
  isKioskReady: boolean;
  missingQuestionCodes: string[];
  missingOptionCodes: string[];
}

export interface KioskHelpArticle {
  id: string;
  topic: string;
  language: string;
  title: string;
  body: string;
  audioUrl?: string;
  status: ContentLifecycleStatus;
  version: number;
  createdBy: string;
}
