import crypto from 'crypto';
import {
  EvaluationReport,
  HumanSignOff,
} from './evaluation.types.js';
import { EvaluationRunnerService } from './evaluation-runner.service.js';
import { DatasetRegistryService } from './dataset-registry.service.js';
import { logger } from '../../config/logger.js';

export interface ReportSigningPayload {
  reportId: string;
  signerName: string;
  signerRole: 'CLINICAL_SAFETY_OFFICER' | 'LEAD_PHARMACIST' | 'CHIEF_MEDICAL_OFFICER' | 'HEAD_OF_COMPLIANCE';
  acknowledgesNegativeResults: boolean;
  clinicalLimitationsStatement: string;
  signingSecret?: string;
}

export interface ReleaseGateCheckResult {
  passed: boolean;
  reasons: string[];
  reportId: string;
  falseVerifiedUpper95: number;
  evaluatedAt: string;
}

export class EvaluationGovernanceService {
  private static readonly MAX_ACCEPTABLE_FALSE_VERIFIED_UPPER95 = 0.02; // 2% clinical safety ceiling

  /**
   * Signs an evaluation report by a named human clinician or safety officer.
   * STRICT GOVERNANCE:
   * - Signer must explicitly acknowledge negative results.
   * - Signer must provide a clinical limitations statement.
   * - Generates an immutable cryptographic signature linked to the report hash.
   */
  public static signReport(payload: ReportSigningPayload): EvaluationReport {
    const report = EvaluationRunnerService.getReport(payload.reportId);
    if (!report) {
      throw new Error(`Evaluation report '${payload.reportId}' not found.`);
    }

    if (!payload.signerName || payload.signerName.trim().length === 0) {
      throw new Error('Signer name is mandatory for clinical governance sign-off.');
    }

    if (!payload.acknowledgesNegativeResults) {
      throw new Error(
        'Human sign-off cannot proceed without explicit acknowledgment of negative results and error bounds.'
      );
    }

    if (!payload.clinicalLimitationsStatement || payload.clinicalLimitationsStatement.trim().length < 20) {
      throw new Error(
        'A comprehensive clinical limitations statement (minimum 20 characters) is required for report sign-off.'
      );
    }

    // Check if this signer role has already signed
    if (report.signOffs.some((s) => s.signerRole === payload.signerRole)) {
      throw new Error(`Report has already been signed by a '${payload.signerRole}'.`);
    }

    const signingSecret = payload.signingSecret || 'HOSPITAL-CLINICAL-GOVERNANCE-SECRET-KEY';
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${report.reportSha256Hash}::${payload.signerRole}::${payload.signerName}::${new Date().toISOString()}`)
      .digest('hex');

    const signOff: HumanSignOff = {
      signOffId: `SIG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      signerName: payload.signerName.trim(),
      signerRole: payload.signerRole,
      signedAt: new Date().toISOString(),
      acknowledgesNegativeResults: true,
      clinicalLimitationsStatement: payload.clinicalLimitationsStatement.trim(),
      cryptographicSignature: signature,
    };

    report.signOffs.push(signOff);

    // Full sign-off requires at least Clinical Safety Officer AND Lead Pharmacist (or CMO)
    const hasSafetyOfficer = report.signOffs.some((s) => s.signerRole === 'CLINICAL_SAFETY_OFFICER');
    const hasPharmacistOrCmo = report.signOffs.some(
      (s) => s.signerRole === 'LEAD_PHARMACIST' || s.signerRole === 'CHIEF_MEDICAL_OFFICER'
    );

    if (hasSafetyOfficer && hasPharmacistOrCmo) {
      report.isFullySignedOff = true;
      report.releaseGateApprovalStatus = 'APPROVED';
    }

    logger.info('[REPORT_SIGNED_OFF]', {
      reportId: report.reportId,
      signerName: payload.signerName,
      signerRole: payload.signerRole,
      isFullySignedOff: report.isFullySignedOff,
    });

    return report;
  }

  /**
   * Release-Gate Verification for Module 10 ReleaseGatesService:
   * Asserts that production deployment has an approved, signed evaluation report
   * meeting all statutory clinical safety thresholds.
   */
  public static verifyReleaseGateSafety(reportId?: string): ReleaseGateCheckResult {
    const reasons: string[] = [];

    // Find report
    let report: EvaluationReport | undefined;
    if (reportId) {
      report = EvaluationRunnerService.getReport(reportId);
    } else {
      // Find latest approved report
      const all = EvaluationRunnerService.listReports();
      report = all.find((r) => r.isFullySignedOff && r.releaseGateApprovalStatus === 'APPROVED');
    }

    if (!report) {
      return {
        passed: false,
        reasons: ['No fully signed-off evaluation report found. Deployment to production is strictly blocked.'],
        reportId: reportId || 'NONE',
        falseVerifiedUpper95: 1.0,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Check 1: Full human sign-off
    if (!report.isFullySignedOff) {
      reasons.push('Evaluation report is missing mandatory clinical board human sign-offs.');
    }

    // Check 2: Primary Document Safety Metric: false-VERIFIED upper 95% bound
    const docUpper95 = report.documentMetrics.falseVerifiedRate.upper95;
    if (docUpper95 > this.MAX_ACCEPTABLE_FALSE_VERIFIED_UPPER95) {
      reasons.push(
        `Document False-VERIFIED upper 95% bound (${(docUpper95 * 100).toFixed(2)}%) exceeds safety ceiling (${(this.MAX_ACCEPTABLE_FALSE_VERIFIED_UPPER95 * 100).toFixed(2)}%).`
      );
    }

    // Check 3: Zero unsupported summary claims
    if (report.summaryMetrics.unsupportedClaimsCount > 0) {
      reasons.push(`AI Summarization contains ${report.summaryMetrics.unsupportedClaimsCount} unsupported claims (mandatory target: 0).`);
    }

    // Check 4: Emergency Red-Flag Sensitivity = 100%
    if (report.redFlagMetrics.falseNegatives > 0) {
      reasons.push(`Red-flag rule evaluation missed ${report.redFlagMetrics.falseNegatives} emergency clinical red flags.`);
    }

    // Check 5: Fairness: No unmeasured enabled features
    if (report.fairnessAudit.hasUnmeasuredEnabledFeatures) {
      reasons.push('System contains unmeasured languages or document types enabled without evaluation data.');
    }

    const passed = reasons.length === 0;

    return {
      passed,
      reasons,
      reportId: report.reportId,
      falseVerifiedUpper95: docUpper95,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Governance Audit: Verifies study retention and scheduled deletion compliance.
   */
  public static verifyStudyRetention(datasetId: string): {
    datasetId: string;
    isExpired: boolean;
    retentionExpiryDate: string;
    actionRequired: 'NONE' | 'PURGE_DELETED_STUDY_DATA';
  } {
    const ds = DatasetRegistryService.getDataset(datasetId);
    if (!ds) {
      throw new Error(`Dataset '${datasetId}' not found.`);
    }

    const now = new Date();
    const expiry = new Date(ds.retentionExpiryDate);
    const isExpired = now.getTime() > expiry.getTime();

    return {
      datasetId,
      isExpired,
      retentionExpiryDate: ds.retentionExpiryDate,
      actionRequired: isExpired ? 'PURGE_DELETED_STUDY_DATA' : 'NONE',
    };
  }
}
