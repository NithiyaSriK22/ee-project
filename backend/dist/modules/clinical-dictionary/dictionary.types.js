"use strict";
/**
 * MODULE 3A — CLINICAL DATA DICTIONARY & TERMINOLOGY GOVERNANCE
 * Type definitions, governance lifecycle, and safety-critical terminology structures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DictionaryCategories = exports.TerminologyStatuses = void 0;
exports.TerminologyStatuses = {
    DRAFT: 'DRAFT',
    REVIEW: 'REVIEW',
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
};
exports.DictionaryCategories = {
    SECTIONS: 'SECTIONS',
    QUESTIONS: 'QUESTIONS',
    OPTION_CODES: 'OPTION_CODES',
    FACT_KEYS: 'FACT_KEYS',
    SUMMARY_KEYS: 'SUMMARY_KEYS',
    DOCUMENT_FIELD_TYPES: 'DOCUMENT_FIELD_TYPES',
    UNITS_AND_CONVERSIONS: 'UNITS_AND_CONVERSIONS',
    DATE_DOSAGE_PATTERNS: 'DATE_DOSAGE_PATTERNS',
    PRESCRIPTION_ABBREVIATIONS: 'PRESCRIPTION_ABBREVIATIONS',
    DRUGS: 'DRUGS',
    LAB_TESTS: 'LAB_TESTS',
    REFERENCE_RANGES: 'REFERENCE_RANGES',
};
