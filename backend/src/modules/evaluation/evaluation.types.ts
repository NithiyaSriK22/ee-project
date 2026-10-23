/**
 * MODULE 5A — EVALUATION, CALIBRATION & GROUND-TRUTH PROGRAM
 * Domain Types, Enums & Interfaces
 *
 * Strict Boundaries:
 * - Evaluation never changes production logic directly.
 * - Results can only change configuration values (thresholds) through governed activation.
 * - Evaluation data never enters production systems.
 * - Test split is locked and never used for tuning.
 */

// ==========================================
// 1. DATASET REGISTRY & SPLITS
// ==========================================

export const DatasetSplits = {
  DEVELOPMENT: 'DEVELOPMENT',
  CALIBRATION: 'CALIBRATION',
  TEST: 'TEST', // LOCKED: Never used for tuning/training
} as const;

export type DatasetSplit = (typeof DatasetSplits)[keyof typeof DatasetSplits];

export const DatasetModalities = {
  DOCUMENTS: 'DOCUMENTS',
  VOICE: 'VOICE',
  SCENARIOS: 'SCENARIOS',
  SUMMARIES: 'SUMMARIES',
  USABILITY: 'USABILITY',
  TIME_AND_MOTION: 'TIME_AND_MOTION',
} as const;

export type DatasetModality = (typeof DatasetModalities)[keyof typeof DatasetModalities];

export const DocumentRenderStyles = {
  PRINTED: 'PRINTED',
  HANDWRITTEN: 'HANDWRITTEN',
  MIXED: 'MIXED',
} as const;

export type DocumentRenderStyle = (typeof DocumentRenderStyles)[keyof typeof DocumentRenderStyles];

export const ImageQualities = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  DEGRADED: 'DEGRADED',
  BLURRED: 'BLURRED',
  LOW_LIGHT: 'LOW_LIGHT',
} as const;

export type ImageQuality = (typeof ImageQualities)[keyof typeof ImageQualities];

export const ImageSources = {
  MOBILE_CAM: 'MOBILE_CAM',
  FLATBED_SCANNER: 'FLATBED_SCANNER',
  KIOSK_CAM: 'KIOSK_CAM',
  SYNTHETIC: 'SYNTHETIC',
} as const;

export type ImageSource = (typeof ImageSources)[keyof typeof ImageSources];

export const AmbientNoiseLevels = {
  QUIET: 'QUIET',
  MODERATE_AMBIENT: 'MODERATE_AMBIENT',
  LOUD_PUBLIC_CLINIC: 'LOUD_PUBLIC_CLINIC',
} as const;

export type AmbientNoiseLevel = (typeof AmbientNoiseLevels)[keyof typeof AmbientNoiseLevels];

export const LegibilityRatings = {
  CLEAR: 'CLEAR',
  MARGINAL: 'MARGINAL',
  UNREADABLE: 'UNREADABLE', // Truly illegible fields MUST have ground truth UNREADABLE
} as const;

export type LegibilityRating = (typeof LegibilityRatings)[keyof typeof LegibilityRatings];

export interface DatasetItemStratification {
  documentType?: string; // e.g. PRESCRIPTION, DISCHARGE_SUMMARY, LAB_REPORT
  renderStyle?: DocumentRenderStyle;
  language?: string; // ISO language code e.g. 'en', 'hi', 'ta'
  imageQuality?: ImageQuality;
  source?: ImageSource;
  noiseLevel?: AmbientNoiseLevel;
  accent?: string;
  isLasaNearMiss?: boolean; // Look-Alike Sound-Alike drug case
  fieldTypes?: string[];
}

export interface DatasetRecord {
  id: string;
  datasetId: string;
  itemIdentifier: string;
  split: DatasetSplit;
  modality: DatasetModality;
  stratification: DatasetItemStratification;
  rawInputData: any; // e.g. image path/snippet, audio transcript, visit facts
  groundTruthData: any; // Gold standard canonical value or expected behavior
  consentReference: string;
  isDeIdentified: boolean;
  createdAt: string;
}

export interface DatasetMetadata {
  id: string;
  datasetCode: string;
  version: string;
  modality: DatasetModality;
  description: string;
  ethicsApprovalNumber: string; // Mandatory human prerequisite
  irbApprovalDate: string;
  consentForSecondaryUse: boolean;
  isEncryptedAtRest: boolean;
  totalRecordsCount: number;
  splitCounts: {
    development: number;
    calibration: number;
    test: number;
  };
  lockedAt?: string;
  lockedBy?: string;
  isTestSplitLocked: boolean; // Protects test split against tuning leakage
  retentionExpiryDate: string; // Study end deletion
  createdAt: string;
}

// ==========================================
// 2. ANNOTATION & ADJUDICATION
// ==========================================

export const AdjudicationStatuses = {
  PENDING: 'PENDING',
  AGREED: 'AGREED',
  ADJUDICATED: 'ADJUDICATED',
  UNRESOLVED: 'UNRESOLVED',
} as const;

export type AdjudicationStatus = (typeof AdjudicationStatuses)[keyof typeof AdjudicationStatuses];

export const AdjudicatorRoles = {
  PHARMACIST: 'PHARMACIST', // Mandatory for drug / medication fields
  CLINICIAN: 'CLINICIAN', // Mandatory for diagnosis / red-flag clinical fields
  SAFETY_OFFICER: 'SAFETY_OFFICER',
} as const;

export type AdjudicatorRole = (typeof AdjudicatorRoles)[keyof typeof AdjudicatorRoles];

export interface BoundingBoxCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldAnnotationEntry {
  annotationId: string;
  recordId: string;
  annotatorId: string;
  annotatorRole: string;
  guidelineVersion: string;
  fieldName: string;
  fieldType: string; // drug_name, dosage, frequency, duration, etc.
  boundingBox?: BoundingBoxCoordinates;
  extractedRawText: string;
  canonicalValue: string;
  legibility: LegibilityRating;
  isLasaCandidate?: boolean;
  notes?: string;
  annotatedAt: string;
}

export interface AdjudicatedFieldResult {
  recordId: string;
  fieldName: string;
  fieldType: string;
  primaryAnnotation: FieldAnnotationEntry;
  secondaryAnnotation: FieldAnnotationEntry;
  agreementStatus: AdjudicationStatus;
  adjudicatorId?: string;
  adjudicatorRole?: AdjudicatorRole;
  adjudicatedCanonicalValue: string;
  adjudicatedLegibility: LegibilityRating;
  adjudicationNotes?: string;
  adjudicatedAt?: string;
}

export interface InterAnnotatorAgreement {
  totalAnnotatedFields: number;
  agreedFieldsCount: number;
  disagreedFieldsCount: number;
  rawAgreementRate: number; // e.g. 0.94
  cohensKappa: number; // e.g. 0.88
  adjudicationRequiredRate: number;
}

// ==========================================
// 3. METRICS & CONFIDENCE INTERVALS
// ==========================================

export interface ConfidenceInterval {
  pointEstimate: number;
  lower95: number;
  upper95: number;
  method: 'WILSON_SCORE' | 'RULE_OF_THREE' | 'CLOPPER_PEARSON';
}

export interface DocumentEvaluationMetrics {
  totalFieldsEvaluated: number;
  verifiedCount: number;
  falseVerifiedCount: number; // Primary safety failure: system said VERIFIED but ground truth disagrees
  unverifiedCount: number;
  unreadableCount: number;
  mismatchFlaggedCount: number;

  // Primary Safety Metric: False-VERIFIED rate + 95% Confidence Interval
  falseVerifiedRate: ConfidenceInterval;

  // Review Cost Metric: Escalation rate (share not verified, costing doctor review time)
  escalationRate: number;

  // Breakdown by Field Type
  byFieldType: Record<
    string,
    {
      total: number;
      falseVerified: number;
      falseVerifiedRate: ConfidenceInterval;
      escalationRate: number;
    }
  >;

  // Breakdown by Render Style (Handwritten vs Printed)
  byRenderStyle: Record<
    DocumentRenderStyle,
    {
      total: number;
      falseVerified: number;
      falseVerifiedRate: ConfidenceInterval;
      escalationRate: number;
    }
  >;

  // Breakdown by Language
  byLanguage: Record<
    string,
    {
      total: number;
      falseVerified: number;
      falseVerifiedRate: ConfidenceInterval;
      escalationRate: number;
    }
  >;

  // Breakdown by Image Quality
  byImageQuality: Record<
    ImageQuality,
    {
      total: number;
      falseVerified: number;
      falseVerifiedRate: ConfidenceInterval;
      escalationRate: number;
    }
  >;

  // LASA (Look-Alike Sound-Alike) specific error analysis
  lasaNearMisses: {
    totalLasaCases: number;
    falseVerifiedLasaCount: number;
    caughtLasaMismatchCount: number;
    lasaSafetyRate: number;
  };
}

export interface CoverageVsErrorPoint {
  thresholdValue: number;
  falseVerifiedRate: number;
  falseVerifiedUpper95: number;
  escalationRate: number;
  coverageRate: number; // 1 - escalationRate
}

export interface VoiceEvaluationMetrics {
  language: string;
  noiseLevel: AmbientNoiseLevel;
  totalSpokenUtterances: number;
  correctAcceptCount: number;
  wrongAcceptCount: number; // Safety error: accepted wrong option
  wrongAcceptRate: ConfidenceInterval;
  fallbackToTouchCount: number;
  fallbackRate: number;
  readBackCorrectionCount: number;
  readBackCorrectionRate: number;
  criticalConfirmationTotal: number;
  criticalConfirmationCompliant: number;
  criticalConfirmationComplianceRate: number; // Target 100%
}

export interface SummaryEvaluationMetrics {
  totalVisitsEvaluated: number;
  unsupportedClaimsCount: number; // Target strictly 0
  unsupportedClaimsRate: ConfidenceInterval;
  omissionsCount: number;
  omissionRate: number;
  clinicianUsefulnessScores: number[]; // 1.0 - 5.0
  averageUsefulnessScore: number;
  fallbackToTemplateCount: number;
  fallbackRate: number;
}

export interface RedFlagRuleEvaluationMetrics {
  totalScenariosEvaluated: number;
  truePositives: number;
  falseNegatives: number; // Dangerous: missed red flag
  trueNegatives: number;
  falsePositives: number; // Alert burden
  sensitivity: ConfidenceInterval; // Target 100% on critical emergency rules
  specificity: ConfidenceInterval;
  alertBurdenRate: number; // Dismissal or non-actionable share
  p95LatencyMs: number;
}

export interface UsabilityCohortMetrics {
  cohortName: 'ELDERLY' | 'LOW_LITERACY' | 'MULTILINGUAL' | 'DOCTORS' | 'CLINICAL_STAFF';
  participantsCount: number;
  taskSuccessRate: number;
  averageErrorCount: number;
  assistanceNeededRate: number;
  averageSatisfactionScore: number; // System Usability Scale (SUS) 0-100 or 1-5
  nearMissObservations: Array<{
    category: 'WRONG_PATIENT' | 'WRONG_ANSWER' | 'CONFUSION' | 'TIME_OUT';
    description: string;
    actionTaken: string;
  }>;
}

export interface AccessibilityAuditResult {
  auditorName: string;
  auditDate: string;
  wcag21AaCompliant: boolean;
  screenReaderTested: boolean;
  highContrastTested: boolean;
  keyboardOnlyTested: boolean;
  touchTargetAdequacy: boolean;
  identifiedGaps: string[];
}

export interface TimeAndMotionStudyMetrics {
  studyDate: string;
  sampleVisitsCount: number;
  baselineDoctorMinutesPerPatient: number; // Human baseline without MediKiosk
  kioskAssistedDoctorMinutesPerPatient: number; // Doctor review with MediKiosk
  averageDoctorMinutesSaved: number;
  percentDoctorTimeSaved: number;
}

export interface FairnessAuditSummary {
  measuredLanguages: string[];
  unmeasuredLanguages: string[];
  measuredDocumentTypes: string[];
  unmeasuredDocumentTypes: string[];
  equityDiscrepancies: Array<{
    dimension: string;
    advantagedGroup: string;
    disadvantagedGroup: string;
    metricDiscrepancy: string;
    recommendation: string;
  }>;
  hasUnmeasuredEnabledFeatures: boolean; // Safety gate blocker
}

// ==========================================
// 4. CALIBRATION PROTOCOL & GOVERNED CONFIG
// ==========================================

export interface CalibrationTarget {
  maxAcceptableFalseVerifiedRate: number; // Human-set target e.g. 0.01 (1%)
  confidenceLevel: number; // e.g. 0.95
  calibrationSplitId: string;
  lockedTestSplitId: string;
}

export interface CalibratedThresholdResult {
  ocrMinConfidenceThreshold: number;
  formularySimilarityThreshold: number;
  highOcrConfidenceThreshold: number;
  calibrationSplitMetrics: {
    falseVerifiedRate: number;
    falseVerifiedUpper95: number;
    escalationRate: number;
  };
  testSplitConfirmationMetrics: {
    falseVerifiedRate: number;
    falseVerifiedUpper95: number;
    escalationRate: number;
    confirmedAt: string;
    testSetEvaluatedOnce: boolean;
  };
  recommendedGovernanceAction: 'APPROVE_FOR_PRODUCTION' | 'REJECT_EXCEEDS_SAFETY_LIMIT';
}

// ==========================================
// 5. EVALUATION REPORT & SIGN-OFF
// ==========================================

export interface HumanSignOff {
  signOffId: string;
  signerName: string;
  signerRole: 'CLINICAL_SAFETY_OFFICER' | 'LEAD_PHARMACIST' | 'CHIEF_MEDICAL_OFFICER' | 'HEAD_OF_COMPLIANCE';
  signedAt: string;
  acknowledgesNegativeResults: boolean;
  clinicalLimitationsStatement: string;
  cryptographicSignature: string; // SHA-256 HMAC of the report hash + signer secret
}

export interface EvaluationReport {
  reportId: string;
  reportCode: string;
  version: string;
  targetPipelineVersion: string;
  generatedAt: string;
  isImmutable: boolean;
  reportSha256Hash: string; // Tamper-evident cryptographic hash of report payload

  // Evaluated Modalities
  documentMetrics: DocumentEvaluationMetrics;
  coverageVsErrorCurve: CoverageVsErrorPoint[];
  voiceMetrics: VoiceEvaluationMetrics[];
  summaryMetrics: SummaryEvaluationMetrics;
  redFlagMetrics: RedFlagRuleEvaluationMetrics;
  usabilityMetrics: UsabilityCohortMetrics[];
  accessibilityAudit: AccessibilityAuditResult;
  timeAndMotionStudy: TimeAndMotionStudyMetrics;
  fairnessAudit: FairnessAuditSummary;

  // Calibrated Thresholds
  calibratedThresholds?: CalibratedThresholdResult;

  // Human Sign-offs
  signOffs: HumanSignOff[];
  isFullySignedOff: boolean;
  releaseGateApprovalStatus: 'APPROVED' | 'REJECTED' | 'PENDING_SIGNOFF';
}

// ==========================================
// 6. DRIFT MONITORING
// ==========================================

export interface DriftAuditSample {
  auditPeriodStart: string;
  auditPeriodEnd: string;
  totalDoctorReviewedRecords: number;
  sampledRecordsCount: number;
  doctorCorrectionCount: number;
  realWorldFalseVerifiedRate: ConfidenceInterval;
  baselineFalseVerifiedRate: number;
  driftDetected: boolean;
  pValDifference?: number;
  recommendedAction: 'MAINTAIN_CURRENT_THRESHOLDS' | 'SCHEDULE_RECALIBRATION' | 'SUSPEND_AUTOMATION';
}

// ==========================================
// 7. SAMPLE SIZE CALCULATOR DTO
// ==========================================

export interface SampleSizeCalculationRequest {
  targetMaxFalseVerifiedRate: number; // e.g. 0.01
  confidenceLevel?: number; // default 0.95
  expectedUnderlyingRate?: number; // e.g. 0.00
  power?: number; // e.g. 0.80
}

export interface SampleSizeCalculationResult {
  ruleOfThreeRequiredN: number; // n >= 3 / targetMaxRate for 0 observed errors
  normalApproximationRequiredN: number;
  recommendedMinimumSampleSize: number;
  rationale: string;
  warningNotice: string;
}
