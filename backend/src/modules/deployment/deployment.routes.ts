import { Router } from 'express';
import { DeploymentController } from './deployment.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';

const router = Router();

// --- Public / Resilient Status & Downtime Endpoints ---
router.get('/status', DeploymentController.getStatusBoard);
router.get('/alert-pipeline/health', DeploymentController.getAlertPipelineHealth);

// --- Feature Flags & Kill Switches ---
router.get('/flags', DeploymentController.getFlags);
router.patch(
  '/flags/:key',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  DeploymentController.updateFlag
);

// --- Global Intake Pause ---
router.get('/intake-pause', DeploymentController.getIntakePauseStatus);
router.post(
  '/intake-pause',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  DeploymentController.setIntakePause
);

// --- Clinical Safety Release Gates ---
router.get('/release-gates', DeploymentController.getReleaseGates);
router.post(
  '/release-gates/override',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN),
  DeploymentController.overrideReleaseGates
);

// --- Disaster Recovery & Restore Drills ---
router.get('/restore-drills', DeploymentController.getRestoreDrills);
router.post(
  '/restore-drills',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN),
  DeploymentController.recordRestoreDrill
);

// --- Kiosk Fleet Hardening & Enrollment ---
router.get('/kiosks', authenticateStaff, authorizeRoles(UserRoles.ADMIN), DeploymentController.getEnrolledKiosks);
router.post('/kiosks/enroll', authenticateStaff, authorizeRoles(UserRoles.ADMIN), DeploymentController.enrollKiosk);
router.post('/kiosks/:code/revoke', authenticateStaff, authorizeRoles(UserRoles.ADMIN), DeploymentController.revokeKiosk);

// Session Wipe Trigger (can be invoked by kiosk on end/timeout/abandon/reboot)
router.post('/kiosks/session/wipe', DeploymentController.wipeKioskSession);

export const deploymentRoutes = router;

