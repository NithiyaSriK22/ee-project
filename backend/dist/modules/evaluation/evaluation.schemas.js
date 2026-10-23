"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftAnalysisSchema = exports.sampleSizeCalculatorSchema = exports.signReportSchema = exports.executeEvaluationSchema = exports.executeCalibrationSchema = exports.adjudicateConflictSchema = exports.submitAnnotationSchema = exports.addRecordSchema = exports.registerDatasetSchema = void 0;
const zod_1 = require("zod");
const evaluation_types_js_1 = require("./evaluation.types.js");
exports.registerDatasetSchema = zod_1.z.object({
    id: zod_1.z.string().trim().min(3),
    datasetCode: zod_1.z.string().trim().min(3),
    version: zod_1.z.string().trim().min(1),
    modality: zod_1.z.enum([
        evaluation_types_js_1.DatasetModalities.DOCUMENTS,
        evaluation_types_js_1.DatasetModalities.VOICE,
        evaluation_types_js_1.DatasetModalities.SCENARIOS,
        evaluation_types_js_1.DatasetModalities.SUMMARIES,
        evaluation_types_js_1.DatasetModalities.USABILITY,
        evaluation_types_js_1.DatasetModalities.TIME_AND_MOTION,
    ]),
    description: zod_1.z.string().trim().min(10),
    ethicsApprovalNumber: zod_1.z.string().trim().min(3, 'Ethics approval number is required'),
    irbApprovalDate: zod_1.z.string().datetime(),
    consentForSecondaryUse: zod_1.z.boolean().refine((val) => val === true, {
        message: 'Explicit patient consent for secondary research use is mandatory',
    }),
    isEncryptedAtRest: zod_1.z.boolean().default(true),
    isTestSplitLocked: zod_1.z.boolean().default(true),
    retentionExpiryDate: zod_1.z.string().datetime(),
});
exports.addRecordSchema = zod_1.z.object({
    datasetId: zod_1.z.string().trim().min(1),
    itemIdentifier: zod_1.z.string().trim().min(1),
    split: zod_1.z.enum([evaluation_types_js_1.DatasetSplits.DEVELOPMENT, evaluation_types_js_1.DatasetSplits.CALIBRATION, evaluation_types_js_1.DatasetSplits.TEST]),
    modality: zod_1.z.enum([
        evaluation_types_js_1.DatasetModalities.DOCUMENTS,
        evaluation_types_js_1.DatasetModalities.VOICE,
        evaluation_types_js_1.DatasetModalities.SCENARIOS,
        evaluation_types_js_1.DatasetModalities.SUMMARIES,
        evaluation_types_js_1.DatasetModalities.USABILITY,
        evaluation_types_js_1.DatasetModalities.TIME_AND_MOTION,
    ]),
    stratification: zod_1.z.record(zod_1.z.any()).default({}),
    rawInputData: zod_1.z.any(),
    groundTruthData: zod_1.z.any(),
    consentReference: zod_1.z.string().trim().min(1),
    isDeIdentified: zod_1.z.boolean().default(true),
});
exports.submitAnnotationSchema = zod_1.z.object({
    recordId: zod_1.z.string().trim().min(1),
    annotatorId: zod_1.z.string().trim().min(1),
    annotatorRole: zod_1.z.string().trim().min(1),
    guidelineVersion: zod_1.z.string().trim().min(1, 'Guideline version is mandatory'),
    fieldName: zod_1.z.string().trim().min(1),
    fieldType: zod_1.z.string().trim().min(1),
    boundingBox: zod_1.z
        .object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        width: zod_1.z.number(),
        height: zod_1.z.number(),
    })
        .optional(),
    extractedRawText: zod_1.z.string().trim(),
    canonicalValue: zod_1.z.string().trim(),
    legibility: zod_1.z.enum([
        evaluation_types_js_1.LegibilityRatings.CLEAR,
        evaluation_types_js_1.LegibilityRatings.MARGINAL,
        evaluation_types_js_1.LegibilityRatings.UNREADABLE,
    ]),
    isLasaCandidate: zod_1.z.boolean().optional(),
    notes: zod_1.z.string().trim().optional(),
});
exports.adjudicateConflictSchema = zod_1.z.object({
    recordId: zod_1.z.string().trim().min(1),
    fieldName: zod_1.z.string().trim().min(1),
    adjudicatorId: zod_1.z.string().trim().min(1),
    adjudicatorRole: zod_1.z.enum([
        evaluation_types_js_1.AdjudicatorRoles.PHARMACIST,
        evaluation_types_js_1.AdjudicatorRoles.CLINICIAN,
        evaluation_types_js_1.AdjudicatorRoles.SAFETY_OFFICER,
    ]),
    resolvedCanonicalValue: zod_1.z.string().trim().min(1),
    resolvedLegibility: zod_1.z.enum([
        evaluation_types_js_1.LegibilityRatings.CLEAR,
        evaluation_types_js_1.LegibilityRatings.MARGINAL,
        evaluation_types_js_1.LegibilityRatings.UNREADABLE,
    ]),
    adjudicationNotes: zod_1.z.string().trim().min(5),
});
exports.executeCalibrationSchema = zod_1.z.object({
    maxAcceptableFalseVerifiedRate: zod_1.z.number().positive().max(0.5, 'Safety target cannot exceed 50%'),
    confidenceLevel: zod_1.z.number().min(0.8).max(0.99).default(0.95),
    calibrationSplitId: zod_1.z.string().trim().min(1),
    lockedTestSplitId: zod_1.z.string().trim().min(1),
});
exports.executeEvaluationSchema = zod_1.z.object({
    pipelineVersion: zod_1.z.string().trim().default('1.0.0'),
    targetDocumentDatasetId: zod_1.z.string().trim().default('DS-DOCS-CLINICAL-2026'),
    targetVoiceDatasetId: zod_1.z.string().trim().default('DS-VOICE-MULTILINGUAL-2026'),
    targetScenarioDatasetId: zod_1.z.string().trim().default('DS-REDFLAG-SCENARIOS-2026'),
});
exports.signReportSchema = zod_1.z.object({
    reportId: zod_1.z.string().trim().min(1),
    signerName: zod_1.z.string().trim().min(2),
    signerRole: zod_1.z.enum([
        'CLINICAL_SAFETY_OFFICER',
        'LEAD_PHARMACIST',
        'CHIEF_MEDICAL_OFFICER',
        'HEAD_OF_COMPLIANCE',
    ]),
    acknowledgesNegativeResults: zod_1.z.boolean().refine((v) => v === true, {
        message: 'Explicit acknowledgment of negative results and error bounds is required',
    }),
    clinicalLimitationsStatement: zod_1.z
        .string()
        .trim()
        .min(20, 'Clinical limitations statement must be at least 20 characters'),
    signingSecret: zod_1.z.string().trim().optional(),
});
exports.sampleSizeCalculatorSchema = zod_1.z.object({
    targetMaxFalseVerifiedRate: zod_1.z.number().positive().max(0.2),
    confidenceLevel: zod_1.z.number().min(0.8).max(0.99).default(0.95),
    expectedUnderlyingRate: zod_1.z.number().min(0).max(0.1).optional(),
});
exports.driftAnalysisSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    totalReviewedRecords: zod_1.z.number().int().positive(),
    sampleSize: zod_1.z.number().int().positive(),
    doctorCorrectionCount: zod_1.z.number().int().nonnegative(),
    baselineFalseVerifiedRate: zod_1.z.number().nonnegative().default(0.005),
});
