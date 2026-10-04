import { Router } from 'express';
import { InterviewAdminController, InterviewKioskController } from './interview.controller.js';
import { authenticateStaff, authorizeRoles, authenticateKioskSession } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRoles } from '../../types/auth.types.js';
import {
  createInterviewTemplateSchema,
  updateInterviewTemplateSchema,
  createInterviewQuestionSchema,
  updateInterviewQuestionSchema,
  startKioskInterviewSchema,
  submitInterviewAnswerSchema,
} from './interview.schemas.js';

// Router for Patient Kiosk Interview Operations
const kioskInterviewRouter = Router();

kioskInterviewRouter.use(authenticateKioskSession);

kioskInterviewRouter.post(
  '/start',
  validateRequest({ body: startKioskInterviewSchema }),
  InterviewKioskController.start
);

kioskInterviewRouter.get(
  '/current-question',
  InterviewKioskController.getCurrentQuestion
);

kioskInterviewRouter.post(
  '/answer',
  validateRequest({ body: submitInterviewAnswerSchema }),
  InterviewKioskController.submitAnswer
);

kioskInterviewRouter.post(
  '/complete',
  InterviewKioskController.complete
);

kioskInterviewRouter.get(
  '/progress',
  InterviewKioskController.getProgress
);

// Router for Admin Template & Question Bank Management
const adminTemplateRouter = Router();

adminTemplateRouter.use(
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
);

adminTemplateRouter.get('/', InterviewAdminController.listTemplates);
adminTemplateRouter.get('/:id', InterviewAdminController.getTemplateById);
adminTemplateRouter.post(
  '/',
  validateRequest({ body: createInterviewTemplateSchema }),
  InterviewAdminController.createTemplate
);
adminTemplateRouter.patch(
  '/:id',
  validateRequest({ body: updateInterviewTemplateSchema }),
  InterviewAdminController.updateTemplate
);
adminTemplateRouter.post('/:id/review', InterviewAdminController.submitForReview);
adminTemplateRouter.post('/:id/publish', InterviewAdminController.publishTemplate);
adminTemplateRouter.post('/:id/retire', InterviewAdminController.retireTemplate);
adminTemplateRouter.post(
  '/:id/questions',
  validateRequest({ body: createInterviewQuestionSchema }),
  InterviewAdminController.addQuestion
);

// Admin Question router
const adminQuestionRouter = Router();

adminQuestionRouter.use(
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
);

adminQuestionRouter.patch(
  '/:id',
  validateRequest({ body: updateInterviewQuestionSchema }),
  InterviewAdminController.updateQuestion
);
adminQuestionRouter.delete('/:id', InterviewAdminController.archiveQuestion);

export { kioskInterviewRouter, adminTemplateRouter, adminQuestionRouter };
