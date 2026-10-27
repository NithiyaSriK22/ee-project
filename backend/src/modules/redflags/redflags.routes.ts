import { Router } from 'express';
import { RedFlagsController } from './redflags.controller.js';
import {
  authenticateStaff,
  authorizeRoles,
  authenticateKioskSession,
} from '../../middleware/auth.middleware.js';
import { TokenUtil } from '../../utils/token.util.js';

// ==============================================================================
// 1. KIOSK SESSION ROUTES (/api/v1/kiosk)
// ==============================================================================
export const kioskAlertsRouter = Router();

// Optional kiosk auth middleware: extracts session claims if present, doesn't block if unregistered
const optionalKioskAuth = (req: any, _res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const kioskHeader = req.headers['x-kiosk-session-token'] as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : kioskHeader;

  if (token) {
    try {
      const claims = TokenUtil.verifyKioskSessionToken(token);
      req.kioskSession = claims;
    } catch {
      // Ignored for emergency help request
    }
  }
  next();
};

kioskAlertsRouter.post('/help-request', optionalKioskAuth, RedFlagsController.requestHelp);
kioskAlertsRouter.post('/alerts/request-help', optionalKioskAuth, RedFlagsController.requestHelp);
kioskAlertsRouter.get('/alerts/status', authenticateKioskSession, RedFlagsController.getKioskAlertStatus);

// ==============================================================================
// 2. STAFF TRIAGE QUEUE ROUTES (/api/v1/triage/alerts)
// ==============================================================================
export const triageAlertsRouter = Router();

triageAlertsRouter.use(
  authenticateStaff,
  authorizeRoles('STAFF_ATTENDANT', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN')
);

triageAlertsRouter.get('/stream', RedFlagsController.streamAlerts);
triageAlertsRouter.get('/', RedFlagsController.listAlerts);
triageAlertsRouter.get('/:id', RedFlagsController.getAlertById);
triageAlertsRouter.post('/:id/acknowledge', RedFlagsController.acknowledgeAlert);
triageAlertsRouter.post('/:id/start-assessment', RedFlagsController.startAssessment);
triageAlertsRouter.post('/:id/resolve', RedFlagsController.resolveAlert);
triageAlertsRouter.post('/:id/escalate', RedFlagsController.escalateAlert);
triageAlertsRouter.post('/:id/dismiss', RedFlagsController.dismissAlert);

// ==============================================================================
// 3. ADMIN & CLINICAL REVIEW ROUTES (/api/v1/admin/redflag-rules)
// ==============================================================================
export const adminRedflagRulesRouter = Router();

adminRedflagRulesRouter.use(authenticateStaff);

adminRedflagRulesRouter.get(
  '/',
  authorizeRoles('DOCTOR', 'ADMIN', 'SUPER_ADMIN'),
  RedFlagsController.listRules
);

adminRedflagRulesRouter.get(
  '/:id',
  authorizeRoles('DOCTOR', 'ADMIN', 'SUPER_ADMIN'),
  RedFlagsController.getRuleById
);

adminRedflagRulesRouter.post(
  '/',
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'DOCTOR'),
  RedFlagsController.createRule
);

adminRedflagRulesRouter.patch(
  '/:id',
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'DOCTOR'),
  RedFlagsController.updateRule
);

adminRedflagRulesRouter.post(
  '/:id/submit-review',
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'DOCTOR'),
  RedFlagsController.submitRuleForReview
);

// Clinician-only approval (Separation of duties checked in service)
adminRedflagRulesRouter.post(
  '/:id/approve',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  RedFlagsController.approveRule
);

adminRedflagRulesRouter.post(
  '/:id/retire',
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'DOCTOR'),
  RedFlagsController.retireRule
);

adminRedflagRulesRouter.post(
  '/:id/run-tests',
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'DOCTOR'),
  RedFlagsController.runRuleTests
);

// Backward-compatible alias router for /redflags
export const redflagRoutes = triageAlertsRouter;
