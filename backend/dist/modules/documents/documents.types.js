"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_THRESHOLDS = exports.FormularyStatus = exports.OcrStatuses = exports.DocumentOverallStatuses = exports.FieldVerificationResults = exports.EvaluationStates = exports.FieldTypeMetadata = exports.FieldTypes = exports.DocumentTypes = void 0;
exports.DocumentTypes = {
    PRESCRIPTION: 'PRESCRIPTION',
    LAB_REPORT: 'LAB_REPORT',
    DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
    OTHER: 'OTHER',
};
exports.FieldTypes = {
    DRUG_NAME: 'drug_name',
    DOSAGE: 'dosage',
    ALLERGY: 'allergy',
    DIAGNOSIS: 'diagnosis',
    LAB_VALUE: 'lab_value',
    LAB_TEST_NAME: 'lab_test_name',
    DATE: 'date',
    PHYSICIAN_NAME: 'physician_name',
    INSTITUTION_NAME: 'institution_name',
};
exports.FieldTypeMetadata = {
    drug_name: { label: 'Drug / Medication Name', isCritical: true, expectedType: 'STRING' },
    dosage: { label: 'Dosage & Frequency', isCritical: true, expectedType: 'STRUCTURED_PATTERN' },
    allergy: { label: 'Allergy & Adverse Reactions', isCritical: true, expectedType: 'STRING' },
    diagnosis: { label: 'Clinical Diagnosis / Indication', isCritical: false, expectedType: 'STRING' },
    lab_value: { label: 'Lab Result Value', isCritical: true, expectedType: 'NUMBER' },
    lab_test_name: { label: 'Lab Investigation Name', isCritical: false, expectedType: 'STRING' },
    date: { label: 'Prescription / Report Date', isCritical: false, expectedType: 'DATE' },
    physician_name: { label: 'Consulting Physician', isCritical: false, expectedType: 'STRING' },
    institution_name: { label: 'Hospital / Clinic Name', isCritical: false, expectedType: 'STRING' },
};
exports.EvaluationStates = {
    MATCH: 'MATCH',
    MISMATCH: 'MISMATCH',
    UNKNOWN: 'UNKNOWN',
};
exports.FieldVerificationResults = {
    VERIFIED: 'VERIFIED',
    UNVERIFIED: 'UNVERIFIED',
    UNREADABLE: 'UNREADABLE',
    MISMATCH_FLAGGED: 'MISMATCH_FLAGGED',
};
exports.DocumentOverallStatuses = {
    PENDING_VALIDATION: 'PENDING_VALIDATION',
    FULLY_VERIFIED: 'FULLY_VERIFIED',
    NEEDS_PHYSICIAN_REVIEW: 'NEEDS_PHYSICIAN_REVIEW',
    PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED',
    EXTRACTION_FAILED: 'EXTRACTION_FAILED',
};
exports.OcrStatuses = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
};
exports.FormularyStatus = {
    DRAFT: 'DRAFT',
    PENDING_REVIEW: 'PENDING_REVIEW',
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
};
// Threshold Constants
exports.VALIDATION_THRESHOLDS = {
    MIN_USABLE_OCR_CONFIDENCE: 0.40, // Below 40% is marked UNREADABLE
    HIGH_OCR_CONFIDENCE: 0.70, // Minimum confidence for automated VERIFIED
    FORMULARY_SIMILARITY_THRESHOLD: 0.80, // Minimum fuzzy string similarity score (80%)
    DEFAULT_FORMULARY_VERSION: 'NFI-EML-2026.1',
};
