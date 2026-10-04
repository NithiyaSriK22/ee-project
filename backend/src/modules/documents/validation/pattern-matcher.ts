import { ValueNormalizer } from './value-normalizer.js';
import { SingleCheckResult } from './types.js';
import { EvaluationStates } from '../documents.types.js';

export class PatternMatcher {
  /**
   * Evaluates dosage format against clinical pattern catalogue
   */
  public static matchDosagePattern(rawText: string): SingleCheckResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        checkName: 'DOSAGE_PATTERN_MATCH',
        state: EvaluationStates.UNKNOWN,
        matchedValue: null,
        score: 0.0,
        detail: 'Dosage field is empty or unreadable.',
      };
    }

    const normalized = ValueNormalizer.normalizeDosagePattern(rawText);

    // Schedule like "1-0-1" or Latin descriptive text
    const isSchedule = /^\d+-\d+-\d+(?:-\d+)?$/.test(normalized);
    const isDescriptive = /\(.*\)/.test(normalized) || /^(OD|BD|BID|TID|TDS|QID|SOS|PRN|HS|STAT)/i.test(normalized);

    if (isSchedule || isDescriptive) {
      return {
        checkName: 'DOSAGE_PATTERN_MATCH',
        state: EvaluationStates.MATCH,
        matchedValue: normalized,
        score: 1.0,
        detail: `Dosage pattern "${rawText}" recognized and standardized to "${normalized}".`,
      };
    }

    return {
      checkName: 'DOSAGE_PATTERN_MATCH',
      state: EvaluationStates.MISMATCH,
      matchedValue: null,
      score: 0.2,
      detail: `Extracted text "${rawText}" does not conform to recognized clinical dosage or frequency notations.`,
    };
  }

  /**
   * Evaluates date format against calendar standards
   */
  public static matchDateFormat(rawText: string): SingleCheckResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        checkName: 'DATE_FORMAT_MATCH',
        state: EvaluationStates.UNKNOWN,
        matchedValue: null,
        score: 0.0,
        detail: 'Date field is empty or unreadable.',
      };
    }

    const norm = ValueNormalizer.normalizeDate(rawText);
    if (norm.isValid && norm.formatted) {
      return {
        checkName: 'DATE_FORMAT_MATCH',
        state: EvaluationStates.MATCH,
        matchedValue: norm.formatted,
        score: 1.0,
        detail: `Date "${rawText}" successfully parsed to valid calendar date "${norm.formatted}".`,
      };
    }

    return {
      checkName: 'DATE_FORMAT_MATCH',
      state: EvaluationStates.MISMATCH,
      matchedValue: null,
      score: 0.1,
      detail: `Date text "${rawText}" is invalid or ambiguous (out of calendar bounds).`,
    };
  }

  /**
   * Evaluates explicit "None stated" statement for allergies (no inferred absence)
   */
  public static matchExplicitNone(rawText: string): SingleCheckResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        checkName: 'EXPLICIT_NONE_CHECK',
        state: EvaluationStates.UNKNOWN,
        matchedValue: null,
        score: 0.0,
        detail: 'Allergy section not found or empty on document. Explicit physician confirmation required.',
      };
    }

    const clean = rawText.trim().toLowerCase();
    const explicitPatterns = [
      'no known allergies',
      'no known drug allergies',
      'no drug allergy',
      'nka',
      'nkda',
      'nil',
      'none',
      'no allergy',
      'no allergies',
      'denies any allergy',
    ];

    const isExplicitNone = explicitPatterns.some(
      (p) => clean === p || clean.includes(p)
    );

    if (isExplicitNone) {
      return {
        checkName: 'EXPLICIT_NONE_CHECK',
        state: EvaluationStates.MATCH,
        matchedValue: 'No Known Drug Allergies (NKDA)',
        score: 1.0,
        detail: `Explicitly documented as "${rawText}".`,
      };
    }

    // Has specific allergy text
    return {
      checkName: 'EXPLICIT_NONE_CHECK',
      state: EvaluationStates.MATCH,
      matchedValue: rawText.trim(),
      score: 0.9,
      detail: `Documented active allergy: "${rawText.trim()}".`,
    };
  }

  /**
   * Evaluates lab numeric plausibility
   */
  public static matchNumericLabValue(rawText: string, testName?: string): SingleCheckResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        checkName: 'NUMERIC_RANGE_CHECK',
        state: EvaluationStates.UNKNOWN,
        matchedValue: null,
        score: 0.0,
        detail: 'Lab value is empty or unreadable.',
      };
    }

    const norm = ValueNormalizer.normalizeNumeric(rawText);
    if (!norm.isValid || norm.value === null) {
      return {
        checkName: 'NUMERIC_RANGE_CHECK',
        state: EvaluationStates.MISMATCH,
        matchedValue: null,
        score: 0.2,
        detail: `Extracted text "${rawText}" is not a valid numeric lab measurement.`,
      };
    }

    // Specific physiological range limits to catch OCR misreads
    const val = norm.value;
    const test = (testName || '').toLowerCase();

    if (test.includes('glucose') || test.includes('sugar') || test.includes('rbs') || test.includes('fbs')) {
      if (val < 20 || val > 1200) {
        return {
          checkName: 'NUMERIC_RANGE_CHECK',
          state: EvaluationStates.MISMATCH,
          matchedValue: `${val} ${norm.unit || 'mg/dL'}`,
          score: 0.3,
          detail: `Value ${val} is outside physiologically plausible blood glucose limits (20 - 1200 mg/dL). Probable OCR misread.`,
        };
      }
    } else if (test.includes('hba1c')) {
      if (val < 2.5 || val > 25.0) {
        return {
          checkName: 'NUMERIC_RANGE_CHECK',
          state: EvaluationStates.MISMATCH,
          matchedValue: `${val} %`,
          score: 0.3,
          detail: `HbA1c value ${val}% is outside plausible limits (2.5 - 25.0%).`,
        };
      }
    } else if (test.includes('hemoglobin') || test.includes('hb')) {
      if (val < 1.0 || val > 30.0) {
        return {
          checkName: 'NUMERIC_RANGE_CHECK',
          state: EvaluationStates.MISMATCH,
          matchedValue: `${val} ${norm.unit || 'g/dL'}`,
          score: 0.3,
          detail: `Hemoglobin value ${val} is outside plausible limits (1.0 - 30.0 g/dL).`,
        };
      }
    }

    return {
      checkName: 'NUMERIC_RANGE_CHECK',
      state: EvaluationStates.MATCH,
      matchedValue: `${norm.value}${norm.unit ? ` ${norm.unit}` : ''}`,
      score: 1.0,
      detail: `Plausible numeric measurement: ${norm.value} ${norm.unit || ''}`.trim(),
    };
  }
}
