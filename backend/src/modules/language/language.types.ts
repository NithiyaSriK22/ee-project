export const SupportedLanguageCodes = {
  ENGLISH: 'en',
  TAMIL: 'ta',
  HINDI: 'hi',
} as const;

export type SupportedLanguageCode =
  (typeof SupportedLanguageCodes)[keyof typeof SupportedLanguageCodes] | string;

export const UiStatuses = {
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  DISABLED: 'DISABLED',
} as const;

export type UiStatus = (typeof UiStatuses)[keyof typeof UiStatuses];

export const VoiceStatuses = {
  SUPPORTED: 'SUPPORTED',
  UNTESTED: 'UNTESTED',
  UNSUPPORTED: 'UNSUPPORTED',
} as const;

export type VoiceStatus = (typeof VoiceStatuses)[keyof typeof VoiceStatuses];

export const ContentStatuses = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  RETIRED: 'RETIRED',
} as const;

export type ContentStatus = (typeof ContentStatuses)[keyof typeof ContentStatuses];

export const ReviewDecisions = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_REVISION: 'NEEDS_REVISION',
} as const;

export type ReviewDecision = (typeof ReviewDecisions)[keyof typeof ReviewDecisions];

export interface SupportedLanguageDTO {
  id: string;
  code: string;
  displayName: string;
  textDirection: 'ltr' | 'rtl';
  uiStatus: UiStatus;
  voiceInputStatus: VoiceStatus;
  voiceOutputStatus: VoiceStatus;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UiStringBundleDTO {
  id: string;
  language: string;
  version: string;
  status: ContentStatus;
  strings: Record<string, string>;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTranslationDTO {
  id: string;
  questionCode: string;
  language: string;
  templateVersion: string;
  promptText: string;
  promptAudioHint?: string;
  status: ContentStatus;
  version: number;
  isCritical: boolean;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptionTranslationDTO {
  id: string;
  optionCode: string;
  questionCode?: string;
  language: string;
  label: string;
  spokenSynonyms: string[];
  status: ContentStatus;
  version: number;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionHelpTextDTO {
  id: string;
  questionCode: string;
  language: string;
  plainExplanation: string;
  status: ContentStatus;
  version: number;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KioskHelpArticleDTO {
  id: string;
  topic: string;
  language: string;
  title: string;
  body: string;
  status: ContentStatus;
  version: number;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationReviewDTO {
  id: string;
  itemRef: string;
  language: string;
  reviewerId: string;
  reviewerName?: string;
  reviewedAt: string;
  decision: ReviewDecision;
  note?: string;
  createdAt: string;
}

export interface TranslationCoverageDTO {
  language: string;
  templateVersion: string;
  totalQuestions: number;
  approvedQuestions: number;
  totalOptions: number;
  approvedOptions: number;
  uiStringsApproved: boolean;
  helpArticlesApproved: number;
  coveragePercentage: number;
  isKioskReady: boolean;
}

export interface KioskContentBundleDTO {
  language: string;
  templateVersion: string;
  uiStrings: Record<string, string>;
  questionTranslations: Record<string, { promptText: string; promptAudioHint?: string; isCritical: boolean }>;
  optionTranslations: Record<string, { label: string; spokenSynonyms: string[] }>;
  questionHelpTexts: Record<string, string>;
  helpArticles: Array<{ topic: string; title: string; body: string }>;
  audioManifest: Record<string, { audioUrl?: string; audioHintUrl?: string }>;
  versionHash: string;
}

export interface SyncAnswerItem {
  idempotencyKey: string;
  questionId: string;
  questionCode?: string;
  answerValue: any;
  answeredVia: string;
  languageUsed: string;
  isCritical?: boolean;
  isSkipped?: boolean;
  answeredAt: string;
}

export interface SyncAnswersBatchDTO {
  visitId: string;
  templateVersion: string;
  clientTimestamp: string;
  answers: SyncAnswerItem[];
}

export interface SyncResultDTO {
  success: boolean;
  processedCount: number;
  duplicateCount: number;
  syncReceiptId: string;
  syncedAt: string;
}
