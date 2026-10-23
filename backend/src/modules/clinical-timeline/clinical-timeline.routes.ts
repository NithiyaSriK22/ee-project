import { Router } from 'express';
import { ClinicalTimelineController } from './clinical-timeline.controller.js';
import { authenticateStaff, authenticateKioskSession, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';

// Router for Staff / Doctor Clinical Timeline (/api/v1/timeline)
export const clinicalTimelineRouter = Router();

clinicalTimelineRouter.use(authenticateStaff);

clinicalTimelineRouter.get(
  '/patients/:patientId',
  authorizeRoles(UserRoles.DOCTOR, UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  ClinicalTimelineController.getTimeline
);

clinicalTimelineRouter.get(
  '/patients/:patientId/trends',
  authorizeRoles(UserRoles.DOCTOR, UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  ClinicalTimelineController.getLabTrends
);

clinicalTimelineRouter.get(
  '/patients/:patientId/diff/:visitId',
  authorizeRoles(UserRoles.DOCTOR, UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  ClinicalTimelineController.getVisitDiff
);

clinicalTimelineRouter.post(
  '/evaluate-lab',
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN),
  ClinicalTimelineController.evaluateLabValue
);

// Router for Kiosk Returning Patient Carry-Forward (/api/v1/kiosk/timeline)
export const kioskTimelineRouter = Router();

kioskTimelineRouter.use(authenticateKioskSession);

kioskTimelineRouter.get(
  '/carry-forward/candidates',
  ClinicalTimelineController.getCarryForwardCandidates
);

kioskTimelineRouter.post(
  '/carry-forward/confirm',
  ClinicalTimelineController.confirmCarryForward
);
