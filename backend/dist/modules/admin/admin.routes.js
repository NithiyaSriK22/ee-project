"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const admin_controller_js_1 = require("./admin.controller.js");
const router = (0, express_1.Router)();
exports.adminRoutes = router;
// All admin endpoints require authenticated staff
router.use(auth_middleware_js_1.authenticateStaff);
// --- ANALYTICS DASHBOARDS (SUPER_ADMIN, ADMIN, ANALYST) ---
router.get('/analytics/metrics-catalog', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.getMetricsCatalog);
router.get('/analytics/overview', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getOperationsOverview);
router.get('/analytics/intake', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getIntakeAnalytics);
router.get('/analytics/language-voice', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getLanguageVoiceAnalytics);
router.get('/analytics/documents', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getDocumentsAnalytics);
router.get('/analytics/summaries-review', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getSummariesReviewAnalytics);
router.get('/analytics/alerts-operations', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getAlertsOperationsAnalytics);
// --- AUDIT TRAIL (SUPER_ADMIN, AUDITOR, ADMIN) ---
router.get('/audit-logs', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'AUDITOR', 'ADMIN'), admin_controller_js_1.AdminController.searchAuditLogs);
router.get('/audit-logs/access-reports', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'AUDITOR'), admin_controller_js_1.AdminController.getAccessReports);
router.get('/audit-logs/:id', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'AUDITOR', 'ADMIN'), admin_controller_js_1.AdminController.getAuditLogById);
router.post('/audit-logs/verify-chain', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'AUDITOR'), admin_controller_js_1.AdminController.verifyChain);
// --- SYSTEM & KIOSK FLEET HEALTH (SUPER_ADMIN, ADMIN) ---
router.get('/system-health', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.getSystemHealth);
router.get('/kiosk-fleet', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.getKioskFleet);
// --- REPORTS (SUPER_ADMIN, ADMIN, ANALYST, AUDITOR) ---
router.get('/reports', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.listReports);
router.post('/reports', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.queueReport);
router.get('/reports/:id/download', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.downloadReport);
// --- EXPORTS (SUPER_ADMIN, ADMIN, ANALYST, AUDITOR) ---
router.post('/exports', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.createExport);
router.get('/exports/:id', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'), admin_controller_js_1.AdminController.getExport);
// --- STAFF ADMINISTRATION ---
router.get('/staff', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.listStaff);
router.post('/staff', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.createStaff);
router.patch('/staff/:id/role', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN'), admin_controller_js_1.AdminController.updateStaffRole);
router.post('/staff/:id/deactivate', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN'), admin_controller_js_1.AdminController.deactivateStaff);
// --- RETENTION & LEGAL HOLDS (SUPER_ADMIN, ADMIN) ---
router.get('/retention-settings', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.getRetentionSettings);
router.patch('/retention-settings', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.updateRetentionSetting);
router.post('/legal-holds', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), admin_controller_js_1.AdminController.placeLegalHold);
// --- PILOT EVALUATION & BASELINES (SUPER_ADMIN, ADMIN, ANALYST) ---
router.get('/pilot/baselines', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.getPilotBaselines);
router.post('/pilot/baselines', (0, auth_middleware_js_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ANALYST'), admin_controller_js_1.AdminController.recordPilotBaseline);
