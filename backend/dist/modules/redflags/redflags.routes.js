"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redflagRoutes = exports.adminRedflagRulesRouter = exports.triageAlertsRouter = exports.kioskAlertsRouter = void 0;
const express_1 = require("express");
const redflags_controller_js_1 = require("./redflags.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const token_util_js_1 = require("../../utils/token.util.js");
// ==============================================================================
// 1. KIOSK SESSION ROUTES (/api/v1/kiosk)
// ==============================================================================
exports.kioskAlertsRouter = (0, express_1.Router)();
// Optional kiosk auth middleware: extracts session claims if present, doesn't block if unregistered
const optionalKioskAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const kioskHeader = req.headers['x-kiosk-session-token'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : kioskHeader;
    if (token) {
        try {
            const claims = token_util_js_1.TokenUtil.verifyKioskSessionToken(token);
            req.kioskSession = claims;
        }
        catch {
            // Ignored for emergency help request
        }
    }
    next();
};
exports.kioskAlertsRouter.post('/help-request', optionalKioskAuth, redflags_controller_js_1.RedFlagsController.requestHelp);
exports.kioskAlertsRouter.get('/alerts/status', auth_middleware_js_1.authenticateKioskSession, redflags_controller_js_1.RedFlagsController.getKioskAlertStatus);
// ==============================================================================
// 2. STAFF TRIAGE QUEUE ROUTES (/api/v1/triage/alerts)
// ==============================================================================
exports.triageAlertsRouter = (0, express_1.Router)();
exports.triageAlertsRouter.use(auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)('STAFF_ATTENDANT', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN'));
exports.triageAlertsRouter.get('/stream', redflags_controller_js_1.RedFlagsController.streamAlerts);
exports.triageAlertsRouter.get('/', redflags_controller_js_1.RedFlagsController.listAlerts);
exports.triageAlertsRouter.get('/:id', redflags_controller_js_1.RedFlagsController.getAlertById);
exports.triageAlertsRouter.post('/:id/acknowledge', redflags_controller_js_1.RedFlagsController.acknowledgeAlert);
exports.triageAlertsRouter.post('/:id/start-assessment', redflags_controller_js_1.RedFlagsController.startAssessment);
exports.triageAlertsRouter.post('/:id/resolve', redflags_controller_js_1.RedFlagsController.resolveAlert);
exports.triageAlertsRouter.post('/:id/escalate', redflags_controller_js_1.RedFlagsController.escalateAlert);
exports.triageAlertsRouter.post('/:id/dismiss', redflags_controller_js_1.RedFlagsController.dismissAlert);
// ==============================================================================
// 3. ADMIN & CLINICAL REVIEW ROUTES (/api/v1/admin/redflag-rules)
// ==============================================================================
exports.adminRedflagRulesRouter = (0, express_1.Router)();
exports.adminRedflagRulesRouter.use(auth_middleware_js_1.authenticateStaff);
exports.adminRedflagRulesRouter.get('/', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'ADMIN', 'SUPER_ADMIN'), redflags_controller_js_1.RedFlagsController.listRules);
exports.adminRedflagRulesRouter.get('/:id', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'ADMIN', 'SUPER_ADMIN'), redflags_controller_js_1.RedFlagsController.getRuleById);
exports.adminRedflagRulesRouter.post('/', (0, auth_middleware_js_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN', 'DOCTOR'), redflags_controller_js_1.RedFlagsController.createRule);
exports.adminRedflagRulesRouter.patch('/:id', (0, auth_middleware_js_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN', 'DOCTOR'), redflags_controller_js_1.RedFlagsController.updateRule);
exports.adminRedflagRulesRouter.post('/:id/submit-review', (0, auth_middleware_js_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN', 'DOCTOR'), redflags_controller_js_1.RedFlagsController.submitRuleForReview);
// Clinician-only approval (Separation of duties checked in service)
exports.adminRedflagRulesRouter.post('/:id/approve', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), redflags_controller_js_1.RedFlagsController.approveRule);
exports.adminRedflagRulesRouter.post('/:id/retire', (0, auth_middleware_js_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN', 'DOCTOR'), redflags_controller_js_1.RedFlagsController.retireRule);
exports.adminRedflagRulesRouter.post('/:id/run-tests', (0, auth_middleware_js_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN', 'DOCTOR'), redflags_controller_js_1.RedFlagsController.runRuleTests);
// Backward-compatible alias router for /redflags
exports.redflagRoutes = exports.triageAlertsRouter;
