export const DocumentTypes = {
  PRESCRIPTION: 'PRESCRIPTION',
  LAB_REPORT: 'LAB_REPORT',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  OTHER: 'OTHER',
} as const;

export type DocumentType = (typeof DocumentTypes)[keyof typeof DocumentTypes];

export const FieldTypes = {
  DRUG_NAME: 'drug_name',
  DOSAGE: 'dosage',
  ALLERGY: 'allergy',
  DIAGNOSIS: 'diagnosis',
  LAB_VALUE: 'lab_value',
  LAB_TEST_NAME: 'lab_test_name',
  DATE: 'date',
  PHYSICIAN_NAME: 'physician_name',
  INSTITUTION_NAME: 'institution_name',
} as const;

export type FieldType = (typeof FieldTypes)[keyof typeof FieldTypes];

export const FieldTypeMetadata: Record<
  FieldType,
  { label: string; isCritical: boolean; expectedType: 'STRING' | 'STRUCTURED_PATTERN' | 'DATE' | 'NUMBER' }
> = {
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

export const EvaluationStates = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvaluationState = (typeof EvaluationStates)[keyof typeof EvaluationStates];

export const FieldVerificationResults = {
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  UNREADABLE: 'UNREADABLE',
  MISMATCH_FLAGGED: 'MISMATCH_FLAGGED',
} as const;

export type FieldVerificationResult =
  (typeof FieldVerificationResults)[keyof typeof FieldVerificationResults];

export const DocumentOverallStatuses = {
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  FULLY_VERIFIED: 'FULLY_VERIFIED',
  NEEDS_PHYSICIAN_REVIEW: 'NEEDS_PHYSICIAN_REVIEW',
  PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
} as const;

export type DocumentOverallStatus =
  (typeof DocumentOverallStatuses)[keyof typeof DocumentOverallStatuses];

export const OcrStatuses = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OcrStatus = (typeof OcrStatuses)[keyof typeof OcrStatuses];

export const FormularyStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type FormularyStatusType = (typeof FormularyStatus)[keyof typeof FormularyStatus];

// Threshold Constants (Calibrated via Module 5A Ground-Truth Program)
export const VALIDATION_THRESHOLDS = {
  MIN_USABLE_OCR_CONFIDENCE: 0.40,      // Below 40% is marked UNREADABLE
  HIGH_OCR_CONFIDENCE: 0.70,            // Minimum confidence for automated VERIFIED
  FORMULARY_SIMILARITY_THRESHOLD: 0.80, // Minimum fuzzy string similarity score (80%)
  DEFAULT_FORMULARY_VERSION: 'NFI-EML-2026.1',
};

export function updateGovernedValidationThresholds(thresholds: {
  minUsableOcrConfidence?: number;
  highOcrConfidence?: number;
  formularySimilarityThreshold?: number;
}): typeof VALIDATION_THRESHOLDS {
  if (thresholds.minUsableOcrConfidence !== undefined) {
    VALIDATION_THRESHOLDS.MIN_USABLE_OCR_CONFIDENCE = thresholds.minUsableOcrConfidence;
  }
  if (thresholds.highOcrConfidence !== undefined) {
    VALIDATION_THRESHOLDS.HIGH_OCR_CONFIDENCE = thresholds.highOcrConfidence;
  }
  if (thresholds.formularySimilarityThreshold !== undefined) {
    VALIDATION_THRESHOLDS.FORMULARY_SIMILARITY_THRESHOLD = thresholds.formularySimilarityThreshold;
  }
  return VALIDATION_THRESHOLDS;
}

