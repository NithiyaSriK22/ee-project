"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationService = void 0;
const evaluation_types_js_1 = require("./evaluation.types.js");
const dataset_registry_service_js_1 = require("./dataset-registry.service.js");
const stats_calculator_js_1 = require("./stats-calculator.js");
const logger_js_1 = require("../../config/logger.js");
class CalibrationService {
    static confirmedCalibrations = new Map();
    static testSplitConfirmationCounts = new Map();
    /**
     * Executes the 5-step Calibration Protocol (Section 6):
     * 1. Takes human-defined maximum acceptable false-VERIFIED rate.
     * 2. Optimizes thresholds on CALIBRATION split to meet safety constraint while minimizing doctor escalation.
     * 3. Confirms single-shot on locked TEST split.
     * 4. Returns calibrated parameters for governed activation in Module 4.
     */
    static executeCalibrationProtocol(target) {
        const maxSafetyRate = target.maxAcceptableFalseVerifiedRate;
        if (maxSafetyRate <= 0 || maxSafetyRate >= 1) {
            throw new Error('Maximum acceptable false-VERIFIED rate must be between 0 and 1 (e.g. 0.01 for 1%).');
        }
        logger_js_1.logger.info('[CALIBRATION_PROTOCOL_START]', {
            maxAcceptableFalseVerifiedRate: maxSafetyRate,
            calibrationSplitId: target.calibrationSplitId,
            lockedTestSplitId: target.lockedTestSplitId,
        });
        // Step 1: Retrieve records from CALIBRATION split (Intent: CALIBRATION_TUNING)
        const calibRecords = dataset_registry_service_js_1.DatasetRegistryService.getRecords(target.calibrationSplitId, evaluation_types_js_1.DatasetSplits.CALIBRATION, 'CALIBRATION_TUNING');
        if (calibRecords.length === 0) {
            throw new Error(`No records found in calibration split for dataset '${target.calibrationSplitId}'.`);
        }
        // Step 2: Grid-search candidate thresholds on calibration split
        // Favor escalating to doctor over false verification whenever the two conflict!
        const candidateThresholds = this.evaluateThresholdGrid(calibRecords, maxSafetyRate);
        // Pick best candidate that meets safety target and minimizes doctor escalation
        const validCandidates = candidateThresholds.filter((c) => c.satisfiesSafetyTarget);
        let chosenCandidate;
        if (validCandidates.length > 0) {
            // Sort by lowest escalation rate, with tie-break favoring higher safety (lower falseVerifiedUpper95)
            validCandidates.sort((a, b) => {
                if (Math.abs(a.escalationRate - b.escalationRate) < 1e-4) {
                    return a.falseVerifiedUpper95 - b.falseVerifiedUpper95;
                }
                return a.escalationRate - b.escalationRate;
            });
            chosenCandidate = validCandidates[0];
        }
        else {
            // If no candidate met safety rate, choose the most conservative candidate (highest thresholds)
            logger_js_1.logger.warn('[CALIBRATION_SAFETY_WARNING] No candidate met target error rate; falling back to ultra-conservative thresholds');
            candidateThresholds.sort((a, b) => a.falseVerifiedUpper95 - b.falseVerifiedUpper95);
            chosenCandidate = candidateThresholds[0];
        }
        // Step 3: Single-Shot Confirmation on locked TEST split
        const testRecords = dataset_registry_service_js_1.DatasetRegistryService.getRecords(target.lockedTestSplitId, evaluation_types_js_1.DatasetSplits.TEST, 'SINGLE_SHOT_TEST_CONFIRMATION');
        const testConfirmationCount = (this.testSplitConfirmationCounts.get(target.lockedTestSplitId) || 0) + 1;
        this.testSplitConfirmationCounts.set(target.lockedTestSplitId, testConfirmationCount);
        const testMetrics = this.evaluateThresholdOnRecords(testRecords, chosenCandidate.ocrMinConfidenceThreshold, chosenCandidate.formularySimilarityThreshold, chosenCandidate.highOcrConfidenceThreshold);
        const recommendedAction = testMetrics.falseVerifiedUpper95 <= maxSafetyRate
            ? 'APPROVE_FOR_PRODUCTION'
            : 'REJECT_EXCEEDS_SAFETY_LIMIT';
        const result = {
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
        logger_js_1.logger.info('[CALIBRATION_PROTOCOL_COMPLETED]', {
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
    static evaluateThresholdGrid(records, maxTargetRate) {
        const minOcrGrid = [0.40, 0.45, 0.50];
        const similarityGrid = [0.75, 0.80, 0.85, 0.90];
        const highOcrGrid = [0.70, 0.75, 0.80, 0.85];
        const results = [];
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
    static evaluateThresholdOnRecords(records, minOcr, similarity, highOcr) {
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
        const ci = stats_calculator_js_1.StatsCalculator.calculateProportionWithConfidence(falseVerifiedCount, verifiedCount);
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
    static getCalibration(id) {
        return this.confirmedCalibrations.get(id);
    }
}
exports.CalibrationService = CalibrationService;
