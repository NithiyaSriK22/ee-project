import { DriftAuditSample } from './evaluation.types.js';
import { StatsCalculator } from './stats-calculator.js';
import { logger } from '../../config/logger.js';

export class DriftMonitorService {
  private static auditSamples: DriftAuditSample[] = [];

  /**
   * Analyzes a random audit sample of doctor-confirmed records during pilot operations
   * to detect distribution drift, OCR degradation, or unexpected clinical handwriting drift.
   */
  public static analyzeAuditSample(params: {
    startDate: string;
    endDate: string;
    totalReviewedRecords: number;
    sampleSize: number;
    doctorCorrectionCount: number;
    baselineFalseVerifiedRate: number; // Historical rate from calibration report e.g. 0.005
  }): DriftAuditSample {
    if (params.sampleSize <= 0) {
      throw new Error('Sample size must be greater than zero.');
    }

    const empiricalCi = StatsCalculator.calculateProportionWithConfidence(
      params.doctorCorrectionCount,
      params.sampleSize
    );

    // Drift Detection: If the lower 95% bound of current doctor corrections exceeds the baseline
    // OR the point estimate is more than 3x baseline rate with at least 5 corrections
    const driftDetected =
      empiricalCi.lower95 > params.baselineFalseVerifiedRate ||
      (params.doctorCorrectionCount >= 5 &&
        empiricalCi.pointEstimate > params.baselineFalseVerifiedRate * 3.0);

    let recommendedAction: 'MAINTAIN_CURRENT_THRESHOLDS' | 'SCHEDULE_RECALIBRATION' | 'SUSPEND_AUTOMATION' =
      'MAINTAIN_CURRENT_THRESHOLDS';

    if (driftDetected) {
      recommendedAction =
        empiricalCi.pointEstimate > 0.05 ? 'SUSPEND_AUTOMATION' : 'SCHEDULE_RECALIBRATION';

      logger.warn('[PILOT_DRIFT_DETECTED]', {
        startDate: params.startDate,
        endDate: params.endDate,
        sampleSize: params.sampleSize,
        doctorCorrections: params.doctorCorrectionCount,
        empiricalRate: empiricalCi.pointEstimate,
        baselineRate: params.baselineFalseVerifiedRate,
        recommendedAction,
      });
    }

    const sample: DriftAuditSample = {
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
  public static getHistoricalDriftSamples(): DriftAuditSample[] {
    return [...this.auditSamples];
  }
}
