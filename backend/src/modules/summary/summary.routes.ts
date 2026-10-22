import { Router } from 'express';
import { SummaryController } from './summary.controller.js';
import {
  authenticateStaff,
  authorizeRoles,
  authenticateKioskSession,
} from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRoles } from '../../types/auth.types.js';
import { z } from 'zod';

const summaryRoutes = Router();

// ============================================================================
// STAFF & DOCTOR SUMMARY ROUTES (/api/v1/summary)
// ============================================================================

summaryRoutes.use(authenticateStaff);

// GET /api/v1/summary/visits/:visitId — Latest version & status
summaryRoutes.get(
  '/visits/:visitId',
  authorizeRoles(
    UserRoles.DOCTOR,
    UserRoles.STAFF_ATTENDANT,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN
  ),
  validateRequest({
    params: z.object({
      visitId: z.string().min(1),
    }),
  }),
  SummaryController.getLatestSummary
);

// GET /api/v1/summary/visits/:visitId/versions — All versions
summaryRoutes.get(
  '/visits/:visitId/versions',
  authorizeRoles(
    UserRoles.DOCTOR,
    UserRoles.STAFF_ATTENDANT,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN
  ),
  validateRequest({
    params: z.object({
      visitId: z.string().min(1),
    }),
  }),
  SummaryController.getSummaryVersions
);

// GET /api/v1/summary/:summaryId — Single version by immutable ID
summaryRoutes.get(
  '/:summaryId',
  authorizeRoles(
    UserRoles.DOCTOR,
    UserRoles.STAFF_ATTENDANT,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN
  ),
  validateRequest({
    params: z.object({
      summaryId: z.string().min(1),
    }),
  }),
  SummaryController.getSummaryById
);

// POST /api/v1/summary/visits/:visitId/regenerate — Regenerate summary draft
summaryRoutes.post(
  '/visits/:visitId/regenerate',
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest({
    params: z.object({
      visitId: z.string().min(1),
    }),
    body: z.object({
      reason: z.string().optional(),
    }).optional(),
  }),
  SummaryController.regenerateSummary
);

// ============================================================================
// KIOSK SUMMARY ROUTER (/api/v1/kiosk/summary)
// ============================================================================

const kioskSummaryRouter = Router();

kioskSummaryRouter.use(authenticateKioskSession);

// GET /api/v1/kiosk/summary/status — Generic status only, zero clinical content
kioskSummaryRouter.get('/status', SummaryController.getKioskSummaryStatus);

// ============================================================================
// ADMIN SUMMARY PROMPTS ROUTER (/api/v1/admin/summary-prompts)
// ============================================================================

const adminSummaryPromptRouter = Router();

adminSummaryPromptRouter.use(
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
);

// GET /api/v1/admin/summary-prompts — List all prompt templates
adminSummaryPromptRouter.get('/', SummaryController.listPrompts);

// POST /api/v1/admin/summary-prompts — Create new prompt draft
adminSummaryPromptRouter.post(
  '/',
  validateRequest({
    body: z.object({
      version: z.string().min(1).max(50),
      systemPrompt: z.string().min(20),
      outputSchemaVersion: z.string().default('1.0'),
    }),
  }),
  SummaryController.createPrompt
);

// POST /api/v1/admin/summary-prompts/:id/submit-review — Submit for clinical review
adminSummaryPromptRouter.post(
  '/:id/submit-review',
  validateRequest({
    params: z.object({
      id: z.string().min(1),
    }),
  }),
  SummaryController.submitPromptReview
);

// POST /api/v1/admin/summary-prompts/:id/run-evaluation — Run automated adversarial suite
adminSummaryPromptRouter.post(
  '/:id/run-evaluation',
  validateRequest({
    params: z.object({
      id: z.string().min(1),
    }),
  }),
  SummaryController.runEvaluation
);

// POST /api/v1/admin/summary-prompts/:id/activate — Activate prompt (GATED by passing evaluation)
adminSummaryPromptRouter.post(
  '/:id/activate',
  validateRequest({
    params: z.object({
      id: z.string().min(1),
    }),
  }),
  SummaryController.activatePrompt
);

export { summaryRoutes, kioskSummaryRouter, adminSummaryPromptRouter };
