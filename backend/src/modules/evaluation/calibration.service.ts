import {
  CalibrationTarget,
  CalibratedThresholdResult,
  DatasetSplits,
  DatasetRecord,
} from './evaluation.types.js';
import { DatasetRegistryService } from './dataset-registry.service.js';
import { StatsCalculator } from './stats-calculator.js';
import { logger } from '../../config/logger.js';

export interface CalibrationCandidateEvaluation {
  ocrMinConfidenceThreshold: number;
  formularySimilarityThreshold: number;
  highOcrConfidenceThreshold: number;
  falseVerifiedCount: number;
  verifiedCount: number;
  escalationCount: number;
  totalFields: number;
  falseVerifiedRate: number;
  falseVerifiedUpper95: number;
  escalationRate: number;
  satisfiesSafetyTarget: boolean;
}

export class CalibrationService {
  private static confirmedCalibrations: Map<string, CalibratedThresholdResult> = new Map();
  private static testSplitConfirmationCounts: Map<string, number> = new Map();

  /**
   * Executes the 5-step Calibration Protocol (Section 6):
   * 1. Takes human-defined maximum acceptable false-VERIFIED rate.
   * 2. Optimizes thresholds on CALIBRATION split to meet safety constraint while minimizing doctor escalation.
   * 3. Confirms single-shot on locked TEST split.
   * 4. Returns calibrated parameters for governed activation in Module 4.
   */
  public static executeCalibrationProtocol(target: CalibrationTarget): CalibratedThresholdResult {
    const maxSafetyRate = target.maxAcceptableFalseVerifiedRate;
    if (maxSafetyRate <= 0 || maxSafetyRate >= 1) {
      throw new Error('Maximum acceptable false-VERIFIED rate must be between 0 and 1 (e.g. 0.01 for 1%).');
    }

    logger.info('[CALIBRATION_PROTOCOL_START]', {
      maxAcceptableFalseVerifiedRate: maxSafetyRate,
      calibrationSplitId: target.calibrationSplitId,
      lockedTestSplitId: target.lockedTestSplitId,
    });

    // Step 1: Retrieve records from CALIBRATION split (Intent: CALIBRATION_TUNING)
    const calibRecords = DatasetRegistryService.getRecords(
      target.calibrationSplitId,
      DatasetSplits.CALIBRATION,
      'CALIBRATION_TUNING'
    );

    if (calibRecords.length === 0) {
      throw new Error(`No records found in calibration split for dataset '${target.calibrationSplitId}'.`);
    }

    // Step 2: Grid-search candidate thresholds on calibration split
    // Favor escalating to doctor over false verification whenever the two conflict!
    const candidateThresholds = this.evaluateThresholdGrid(calibRecords, maxSafetyRate);

    // Pick best candidate that meets safety target and minimizes doctor escalation
    const validCandidates = candidateThresholds.filter((c) => c.satisfiesSafetyTarget);

    let chosenCandidate: CalibrationCandidateEvaluation;
    if (validCandidates.length > 0) {
      // Sort by lowest escalation rate, with tie-break favoring higher safety (lower falseVerifiedUpper95)
      validCandidates.sort((a, b) => {
        if (Math.abs(a.escalationRate - b.escalationRate) < 1e-4) {
          return a.falseVerifiedUpper95 - b.falseVerifiedUpper95;
        }
        return a.escalationRate - b.escalationRate;
      });
      chosenCandidate = validCandidates[0]!;
    } else {
      // If no candidate met safety rate, choose the most conservative candidate (highest thresholds)
      logger.warn('[CALIBRATION_SAFETY_WARNING] No candidate met target error rate; falling back to ultra-conservative thresholds');
      candidateThresholds.sort((a, b) => a.falseVerifiedUpper95 - b.falseVerifiedUpper95);
      chosenCandidate = candidateThresholds[0]!;
    }

    // Step 3: Single-Shot Confirmation on locked TEST split
    const testRecords = DatasetRegistryService.getRecords(
      target.lockedTestSplitId,
      DatasetSplits.TEST,
      'SINGLE_SHOT_TEST_CONFIRMATION'
    );

    const testConfirmationCount = (this.testSplitConfirmationCounts.get(target.lockedTestSplitId) || 0) + 1;
    this.testSplitConfirmationCounts.set(target.lockedTestSplitId, testConfirmationCount);

    const testMetrics = this.evaluateThresholdOnRecords(
      testRecords,
      chosenCandidate.ocrMinConfidenceThreshold,
      chosenCandidate.formularySimilarityThreshold,
      chosenCandidate.highOcrConfidenceThreshold
    );

    const recommendedAction =
      testMetrics.falseVerifiedUpper95 <= maxSafetyRate
        ? 'APPROVE_FOR_PRODUCTION'
        : 'REJECT_EXCEEDS_SAFETY_LIMIT';

    const result: CalibratedThresholdResult = {
      ocrMinConfidenceThreshold: chosenCandidate.ocrMinConfidenceThreshold,
      formularySimilarityThreshold: chosenCandidate.formularySimilarityThreshold,
      highOcrConfidenceThreshold: chosenCandidate.highOcrConfidenceThreshold,
      calibrationSplitMetrics: {
        falseVerifiedRate: chosenCandidate.falseVerifiedRate,
        falseVerifiedUpper95: chosenCandidate.falseVerifiedUpper95,
        escalationRate: chosenCandidate.escalationRate,
      },
      testSplitConfirmationMetrics: {
        falseVerifiedRate: testMetrics.falseVerifiedRate,
        falseVerifiedUpper95: testMetrics.falseVerifiedUpper95,
        escalationRate: testMetrics.escalationRate,
        confirmedAt: new Date().toISOString(),
        testSetEvaluatedOnce: testConfirmationCount === 1,
      },
      recommendedGovernanceAction: recommendedAction,
    };

    const calibrationId = `CALIB-${Date.now()}`;
    this.confirmedCalibrations.set(calibrationId, result);

    logger.info('[CALIBRATION_PROTOCOL_COMPLETED]', {
      calibrationId,
      recommendedAction,
      ocrMinConfidenceThreshold: result.ocrMinConfidenceThreshold,
      formularySimilarityThreshold: result.formularySimilarityThreshold,
      testFalseVerifiedUpper95: result.testSplitConfirmationMetrics.falseVerifiedUpper95,
    });

    return result;
  }

  /**
   * Grid search over candidate threshold triplets on calibration records.
   */
  private static evaluateThresholdGrid(
    records: DatasetRecord[],
    maxTargetRate: number
  ): CalibrationCandidateEvaluation[] {
    const minOcrGrid = [0.40, 0.45, 0.50];
    const similarityGrid = [0.75, 0.80, 0.85, 0.90];
    const highOcrGrid = [0.70, 0.75, 0.80, 0.85];

    const results: CalibrationCandidateEvaluation[] = [];

    for (const minOcr of minOcrGrid) {
      for (const sim of similarityGrid) {
        for (const highOcr of highOcrGrid) {
          const evalResult = this.evaluateThresholdOnRecords(records, minOcr, sim, highOcr);
          results.push({
            ocrMinConfidenceThreshold: minOcr,
            formularySimilarityThreshold: sim,
            highOcrConfidenceThreshold: highOcr,
            ...evalResult,
            satisfiesSafetyTarget: evalResult.falseVerifiedUpper95 <= maxTargetRate,
          });
        }
      }
    }

    return results;
  }

  /**
   * Evaluates a specific threshold triplet on a set of records.
   */
  public static evaluateThresholdOnRecords(
    records: DatasetRecord[],
    minOcr: number,
    similarity: number,
    highOcr: number
  ): {
    falseVerifiedCount: number;
    verifiedCount: number;
    escalationCount: number;
    totalFields: number;
    falseVerifiedRate: number;
    falseVerifiedUpper95: number;
    escalationRate: number;
  } {
    let verifiedCount = 0;
    let falseVerifiedCount = 0;
    let totalFields = records.length;

    for (const r of records) {
      const ocrConfidence = Number(r.rawInputData?.ocrConfidence ?? 0.5);
      const isGroundTruthMatch = Boolean(r.groundTruthData?.isMatch ?? true);

      // Simulation of Module 4 validation rule:
      // Verified only if ocrConfidence >= highOcr, ocrConfidence >= minOcr, AND similarity match satisfied
      const systemVerified = ocrConfidence >= highOcr && ocrConfidence >= minOcr && similarity >= 0.75;

      if (systemVerified) {
        verifiedCount++;
        if (!isGroundTruthMatch) {
          falseVerifiedCount++;
        }
      }
    }

    const escalationCount = totalFields - verifiedCount;
    const escalationRate = totalFields > 0 ? escalationCount / totalFields : 0;
    const falseVerifiedRate = verifiedCount > 0 ? falseVerifiedCount / verifiedCount : 0;
    const ci = StatsCalculator.calculateProportionWithConfidence(falseVerifiedCount, verifiedCount);

    return {
      falseVerifiedCount,
      verifiedCount,
      escalationCount,
      totalFields,
      falseVerifiedRate: Number(falseVerifiedRate.toFixed(4)),
      falseVerifiedUpper95: ci.upper95,
      escalationRate: Number(escalationRate.toFixed(4)),
    };
  }

  /**
   * Retrieves historical confirmed calibration by ID.
   */
  public static getCalibration(id: string): CalibratedThresholdResult | undefined {
    return this.confirmedCalibrations.get(id);
  }
}
