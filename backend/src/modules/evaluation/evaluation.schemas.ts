import { z } from 'zod';
import {
  DatasetSplits,
  DatasetModalities,
  AdjudicatorRoles,
  LegibilityRatings,
} from './evaluation.types.js';

export const registerDatasetSchema = z.object({
  id: z.string().trim().min(3),
  datasetCode: z.string().trim().min(3),
  version: z.string().trim().min(1),
  modality: z.enum([
    DatasetModalities.DOCUMENTS,
    DatasetModalities.VOICE,
    DatasetModalities.SCENARIOS,
    DatasetModalities.SUMMARIES,
    DatasetModalities.USABILITY,
    DatasetModalities.TIME_AND_MOTION,
  ]),
  description: z.string().trim().min(10),
  ethicsApprovalNumber: z.string().trim().min(3, 'Ethics approval number is required'),
  irbApprovalDate: z.string().datetime(),
  consentForSecondaryUse: z.boolean().refine((val) => val === true, {
    message: 'Explicit patient consent for secondary research use is mandatory',
  }),
  isEncryptedAtRest: z.boolean().default(true),
  isTestSplitLocked: z.boolean().default(true),
  retentionExpiryDate: z.string().datetime(),
});

export const addRecordSchema = z.object({
  datasetId: z.string().trim().min(1),
  itemIdentifier: z.string().trim().min(1),
  split: z.enum([DatasetSplits.DEVELOPMENT, DatasetSplits.CALIBRATION, DatasetSplits.TEST]),
  modality: z.enum([
    DatasetModalities.DOCUMENTS,
    DatasetModalities.VOICE,
    DatasetModalities.SCENARIOS,
    DatasetModalities.SUMMARIES,
    DatasetModalities.USABILITY,
    DatasetModalities.TIME_AND_MOTION,
  ]),
  stratification: z.record(z.any()).default({}),
  rawInputData: z.any(),
  groundTruthData: z.any(),
  consentReference: z.string().trim().min(1),
  isDeIdentified: z.boolean().default(true),
});

export const submitAnnotationSchema = z.object({
  recordId: z.string().trim().min(1),
  annotatorId: z.string().trim().min(1),
  annotatorRole: z.string().trim().min(1),
  guidelineVersion: z.string().trim().min(1, 'Guideline version is mandatory'),
  fieldName: z.string().trim().min(1),
  fieldType: z.string().trim().min(1),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  extractedRawText: z.string().trim(),
  canonicalValue: z.string().trim(),
  legibility: z.enum([
    LegibilityRatings.CLEAR,
    LegibilityRatings.MARGINAL,
    LegibilityRatings.UNREADABLE,
  ]),
  isLasaCandidate: z.boolean().optional(),
  notes: z.string().trim().optional(),
});

export const adjudicateConflictSchema = z.object({
  recordId: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
  adjudicatorId: z.string().trim().min(1),
  adjudicatorRole: z.enum([
    AdjudicatorRoles.PHARMACIST,
    AdjudicatorRoles.CLINICIAN,
    AdjudicatorRoles.SAFETY_OFFICER,
  ]),
  resolvedCanonicalValue: z.string().trim().min(1),
  resolvedLegibility: z.enum([
    LegibilityRatings.CLEAR,
    LegibilityRatings.MARGINAL,
    LegibilityRatings.UNREADABLE,
  ]),
  adjudicationNotes: z.string().trim().min(5),
});

export const executeCalibrationSchema = z.object({
  maxAcceptableFalseVerifiedRate: z.number().positive().max(0.5, 'Safety target cannot exceed 50%'),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  calibrationSplitId: z.string().trim().min(1),
  lockedTestSplitId: z.string().trim().min(1),
});

export const executeEvaluationSchema = z.object({
  pipelineVersion: z.string().trim().default('1.0.0'),
  targetDocumentDatasetId: z.string().trim().default('DS-DOCS-CLINICAL-2026'),
  targetVoiceDatasetId: z.string().trim().default('DS-VOICE-MULTILINGUAL-2026'),
  targetScenarioDatasetId: z.string().trim().default('DS-REDFLAG-SCENARIOS-2026'),
});

export const signReportSchema = z.object({
  reportId: z.string().trim().min(1),
  signerName: z.string().trim().min(2),
  signerRole: z.enum([
    'CLINICAL_SAFETY_OFFICER',
    'LEAD_PHARMACIST',
    'CHIEF_MEDICAL_OFFICER',
    'HEAD_OF_COMPLIANCE',
  ]),
  acknowledgesNegativeResults: z.boolean().refine((v) => v === true, {
    message: 'Explicit acknowledgment of negative results and error bounds is required',
  }),
  clinicalLimitationsStatement: z
    .string()
    .trim()
    .min(20, 'Clinical limitations statement must be at least 20 characters'),
  signingSecret: z.string().trim().optional(),
});

export const sampleSizeCalculatorSchema = z.object({
  targetMaxFalseVerifiedRate: z.number().positive().max(0.2),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  expectedUnderlyingRate: z.number().min(0).max(0.1).optional(),
});

export const driftAnalysisSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalReviewedRecords: z.number().int().positive(),
  sampleSize: z.number().int().positive(),
  doctorCorrectionCount: z.number().int().nonnegative(),
  baselineFalseVerifiedRate: z.number().nonnegative().default(0.005),
});
