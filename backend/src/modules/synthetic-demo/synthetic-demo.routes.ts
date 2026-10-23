import { Router } from 'express';
import { SyntheticDemoController } from './synthetic-demo.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';

const router = Router();

// ==========================================
// 1. PUBLIC DEMO & DISCLOSURE ENDPOINTS
// ==========================================

// Current demo mode status and banner
router.get('/status', SyntheticDemoController.getDemoStatus);

// Honest "About this Demo" disclosure registry (Real vs Mocked vs Canned)
router.get('/about', SyntheticDemoController.getAboutDemoRegistry);

// List all 12 named scenarios
router.get('/scenarios', SyntheticDemoController.getScenarios);

// ==========================================
// 2. SCENARIO EXECUTION & RESET (STAFF / ADMIN)
// ==========================================

// Run a specific named scenario
router.post(
  '/scenarios/:scenarioId/run',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.runScenario
);

// Run all 12 scenarios (Smoke run)
router.post(
  '/scenarios/run-all',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.runAllScenarios
);

// Reset demo sandbox to clean slate
router.post(
  '/reset',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.resetDemoSandbox
);

// Virtual Kiosk Fleet Simulator
router.post(
  '/simulation/kiosk-fleet',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.simulateFleet
);

// ==========================================
// 3. SYNTHETIC GENERATORS
// ==========================================

router.post(
  '/synthetic/generate-patient',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.generatePatient
);

router.post(
  '/synthetic/generate-document',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.generateDocument
);

// ==========================================
// 4. FAULT INJECTION & RESILIENCE
// ==========================================

router.get(
  '/fault-injection',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.getFaultInjectionRules
);

router.post(
  '/fault-injection',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.setFaultInjectionRule
);

// ==========================================
// 5. CROSS-MODULE CONSISTENCY AUDIT
// ==========================================

router.get(
  '/audit/consistency',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.runConsistencyAudit
);

router.get(
  '/audit/consistency/markdown',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  SyntheticDemoController.getConsistencyAuditMarkdown
);

export { router as syntheticDemoRoutes };
