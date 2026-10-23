"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftMonitorService = void 0;
const stats_calculator_js_1 = require("./stats-calculator.js");
const logger_js_1 = require("../../config/logger.js");
class DriftMonitorService {
    static auditSamples = [];
    /**
     * Analyzes a random audit sample of doctor-confirmed records during pilot operations
     * to detect distribution drift, OCR degradation, or unexpected clinical handwriting drift.
     */
    static analyzeAuditSample(params) {
        if (params.sampleSize <= 0) {
            throw new Error('Sample size must be greater than zero.');
        }
        const empiricalCi = stats_calculator_js_1.StatsCalculator.calculateProportionWithConfidence(params.doctorCorrectionCount, params.sampleSize);
        // Drift Detection: If the lower 95% bound of current doctor corrections exceeds the baseline
        // OR the point estimate is more than 3x baseline rate with at least 5 corrections
        const driftDetected = empiricalCi.lower95 > params.baselineFalseVerifiedRate ||
            (params.doctorCorrectionCount >= 5 &&
                empiricalCi.pointEstimate > params.baselineFalseVerifiedRate * 3.0);
        let recommendedAction = 'MAINTAIN_CURRENT_THRESHOLDS';
        if (driftDetected) {
            recommendedAction =
                empiricalCi.pointEstimate > 0.05 ? 'SUSPEND_AUTOMATION' : 'SCHEDULE_RECALIBRATION';
            logger_js_1.logger.warn('[PILOT_DRIFT_DETECTED]', {
                startDate: params.startDate,
                endDate: params.endDate,
                sampleSize: params.sampleSize,
                doctorCorrections: params.doctorCorrectionCount,
                empiricalRate: empiricalCi.pointEstimate,
                baselineRate: params.baselineFalseVerifiedRate,
                recommendedAction,
            });
        }
        const sample = {
            auditPeriodStart: params.startDate,
            auditPeriodEnd: params.endDate,
            totalDoctorReviewedRecords: params.totalReviewedRecords,
            sampledRecordsCount: params.sampleSize,
            doctorCorrectionCount: params.doctorCorrectionCount,
            realWorldFalseVerifiedRate: empiricalCi,
            baselineFalseVerifiedRate: params.baselineFalseVerifiedRate,
            driftDetected,
            recommendedAction,
        };
        this.auditSamples.push(sample);
        return sample;
    }
    /**
     * Retrieves all historical drift audit samples.
     */
    static getHistoricalDriftSamples() {
        return [...this.auditSamples];
    }
}
exports.DriftMonitorService = DriftMonitorService;
