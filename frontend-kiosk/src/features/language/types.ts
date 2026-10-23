export interface SupportedLanguage {
  id: string;
  code: string;
  displayName: string;
  textDirection: 'ltr' | 'rtl';
  uiStatus: 'READY' | 'PARTIAL' | 'DISABLED';
  voiceInputStatus: 'SUPPORTED' | 'UNTESTED' | 'UNSUPPORTED';
  voiceOutputStatus: 'SUPPORTED' | 'UNTESTED' | 'UNSUPPORTED';
  enabled: boolean;
}

export type AccessibilityMode =
  | 'STANDARD'
  | 'HIGH_CONTRAST_LARGE'
  | 'VOICE_FIRST'
  | 'TOUCH_CAPTIONS'
  | 'SIMPLIFIED'
  | 'SLOWER_PACE';

export interface KioskContentBundle {
  language: string;
  templateVersion: string;
  uiStrings: Record<string, string>;
  questionTranslations: Record<string, { promptText: string; promptAudioHint?: string; isCritical: boolean }>;
  optionTranslations: Record<string, { label: string; spokenSynonyms: string[] }>;
  questionHelpTexts: Record<string, string>;
  helpArticles: Array<{ topic: string; title: string; body: string }>;
  versionHash: string;
}
