import { Router } from 'express';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { AdminController } from './admin.controller.js';

const router = Router();

// All admin endpoints require authenticated staff
router.use(authenticateStaff);

// --- ANALYTICS DASHBOARDS (SUPER_ADMIN, ADMIN, ANALYST) ---
router.get(
  '/analytics/metrics-catalog',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.getMetricsCatalog
);
router.get(
  '/analytics/overview',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getOperationsOverview
);
router.get(
  '/analytics/intake',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getIntakeAnalytics
);
router.get(
  '/analytics/language-voice',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getLanguageVoiceAnalytics
);
router.get(
  '/analytics/documents',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getDocumentsAnalytics
);
router.get(
  '/analytics/summaries-review',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getSummariesReviewAnalytics
);
router.get(
  '/analytics/alerts-operations',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getAlertsOperationsAnalytics
);

// --- AUDIT TRAIL (SUPER_ADMIN, AUDITOR, ADMIN) ---
router.get(
  '/audit-logs',
  authorizeRoles('SUPER_ADMIN', 'AUDITOR', 'ADMIN'),
  AdminController.searchAuditLogs
);
router.get(
  '/audit-logs/access-reports',
  authorizeRoles('SUPER_ADMIN', 'AUDITOR'),
  AdminController.getAccessReports
);
router.get(
  '/audit-logs/:id',
  authorizeRoles('SUPER_ADMIN', 'AUDITOR', 'ADMIN'),
  AdminController.getAuditLogById
);
router.post(
  '/audit-logs/verify-chain',
  authorizeRoles('SUPER_ADMIN', 'AUDITOR'),
  AdminController.verifyChain
);

// --- SYSTEM & KIOSK FLEET HEALTH (SUPER_ADMIN, ADMIN) ---
router.get(
  '/system-health',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.getSystemHealth
);
router.get(
  '/kiosk-fleet',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.getKioskFleet
);

// --- REPORTS (SUPER_ADMIN, ADMIN, ANALYST, AUDITOR) ---
router.get(
  '/reports',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.listReports
);
router.post(
  '/reports',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.queueReport
);
router.get(
  '/reports/:id/download',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.downloadReport
);

// --- EXPORTS (SUPER_ADMIN, ADMIN, ANALYST, AUDITOR) ---
router.post(
  '/exports',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.createExport
);
router.get(
  '/exports/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR'),
  AdminController.getExport
);

// --- STAFF ADMINISTRATION ---
router.get(
  '/staff',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.listStaff
);
router.post(
  '/staff',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.createStaff
);
router.patch(
  '/staff/:id/role',
  authorizeRoles('SUPER_ADMIN'),
  AdminController.updateStaffRole
);
router.post(
  '/staff/:id/deactivate',
  authorizeRoles('SUPER_ADMIN'),
  AdminController.deactivateStaff
);

// --- RETENTION & LEGAL HOLDS (SUPER_ADMIN, ADMIN) ---
router.get(
  '/retention-settings',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.getRetentionSettings
);
router.patch(
  '/retention-settings',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.updateRetentionSetting
);
router.post(
  '/legal-holds',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  AdminController.placeLegalHold
);

// --- PILOT EVALUATION & BASELINES (SUPER_ADMIN, ADMIN, ANALYST) ---
router.get(
  '/pilot/baselines',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.getPilotBaselines
);
router.post(
  '/pilot/baselines',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST'),
  AdminController.recordPilotBaseline
);

export { router as adminRoutes };
