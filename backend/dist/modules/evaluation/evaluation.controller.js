"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationController = void 0;
const response_util_js_1 = require("../../utils/response.util.js");
const dataset_registry_service_js_1 = require("./dataset-registry.service.js");
const annotation_service_js_1 = require("./annotation.service.js");
const calibration_service_js_1 = require("./calibration.service.js");
const evaluation_runner_service_js_1 = require("./evaluation-runner.service.js");
const evaluation_governance_service_js_1 = require("./evaluation-governance.service.js");
const stats_calculator_js_1 = require("./stats-calculator.js");
const drift_monitor_service_js_1 = require("./drift-monitor.service.js");
const ci_evaluation_runner_js_1 = require("./ci-evaluation-runner.js");
class EvaluationController {
    // ==========================================
    // DATASET REGISTRY ENDPOINTS
    // ==========================================
    static listDatasets(_req, res) {
        const datasets = dataset_registry_service_js_1.DatasetRegistryService.listDatasets();
        response_util_js_1.ResponseUtil.success(res, datasets, 'Evaluation datasets retrieved successfully');
    }
    static getDataset(req, res, next) {
        try {
            const id = String(req.params.id || '');
            const dataset = dataset_registry_service_js_1.DatasetRegistryService.getDataset(id);
            if (!dataset) {
                response_util_js_1.ResponseUtil.error(res, 404, 'NOT_FOUND', `Dataset '${id}' not found`);
                return;
            }
            response_util_js_1.ResponseUtil.success(res, dataset, 'Dataset details retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    static registerDataset(req, res, next) {
        try {
            const created = dataset_registry_service_js_1.DatasetRegistryService.registerDataset(req.body);
            response_util_js_1.ResponseUtil.success(res, created, 'Evaluation dataset registered successfully with ethics approval', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static addRecord(req, res, next) {
        try {
            const record = dataset_registry_service_js_1.DatasetRegistryService.addRecord(req.body);
            response_util_js_1.ResponseUtil.success(res, record, 'Evaluation record added successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // ANNOTATION & ADJUDICATION ENDPOINTS
    // ==========================================
    static submitAnnotation(req, res, next) {
        try {
            const annotatorId = req.user ? req.user.id : req.body.annotatorId;
            const annotatorRole = req.user ? req.user.role : req.body.annotatorRole;
            const annotation = annotation_service_js_1.AnnotationService.submitAnnotation({
                ...req.body,
                annotatorId,
                annotatorRole,
            });
            response_util_js_1.ResponseUtil.success(res, annotation, 'Field annotation recorded successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static adjudicateConflict(req, res, next) {
        try {
            const adjudicatorId = req.user ? req.user.id : req.body.adjudicatorId;
            const result = annotation_service_js_1.AnnotationService.adjudicateConflict({
                ...req.body,
                adjudicatorId,
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Annotation conflict adjudicated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static getAgreementMetrics(_req, res) {
        const metrics = annotation_service_js_1.AnnotationService.computeAgreementMetrics();
        response_util_js_1.ResponseUtil.success(res, metrics, 'Inter-annotator agreement metrics computed');
    }
    // ==========================================
    // SAMPLE SIZE CALCULATOR
    // ==========================================
    static calculateSampleSize(req, res, next) {
        try {
            const targetRate = Number(req.query.targetMaxFalseVerifiedRate || req.body.targetMaxFalseVerifiedRate);
            const confidence = Number(req.query.confidenceLevel || req.body.confidenceLevel || 0.95);
            const result = stats_calculator_js_1.StatsCalculator.calculateSampleSize({
                targetMaxFalseVerifiedRate: targetRate,
                confidenceLevel: confidence,
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Sample size calculation computed');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // CALIBRATION PROTOCOL
    // ==========================================
    static runCalibration(req, res, next) {
        try {
            const result = calibration_service_js_1.CalibrationService.executeCalibrationProtocol(req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Calibration protocol executed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // EVALUATION RUNNER & REPORTS
    // ==========================================
    static async runEvaluation(req, res, next) {
        try {
            const report = await evaluation_runner_service_js_1.EvaluationRunnerService.executeFullEvaluation({
                pipelineVersion: req.body.pipelineVersion || '1.0.0',
                targetDocumentDatasetId: req.body.targetDocumentDatasetId || 'DS-DOCS-CLINICAL-2026',
                targetVoiceDatasetId: req.body.targetVoiceDatasetId || 'DS-VOICE-MULTILINGUAL-2026',
                targetScenarioDatasetId: req.body.targetScenarioDatasetId || 'DS-REDFLAG-SCENARIOS-2026',
            });
            response_util_js_1.ResponseUtil.success(res, report, 'Full pipeline evaluation executed successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static listReports(_req, res) {
        const reports = evaluation_runner_service_js_1.EvaluationRunnerService.listReports();
        response_util_js_1.ResponseUtil.success(res, reports, 'Evaluation reports retrieved');
    }
    static getReport(req, res, next) {
        try {
            const id = String(req.params.id || '');
            const report = evaluation_runner_service_js_1.EvaluationRunnerService.getReport(id);
            if (!report) {
                response_util_js_1.ResponseUtil.error(res, 404, 'NOT_FOUND', `Evaluation report '${id}' not found`);
                return;
            }
            response_util_js_1.ResponseUtil.success(res, report, 'Evaluation report retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    static compareReports(req, res, next) {
        try {
            const { reportAId, reportBId } = req.query;
            if (!reportAId || !reportBId) {
                response_util_js_1.ResponseUtil.error(res, 400, 'VALIDATION_ERROR', 'reportAId and reportBId query params are required');
                return;
            }
            const comparison = evaluation_runner_service_js_1.EvaluationRunnerService.compareReports(String(reportAId), String(reportBId));
            response_util_js_1.ResponseUtil.success(res, comparison, 'Version-to-version report comparison generated');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // GOVERNANCE & SIGN-OFF
    // ==========================================
    static signReport(req, res, next) {
        try {
            const signerName = req.user ? req.user.fullName : req.body.signerName;
            const signedReport = evaluation_governance_service_js_1.EvaluationGovernanceService.signReport({
                ...req.body,
                signerName,
            });
            response_util_js_1.ResponseUtil.success(res, signedReport, 'Evaluation report successfully signed off by human clinician');
        }
        catch (err) {
            next(err);
        }
    }
    static verifyReleaseGate(req, res) {
        const reportId = req.query.reportId ? String(req.query.reportId) : undefined;
        const gateStatus = evaluation_governance_service_js_1.EvaluationGovernanceService.verifyReleaseGateSafety(reportId);
        response_util_js_1.ResponseUtil.success(res, gateStatus, 'Release gate clinical evaluation verification completed');
    }
    // ==========================================
    // CI EVALUATION JOB
    // ==========================================
    static runCiEvaluation(_req, res) {
        const result = ci_evaluation_runner_js_1.CiEvaluationRunner.runCiEvaluation();
        response_util_js_1.ResponseUtil.success(res, result, 'CI synthetic/dev evaluation run completed');
    }
    // ==========================================
    // DRIFT MONITORING
    // ==========================================
    static analyzeDrift(req, res, next) {
        try {
            const result = drift_monitor_service_js_1.DriftMonitorService.analyzeAuditSample(req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Pilot drift analysis completed');
        }
        catch (err) {
            next(err);
        }
    }
    static listDriftSamples(_req, res) {
        const samples = drift_monitor_service_js_1.DriftMonitorService.getHistoricalDriftSamples();
        response_util_js_1.ResponseUtil.success(res, samples, 'Historical drift audit samples retrieved');
    }
}
exports.EvaluationController = EvaluationController;
