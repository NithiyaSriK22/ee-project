import {
  FieldTypeMetadata,
  EvaluationStates,
  EvaluationState,
  FieldVerificationResults,
  FieldVerificationResult,
  DocumentOverallStatuses,
  DocumentOverallStatus,
  VALIDATION_THRESHOLDS,
} from '../documents.types.js';
import {
  RawFieldInput,
  FormularyDataset,
  SingleCheckResult,
  EvaluatedFieldResult,
  DocumentValidationSummary,
} from './types.js';
import { FormularyMatcher } from './formulary-matcher.js';
import { PatternMatcher } from './pattern-matcher.js';
import { ExplanationGenerator } from './explanation-generator.js';

export class FieldCheckEvaluator {
  /**
   * Evaluates three-state Boolean AND logic:
   * TRUE AND TRUE = TRUE
   * TRUE AND FALSE = FALSE
   * TRUE AND UNKNOWN = UNKNOWN
   * FALSE AND UNKNOWN = FALSE
   */
  public static combineThreeStateLogic(states: EvaluationState[]): EvaluationState {
    if (states.length === 0) return EvaluationStates.UNKNOWN;
    if (states.includes(EvaluationStates.MISMATCH)) return EvaluationStates.MISMATCH;
    if (states.includes(EvaluationStates.UNKNOWN)) return EvaluationStates.UNKNOWN;
    return EvaluationStates.MATCH;
  }

  /**
   * Pure evaluation of an individual raw field against reference datasets
   */
  public static evaluateField(
    rawField: RawFieldInput,
    formularyDataset: FormularyDataset
  ): EvaluatedFieldResult {
    const meta = FieldTypeMetadata[rawField.fieldType] || {
      label: rawField.fieldType,
      isCritical: false,
      expectedType: 'STRING',
    };

    const isCritical = meta.isCritical;
    const ocrConfidence = rawField.ocrConfidence ?? 0.0;
    const rawText = (rawField.rawText || '').trim();

    const checksPerformed: SingleCheckResult[] = [];

    // Check 1: OCR Usability Threshold
    if (ocrConfidence < VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE || rawText.length === 0) {
      const explanation = ExplanationGenerator.generateFieldExplanation(
        rawField.fieldType,
        rawText,
        FieldVerificationResults.UNREADABLE,
        null,
        null,
        ocrConfidence
      );

      return {
        rawFieldId: rawField.id,
        fieldType: rawField.fieldType,
        rawText,
        ocrConfidence,
        isCritical,
        result: FieldVerificationResults.UNREADABLE,
        evalState: EvaluationStates.UNKNOWN,
        matchedReferenceValue: null,
        matchScore: null,
        explanation,
        checksPerformed: [
          {
            checkName: 'OCR_CONFIDENCE_THRESHOLD',
            state: EvaluationStates.UNKNOWN,
            score: ocrConfidence,
            detail: `Confidence ${Math.round(ocrConfidence * 100)}% is below minimum usability threshold (40%).`,
          },
        ],
      };
    }

    // Perform Type-Specific Reference / Pattern Checks
    let matchedValue: string | null = null;
    let matchScore: number | null = null;

    switch (rawField.fieldType) {
      case 'drug_name': {
        const check = FormularyMatcher.matchDrug(
          rawText,
          formularyDataset.drugs,
          VALIDATION_THRESHOLDS.FORMULARY_SIMILARITY_THRESHOLD
        );
        checksPerformed.push(check);
        matchedValue = check.matchedValue || null;
        matchScore = check.score ?? null;
        break;
      }

      case 'dosage': {
        const check = PatternMatcher.matchDosagePattern(rawText);
        checksPerformed.push(check);
        matchedValue = check.matchedValue || null;
        matchScore = check.score ?? null;
        break;
      }

      case 'date': {
        const check = PatternMatcher.matchDateFormat(rawText);
        checksPerformed.push(check);
        matchedValue = check.matchedValue || null;
        matchScore = check.score ?? null;
        break;
      }

      case 'allergy': {
        const check = PatternMatcher.matchExplicitNone(rawText);
        checksPerformed.push(check);
        matchedValue = check.matchedValue || null;
        matchScore = check.score ?? null;
        break;
      }

      case 'lab_value': {
        const check = PatternMatcher.matchNumericLabValue(rawText);
        checksPerformed.push(check);
        matchedValue = check.matchedValue || null;
        matchScore = check.score ?? null;
        break;
      }

      case 'diagnosis':
      case 'lab_test_name':
      case 'physician_name':
      case 'institution_name':
      default: {
        // Free-text clinical fields pass if confidence is adequate
        const state =
          ocrConfidence >= VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE
            ? EvaluationStates.MATCH
            : EvaluationStates.UNKNOWN;
        checksPerformed.push({
          checkName: 'OCR_CONFIDENCE_THRESHOLD',
          state,
          matchedValue: rawText,
          score: ocrConfidence,
          detail: `Text field extracted with ${Math.round(ocrConfidence * 100)}% OCR confidence.`,
        });
        matchedValue = rawText;
        matchScore = ocrConfidence;
        break;
      }
    }

    // Aggregate checks with three-state logic
    const overallEvalState = this.combineThreeStateLogic(checksPerformed.map((c) => c.state));

    // Determine Final Field Verification Result (Requirements 22 & 23)
    let finalResult: FieldVerificationResult;

    if (overallEvalState === EvaluationStates.MATCH && ocrConfidence >= VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE) {
      finalResult = FieldVerificationResults.VERIFIED;
    } else if (overallEvalState === EvaluationStates.MISMATCH) {
      finalResult = FieldVerificationResults.MISMATCH_FLAGGED;
    } else if (ocrConfidence < VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE) {
      finalResult = FieldVerificationResults.UNREADABLE;
    } else {
      // Uncertainty remains (low confidence on critical field or unknown reference match)
      finalResult = FieldVerificationResults.UNVERIFIED;
    }

    const explanation = ExplanationGenerator.generateFieldExplanation(
      rawField.fieldType,
      rawText,
      finalResult,
      matchedValue,
      matchScore,
      ocrConfidence
    );

    return {
      rawFieldId: rawField.id,
      fieldType: rawField.fieldType,
      rawText,
      ocrConfidence,
      isCritical,
      result: finalResult,
      evalState: overallEvalState,
      matchedReferenceValue: matchedValue,
      matchScore,
      explanation,
      checksPerformed,
    };
  }

  /**
   * Evaluates all raw fields of a document, sorts them by clinical review priority,
   * and computes the document-level rollup status.
   */
  public static evaluateDocument(
    documentId: string,
    documentType: string,
    rawFields: RawFieldInput[],
    formularyDataset: FormularyDataset
  ): DocumentValidationSummary {
    if (rawFields.length === 0) {
      return {
        documentId,
        documentType,
        formularyVersion: formularyDataset.versionCode,
        evaluatedAt: new Date(),
        overallStatus: DocumentOverallStatuses.EXTRACTION_FAILED,
        totalFieldsCount: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        unreadableCount: 0,
        mismatchFlaggedCount: 0,
        criticalFlaggedCount: 0,
        structuredExplanation: {
          summaryText: 'No text or fields could be extracted from this document.',
          verifiedSummary: [],
          flaggedSummary: [],
          unverifiedSummary: [],
          unreadableSummary: [],
        },
        fields: [],
      };
    }

    // 1. Evaluate each individual field
    const evaluatedFields = rawFields.map((field) =>
      this.evaluateField(field, formularyDataset)
    );

    // 2. Count verification outcomes
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let unreadableCount = 0;
    let mismatchFlaggedCount = 0;
    let criticalFlaggedCount = 0;

    for (const f of evaluatedFields) {
      if (f.result === FieldVerificationResults.VERIFIED) {
        verifiedCount++;
      } else if (f.result === FieldVerificationResults.MISMATCH_FLAGGED) {
        mismatchFlaggedCount++;
        if (f.isCritical) criticalFlaggedCount++;
      } else if (f.result === FieldVerificationResults.UNREADABLE) {
        unreadableCount++;
        if (f.isCritical) criticalFlaggedCount++;
      } else if (f.result === FieldVerificationResults.UNVERIFIED) {
        unverifiedCount++;
        if (f.isCritical) criticalFlaggedCount++;
      }
    }

    // 3. Rollup Document Status (Requirement 46)
    let overallStatus: DocumentOverallStatus;

    if (criticalFlaggedCount > 0) {
      overallStatus = DocumentOverallStatuses.NEEDS_PHYSICIAN_REVIEW;
    } else if (unverifiedCount > 0 || unreadableCount > 0 || mismatchFlaggedCount > 0) {
      overallStatus = DocumentOverallStatuses.PARTIALLY_VERIFIED;
    } else if (verifiedCount === evaluatedFields.length && verifiedCount > 0) {
      overallStatus = DocumentOverallStatuses.FULLY_VERIFIED;
    } else {
      overallStatus = DocumentOverallStatuses.EXTRACTION_FAILED;
    }

    // 4. Sort fields by clinical review prioritization (Requirement 47)
    // 1. Critical + UNVERIFIED/UNREADABLE/MISMATCH_FLAGGED
    // 2. Critical + VERIFIED
    // 3. Non-critical + uncertain
    // 4. Non-critical + VERIFIED
    const prioritizedFields = [...evaluatedFields].sort((a, b) => {
      const getRank = (item: EvaluatedFieldResult) => {
        const isNotVerified = item.result !== FieldVerificationResults.VERIFIED;
        if (item.isCritical && isNotVerified) return 1;
        if (item.isCritical && !isNotVerified) return 2;
        if (!item.isCritical && isNotVerified) return 3;
        return 4;
      };
      return getRank(a) - getRank(b);
    });

    // 5. Generate structured explanation
    const structuredExplanation = ExplanationGenerator.generateDocumentExplanation(
      prioritizedFields,
      overallStatus
    );

    return {
      documentId,
      documentType,
      formularyVersion: formularyDataset.versionCode,
      evaluatedAt: new Date(),
      overallStatus,
      totalFieldsCount: evaluatedFields.length,
      verifiedCount,
      unverifiedCount,
      unreadableCount,
      mismatchFlaggedCount,
      criticalFlaggedCount,
      structuredExplanation,
      fields: prioritizedFields,
    };
  }
}
