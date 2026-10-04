"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldCheckEvaluator = void 0;
const documents_types_js_1 = require("../documents.types.js");
const formulary_matcher_js_1 = require("./formulary-matcher.js");
const pattern_matcher_js_1 = require("./pattern-matcher.js");
const explanation_generator_js_1 = require("./explanation-generator.js");
class FieldCheckEvaluator {
    /**
     * Evaluates three-state Boolean AND logic:
     * TRUE AND TRUE = TRUE
     * TRUE AND FALSE = FALSE
     * TRUE AND UNKNOWN = UNKNOWN
     * FALSE AND UNKNOWN = FALSE
     */
    static combineThreeStateLogic(states) {
        if (states.length === 0)
            return documents_types_js_1.EvaluationStates.UNKNOWN;
        if (states.includes(documents_types_js_1.EvaluationStates.MISMATCH))
            return documents_types_js_1.EvaluationStates.MISMATCH;
        if (states.includes(documents_types_js_1.EvaluationStates.UNKNOWN))
            return documents_types_js_1.EvaluationStates.UNKNOWN;
        return documents_types_js_1.EvaluationStates.MATCH;
    }
    /**
     * Pure evaluation of an individual raw field against reference datasets
     */
    static evaluateField(rawField, formularyDataset) {
        const meta = documents_types_js_1.FieldTypeMetadata[rawField.fieldType] || {
            label: rawField.fieldType,
            isCritical: false,
            expectedType: 'STRING',
        };
        const isCritical = meta.isCritical;
        const ocrConfidence = rawField.ocrConfidence ?? 0.0;
        const rawText = (rawField.rawText || '').trim();
        const checksPerformed = [];
        // Check 1: OCR Usability Threshold
        if (ocrConfidence < documents_types_js_1.VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE || rawText.length === 0) {
            const explanation = explanation_generator_js_1.ExplanationGenerator.generateFieldExplanation(rawField.fieldType, rawText, documents_types_js_1.FieldVerificationResults.UNREADABLE, null, null, ocrConfidence);
            return {
                rawFieldId: rawField.id,
                fieldType: rawField.fieldType,
                rawText,
                ocrConfidence,
                isCritical,
                result: documents_types_js_1.FieldVerificationResults.UNREADABLE,
                evalState: documents_types_js_1.EvaluationStates.UNKNOWN,
                matchedReferenceValue: null,
                matchScore: null,
                explanation,
                checksPerformed: [
                    {
                        checkName: 'OCR_CONFIDENCE_THRESHOLD',
                        state: documents_types_js_1.EvaluationStates.UNKNOWN,
                        score: ocrConfidence,
                        detail: `Confidence ${Math.round(ocrConfidence * 100)}% is below minimum usability threshold (40%).`,
                    },
                ],
            };
        }
        // Perform Type-Specific Reference / Pattern Checks
        let matchedValue = null;
        let matchScore = null;
        switch (rawField.fieldType) {
            case 'drug_name': {
                const check = formulary_matcher_js_1.FormularyMatcher.matchDrug(rawText, formularyDataset.drugs, documents_types_js_1.VALIDATION_THRESHOLDS.FORMULARY_SIMILARITY_THRESHOLD);
                checksPerformed.push(check);
                matchedValue = check.matchedValue || null;
                matchScore = check.score ?? null;
                break;
            }
            case 'dosage': {
                const check = pattern_matcher_js_1.PatternMatcher.matchDosagePattern(rawText);
                checksPerformed.push(check);
                matchedValue = check.matchedValue || null;
                matchScore = check.score ?? null;
                break;
            }
            case 'date': {
                const check = pattern_matcher_js_1.PatternMatcher.matchDateFormat(rawText);
                checksPerformed.push(check);
                matchedValue = check.matchedValue || null;
                matchScore = check.score ?? null;
                break;
            }
            case 'allergy': {
                const check = pattern_matcher_js_1.PatternMatcher.matchExplicitNone(rawText);
                checksPerformed.push(check);
                matchedValue = check.matchedValue || null;
                matchScore = check.score ?? null;
                break;
            }
            case 'lab_value': {
                const check = pattern_matcher_js_1.PatternMatcher.matchNumericLabValue(rawText);
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
                const state = ocrConfidence >= documents_types_js_1.VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE
                    ? documents_types_js_1.EvaluationStates.MATCH
                    : documents_types_js_1.EvaluationStates.UNKNOWN;
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
        let finalResult;
        if (overallEvalState === documents_types_js_1.EvaluationStates.MATCH && ocrConfidence >= documents_types_js_1.VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE) {
            finalResult = documents_types_js_1.FieldVerificationResults.VERIFIED;
        }
        else if (overallEvalState === documents_types_js_1.EvaluationStates.MISMATCH) {
            finalResult = documents_types_js_1.FieldVerificationResults.MISMATCH_FLAGGED;
        }
        else if (ocrConfidence < documents_types_js_1.VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE) {
            finalResult = documents_types_js_1.FieldVerificationResults.UNREADABLE;
        }
        else {
            // Uncertainty remains (low confidence on critical field or unknown reference match)
            finalResult = documents_types_js_1.FieldVerificationResults.UNVERIFIED;
        }
        const explanation = explanation_generator_js_1.ExplanationGenerator.generateFieldExplanation(rawField.fieldType, rawText, finalResult, matchedValue, matchScore, ocrConfidence);
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
    static evaluateDocument(documentId, documentType, rawFields, formularyDataset) {
        if (rawFields.length === 0) {
            return {
                documentId,
                documentType,
                formularyVersion: formularyDataset.versionCode,
                evaluatedAt: new Date(),
                overallStatus: documents_types_js_1.DocumentOverallStatuses.EXTRACTION_FAILED,
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
        const evaluatedFields = rawFields.map((field) => this.evaluateField(field, formularyDataset));
        // 2. Count verification outcomes
        let verifiedCount = 0;
        let unverifiedCount = 0;
        let unreadableCount = 0;
        let mismatchFlaggedCount = 0;
        let criticalFlaggedCount = 0;
        for (const f of evaluatedFields) {
            if (f.result === documents_types_js_1.FieldVerificationResults.VERIFIED) {
                verifiedCount++;
            }
            else if (f.result === documents_types_js_1.FieldVerificationResults.MISMATCH_FLAGGED) {
                mismatchFlaggedCount++;
                if (f.isCritical)
                    criticalFlaggedCount++;
            }
            else if (f.result === documents_types_js_1.FieldVerificationResults.UNREADABLE) {
                unreadableCount++;
                if (f.isCritical)
                    criticalFlaggedCount++;
            }
            else if (f.result === documents_types_js_1.FieldVerificationResults.UNVERIFIED) {
                unverifiedCount++;
                if (f.isCritical)
                    criticalFlaggedCount++;
            }
        }
        // 3. Rollup Document Status (Requirement 46)
        let overallStatus;
        if (criticalFlaggedCount > 0) {
            overallStatus = documents_types_js_1.DocumentOverallStatuses.NEEDS_PHYSICIAN_REVIEW;
        }
        else if (unverifiedCount > 0 || unreadableCount > 0 || mismatchFlaggedCount > 0) {
            overallStatus = documents_types_js_1.DocumentOverallStatuses.PARTIALLY_VERIFIED;
        }
        else if (verifiedCount === evaluatedFields.length && verifiedCount > 0) {
            overallStatus = documents_types_js_1.DocumentOverallStatuses.FULLY_VERIFIED;
        }
        else {
            overallStatus = documents_types_js_1.DocumentOverallStatuses.EXTRACTION_FAILED;
        }
        // 4. Sort fields by clinical review prioritization (Requirement 47)
        // 1. Critical + UNVERIFIED/UNREADABLE/MISMATCH_FLAGGED
        // 2. Critical + VERIFIED
        // 3. Non-critical + uncertain
        // 4. Non-critical + VERIFIED
        const prioritizedFields = [...evaluatedFields].sort((a, b) => {
            const getRank = (item) => {
                const isNotVerified = item.result !== documents_types_js_1.FieldVerificationResults.VERIFIED;
                if (item.isCritical && isNotVerified)
                    return 1;
                if (item.isCritical && !isNotVerified)
                    return 2;
                if (!item.isCritical && isNotVerified)
                    return 3;
                return 4;
            };
            return getRank(a) - getRank(b);
        });
        // 5. Generate structured explanation
        const structuredExplanation = explanation_generator_js_1.ExplanationGenerator.generateDocumentExplanation(prioritizedFields, overallStatus);
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
exports.FieldCheckEvaluator = FieldCheckEvaluator;
