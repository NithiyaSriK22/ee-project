import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SupportedLanguage, AccessibilityMode, KioskContentBundle } from './types';
import { apiClient } from '../../lib/api-client';
import { translations, AppTranslations } from './translations';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  availableLanguages: SupportedLanguage[];
  bundle: KioskContentBundle | null;
  locale: AppTranslations;
  l: (enText: string, taText: string) => string;
  t: (key: string, fallback?: string) => string;
  getQuestionPrompt: (questionCode?: string, defaultText?: string) => string;
  getQuestionHint: (questionCode?: string, defaultHint?: string) => string;
  getOptionLabel: (optionCode?: string, defaultLabel?: string) => string;
  accessibilityMode: AccessibilityMode;
  setAccessibilityMode: (mode: AccessibilityMode) => void;
  isHighContrast: boolean;
  isLargeText: boolean;
  isCaptionsMode: boolean;
  isVoiceFirst: boolean;
  isSimplified: boolean;
  isSlowerPace: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const DEFAULT_LANGUAGES: SupportedLanguage[] = [
  {
    id: 'lang-en',
    code: 'en',
    displayName: 'English',
    textDirection: 'ltr',
    uiStatus: 'READY',
    voiceInputStatus: 'SUPPORTED',
    voiceOutputStatus: 'SUPPORTED',
    enabled: true,
  },
  {
    id: 'lang-ta',
    code: 'ta',
    displayName: 'தமிழ்',
    textDirection: 'ltr',
    uiStatus: 'READY',
    voiceInputStatus: 'SUPPORTED',
    voiceOutputStatus: 'SUPPORTED',
    enabled: true,
  },
  {
    id: 'lang-hi',
    code: 'hi',
    displayName: 'हिन्दी',
    textDirection: 'ltr',
    uiStatus: 'PARTIAL',
    voiceInputStatus: 'SUPPORTED',
    voiceOutputStatus: 'SUPPORTED',
    enabled: true,
  },
];

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Safe fallback
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Safe fallback
    }
  },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    return safeStorage.getItem('medikiosk_lang') || 'en';
  });

  const [availableLanguages, setAvailableLanguages] = useState<SupportedLanguage[]>(DEFAULT_LANGUAGES);
  const [bundle, setBundle] = useState<KioskContentBundle | null>(null);
  const [accessibilityMode, setAccessibilityModeState] = useState<AccessibilityMode>(() => {
    return (safeStorage.getItem('medikiosk_a11y') as AccessibilityMode) || 'STANDARD';
  });

  // 1. Fetch available kiosk languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: SupportedLanguage[] }>('/kiosk/languages');
        if (res.data && res.data.data && res.data.data.length > 0) {
          setAvailableLanguages(res.data.data);
        }
      } catch {
        // Offline fallback
        setAvailableLanguages(DEFAULT_LANGUAGES);
      }
    };
    fetchLanguages();
  }, []);

  // 2. Fetch approved content bundle when language changes
  useEffect(() => {
    const fetchBundle = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: KioskContentBundle }>(
          `/kiosk/content/bundle?lang=${currentLanguage}`
        );
        if (res.data && res.data.data) {
          setBundle(res.data.data);
          // Cache locally for offline resilience
          safeStorage.setItem(`bundle_${currentLanguage}`, JSON.stringify(res.data.data));
        }
      } catch {
        // Fallback to cached bundle
        const cached = safeStorage.getItem(`bundle_${currentLanguage}`);
        if (cached) {
          try {
            setBundle(JSON.parse(cached));
          } catch {
            setBundle(null);
          }
        }
      }
    };
    fetchBundle();
  }, [currentLanguage]);

  // Set Language with persistence
  const setLanguage = useCallback((lang: string) => {
    setCurrentLanguageState(lang);
    safeStorage.setItem('medikiosk_lang', lang);
  }, []);

  // Set Accessibility Mode with DOM class reflection
  const setAccessibilityMode = useCallback((mode: AccessibilityMode) => {
    setAccessibilityModeState(mode);
    safeStorage.setItem('medikiosk_a11y', mode);

    const root = document.documentElement;
    root.classList.remove('high-contrast', 'text-lg', 'text-xl', 'slower-pace', 'simplified-ui');

    if (mode === 'HIGH_CONTRAST_LARGE') {
      root.classList.add('high-contrast', 'text-xl');
    } else if (mode === 'SLOWER_PACE') {
      root.classList.add('slower-pace');
    } else if (mode === 'SIMPLIFIED') {
      root.classList.add('simplified-ui');
    }
  }, []);

  // Active Locale dictionary
  const currentLangKey = (currentLanguage === 'ta' ? 'ta' : 'en') as 'en' | 'ta';
  const locale = translations[currentLangKey] || translations.en;

  // Bilingual direct text selector: strictly returns English or Tamil without slashes
  const l = useCallback(
    (enText: string, taText: string): string => {
      return currentLanguage === 'ta' ? taText : enText;
    },
    [currentLanguage]
  );

  // Translate UI string key
  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (bundle && bundle.uiStrings && bundle.uiStrings[key]) {
        return bundle.uiStrings[key];
      }
      if (key in locale) {
        return (locale as any)[key];
      }
      return fallback || key;
    },
    [bundle, locale]
  );

  // Get question prompt in patient's language
  const getQuestionPrompt = useCallback(
    (questionCode?: string, defaultText?: string): string => {
      if (questionCode && bundle && bundle.questionTranslations && bundle.questionTranslations[questionCode]) {
        return bundle.questionTranslations[questionCode].promptText;
      }
      return defaultText || '';
    },
    [bundle]
  );

  // Get audio hint in patient's language
  const getQuestionHint = useCallback(
    (questionCode?: string, defaultHint?: string): string => {
      if (
        questionCode &&
        bundle &&
        bundle.questionTranslations &&
        bundle.questionTranslations[questionCode] &&
        bundle.questionTranslations[questionCode].promptAudioHint
      ) {
        return bundle.questionTranslations[questionCode].promptAudioHint;
      }
      return defaultHint || '';
    },
    [bundle]
  );

  // Get option label in patient's language
  const getOptionLabel = useCallback(
    (optionCode?: string, defaultLabel?: string): string => {
      if (optionCode && bundle && bundle.optionTranslations && bundle.optionTranslations[optionCode]) {
        return bundle.optionTranslations[optionCode].label;
      }
      return defaultLabel || optionCode || '';
    },
    [bundle]
  );

  const isHighContrast = accessibilityMode === 'HIGH_CONTRAST_LARGE';
  const isLargeText = accessibilityMode === 'HIGH_CONTRAST_LARGE';
  const isCaptionsMode = accessibilityMode === 'TOUCH_CAPTIONS';
  const isVoiceFirst = accessibilityMode === 'VOICE_FIRST';
  const isSimplified = accessibilityMode === 'SIMPLIFIED';
  const isSlowerPace = accessibilityMode === 'SLOWER_PACE';

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        availableLanguages,
        bundle,
        locale,
        l,
        t,
        getQuestionPrompt,
        getQuestionHint,
        getOptionLabel,
        accessibilityMode,
        setAccessibilityMode,
        isHighContrast,
        isLargeText,
        isCaptionsMode,
        isVoiceFirst,
        isSimplified,
        isSlowerPace,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
