import { devFallbackLanguageStore } from '../dev-fallback-language-store.js';
import { CanonicalParser } from '../translations/canonical-parser.js';
import { ContentStatuses } from '../language.types.js';

export interface VoiceAnswerMappingRequest {
  transcript: string;
  confidence: number;
  questionCode: string;
  questionType: string;
  language: string;
  isCritical: boolean;
  permittedOptions?: Array<{ code: string; label: string; spokenSynonyms?: string[] }>;
}

export interface VoiceAnswerMappingResult {
  matchedOptionCode?: string;
  canonicalValue?: any;
  confirmedDisplayLabel?: string;
  requiresReadBackConfirmation: boolean;
  readBackPrompt?: string;
  fallbackToTouch: boolean;
  fallbackReason?: 'LOW_CONFIDENCE' | 'NO_MATCH' | 'AMBIGUOUS_MATCH' | 'SILENCE_OR_NOISE';
  isPreferNotToAnswer: boolean;
}

export class VoiceAnswerMapper {
  private static CONFIDENCE_THRESHOLD = 0.70;

  public static getConfidenceThreshold(): number {
    return this.CONFIDENCE_THRESHOLD;
  }

  public static updateGovernedConfidenceThreshold(threshold: number): void {
    if (threshold >= 0.1 && threshold <= 0.99) {
      this.CONFIDENCE_THRESHOLD = threshold;
    }
  }

  /**
   * Deterministic mapper from spoken transcript to structured option code or canonical value.
   * STRICT CLINICAL SAFETY: No LLM is EVER called on the interview voice path.
   */
  public static mapSpokenAnswer(req: VoiceAnswerMappingRequest): VoiceAnswerMappingResult {
    const { transcript, confidence, questionCode, questionType, language, isCritical, permittedOptions } = req;

    // 1. Check confidence threshold
    if (!transcript || transcript.trim() === '' || confidence < this.CONFIDENCE_THRESHOLD) {
      return {
        requiresReadBackConfirmation: false,
        fallbackToTouch: true,
        fallbackReason: (!transcript || transcript.trim() === '') ? 'SILENCE_OR_NOISE' : 'LOW_CONFIDENCE',
        isPreferNotToAnswer: false,
      };
    }

    const rawClean = transcript.trim().toLowerCase();
    const normalizedDigits = CanonicalParser.normalizeDigits(rawClean);

    // 2. Check universal "Prefer not to answer" / skip phrase across languages
    const skipPhrases = [
      'prefer not to answer',
      'prefer not to say',
      'skip',
      'skip question',
      'பதிலளிக்க விரும்பவில்லை',
      'சொல்ல விரும்பவில்லை',
      'தவிர்',
      'கேள்வியை தவிர்',
      'उत्तर नहीं देना',
      'छोड़ दें',
    ];

    if (skipPhrases.some((phrase) => rawClean.includes(phrase))) {
      return {
        matchedOptionCode: 'PREFER_NOT_TO_ANSWER',
        canonicalValue: null,
        confirmedDisplayLabel: language === 'ta' ? 'பதிலளிக்க விரும்பவில்லை' : 'Prefer not to answer',
        requiresReadBackConfirmation: false,
        fallbackToTouch: false,
        isPreferNotToAnswer: true,
      };
    }

    // 3. FREE_TEXT: Returns transcript for patient review
    if (questionType === 'FREE_TEXT') {
      return {
        canonicalValue: transcript.trim(),
        confirmedDisplayLabel: transcript.trim(),
        requiresReadBackConfirmation: true,
        readBackPrompt: language === 'ta'
          ? `நீங்கள் கூறியது: "${transcript.trim()}". இது சரியானதா?`
          : `You said: "${transcript.trim()}". Is that correct?`,
        fallbackToTouch: false,
        isPreferNotToAnswer: false,
      };
    }

    // 4. NUMERIC Question: Parse canonical number
    if (questionType === 'NUMERIC') {
      const parsedNum = CanonicalParser.parseNumeric(normalizedDigits);
      if (parsedNum === null) {
        return {
          requiresReadBackConfirmation: false,
          fallbackToTouch: true,
          fallbackReason: 'NO_MATCH',
          isPreferNotToAnswer: false,
        };
      }
      return {
        canonicalValue: parsedNum,
        confirmedDisplayLabel: String(parsedNum),
        requiresReadBackConfirmation: true, // Always confirm parsed numbers
        readBackPrompt: language === 'ta'
          ? `நீங்கள் கூறிய எண்: ${parsedNum}. இது சரியானதா?`
          : `You said: ${parsedNum}. Is that correct?`,
        fallbackToTouch: false,
        isPreferNotToAnswer: false,
      };
    }

    // 5. DATE Question: Parse canonical ISO date
    if (questionType === 'DATE') {
      const parsedDate = CanonicalParser.parseDate(normalizedDigits);
      if (!parsedDate) {
        return {
          requiresReadBackConfirmation: false,
          fallbackToTouch: true,
          fallbackReason: 'NO_MATCH',
          isPreferNotToAnswer: false,
        };
      }
      return {
        canonicalValue: parsedDate,
        confirmedDisplayLabel: parsedDate,
        requiresReadBackConfirmation: true,
        readBackPrompt: `You said: ${parsedDate}. Is that correct?`,
        fallbackToTouch: false,
        isPreferNotToAnswer: false,
      };
    }

    // 6. Gather approved option synonyms for this question and language
    const optionsToMatch: Array<{ code: string; label: string; synonyms: string[] }> = [];

    // First collect from in-memory approved option translations
    for (const [, opt] of devFallbackLanguageStore.optionTranslations.entries()) {
      if (
        opt.language === language &&
        opt.status === ContentStatuses.APPROVED &&
        (!opt.questionCode || opt.questionCode === questionCode)
      ) {
        optionsToMatch.push({
          code: opt.optionCode,
          label: opt.label,
          synonyms: (opt.spokenSynonyms || []).map((s) => s.toLowerCase()),
        });
      }
    }

    // Supplement with passed permitted options if any
    if (permittedOptions) {
      for (const po of permittedOptions) {
        if (!optionsToMatch.some((o) => o.code === po.code)) {
          optionsToMatch.push({
            code: po.code,
            label: po.label,
            synonyms: (po.spokenSynonyms || [po.label]).map((s) => s.toLowerCase()),
          });
        }
      }
    }

    // 7. Deterministic Synonym Matching
    const matched: Array<{ code: string; label: string; matchType: 'EXACT' | 'CONTAINS' }> = [];

    for (const opt of optionsToMatch) {
      const allTokens = [opt.label.toLowerCase(), ...opt.synonyms];
      // Check exact match
      if (allTokens.some((token) => rawClean === token || normalizedDigits === token)) {
        matched.push({ code: opt.code, label: opt.label, matchType: 'EXACT' });
        continue;
      }
      // Check substring inclusion
      if (allTokens.some((token) => token.length >= 2 && rawClean.includes(token))) {
        matched.push({ code: opt.code, label: opt.label, matchType: 'CONTAINS' });
      }
    }

    // If exact matches exist, prioritize exact over substring
    const exactMatches = matched.filter((m) => m.matchType === 'EXACT');
    const finalCandidates = exactMatches.length > 0 ? exactMatches : matched;

    // Check match count
    if (finalCandidates.length === 0) {
      return {
        requiresReadBackConfirmation: false,
        fallbackToTouch: true,
        fallbackReason: 'NO_MATCH',
        isPreferNotToAnswer: false,
      };
    }

    if (finalCandidates.length > 1) {
      // Ambiguous multiple options matched -> Fall back to touch immediately
      return {
        requiresReadBackConfirmation: false,
        fallbackToTouch: true,
        fallbackReason: 'AMBIGUOUS_MATCH',
        isPreferNotToAnswer: false,
      };
    }

    // Exactly one option matched!
    const bestMatch = finalCandidates[0];
    if (!bestMatch) {
      return {
        requiresReadBackConfirmation: false,
        fallbackToTouch: true,
        fallbackReason: 'NO_MATCH',
        isPreferNotToAnswer: false,
      };
    }

    const requiresReadBack = isCritical;

    const readBackPrompt = language === 'ta'
      ? `நீங்கள் கூறியது: "${bestMatch.label}". இது சரியானதா?`
      : `You said: "${bestMatch.label}". Is that correct?`;

    return {
      matchedOptionCode: bestMatch.code,
      canonicalValue: bestMatch.code,
      confirmedDisplayLabel: bestMatch.label,
      requiresReadBackConfirmation: requiresReadBack,
      readBackPrompt: requiresReadBack ? readBackPrompt : undefined,
      fallbackToTouch: false,
      isPreferNotToAnswer: false,
    };
  }
}
