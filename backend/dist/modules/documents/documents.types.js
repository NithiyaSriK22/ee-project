"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_THRESHOLDS = exports.FormularyStatus = exports.OcrStatuses = exports.DocumentOverallStatuses = exports.FieldVerificationResults = exports.EvaluationStates = exports.FieldTypeMetadata = exports.FieldTypes = exports.ImagingDocumentTypes = exports.DocumentTypes = void 0;
exports.isMedicalImagingDocument = isMedicalImagingDocument;
exports.updateGovernedValidationThresholds = updateGovernedValidationThresholds;
exports.DocumentTypes = {
    PRESCRIPTION: 'PRESCRIPTION',
    CLINICAL_NOTES: 'CLINICAL_NOTES',
    LAB_REPORT: 'LAB_REPORT',
    ULTRASOUND: 'ULTRASOUND',
    XRAY_CT_MRI: 'XRAY_CT_MRI',
    DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
    RADIOLOGY_REPORT: 'RADIOLOGY_REPORT',
    OTHER: 'OTHER',
};
exports.ImagingDocumentTypes = ['ULTRASOUND', 'XRAY_CT_MRI'];
function isMedicalImagingDocument(docType) {
    if (!docType)
        return false;
    const upper = docType.toUpperCase();
    return (upper === exports.DocumentTypes.ULTRASOUND ||
        upper === exports.DocumentTypes.XRAY_CT_MRI ||
        upper === 'RADIOLOGY_IMAGE' ||
        upper === 'SCAN_IMAGE' ||
        upper.includes('ULTRASOUND') ||
        upper.includes('XRAY') ||
        upper.includes('MRI') ||
        upper.includes('CT_SCAN'));
}
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
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    SUCCESSFUL: 'COMPLETED',
    PARTIALLY_SUCCESSFUL: 'PARTIALLY_SUCCESSFUL',
    FAILED: 'FAILED',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    SKIPPED: 'NOT_APPLICABLE',
};
exports.FormularyStatus = {
    DRAFT: 'DRAFT',
    PENDING_REVIEW: 'PENDING_REVIEW',
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
};
// Threshold Constants (Calibrated via Module 5A Ground-Truth Program)
exports.VALIDATION_THRESHOLDS = {
    MIN_USABLE_OCR_CONFIDENCE: 0.40, // Below 40% is marked UNREADABLE
    HIGH_OCR_CONFIDENCE: 0.70, // Minimum confidence for automated VERIFIED
    FORMULARY_SIMILARITY_THRESHOLD: 0.80, // Minimum fuzzy string similarity score (80%)
    DEFAULT_FORMULARY_VERSION: 'NFI-EML-2026.1',
};
function updateGovernedValidationThresholds(thresholds) {
    if (thresholds.minUsableOcrConfidence !== undefined) {
        exports.VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE = thresholds.minUsableOcrConfidence;
    }
    if (thresholds.highOcrConfidence !== undefined) {
        exports.VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE = thresholds.highOcrConfidence;
    }
    if (thresholds.formularySimilarityThreshold !== undefined) {
        exports.VALIDATION_THRESHOLDS.FORMULARY_SIMILARITY_THRESHOLD = thresholds.formularySimilarityThreshold;
    }
    return exports.VALIDATION_THRESHOLDS;
}
