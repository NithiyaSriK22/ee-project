"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryController = void 0;
const summary_service_js_1 = require("./summary.service.js");
const app_error_js_1 = require("../../errors/app-error.js");
class SummaryController {
    static async getLatestSummary(req, res, next) {
        try {
            const { visitId } = req.params;
            const summary = await summary_service_js_1.SummaryService.getLatestSummaryForVisit(visitId, req.user);
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSummaryVersions(req, res, next) {
        try {
            const { visitId } = req.params;
            const versions = await summary_service_js_1.SummaryService.getSummaryVersionsForVisit(visitId, req.user);
            res.status(200).json({
                success: true,
                data: versions,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSummaryById(req, res, next) {
        try {
            const { summaryId } = req.params;
            const summary = await summary_service_js_1.SummaryService.getSummaryById(summaryId, req.user);
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async regenerateSummary(req, res, next) {
        try {
            const { visitId } = req.params;
            const summary = await summary_service_js_1.SummaryService.generateSummaryForVisit(visitId, {
                forceRegenerate: true,
                triggeredBy: req.user?.id,
            });
            res.status(201).json({
                success: true,
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getKioskSummaryStatus(req, res, next) {
        try {
            const visitId = req.kioskSession?.visitId || req.query.visitId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('Kiosk session or visitId parameter required');
            }
            const status = await summary_service_js_1.SummaryService.getKioskSummaryStatus(visitId);
            res.status(200).json({
                success: true,
                data: status,
            });
        }
        catch (err) {
            next(err);
        }
    }
    // ============================================================================
    // ADMIN PROMPT MANAGEMENT CONTROLLERS
    // ============================================================================
    static async listPrompts(_req, res, next) {
        try {
            const templates = await summary_service_js_1.SummaryService.listPromptTemplates();
            res.status(200).json({
                success: true,
                data: templates,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async createPrompt(req, res, next) {
        try {
            const template = await summary_service_js_1.SummaryService.createPromptTemplate(req.body, req.user);
            res.status(201).json({
                success: true,
                data: template,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async submitPromptReview(req, res, next) {
        try {
            const { id } = req.params;
            const updated = await summary_service_js_1.SummaryService.submitPromptForReview(id, req.user);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async runEvaluation(req, res, next) {
        try {
            const { id } = req.params;
            const result = await summary_service_js_1.SummaryService.runEvaluationForPrompt(id, req.user);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async activatePrompt(req, res, next) {
        try {
            const { id } = req.params;
            const updated = await summary_service_js_1.SummaryService.activatePromptTemplate(id, req.user);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SummaryController = SummaryController;
