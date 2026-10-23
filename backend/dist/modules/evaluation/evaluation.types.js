"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjudicatorRoles = exports.AdjudicationStatuses = exports.LegibilityRatings = exports.AmbientNoiseLevels = exports.ImageSources = exports.ImageQualities = exports.DocumentRenderStyles = exports.DatasetModalities = exports.DatasetSplits = void 0;
// ==========================================
// 1. DATASET REGISTRY & SPLITS
// ==========================================
exports.DatasetSplits = {
    DEVELOPMENT: 'DEVELOPMENT',
    CALIBRATION: 'CALIBRATION',
    TEST: 'TEST', // LOCKED: Never used for tuning/training
};
exports.DatasetModalities = {
    DOCUMENTS: 'DOCUMENTS',
    VOICE: 'VOICE',
    SCENARIOS: 'SCENARIOS',
    SUMMARIES: 'SUMMARIES',
    USABILITY: 'USABILITY',
    TIME_AND_MOTION: 'TIME_AND_MOTION',
};
exports.DocumentRenderStyles = {
    PRINTED: 'PRINTED',
    HANDWRITTEN: 'HANDWRITTEN',
    MIXED: 'MIXED',
};
exports.ImageQualities = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    DEGRADED: 'DEGRADED',
    BLURRED: 'BLURRED',
    LOW_LIGHT: 'LOW_LIGHT',
};
exports.ImageSources = {
    MOBILE_CAM: 'MOBILE_CAM',
    FLATBED_SCANNER: 'FLATBED_SCANNER',
    KIOSK_CAM: 'KIOSK_CAM',
    SYNTHETIC: 'SYNTHETIC',
};
exports.AmbientNoiseLevels = {
    QUIET: 'QUIET',
    MODERATE_AMBIENT: 'MODERATE_AMBIENT',
    LOUD_PUBLIC_CLINIC: 'LOUD_PUBLIC_CLINIC',
};
exports.LegibilityRatings = {
    CLEAR: 'CLEAR',
    MARGINAL: 'MARGINAL',
    UNREADABLE: 'UNREADABLE', // Truly illegible fields MUST have ground truth UNREADABLE
};
// ==========================================
// 2. ANNOTATION & ADJUDICATION
// ==========================================
exports.AdjudicationStatuses = {
    PENDING: 'PENDING',
    AGREED: 'AGREED',
    ADJUDICATED: 'ADJUDICATED',
    UNRESOLVED: 'UNRESOLVED',
};
exports.AdjudicatorRoles = {
    PHARMACIST: 'PHARMACIST', // Mandatory for drug / medication fields
    CLINICIAN: 'CLINICIAN', // Mandatory for diagnosis / red-flag clinical fields
    SAFETY_OFFICER: 'SAFETY_OFFICER',
};
