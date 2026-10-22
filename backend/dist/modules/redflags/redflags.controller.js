"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedFlagsController = void 0;
const redflags_service_js_1 = require("./redflags.service.js");
const sse_broadcaster_js_1 = require("./alerts/sse-broadcaster.js");
const redflags_schemas_js_1 = require("./redflags.schemas.js");
class RedFlagsController {
    // ============================================================================
    // KIOSK ENDPOINTS (Session-scoped)
    // ============================================================================
    static async requestHelp(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.HelpRequestSchema.parse(req.body);
            const visitId = req.kioskSession?.visitId || req.user?.visitId || req.body.visitId || `unregistered-${Date.now()}`;
            const kioskDeviceId = parsed.kioskDeviceId || req.kioskSession?.kioskDeviceId;
            const alert = await redflags_service_js_1.RedFlagsService.raiseManualHelpRequest(visitId, kioskDeviceId, parsed.reason);
            res.status(201).json({
                success: true,
                message: 'A staff member has been alerted to assist you at this kiosk. Please stay here.',
                data: {
                    alertId: alert.id,
                    status: 'HELP_REQUESTED',
                    kioskLocation: alert.kioskLocation,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getKioskAlertStatus(req, res, next) {
        try {
            const visitId = req.kioskSession?.visitId || req.user?.visitId || req.query.visitId;
            if (!visitId) {
                res.status(200).json({
                    success: true,
                    data: { hasActiveAlert: false, messageType: null },
                });
                return;
            }
            const status = await redflags_service_js_1.RedFlagsService.getKioskAlertStatus(visitId);
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
    // STAFF TRIAGE QUEUE ENDPOINTS
    // ============================================================================
    static async listAlerts(req, res, next) {
        try {
            const filter = redflags_schemas_js_1.AlertFilterSchema.parse(req.query);
            const alerts = await redflags_service_js_1.RedFlagsService.listAlerts(filter);
            res.status(200).json({
                success: true,
                data: alerts,
                meta: { total: alerts.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAlertById(req, res, next) {
        try {
            const alert = await redflags_service_js_1.RedFlagsService.getAlertById(req.params.id);
            res.status(200).json({
                success: true,
                data: alert,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async acknowledgeAlert(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.AcknowledgeAlertSchema.parse(req.body);
            const actorId = req.user?.id;
            const actorRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.acknowledgeAlert(req.params.id, actorId, actorRole, parsed.note);
            res.status(200).json({
                success: true,
                message: 'Alert acknowledged',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async startAssessment(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.StartAssessmentSchema.parse(req.body);
            const actorId = req.user?.id;
            const actorRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.startAssessment(req.params.id, actorId, actorRole, parsed.note);
            res.status(200).json({
                success: true,
                message: 'Alert moved to IN_ASSESSMENT',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async resolveAlert(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.ResolveAlertSchema.parse(req.body);
            const actorId = req.user?.id;
            const actorRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.resolveAlert(req.params.id, actorId, actorRole, parsed.resolutionType, parsed.resolutionNote);
            res.status(200).json({
                success: true,
                message: 'Alert resolved successfully',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async escalateAlert(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.EscalateAlertSchema.parse(req.body);
            const actorId = req.user?.id;
            const actorRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.escalateAlert(req.params.id, actorId, actorRole, parsed.reason);
            res.status(200).json({
                success: true,
                message: 'Alert escalated',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async dismissAlert(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.DismissAlertSchema.parse(req.body);
            const actorId = req.user?.id;
            const actorRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.dismissAlert(req.params.id, actorId, actorRole, parsed.dismissalReason, parsed.note);
            res.status(200).json({
                success: true,
                message: 'Alert dismissed as false positive',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static streamAlerts(req, res) {
        const clientId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const role = req.user?.role;
        sse_broadcaster_js_1.SSEBroadcaster.addClient(clientId, res, role);
        req.on('close', () => {
            sse_broadcaster_js_1.SSEBroadcaster.removeClient(clientId);
        });
    }
    // ============================================================================
    // ADMIN & CLINICAL REVIEW ENDPOINTS
    // ============================================================================
    static async listRules(_req, res, next) {
        try {
            const rules = await redflags_service_js_1.RedFlagsService.listRules();
            res.status(200).json({
                success: true,
                data: rules,
                meta: { total: rules.length },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getRuleById(req, res, next) {
        try {
            const rule = await redflags_service_js_1.RedFlagsService.getRuleById(req.params.id);
            res.status(200).json({
                success: true,
                data: rule,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async createRule(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.CreateRuleSchema.parse(req.body);
            const authorId = req.user?.id;
            const rule = await redflags_service_js_1.RedFlagsService.createRule({
                ruleCode: parsed.ruleCode,
                name: parsed.name,
                description: parsed.description,
                severityTier: parsed.severityTier,
                conditionTree: parsed.conditionTree,
                testCases: parsed.testCases,
                raiseOnIndeterminate: parsed.raiseOnIndeterminate,
                recommendedStaffAction: parsed.recommendedStaffAction,
                isIllustrative: parsed.isIllustrative,
            }, authorId);
            res.status(201).json({
                success: true,
                message: 'Red-flag rule authored in DRAFT state',
                data: rule,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateRule(req, res, next) {
        try {
            const parsed = redflags_schemas_js_1.UpdateRuleSchema.parse(req.body);
            const updated = await redflags_service_js_1.RedFlagsService.updateRule(req.params.id, parsed);
            res.status(200).json({
                success: true,
                message: 'Red-flag rule updated',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async submitRuleForReview(req, res, next) {
        try {
            const actorId = req.user?.id;
            const updated = await redflags_service_js_1.RedFlagsService.submitRuleForReview(req.params.id, actorId);
            res.status(200).json({
                success: true,
                message: 'Red-flag rule submitted for clinical review after passing test harness',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async approveRule(req, res, next) {
        try {
            const reviewerId = req.user?.id;
            const reviewerRole = req.user?.role;
            const updated = await redflags_service_js_1.RedFlagsService.approveRule(req.params.id, reviewerId, reviewerRole);
            res.status(200).json({
                success: true,
                message: 'Red-flag rule successfully approved and activated by clinician',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async retireRule(req, res, next) {
        try {
            const actorId = req.user?.id;
            const updated = await redflags_service_js_1.RedFlagsService.retireRule(req.params.id, actorId);
            res.status(200).json({
                success: true,
                message: 'Red-flag rule retired',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async runRuleTests(req, res, next) {
        try {
            const testReport = await redflags_service_js_1.RedFlagsService.runRuleTests(req.params.id);
            res.status(200).json({
                success: true,
                data: testReport,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RedFlagsController = RedFlagsController;
