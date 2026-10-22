"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormularyMatcher = void 0;
const value_normalizer_js_1 = require("./value-normalizer.js");
const documents_types_js_1 = require("../documents.types.js");
class FormularyMatcher {
    /**
     * Calculates Normalized Levenshtein Similarity Score (0.0 to 1.0)
     */
    static calculateSimilarity(s1, s2) {
        const a = s1.toLowerCase().trim();
        const b = s2.toLowerCase().trim();
        if (a === b)
            return 1.0;
        if (a.length === 0 || b.length === 0)
            return 0.0;
        const wordsA = a.split(/\s+/);
        const wordsB = b.split(/\s+/);
        // Initialize Levenshtein matrix
        const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
        for (let i = 0; i <= b.length; i++) {
            matrix[i][0] = i;
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        const distance = matrix[b.length][a.length];
        const maxLen = Math.max(a.length, b.length);
        const baseScore = 1.0 - distance / maxLen;
        // Check if primary stem matches (e.g., "amoxi" in "amoxicillin")
        let stemBonus = 0;
        if (wordsA[0] && wordsB[0]) {
            const stemA = wordsA[0];
            const stemB = wordsB[0];
            if (stemA.length >= 4 && (stemB.startsWith(stemA) || stemA.startsWith(stemB))) {
                stemBonus = 0.15;
            }
        }
        return Math.min(1.0, Math.round((baseScore + stemBonus) * 100) / 100);
    }
    /**
     * Deterministically evaluates a raw drug text against the formulary dataset
     */
    static matchDrug(rawText, formularyDrugs, threshold = documents_types_js_1.VALIDATION_THRESHOLDS.FORMULARY_SIMILARITY_THRESHOLD) {
        if (!rawText || rawText.trim().length < 2) {
            return {
                checkName: 'FORMULARY_MATCH',
                state: documents_types_js_1.EvaluationStates.UNKNOWN,
                matchedValue: null,
                score: 0.0,
                detail: 'Drug text is empty or too short to perform a reference match.',
            };
        }
        const normalizedInput = value_normalizer_js_1.ValueNormalizer.normalizeDrugName(rawText);
        let bestMatch = {
            drug: null,
            matchedTerm: null,
            score: 0.0,
        };
        for (const drug of formularyDrugs) {
            // 1. Check Canonical Name
            const scoreCanonical = this.calculateSimilarity(normalizedInput, drug.canonicalName);
            if (scoreCanonical > bestMatch.score) {
                bestMatch = { drug, matchedTerm: drug.canonicalName, score: scoreCanonical };
            }
            // 2. Check Generic Name
            const scoreGeneric = this.calculateSimilarity(normalizedInput, drug.genericName);
            if (scoreGeneric > bestMatch.score) {
                bestMatch = { drug, matchedTerm: drug.canonicalName, score: scoreGeneric };
            }
            // 3. Check Brand Names
            for (const brand of drug.brandNames || []) {
                const scoreBrand = this.calculateSimilarity(normalizedInput, brand);
                if (scoreBrand > bestMatch.score) {
                    bestMatch = { drug, matchedTerm: drug.canonicalName, score: scoreBrand };
                }
            }
            // 4. Check Common Misreadings
            for (const misread of drug.commonMisreadings || []) {
                const scoreMisread = this.calculateSimilarity(normalizedInput, misread);
                if (scoreMisread >= threshold && scoreMisread > bestMatch.score) {
                    bestMatch = { drug, matchedTerm: drug.canonicalName, score: Math.max(scoreMisread, 0.90) };
                }
                else if (scoreMisread > bestMatch.score) {
                    bestMatch = { drug, matchedTerm: drug.canonicalName, score: scoreMisread };
                }
            }
            // Early exit on exact match
            if (bestMatch.score === 1.0)
                break;
        }
        if (bestMatch.drug && bestMatch.score >= threshold) {
            return {
                checkName: 'FORMULARY_MATCH',
                state: documents_types_js_1.EvaluationStates.MATCH,
                matchedValue: bestMatch.drug.canonicalName,
                score: bestMatch.score,
                detail: `Matched to canonical formulary entry "${bestMatch.drug.canonicalName}" with similarity score ${Math.round(bestMatch.score * 100)}%.`,
            };
        }
        return {
            checkName: 'FORMULARY_MATCH',
            state: documents_types_js_1.EvaluationStates.MISMATCH,
            matchedValue: bestMatch.drug ? bestMatch.drug.canonicalName : null,
            score: bestMatch.score,
            detail: `Input "${rawText}" did not match any active formulary item above the required ${Math.round(threshold * 100)}% similarity threshold (highest score: ${Math.round(bestMatch.score * 100)}%).`,
        };
    }
}
exports.FormularyMatcher = FormularyMatcher;
