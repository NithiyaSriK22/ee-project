"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationService = void 0;
const evaluation_types_js_1 = require("./evaluation.types.js");
const stats_calculator_js_1 = require("./stats-calculator.js");
const logger_js_1 = require("../../config/logger.js");
class AnnotationService {
    static annotations = new Map(); // key: `${recordId}::${fieldName}`
    static adjudicatedResults = new Map(); // key: `${recordId}::${fieldName}`
    /**
     * Submits a field-level annotation under a versioned guideline.
     * Truly illegible fields must have canonicalValue = 'UNREADABLE' and legibility = 'UNREADABLE'.
     */
    static submitAnnotation(entry) {
        if (!entry.guidelineVersion || entry.guidelineVersion.trim().length === 0) {
            throw new Error('Guideline version is mandatory for field-level annotations.');
        }
        // Enforcement: Truly illegible fields MUST have ground truth UNREADABLE
        if (entry.legibility === evaluation_types_js_1.LegibilityRatings.UNREADABLE) {
            entry.canonicalValue = evaluation_types_js_1.LegibilityRatings.UNREADABLE;
        }
        const key = `${entry.recordId}::${entry.fieldName}`;
        const existing = this.annotations.get(key) || [];
        // Ensure annotators are double-blinded (one annotator cannot submit both primary and secondary)
        if (existing.some((e) => e.annotatorId === entry.annotatorId)) {
            throw new Error(`Annotator '${entry.annotatorId}' has already submitted an annotation for ${key}.`);
        }
        const newEntry = {
            ...entry,
            annotationId: `ANN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            annotatedAt: new Date().toISOString(),
        };
        existing.push(newEntry);
        this.annotations.set(key, existing);
        if (existing.length === 2 && existing[0] && existing[1]) {
            this.evaluateDoubleAnnotation(entry.recordId, entry.fieldName, existing[0], existing[1]);
        }
        logger_js_1.logger.info('[ANNOTATION] Field annotation submitted', {
            recordId: entry.recordId,
            fieldName: entry.fieldName,
            annotatorId: entry.annotatorId,
            guidelineVersion: entry.guidelineVersion,
        });
        return newEntry;
    }
    /**
     * Internal evaluation of two independent annotations for agreement / adjudication.
     */
    static evaluateDoubleAnnotation(recordId, fieldName, ann1, ann2) {
        const key = `${recordId}::${fieldName}`;
        const valueMatch = ann1.canonicalValue.trim().toLowerCase() === ann2.canonicalValue.trim().toLowerCase();
        const legibilityMatch = ann1.legibility === ann2.legibility;
        const isAgreed = valueMatch && legibilityMatch;
        const result = {
            recordId,
            fieldName,
            fieldType: ann1.fieldType,
            primaryAnnotation: ann1,
            secondaryAnnotation: ann2,
            agreementStatus: isAgreed ? evaluation_types_js_1.AdjudicationStatuses.AGREED : evaluation_types_js_1.AdjudicationStatuses.PENDING,
            adjudicatedCanonicalValue: isAgreed ? ann1.canonicalValue : '',
            adjudicatedLegibility: isAgreed ? ann1.legibility : evaluation_types_js_1.LegibilityRatings.CLEAR,
        };
        this.adjudicatedResults.set(key, result);
        return result;
    }
    /**
     * Adjudicates a conflicting double-annotation.
     * Drug fields MANDATE a PHARMACIST adjudicator.
     * Clinical / diagnosis fields MANDATE a CLINICIAN adjudicator.
     */
    static adjudicateConflict(params) {
        const key = `${params.recordId}::${params.fieldName}`;
        const existing = this.adjudicatedResults.get(key);
        if (!existing) {
            throw new Error(`Double-annotation not found for ${key}.`);
        }
        // Role-specific adjudication gating
        const isDrugField = ['drug_name', 'dosage', 'frequency', 'duration', 'route'].includes(existing.fieldType.toLowerCase());
        if (isDrugField && params.adjudicatorRole !== evaluation_types_js_1.AdjudicatorRoles.PHARMACIST) {
            throw new Error(`Drug field '${existing.fieldType}' requires adjudication by a licensed PHARMACIST (provided role: ${params.adjudicatorRole}).`);
        }
        if (!isDrugField && params.adjudicatorRole !== evaluation_types_js_1.AdjudicatorRoles.CLINICIAN && params.adjudicatorRole !== evaluation_types_js_1.AdjudicatorRoles.PHARMACIST) {
            throw new Error(`Clinical field '${existing.fieldType}' requires adjudication by a CLINICIAN or PHARMACIST.`);
        }
        if (params.resolvedLegibility === evaluation_types_js_1.LegibilityRatings.UNREADABLE) {
            params.resolvedCanonicalValue = evaluation_types_js_1.LegibilityRatings.UNREADABLE;
        }
        existing.agreementStatus = evaluation_types_js_1.AdjudicationStatuses.ADJUDICATED;
        existing.adjudicatorId = params.adjudicatorId;
        existing.adjudicatorRole = params.adjudicatorRole;
        existing.adjudicatedCanonicalValue = params.resolvedCanonicalValue;
        existing.adjudicatedLegibility = params.resolvedLegibility;
        existing.adjudicationNotes = params.adjudicationNotes;
        existing.adjudicatedAt = new Date().toISOString();
        this.adjudicatedResults.set(key, existing);
        logger_js_1.logger.info('[ADJUDICATION_RESOLVED]', {
            key,
            adjudicatorRole: params.adjudicatorRole,
            resolvedValue: params.resolvedCanonicalValue,
        });
        return existing;
    }
    /**
     * Computes the Inter-Annotator Agreement (raw % agreement & Cohen's Kappa) across all double-annotated items.
     */
    static computeAgreementMetrics() {
        const ann1Values = [];
        const ann2Values = [];
        for (const item of this.adjudicatedResults.values()) {
            ann1Values.push(item.primaryAnnotation.canonicalValue);
            ann2Values.push(item.secondaryAnnotation.canonicalValue);
        }
        return stats_calculator_js_1.StatsCalculator.calculateInterAnnotatorAgreement(ann1Values, ann2Values);
    }
    /**
     * Retrieves ground truth for a field, considering consensus or adjudication.
     */
    static getGroundTruthForField(recordId, fieldName) {
        return this.adjudicatedResults.get(`${recordId}::${fieldName}`);
    }
}
exports.AnnotationService = AnnotationService;
