"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplanationGenerator = void 0;
const documents_types_js_1 = require("../documents.types.js");
class ExplanationGenerator {
    /**
     * Generates a deterministic, human-readable explanation for an individual field
     */
    static generateFieldExplanation(fieldType, rawText, result, matchedValue, score, ocrConfidence = 0) {
        const meta = documents_types_js_1.FieldTypeMetadata[fieldType] || { label: fieldType, isCritical: false };
        const label = meta.label;
        const scorePct = score ? Math.round(score * 100) : Math.round(ocrConfidence * 100);
        switch (result) {
            case documents_types_js_1.FieldVerificationResults.VERIFIED:
                if (fieldType === 'drug_name') {
                    return `✓ ${label}: matched to "${matchedValue}" (${scorePct}% reference match).`;
                }
                if (fieldType === 'dosage') {
                    return `✓ ${label}: recognized valid schedule pattern "${matchedValue}".`;
                }
                if (fieldType === 'date') {
                    return `✓ ${label}: verified calendar date "${matchedValue}".`;
                }
                if (fieldType === 'allergy') {
                    return `✓ ${label}: explicit documentation verified ("${matchedValue}").`;
                }
                return `✓ ${label}: verified against reference standards (${matchedValue || rawText}).`;
            case documents_types_js_1.FieldVerificationResults.MISMATCH_FLAGGED:
                return `⚠ ${label}: Extracted text "${rawText}" did not match any known reference entry with sufficient confidence (${scorePct}%). Please verify against original document.`;
            case documents_types_js_1.FieldVerificationResults.UNREADABLE:
                return `❌ ${label}: Extracted text is illegible or missing (OCR confidence ${Math.round(ocrConfidence * 100)}%). Manual physician verification required.`;
            case documents_types_js_1.FieldVerificationResults.UNVERIFIED:
            default:
                if (meta.isCritical) {
                    return `⚠ ${label}: Critical field extracted as "${rawText}" with marginal confidence (${Math.round(ocrConfidence * 100)}%). Requires mandatory physician verification.`;
                }
                return `ℹ ${label}: Extracted as "${rawText}" (${Math.round(ocrConfidence * 100)}% confidence). Review advised.`;
        }
    }
    /**
     * Generates a deterministic document-level structured explanation
     */
    static generateDocumentExplanation(fields, overallStatus) {
        const verifiedSummary = [];
        const flaggedSummary = [];
        const unverifiedSummary = [];
        const unreadableSummary = [];
        for (const f of fields) {
            const meta = documents_types_js_1.FieldTypeMetadata[f.fieldType] || { label: f.fieldType };
            switch (f.result) {
                case documents_types_js_1.FieldVerificationResults.VERIFIED:
                    verifiedSummary.push(`${meta.label}: ${f.matchedReferenceValue || f.rawText}`);
                    break;
                case documents_types_js_1.FieldVerificationResults.MISMATCH_FLAGGED:
                    flaggedSummary.push(`${meta.label}: "${f.rawText}" (no reference match)`);
                    break;
                case documents_types_js_1.FieldVerificationResults.UNREADABLE:
                    unreadableSummary.push(`${meta.label}: illegible or missing`);
                    break;
                case documents_types_js_1.FieldVerificationResults.UNVERIFIED:
                    unverifiedSummary.push(`${meta.label}: "${f.rawText}" (marginal confidence)`);
                    break;
            }
        }
        let summaryText = '';
        if (overallStatus === 'FULLY_VERIFIED') {
            summaryText = `All ${fields.length} extracted fields successfully verified against clinical reference standards.`;
        }
        else if (overallStatus === 'NEEDS_PHYSICIAN_REVIEW') {
            const issuesCount = flaggedSummary.length + unverifiedSummary.length + unreadableSummary.length;
            summaryText = `${verifiedSummary.length} fields verified, ${issuesCount} critical field(s) require mandatory physician confirmation.`;
        }
        else if (overallStatus === 'PARTIALLY_VERIFIED') {
            summaryText = `${verifiedSummary.length} critical fields verified; non-critical fields contain minor uncertainty.`;
        }
        else {
            summaryText = 'OCR extraction failed to produce usable text from document.';
        }
        return {
            summaryText,
            verifiedSummary,
            flaggedSummary,
            unverifiedSummary,
            unreadableSummary,
        };
    }
}
exports.ExplanationGenerator = ExplanationGenerator;
