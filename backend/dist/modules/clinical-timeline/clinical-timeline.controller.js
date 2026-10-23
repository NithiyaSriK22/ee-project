"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalTimelineController = void 0;
const clinical_timeline_service_js_1 = require("./clinical-timeline.service.js");
const lab_flagging_service_js_1 = require("./lab-flagging.service.js");
const carry_forward_service_js_1 = require("./carry-forward.service.js");
const longitudinal_diff_service_js_1 = require("./longitudinal-diff.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class ClinicalTimelineController {
    /**
     * Retrieves the full chronological patient timeline
     */
    static async getTimeline(req, res, next) {
        try {
            const { patientId } = req.params;
            if (!patientId) {
                throw new app_error_js_1.ValidationError('Patient ID is required');
            }
            const timeline = await clinical_timeline_service_js_1.ClinicalTimelineService.getPatientTimeline(patientId, {
                patientAge: req.query.age ? Number(req.query.age) : undefined,
                patientGender: req.query.gender ? String(req.query.gender) : undefined,
            });
            response_util_js_1.ResponseUtil.success(res, timeline, 'Patient longitudinal timeline retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Retrieves longitudinal trends for a specific lab test
     */
    static async getLabTrends(req, res, next) {
        try {
            const { patientId } = req.params;
            const test = req.query.test ? String(req.query.test) : 'LAB_FASTING_GLUCOSE';
            if (!patientId) {
                throw new app_error_js_1.ValidationError('Patient ID is required');
            }
            const trends = await clinical_timeline_service_js_1.ClinicalTimelineService.getLabTrends(patientId, test);
            response_util_js_1.ResponseUtil.success(res, trends, `Longitudinal trends for test "${test}" retrieved successfully`);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Retrieves deterministic "Changed Since Last Visit" diff
     */
    static async getVisitDiff(req, res, next) {
        try {
            const { patientId, visitId } = req.params;
            const priorVisitId = req.query.priorVisitId ? String(req.query.priorVisitId) : undefined;
            if (!patientId || !visitId) {
                throw new app_error_js_1.ValidationError('Patient ID and Visit ID are required');
            }
            const diff = await longitudinal_diff_service_js_1.LongitudinalDiffService.computeVisitDiff(patientId, visitId, priorVisitId);
            response_util_js_1.ResponseUtil.success(res, diff, 'Longitudinal visit diff computed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Evaluates a single lab value against reference ranges (utility endpoint)
     */
    static async evaluateLabValue(req, res, next) {
        try {
            const { testCodeOrName, rawValue, rawUnit, isVerified, reportPrintedRange, patientAge, patientGender } = req.body;
            if (!testCodeOrName || rawValue === undefined) {
                throw new app_error_js_1.ValidationError('testCodeOrName and rawValue are required');
            }
            const result = lab_flagging_service_js_1.LabFlaggingService.evaluateLabResult({
                testCodeOrName,
                rawValue,
                rawUnit,
                isVerified: Boolean(isVerified ?? true),
                reportPrintedRange,
                patientAge,
                patientGender,
            });
            response_util_js_1.ResponseUtil.success(res, result, 'Lab reference range evaluation completed');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Kiosk: Retrieves carry-forward candidate questions from prior visits
     */
    static async getCarryForwardCandidates(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { visitId, patientId } = req.kioskSession;
            const candidates = await carry_forward_service_js_1.CarryForwardService.getCarryForwardCandidates(patientId, visitId);
            response_util_js_1.ResponseUtil.success(res, candidates, 'Carry-forward candidate questions retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Kiosk: Confirms or changes a prior answer for the current visit
     */
    static async confirmCarryForward(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { visitId, patientId } = req.kioskSession;
            const result = await carry_forward_service_js_1.CarryForwardService.processCarryForwardConfirmation(visitId, patientId, req.body);
            response_util_js_1.ResponseUtil.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ClinicalTimelineController = ClinicalTimelineController;
