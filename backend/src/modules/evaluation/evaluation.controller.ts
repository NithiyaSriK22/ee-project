import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../utils/response.util.js';
import { DatasetRegistryService } from './dataset-registry.service.js';
import { AnnotationService } from './annotation.service.js';
import { CalibrationService } from './calibration.service.js';
import { EvaluationRunnerService } from './evaluation-runner.service.js';
import { EvaluationGovernanceService } from './evaluation-governance.service.js';
import { StatsCalculator } from './stats-calculator.js';
import { DriftMonitorService } from './drift-monitor.service.js';
import { CiEvaluationRunner } from './ci-evaluation-runner.js';
import { AppRequest } from '../../types/api.types.js';

export class EvaluationController {
  // ==========================================
  // DATASET REGISTRY ENDPOINTS
  // ==========================================

  public static listDatasets(_req: Request, res: Response): void {
    const datasets = DatasetRegistryService.listDatasets();
    ResponseUtil.success(res, datasets, 'Evaluation datasets retrieved successfully');
  }

  public static getDataset(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = String(req.params.id || '');
      const dataset = DatasetRegistryService.getDataset(id);
      if (!dataset) {
        ResponseUtil.error(res, 404, 'NOT_FOUND', `Dataset '${id}' not found`);
        return;
      }
      ResponseUtil.success(res, dataset, 'Dataset details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static registerDataset(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const created = DatasetRegistryService.registerDataset(req.body);
      ResponseUtil.success(res, created, 'Evaluation dataset registered successfully with ethics approval', 201);
    } catch (err) {
      next(err);
    }
  }

  public static addRecord(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const record = DatasetRegistryService.addRecord(req.body);
      ResponseUtil.success(res, record, 'Evaluation record added successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // ANNOTATION & ADJUDICATION ENDPOINTS
  // ==========================================

  public static submitAnnotation(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const annotatorId = req.user ? req.user.id : req.body.annotatorId;
      const annotatorRole = req.user ? req.user.role : req.body.annotatorRole;

      const annotation = AnnotationService.submitAnnotation({
        ...req.body,
        annotatorId,
        annotatorRole,
      });

      ResponseUtil.success(res, annotation, 'Field annotation recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static adjudicateConflict(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const adjudicatorId = req.user ? req.user.id : req.body.adjudicatorId;
      const result = AnnotationService.adjudicateConflict({
        ...req.body,
        adjudicatorId,
      });

      ResponseUtil.success(res, result, 'Annotation conflict adjudicated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static getAgreementMetrics(_req: Request, res: Response): void {
    const metrics = AnnotationService.computeAgreementMetrics();
    ResponseUtil.success(res, metrics, 'Inter-annotator agreement metrics computed');
  }

  // ==========================================
  // SAMPLE SIZE CALCULATOR
  // ==========================================

  public static calculateSampleSize(req: Request, res: Response, next: NextFunction): void {
    try {
      const targetRate = Number(req.query.targetMaxFalseVerifiedRate || req.body.targetMaxFalseVerifiedRate);
      const confidence = Number(req.query.confidenceLevel || req.body.confidenceLevel || 0.95);

      const result = StatsCalculator.calculateSampleSize({
        targetMaxFalseVerifiedRate: targetRate,
        confidenceLevel: confidence,
      });

      ResponseUtil.success(res, result, 'Sample size calculation computed');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // CALIBRATION PROTOCOL
  // ==========================================

  public static runCalibration(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const result = CalibrationService.executeCalibrationProtocol(req.body);
      ResponseUtil.success(res, result, 'Calibration protocol executed successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // EVALUATION RUNNER & REPORTS
  // ==========================================

  public static async runEvaluation(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await EvaluationRunnerService.executeFullEvaluation({
        pipelineVersion: req.body.pipelineVersion || '1.0.0',
        targetDocumentDatasetId: req.body.targetDocumentDatasetId || 'DS-DOCS-CLINICAL-2026',
        targetVoiceDatasetId: req.body.targetVoiceDatasetId || 'DS-VOICE-MULTILINGUAL-2026',
        targetScenarioDatasetId: req.body.targetScenarioDatasetId || 'DS-REDFLAG-SCENARIOS-2026',
      });

      ResponseUtil.success(res, report, 'Full pipeline evaluation executed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static listReports(_req: Request, res: Response): void {
    const reports = EvaluationRunnerService.listReports();
    ResponseUtil.success(res, reports, 'Evaluation reports retrieved');
  }

  public static getReport(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = String(req.params.id || '');
      const report = EvaluationRunnerService.getReport(id);
      if (!report) {
        ResponseUtil.error(res, 404, 'NOT_FOUND', `Evaluation report '${id}' not found`);
        return;
      }
      ResponseUtil.success(res, report, 'Evaluation report retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static compareReports(req: Request, res: Response, next: NextFunction): void {
    try {
      const { reportAId, reportBId } = req.query;
      if (!reportAId || !reportBId) {
        ResponseUtil.error(res, 400, 'VALIDATION_ERROR', 'reportAId and reportBId query params are required');
        return;
      }

      const comparison = EvaluationRunnerService.compareReports(
        String(reportAId),
        String(reportBId)
      );
      ResponseUtil.success(res, comparison, 'Version-to-version report comparison generated');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // GOVERNANCE & SIGN-OFF
  // ==========================================

  public static signReport(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const signerName = req.user ? req.user.fullName : req.body.signerName;
      const signedReport = EvaluationGovernanceService.signReport({
        ...req.body,
        signerName,
      });

      ResponseUtil.success(res, signedReport, 'Evaluation report successfully signed off by human clinician');
    } catch (err) {
      next(err);
    }
  }

  public static verifyReleaseGate(req: Request, res: Response): void {
    const reportId = req.query.reportId ? String(req.query.reportId) : undefined;
    const gateStatus = EvaluationGovernanceService.verifyReleaseGateSafety(reportId);
    ResponseUtil.success(res, gateStatus, 'Release gate clinical evaluation verification completed');
  }

  // ==========================================
  // CI EVALUATION JOB
  // ==========================================

  public static runCiEvaluation(_req: Request, res: Response): void {
    const result = CiEvaluationRunner.runCiEvaluation();
    ResponseUtil.success(res, result, 'CI synthetic/dev evaluation run completed');
  }

  // ==========================================
  // DRIFT MONITORING
  // ==========================================

  public static analyzeDrift(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      const result = DriftMonitorService.analyzeAuditSample(req.body);
      ResponseUtil.success(res, result, 'Pilot drift analysis completed');
    } catch (err) {
      next(err);
    }
  }

  public static listDriftSamples(_req: Request, res: Response): void {
    const samples = DriftMonitorService.getHistoricalDriftSamples();
    ResponseUtil.success(res, samples, 'Historical drift audit samples retrieved');
  }
}
