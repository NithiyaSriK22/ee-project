/**
 * MODULE 4A — CLINICAL TIMELINE & LAB REFERENCE RANGES
 * LabFlaggingService: Deterministic Reference Range Evaluator
 *
 * SAFETY BOUNDARY:
 * - Display and flagging ONLY.
 * - Zero AI in the flag path (deterministic code only).
 * - Zero clinical inference or diagnosis.
 * - Neutral phrasing: "outside reference range", NEVER "abnormal" as a conclusion.
 * - Range precedence: (1) Report-printed range (if verified) -> (2) Governed dictionary table -> (3) No range.
 * - Qualifiers ("<5", "trace", "+++") remain text and are NOT coerced to numbers.
 */

import {
  LabFlagResult,
  LabFlagState,
  LabFlagStates,
  RangeSourceType,
  RangeSourceTypes,
  LabReferenceRangeDefinition,
} from './clinical-timeline.types.js';
import { DictionaryStore } from '../clinical-dictionary/dictionary-store.js';
import {
  DictionaryCategories,
  LabTestEntry,
  ReferenceRangeEntry,
} from '../clinical-dictionary/dictionary.types.js';
import { logger } from '../../config/logger.js';

export interface EvaluateLabInput {
  testCodeOrName: string;
  rawValue: string | number;
  rawUnit?: string;
  isVerified: boolean;
  verificationState?: string;
  reportPrintedRange?: {
    low?: number;
    high?: number;
    textualRange?: string;
  } | null;
  patientAge?: number | null;
  patientGender?: string | null;
}

export class LabFlaggingService {
  // Regex to detect pure numbers (integer, decimal, scientific notation)
  private static readonly NUMERIC_REGEX = /^[-+]?[0-9]*\.?[0-9]+$/;

  // Known qualitative markers that must NOT be coerced to numbers
  private static readonly QUALIFIER_PATTERNS = [
    /^<.*$/,
    /^>.*$/,
    /^trace$/i,
    /^\+{1,4}$/,
    /^positive$/i,
    /^negative$/i,
    /^reactive$/i,
    /^non-reactive$/i,
    /^nil$/i,
    /^present$/i,
    /^absent$/i,
    /^normal$/i,
  ];

  /**
   * Deterministically evaluates a lab value against approved reference ranges
   */
  public static evaluateLabResult(input: EvaluateLabInput): LabFlagResult {
    const rawValStr = String(input.rawValue ?? '').trim();
    const unit = (input.rawUnit || '').trim();

    // 1. Resolve normalized test code and metadata from Clinical Dictionary
    const testEntry = this.resolveLabTest(input.testCodeOrName);
    const testCode = testEntry ? testEntry.code : input.testCodeOrName.toUpperCase();
    const testName = testEntry ? testEntry.testName : input.testCodeOrName;

    // 2. Value Verification Gate (Section 3 & 4)
    // Only VERIFIED values can receive range evaluation flags. Others return VALUE_NOT_VERIFIED.
    if (!input.isVerified) {
      return {
        testCode,
        testName,
        rawValue: rawValStr,
        numericValue: null,
        isQualifier: false,
        unit,
        flagState: LabFlagStates.VALUE_NOT_VERIFIED,
        rangeSource: RangeSourceTypes.NONE,
        isCriticalValue: false,
        flagExplanation: 'Value not verified. Extraction or validation pending.',
      };
    }

    // 3. Qualifier and Non-Numeric Handling (Section 4)
    // Qualifiers ("<5", "trace", "+++") remain text and are NOT coerced to numbers.
    const isQualifier = this.isQualifierValue(rawValStr);
    let numericValue: number | null = null;

    if (!isQualifier && this.NUMERIC_REGEX.test(rawValStr)) {
      numericValue = parseFloat(rawValStr);
    }

    if (isQualifier || numericValue === null || isNaN(numericValue)) {
      return {
        testCode,
        testName,
        rawValue: rawValStr,
        numericValue: null,
        isQualifier: true,
        qualifierText: rawValStr,
        unit,
        flagState: LabFlagStates.NO_RANGE_AVAILABLE,
        rangeSource: RangeSourceTypes.NONE,
        isCriticalValue: false,
        flagExplanation: `Qualitative / semi-quantitative value preserved as text ("${rawValStr}"). Numeric range comparison not applicable.`,
      };
    }

    // 4. Resolve Reference Range with Precedence
    // Precedence (1): Report-printed range, if present, valid, and verified
    let resolvedRange: LabReferenceRangeDefinition | null = null;
    let rangeSource: RangeSourceType = RangeSourceTypes.NONE;

    if (
      input.reportPrintedRange &&
      input.reportPrintedRange.low !== undefined &&
      input.reportPrintedRange.high !== undefined &&
      !isNaN(input.reportPrintedRange.low) &&
      !isNaN(input.reportPrintedRange.high)
    ) {
      resolvedRange = {
        low: input.reportPrintedRange.low,
        high: input.reportPrintedRange.high,
        textualRange: input.reportPrintedRange.textualRange || `${input.reportPrintedRange.low} - ${input.reportPrintedRange.high}`,
        clinicalSource: 'Report-Printed Reference Interval (Verified from laboratory document)',
      };
      rangeSource = RangeSourceTypes.REPORT_PRINTED;
    }

    // Precedence (2): Approved dictionary reference table
    if (!resolvedRange) {
      resolvedRange = this.resolveGovernedReferenceRange(
        testCode,
        unit,
        input.patientAge,
        input.patientGender
      );
      if (resolvedRange) {
        rangeSource = RangeSourceTypes.GOVERNED_DICTIONARY_TABLE;
      }
    }

    // If no approved range source exists or units mismatch/unconvertible
    if (!resolvedRange) {
      return {
        testCode,
        testName,
        rawValue: rawValStr,
        numericValue,
        isQualifier: false,
        unit,
        flagState: LabFlagStates.NO_RANGE_AVAILABLE,
        rangeSource: RangeSourceTypes.NONE,
        isCriticalValue: false,
        flagExplanation: `No verified reference interval available for test "${testName}" with unit "${unit}".`,
      };
    }

    // 5. Compare Value against Resolved Range
    let flagState: LabFlagState = LabFlagStates.WITHIN_RANGE;
    let flagExplanation = `Value ${numericValue} ${unit} is within reference interval (${resolvedRange.low} - ${resolvedRange.high} ${unit}).`;

    if (numericValue > resolvedRange.high) {
      flagState = LabFlagStates.ABOVE_RANGE;
      flagExplanation = `Value ${numericValue} ${unit} is outside reference range: exceeds upper limit of ${resolvedRange.high} ${unit} (${resolvedRange.clinicalSource}).`;
    } else if (numericValue < resolvedRange.low) {
      flagState = LabFlagStates.BELOW_RANGE;
      flagExplanation = `Value ${numericValue} ${unit} is outside reference range: below lower limit of ${resolvedRange.low} ${unit} (${resolvedRange.clinicalSource}).`;
    }

    // 6. Clinician-Approved Critical Value List Check (Doctor Only marker)
    let isCriticalValue = false;
    let criticalMarker: string | undefined;

    if (
      (resolvedRange.criticalLow !== undefined && numericValue <= resolvedRange.criticalLow) ||
      (resolvedRange.criticalHigh !== undefined && numericValue >= resolvedRange.criticalHigh)
    ) {
      isCriticalValue = true;
      criticalMarker = 'Critical Value — Doctor Attention Required';
      flagExplanation += ` [${criticalMarker}]`;
    }

    return {
      testCode,
      testName,
      rawValue: rawValStr,
      numericValue,
      isQualifier: false,
      unit,
      flagState,
      rangeSource,
      referenceRange: resolvedRange,
      isCriticalValue,
      criticalMarker,
      flagExplanation,
    };
  }

  /**
   * Resolves test entry from Clinical Dictionary by code, LOINC, or synonym
   */
  public static resolveLabTest(codeOrName: string): LabTestEntry | null {
    if (!codeOrName) return null;
    const clean = codeOrName.trim().toUpperCase();

    const allLabTests = DictionaryStore.getEntriesByCategory<LabTestEntry>(
      DictionaryCategories.LAB_TESTS
    );

    // Direct code match
    const byCode = allLabTests.find((t) => t.code.toUpperCase() === clean);
    if (byCode) return byCode;

    // Test name match
    const byName = allLabTests.find((t) => t.testName.toUpperCase() === clean || t.name.toUpperCase() === clean);
    if (byName) return byName;

    // Synonym match
    const bySynonym = allLabTests.find((t) =>
      t.synonyms?.some((syn) => syn.toUpperCase() === clean)
    );
    if (bySynonym) return bySynonym;

    // Partial contains match (e.g. "HEMOGLOBIN (HB)" -> "HEMOGLOBIN")
    const byIncludes = allLabTests.find(
      (t) => clean.includes(t.testName.toUpperCase()) || t.synonyms?.some((syn) => clean.includes(syn.toUpperCase()))
    );
    if (byIncludes) return byIncludes;

    return null;
  }

  /**
   * Resolves governed reference range from Clinical Dictionary table
   */
  public static resolveGovernedReferenceRange(
    testCode: string,
    unit: string,
    age?: number | null,
    gender?: string | null
  ): LabReferenceRangeDefinition | null {
    const allRanges = DictionaryStore.getEntriesByCategory<ReferenceRangeEntry>(
      DictionaryCategories.REFERENCE_RANGES
    );

    const testRanges = allRanges.filter((r) => r.labTestCode.toUpperCase() === testCode.toUpperCase());
    if (testRanges.length === 0) {
      return null;
    }

    // Normalize unit check
    const normalizedUnit = unit.toLowerCase().trim();
    const unitRanges = testRanges.filter((r) => r.unit.toLowerCase().trim() === normalizedUnit);
    if (unitRanges.length === 0) {
      // Unit mismatch - unapproved or unconvertible unit gives no flag
      logger.info('Lab reference range refused due to unit mismatch/unapproved unit', {
        testCode,
        requestedUnit: unit,
      });
      return null;
    }

    const patientAge = age !== undefined && age !== null ? age : 30; // default adult band if unspecified
    const patientSex = (gender || '').trim().toUpperCase();

    // 1. Specific sex and age match
    let matchedRange = unitRanges.find(
      (r) =>
        r.sex === patientSex &&
        patientAge >= r.ageMinYears &&
        patientAge <= r.ageMaxYears
    );

    // 2. Fallback to 'ALL' sex for age band
    if (!matchedRange) {
      matchedRange = unitRanges.find(
        (r) =>
          r.sex === 'ALL' &&
          patientAge >= r.ageMinYears &&
          patientAge <= r.ageMaxYears
      );
    }

    // 3. Fallback to first available matching range if within age band
    if (!matchedRange && unitRanges.length > 0) {
      matchedRange = unitRanges[0];
    }

    if (!matchedRange || matchedRange.rangeLow === undefined || matchedRange.rangeHigh === undefined) {
      return null;
    }

    return {
      low: matchedRange.rangeLow,
      high: matchedRange.rangeHigh,
      criticalLow: matchedRange.criticalLow,
      criticalHigh: matchedRange.criticalHigh,
      textualRange: `${matchedRange.rangeLow} - ${matchedRange.rangeHigh} ${matchedRange.unit}`,
      clinicalSource: `Governed Dictionary Table: ${matchedRange.clinicalSource || matchedRange.name}`,
    };
  }

  /**
   * Checks if string is a qualitative qualifier that must remain text
   */
  private static isQualifierValue(val: string): boolean {
    if (!val) return false;
    const trimmed = val.trim();
    return this.QUALIFIER_PATTERNS.some((pattern) => pattern.test(trimmed));
  }
}
