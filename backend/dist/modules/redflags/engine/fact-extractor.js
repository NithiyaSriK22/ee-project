"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactExtractor = void 0;
const fact_catalog_js_1 = require("./fact-catalog.js");
const redflags_types_js_1 = require("../redflags.types.js");
class FactExtractor {
    /**
     * Normalizes interview answers and validated document fields into a clean facts map.
     * Crucial rule: Free-text is never parsed into facts. Unknown values are never coerced to false.
     */
    static extractNormalizedFacts(visitId, answers, documentFields) {
        const facts = {};
        // 1. Initialize all known catalog items as UNKNOWN by default
        for (const [key, meta] of Object.entries(fact_catalog_js_1.CENTRAL_FACT_CATALOG)) {
            facts[key] = {
                factKey: key,
                state: redflags_types_js_1.FactStates.UNKNOWN,
                isCritical: meta.isCritical,
                description: meta.description,
            };
        }
        // 2. Process Interview Answers
        for (const ans of answers) {
            const factKey = this.matchAnswerToFactKey(ans);
            if (!factKey)
                continue;
            const meta = fact_catalog_js_1.CENTRAL_FACT_CATALOG[factKey];
            const isCritical = ans.isCritical ?? meta?.isCritical ?? false;
            // Handle skipped or declined
            if (ans.isSkipped || this.isDeclinedAnswer(ans.answerValue)) {
                facts[factKey] = {
                    factKey,
                    state: redflags_types_js_1.FactStates.UNKNOWN,
                    isCritical,
                    sourceType: 'INTERVIEW_ANSWER',
                    sourceId: ans.id,
                    description: meta?.description,
                };
                continue;
            }
            // Check if question is free text - free text is NEVER interpreted by the engine
            if (ans.questionType === 'FREE_TEXT') {
                // Keep as UNKNOWN for rule evaluation purposes
                continue;
            }
            // Parse structured value
            const parsed = this.parseAnswerValue(ans.answerValue, meta?.dataType || 'BOOLEAN');
            if (parsed !== undefined) {
                facts[factKey] = {
                    factKey,
                    state: redflags_types_js_1.FactStates.KNOWN,
                    value: parsed,
                    isCritical,
                    sourceType: 'INTERVIEW_ANSWER',
                    sourceId: ans.id,
                    description: meta?.description,
                };
            }
        }
        // 3. Process Validated Document Fields
        for (const field of documentFields) {
            const factKey = this.matchDocumentFieldToFactKey(field);
            if (!factKey)
                continue;
            const meta = fact_catalog_js_1.CENTRAL_FACT_CATALOG[factKey];
            const isCritical = field.isCritical || (meta?.isCritical ?? false);
            // Rule: UNVERIFIED, UNREADABLE, or MISMATCH_FLAGGED fields must NEVER be treated as verified facts
            if (field.result === 'UNREADABLE' ||
                field.result === 'UNVERIFIED' ||
                field.result === 'MISMATCH_FLAGGED') {
                // Must stay/become UNKNOWN
                facts[factKey] = {
                    factKey,
                    state: redflags_types_js_1.FactStates.UNKNOWN,
                    isCritical,
                    sourceType: 'VALIDATED_FIELD',
                    sourceId: field.id,
                    description: meta?.description,
                };
                continue;
            }
            // If VERIFIED
            if (field.result === 'VERIFIED') {
                const parsedVal = this.parseFieldValue(field, meta?.dataType || 'STRING');
                if (parsedVal !== undefined) {
                    facts[factKey] = {
                        factKey,
                        state: redflags_types_js_1.FactStates.KNOWN,
                        value: parsedVal,
                        isCritical,
                        sourceType: 'VALIDATED_FIELD',
                        sourceId: field.id,
                        description: meta?.description,
                    };
                }
            }
        }
        return {
            visitId,
            facts,
            assembledAt: new Date().toISOString(),
        };
    }
    static matchAnswerToFactKey(ans) {
        // 1. Direct match on questionCode
        if (ans.questionCode) {
            const codeUpper = ans.questionCode.toUpperCase();
            for (const [key, item] of Object.entries(fact_catalog_js_1.CENTRAL_FACT_CATALOG)) {
                if (item.sourceKey.toUpperCase() === codeUpper)
                    return key;
            }
        }
        // 2. Fuzzy match on questionId or prompt text aliases
        const promptNorm = (ans.promptText || '').toLowerCase();
        for (const [key, item] of Object.entries(fact_catalog_js_1.CENTRAL_FACT_CATALOG)) {
            if (item.matchAliases?.some((alias) => promptNorm.includes(alias.toLowerCase()))) {
                return key;
            }
        }
        return null;
    }
    static matchDocumentFieldToFactKey(field) {
        const fType = field.fieldType.toLowerCase();
        const refVal = (field.matchedReferenceValue || '').toLowerCase();
        for (const [key, item] of Object.entries(fact_catalog_js_1.CENTRAL_FACT_CATALOG)) {
            if (item.sourceType === 'DOCUMENT_FIELD') {
                if (item.sourceKey.toLowerCase() === fType) {
                    // If aliases exist, check against matched reference
                    if (item.matchAliases && item.matchAliases.length > 0) {
                        if (item.matchAliases.some((alias) => refVal.includes(alias.toLowerCase()))) {
                            return key;
                        }
                    }
                    else {
                        return key;
                    }
                }
            }
        }
        return null;
    }
    static isDeclinedAnswer(value) {
        if (value === null || value === undefined)
            return false;
        const str = String(typeof value === 'object' ? value.value || '' : value).trim().toLowerCase();
        return str === 'prefer not to answer' || str === 'declined' || str === 'skip';
    }
    static parseAnswerValue(val, expectedType) {
        if (val === null || val === undefined)
            return undefined;
        let target = val;
        if (typeof val === 'object' && val.value !== undefined) {
            target = val.value;
        }
        if (expectedType === 'BOOLEAN') {
            if (typeof target === 'boolean')
                return target;
            const s = String(target).trim().toLowerCase();
            if (s === 'yes' || s === 'true' || s === '1')
                return true;
            if (s === 'no' || s === 'false' || s === '0' || s === 'none')
                return false;
            return undefined;
        }
        if (expectedType === 'NUMBER') {
            const n = Number(target);
            return isNaN(n) ? undefined : n;
        }
        return String(target).trim();
    }
    static parseFieldValue(field, expectedType) {
        const val = field.matchedReferenceValue;
        if (!val)
            return undefined;
        if (expectedType === 'BOOLEAN') {
            return true; // e.g. A verified drug or allergy match indicates presence
        }
        if (expectedType === 'NUMBER') {
            const match = val.match(/\d+(\.\d+)?/);
            return match ? parseFloat(match[0]) : undefined;
        }
        return val;
    }
}
exports.FactExtractor = FactExtractor;
