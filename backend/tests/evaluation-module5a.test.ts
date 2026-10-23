import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StatsCalculator,
  DatasetRegistryService,
  TestSetLeakageError,
  AnnotationService,
  CalibrationService,
  EvaluationRunnerService,
  EvaluationGovernanceService,
  DriftMonitorService,
  CiEvaluationRunner,
  DatasetSplits,
  DatasetModalities,
  LegibilityRatings,
  AdjudicatorRoles,
} from '../src/modules/evaluation/index.js';
import { ReleaseGatesService } from '../src/modules/deployment/release-gates.service.js';

describe('MODULE 5A — EVALUATION, CALIBRATION & GROUND-TRUTH PROGRAM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. STATISTICAL CALCULATOR & HAND-COMPUTED FIXTURES (Section 5)
  // ============================================================================

  describe('Statistical Metric Calculations & Confidence Intervals', () => {
    it('Calculates exact Wilson Score 95% Confidence Interval for non-zero failures', () => {
      // Hand-computed fixture: 5 failures out of 100 trials (p = 0.05)
      // Wilson center = (0.05 + 1.96^2 / 200) / (1 + 1.96^2 / 100) = 0.0667 / 1.0384 = 0.0642
      // Lower bound approx ~0.0215, Upper bound approx ~0.1118
      const ci = StatsCalculator.calculateWilsonScoreInterval(5, 100);

      expect(ci.pointEstimate).toBe(0.05);
      expect(ci.lower95).toBeGreaterThan(0.02);
      expect(ci.lower95).toBeLessThan(0.025);
      expect(ci.upper95).toBeGreaterThan(0.11);
      expect(ci.upper95).toBeLessThan(0.12);
      expect(ci.method).toBe('WILSON_SCORE');
    });

    it('Applies Rule of Three for zero failures (upper 95% bound ~ 3 / n)', () => {
      // 0 failures in 300 trials => upper 95% bound = 3 / 300 = 0.01 (1%)
      const ci300 = StatsCalculator.calculateRuleOfThreeUpper(300);
      expect(ci300.pointEstimate).toBe(0);
      expect(ci300.upper95).toBe(0.01);

      // 0 failures in 100 trials => upper 95% bound = 3 / 100 = 0.03 (3%)
      const ci100 = StatsCalculator.calculateRuleOfThreeUpper(100);
      expect(ci100.upper95).toBe(0.03);

      // 0 failures in 0 trials handles gracefully
      const ci0 = StatsCalculator.calculateRuleOfThreeUpper(0);
      expect(ci0.upper95).toBe(1.0);
    });

    it('Sample Size Calculator derives required samples from human safety target', () => {
      // Target max false-verified rate = 1% (0.01)
      // Rule of three: n >= 3 / 0.01 = 300 samples
      const calc1Percent = StatsCalculator.calculateSampleSize({
        targetMaxFalseVerifiedRate: 0.01,
        confidenceLevel: 0.95,
      });

      expect(calc1Percent.ruleOfThreeRequiredN).toBe(300);
      expect(calc1Percent.recommendedMinimumSampleSize).toBeGreaterThanOrEqual(300);

      // Target max false-verified rate = 0.5% (0.005)
      // Rule of three: n >= 3 / 0.005 = 600 samples
      const calcHalfPercent = StatsCalculator.calculateSampleSize({
        targetMaxFalseVerifiedRate: 0.005,
        confidenceLevel: 0.95,
      });

      expect(calcHalfPercent.ruleOfThreeRequiredN).toBe(600);
    });

    it('Computes Cohen Kappa coefficient for inter-annotator agreement', () => {
      // Complete agreement
      const perfect = StatsCalculator.calculateInterAnnotatorAgreement(
        ['Paracetamol', 'Metformin', 'Amoxicillin'],
        ['Paracetamol', 'Metformin', 'Amoxicillin']
      );
      expect(perfect.rawAgreementRate).toBe(1.0);
      expect(perfect.cohensKappa).toBe(1.0);
      expect(perfect.adjudicationRequiredRate).toBe(0.0);

      // Partial agreement with discrepancy
      const partial = StatsCalculator.calculateInterAnnotatorAgreement(
        ['Paracetamol', 'Metformin', 'Amoxicillin', 'Aspirin'],
        ['Paracetamol', 'Metformin', 'Cephalexin', 'Aspirin']
      );
      expect(partial.rawAgreementRate).toBe(0.75);
      expect(partial.cohensKappa).toBeGreaterThan(0.5);
      expect(partial.disagreedFieldsCount).toBe(1);
    });

    it('Generates coverage-vs-error curve across threshold values', () => {
      const items = [
        { score: 0.95, isGroundTruthMatch: true },
        { score: 0.85, isGroundTruthMatch: true },
        { score: 0.75, isGroundTruthMatch: true },
        { score: 0.65, isGroundTruthMatch: false },
        { score: 0.45, isGroundTruthMatch: false },
      ];

      const curve = StatsCalculator.generateCoverageVsErrorCurve(items);
      expect(curve.length).toBeGreaterThan(5);

      // At strict threshold 0.90, coverage is lower but error rate is zero
      const strictPoint = curve.find((p) => p.thresholdValue === 0.9);
      expect(strictPoint).toBeDefined();
      expect(strictPoint!.falseVerifiedRate).toBe(0.0);

      // At loose threshold 0.50, coverage is higher but error rate increases
      const loosePoint = curve.find((p) => p.thresholdValue === 0.5);
      expect(loosePoint).toBeDefined();
      expect(loosePoint!.coverageRate).toBeGreaterThan(strictPoint!.coverageRate);
    });
  });

  // ============================================================================
  // 2. DATASET REGISTRY & SPLIT INTEGRITY (Section 3, 7, 9)
  // ============================================================================

  describe('Dataset Registry & Locked Test Split Isolation', () => {
    it('Enforces mandatory institutional ethics approval number and secondary consent', () => {
      expect(() => {
        DatasetRegistryService.registerDataset({
          id: 'DS-INVALID-NO-ETHICS',
          datasetCode: 'INVALID-CODE',
          version: '1.0.0',
          modality: DatasetModalities.DOCUMENTS,
          description: 'Invalid dataset without ethics',
          ethicsApprovalNumber: '', // Missing
          irbApprovalDate: new Date().toISOString(),
          consentForSecondaryUse: true,
          isEncryptedAtRest: true,
          isTestSplitLocked: true,
          retentionExpiryDate: '2028-01-01',
          createdAt: new Date().toISOString(),
        });
      }).toThrow('Institutional Ethics Approval Number is a mandatory prerequisite');

      expect(() => {
        DatasetRegistryService.registerDataset({
          id: 'DS-INVALID-NO-CONSENT',
          datasetCode: 'INVALID-CONSENT',
          version: '1.0.0',
          modality: DatasetModalities.DOCUMENTS,
          description: 'Invalid dataset without secondary consent',
          ethicsApprovalNumber: 'IRB-123',
          irbApprovalDate: new Date().toISOString(),
          consentForSecondaryUse: false, // Disallowed
          isEncryptedAtRest: true,
          isTestSplitLocked: true,
          retentionExpiryDate: '2028-01-01',
          createdAt: new Date().toISOString(),
        });
      }).toThrow('Explicit patient consent for secondary research use is required');
    });

    it('STRICT LEAKAGE GUARD: Blocks attempts to query locked TEST split for development or tuning', () => {
      // Trying to query TEST split with DEVELOPMENT intent
      expect(() => {
        DatasetRegistryService.getRecords(
          'DS-DOCS-CLINICAL-2026',
          DatasetSplits.TEST,
          'DEVELOPMENT' as any
        );
      }).toThrow(TestSetLeakageError);

      // Trying to query TEST split with CALIBRATION_TUNING intent
      expect(() => {
        DatasetRegistryService.getRecords(
          'DS-DOCS-CLINICAL-2026',
          DatasetSplits.TEST,
          'CALIBRATION_TUNING' as any
        );
      }).toThrow('Access to locked TEST split forbidden');
    });

    it('Permits querying TEST split ONLY under explicit single-shot test confirmation intent', () => {
      const records = DatasetRegistryService.getRecords(
        'DS-DOCS-CLINICAL-2026',
        DatasetSplits.TEST,
        'SINGLE_SHOT_TEST_CONFIRMATION'
      );
      expect(records.length).toBeGreaterThan(0);
      expect(records.every((r) => r.split === DatasetSplits.TEST)).toBe(true);
    });
  });

  // ============================================================================
  // 3. ANNOTATION & ADJUDICATION WORKFLOW (Section 4)
  // ============================================================================

  describe('Double-Blind Annotation, Adjudication & Role Gating', () => {
    const testRecordId = 'REC-TEST-ANN-01';

    it('Enforces UNREADABLE ground truth when field is marked illegible', () => {
      const ann = AnnotationService.submitAnnotation({
        recordId: testRecordId,
        annotatorId: 'ANN-DOC-01',
        annotatorRole: 'CLINICIAN',
        guidelineVersion: 'GUIDELINE-v1.0',
        fieldName: 'drug_name_line_3',
        fieldType: 'drug_name',
        extractedRawText: '??? scribbled line ???',
        canonicalValue: 'Metformin', // Annotator attempted to guess
        legibility: LegibilityRatings.UNREADABLE,
      });

      // Strict clinical rule: truly illegible fields have ground truth UNREADABLE
      expect(ann.canonicalValue).toBe(LegibilityRatings.UNREADABLE);
      expect(ann.legibility).toBe(LegibilityRatings.UNREADABLE);
    });

    it('Double-blind annotation records consensus when both annotators agree', () => {
      const field = 'drug_name_line_1';

      AnnotationService.submitAnnotation({
        recordId: testRecordId,
        annotatorId: 'USER-A',
        annotatorRole: 'CLINICIAN',
        guidelineVersion: 'GUIDELINE-v1.0',
        fieldName: field,
        fieldType: 'drug_name',
        extractedRawText: 'Paracetamol 500mg',
        canonicalValue: 'Paracetamol',
        legibility: LegibilityRatings.CLEAR,
      });

      AnnotationService.submitAnnotation({
        recordId: testRecordId,
        annotatorId: 'USER-B',
        annotatorRole: 'CLINICIAN',
        guidelineVersion: 'GUIDELINE-v1.0',
        fieldName: field,
        fieldType: 'drug_name',
        extractedRawText: 'Paracetamol 500mg',
        canonicalValue: 'Paracetamol',
        legibility: LegibilityRatings.CLEAR,
      });

      const groundTruth = AnnotationService.getGroundTruthForField(testRecordId, field);
      expect(groundTruth).toBeDefined();
      expect(groundTruth!.agreementStatus).toBe('AGREED');
      expect(groundTruth!.adjudicatedCanonicalValue).toBe('Paracetamol');
    });

    it('Gating: Drug field conflicts strictly mandate a PHARMACIST adjudicator', () => {
      const field = 'drug_dosage_conflict';

      AnnotationService.submitAnnotation({
        recordId: testRecordId,
        annotatorId: 'USER-X',
        annotatorRole: 'CLINICIAN',
        guidelineVersion: 'GUIDELINE-v1.0',
        fieldName: field,
        fieldType: 'drug_name',
        extractedRawText: 'Metformin 500mg',
        canonicalValue: 'Metformin',
        legibility: LegibilityRatings.CLEAR,
      });

      AnnotationService.submitAnnotation({
        recordId: testRecordId,
        annotatorId: 'USER-Y',
        annotatorRole: 'CLINICIAN',
        guidelineVersion: 'GUIDELINE-v1.0',
        fieldName: field,
        fieldType: 'drug_name',
        extractedRawText: 'Metformin 500mg',
        canonicalValue: 'Metformin XR',
        legibility: LegibilityRatings.CLEAR,
      });

      // A general safety officer attempt to adjudicate drug field must fail
      expect(() => {
        AnnotationService.adjudicateConflict({
          recordId: testRecordId,
          fieldName: field,
          adjudicatorId: 'SAFETY-OFFICER-01',
          adjudicatorRole: AdjudicatorRoles.SAFETY_OFFICER as any,
          resolvedCanonicalValue: 'Metformin',
          resolvedLegibility: LegibilityRatings.CLEAR,
          adjudicationNotes: 'Resolved by safety officer',
        });
      }).toThrow('requires adjudication by a licensed PHARMACIST');

      // Licensed pharmacist adjudication succeeds
      const resolved = AnnotationService.adjudicateConflict({
        recordId: testRecordId,
        fieldName: field,
        adjudicatorId: 'PHARM-RAJESH-01',
        adjudicatorRole: AdjudicatorRoles.PHARMACIST,
        resolvedCanonicalValue: 'Metformin',
        resolvedLegibility: LegibilityRatings.CLEAR,
        adjudicationNotes: 'Formulary cross-reference confirms standard release Metformin 500mg.',
      });

      expect(resolved.agreementStatus).toBe('ADJUDICATED');
      expect(resolved.adjudicatorRole).toBe(AdjudicatorRoles.PHARMACIST);
      expect(resolved.adjudicatedCanonicalValue).toBe('Metformin');
    });
  });

  // ============================================================================
  // 4. CALIBRATION PROTOCOL (Section 6)
  // ============================================================================

  describe('Calibration Protocol & Governed Threshold Activation', () => {
    it('Executes 5-step calibration: derives thresholds on CALIBRATION split, confirms on TEST split', () => {
      const calibrationResult = CalibrationService.executeCalibrationProtocol({
        maxAcceptableFalseVerifiedRate: 0.02, // 2% human safety threshold
        confidenceLevel: 0.95,
        calibrationSplitId: 'DS-DOCS-CLINICAL-2026',
        lockedTestSplitId: 'DS-DOCS-CLINICAL-2026',
      });

      expect(calibrationResult).toBeDefined();
      expect(calibrationResult.ocrMinConfidenceThreshold).toBeGreaterThanOrEqual(0.40);
      expect(calibrationResult.formularySimilarityThreshold).toBeGreaterThanOrEqual(0.75);
      expect(calibrationResult.calibrationSplitMetrics.falseVerifiedRate).toBeDefined();
      expect(calibrationResult.testSplitConfirmationMetrics.confirmedAt).toBeDefined();
      expect(calibrationResult.testSplitConfirmationMetrics.testSetEvaluatedOnce).toBe(true);
      expect(calibrationResult.recommendedGovernanceAction).toBe('APPROVE_FOR_PRODUCTION');
    });

    it('Fails calibration recommendation if test split error exceeds human safety limit', () => {
      // Very strict safety target of 0.0001 (virtually impossible)
      const strictResult = CalibrationService.executeCalibrationProtocol({
        maxAcceptableFalseVerifiedRate: 0.0001,
        confidenceLevel: 0.95,
        calibrationSplitId: 'DS-DOCS-CLINICAL-2026',
        lockedTestSplitId: 'DS-DOCS-CLINICAL-2026',
      });

      expect(strictResult.recommendedGovernanceAction).toBe('REJECT_EXCEEDS_SAFETY_LIMIT');
    });
  });

  // ============================================================================
  // 5. EVALUATION RUNNER & IMMUTABLE REPORTS (Section 7)
  // ============================================================================

  describe('Full Multi-Modality Evaluation Runner & Cryptographic Immutability', () => {
    it('Executes comprehensive pipeline evaluation producing SHA-256 hashed report', async () => {
      const report = await EvaluationRunnerService.executeFullEvaluation({
        pipelineVersion: '1.0.0',
        targetDocumentDatasetId: 'DS-DOCS-CLINICAL-2026',
        targetVoiceDatasetId: 'DS-VOICE-MULTILINGUAL-2026',
        targetScenarioDatasetId: 'DS-REDFLAG-SCENARIOS-2026',
      });

      expect(report.reportId).toBeDefined();
      expect(report.reportSha256Hash).toMatch(/^[a-f0-9]{64}$/);
      expect(report.isImmutable).toBe(true);

      // Verify Document Metrics
      expect(report.documentMetrics.totalFieldsEvaluated).toBe(450);
      expect(report.documentMetrics.falseVerifiedRate.upper95).toBeLessThanOrEqual(0.02);
      expect(report.documentMetrics.escalationRate).toBeGreaterThan(0.1);
      expect(report.documentMetrics.byFieldType.drug_name).toBeDefined();
      expect(report.documentMetrics.lasaNearMisses.lasaSafetyRate).toBe(1.0);

      // Verify Voice Metrics across languages
      expect(report.voiceMetrics.length).toBeGreaterThanOrEqual(6);
      const enVoice = report.voiceMetrics.find((v) => v.language === 'en');
      expect(enVoice).toBeDefined();
      expect(enVoice!.criticalConfirmationComplianceRate).toBe(1.0);

      // Verify AI Summary Metrics
      expect(report.summaryMetrics.unsupportedClaimsCount).toBe(0); // Zero unsupported claims
      expect(report.summaryMetrics.averageUsefulnessScore).toBeGreaterThanOrEqual(4.5);

      // Verify Red-Flag Metrics
      expect(report.redFlagMetrics.falseNegatives).toBe(0); // Zero missed red flags
      expect(report.redFlagMetrics.p95LatencyMs).toBeLessThan(100);

      // Verify Usability Cohorts
      const elderly = report.usabilityMetrics.find((u) => u.cohortName === 'ELDERLY');
      expect(elderly).toBeDefined();
      expect(elderly!.taskSuccessRate).toBeGreaterThan(0.9);

      // Verify Time and Motion
      expect(report.timeAndMotionStudy.averageDoctorMinutesSaved).toBeGreaterThan(3.0);
    });

    it('Compares two evaluation reports showing safety delta and efficiency metrics', () => {
      const allReports = EvaluationRunnerService.listReports();
      expect(allReports.length).toBeGreaterThanOrEqual(1);

      const comparison = EvaluationRunnerService.compareReports(
        allReports[0].reportId,
        allReports[0].reportId
      );

      expect(comparison.deltaFalseVerifiedUpper95).toBe(0.0);
      expect(comparison.deltaEscalationRate).toBe(0.0);
      expect(comparison.safetyImprovement).toBe(true);
    });
  });

  // ============================================================================
  // 6. GOVERNANCE, SIGN-OFF & RELEASE GATES (Section 7, 8, 10)
  // ============================================================================

  describe('Human Clinician Sign-Off & Release-Gate Safety Verification', () => {
    it('Requires explicit negative results acknowledgment and clinical limitations', () => {
      expect(() => {
        EvaluationGovernanceService.signReport({
          reportId: 'REP-BASELINE-v1.0.0',
          signerName: 'Dr. Test',
          signerRole: 'CLINICAL_SAFETY_OFFICER',
          acknowledgesNegativeResults: false, // Disallowed
          clinicalLimitationsStatement: 'Valid statement over 20 chars',
        });
      }).toThrow('acknowledgment of negative results and error bounds');

      expect(() => {
        EvaluationGovernanceService.signReport({
          reportId: 'REP-BASELINE-v1.0.0',
          signerName: 'Dr. Test',
          signerRole: 'CLINICAL_SAFETY_OFFICER',
          acknowledgesNegativeResults: true,
          clinicalLimitationsStatement: 'Too short', // < 20 chars
        });
      }).toThrow('minimum 20 characters');
    });

    it('Module 10 Release-Gates Service passes with approved signed evaluation report', () => {
      const gateEvaluation = ReleaseGatesService.evaluateReleaseGates();
      expect(gateEvaluation).toBeDefined();

      const summaryPromptGate = gateEvaluation.gates.find(
        (g) => g.gateKey === 'EVALUATED_SUMMARY_PROMPT'
      );
      expect(summaryPromptGate).toBeDefined();
      expect(summaryPromptGate!.passed).toBe(true);
      expect(summaryPromptGate!.details).toContain('Signed evaluation report');
    });

    it('Release-Gate verification fails if report exceeds false-VERIFIED ceiling', () => {
      // Test the release gate validator directly with simulated invalid report
      const mockReport = {
        reportId: 'REP-UNSAFE',
        documentMetrics: {
          falseVerifiedRate: { upper95: 0.05 }, // 5% exceeds 2% ceiling
        },
        summaryMetrics: { unsupportedClaimsCount: 1 }, // > 0
        redFlagMetrics: { falseNegatives: 1 }, // Missed emergency flag
        fairnessAudit: { hasUnmeasuredEnabledFeatures: true },
        isFullySignedOff: false,
      };

      vi.spyOn(EvaluationRunnerService, 'getReport').mockReturnValueOnce(mockReport as any);

      const check = EvaluationGovernanceService.verifyReleaseGateSafety('REP-UNSAFE');
      expect(check.passed).toBe(false);
      expect(check.reasons.length).toBeGreaterThanOrEqual(4);
      expect(check.reasons.some((r) => r.includes('exceeds safety ceiling'))).toBe(true);
      expect(check.reasons.some((r) => r.includes('unsupported claims'))).toBe(true);
    });
  });

  // ============================================================================
  // 7. CI RUNNER & LEAKAGE GUARD (Section 7, 9)
  // ============================================================================

  describe('CI Evaluation Runner (Synthetic & Dev Only)', () => {
    it('Executes CI job, confirms synthetic tests and proves test split leakage guard', () => {
      const ciResult = CiEvaluationRunner.runCiEvaluation();
      expect(ciResult.passed).toBe(true);
      expect(ciResult.testSplitLeakageGuardVerified).toBe(true);
      expect(ciResult.unsupportedClaimsCount).toBe(0);
      expect(ciResult.errors.length).toBe(0);
    });
  });

  // ============================================================================
  // 8. DRIFT MONITORING (Section 7)
  // ============================================================================

  describe('Drift Monitoring During Pilot Operations', () => {
    it('Identifies normal operations within expected baseline error rates', () => {
      const sample = DriftMonitorService.analyzeAuditSample({
        startDate: '2026-03-01T00:00:00Z',
        endDate: '2026-03-07T23:59:59Z',
        totalReviewedRecords: 500,
        sampleSize: 100,
        doctorCorrectionCount: 0,
        baselineFalseVerifiedRate: 0.005,
      });

      expect(sample.driftDetected).toBe(false);
      expect(sample.recommendedAction).toBe('MAINTAIN_CURRENT_THRESHOLDS');
    });

    it('Detects statistically significant drift when doctor corrections spike', () => {
      // Moderate drift (3% error rate) schedules recalibration
      const moderateSample = DriftMonitorService.analyzeAuditSample({
        startDate: '2026-03-08T00:00:00Z',
        endDate: '2026-03-14T23:59:59Z',
        totalReviewedRecords: 500,
        sampleSize: 100,
        doctorCorrectionCount: 3, // 3% error rate > 0.5% baseline
        baselineFalseVerifiedRate: 0.005,
      });

      expect(moderateSample.driftDetected).toBe(true);
      expect(moderateSample.recommendedAction).toBe('SCHEDULE_RECALIBRATION');

      // Severe drift (6% error rate) suspends automation
      const severeSample = DriftMonitorService.analyzeAuditSample({
        startDate: '2026-03-15T00:00:00Z',
        endDate: '2026-03-21T23:59:59Z',
        totalReviewedRecords: 500,
        sampleSize: 100,
        doctorCorrectionCount: 6, // 6% error rate exceeds 5% critical ceiling
        baselineFalseVerifiedRate: 0.005,
      });

      expect(severeSample.driftDetected).toBe(true);
      expect(severeSample.recommendedAction).toBe('SUSPEND_AUTOMATION');
    });
  });
});
