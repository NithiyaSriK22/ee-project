import { Router } from 'express';
import { VisitController } from './visit.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';

// 1. Kiosk Visits Router (/api/v1/kiosk/visits)
export const kioskVisitsRouter = Router();
kioskVisitsRouter.post('/start', VisitController.startKioskVisit);

// 2. Desk Visits & Patient Identity Safety Router (/api/v1/desk)
export const deskVisitsRouter = Router();
deskVisitsRouter.use(authenticateStaff);

deskVisitsRouter.post(
  '/visits/check-in',
  authorizeRoles(UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN, UserRoles.DOCTOR),
  VisitController.checkInDeskVisit
);

deskVisitsRouter.get(
  '/visits',
  authorizeRoles(UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN, UserRoles.DOCTOR),
  VisitController.getDeskQueue
);

deskVisitsRouter.post(
  '/patients/:id/reconcile',
  authorizeRoles(UserRoles.STAFF_ATTENDANT, UserRoles.ADMIN),
  VisitController.reconcilePatient
);

deskVisitsRouter.post(
  '/patients/merge',
  authorizeRoles(UserRoles.ADMIN, UserRoles.STAFF_ATTENDANT),
  VisitController.mergePatients
);

deskVisitsRouter.post(
  '/patients/reverse-merge/:mergeId',
  authorizeRoles(UserRoles.ADMIN),
  VisitController.reverseMerge
);

deskVisitsRouter.post(
  '/visits/:id/quarantine',
  authorizeRoles(UserRoles.ADMIN, UserRoles.STAFF_ATTENDANT),
  VisitController.quarantineVisit
);

// 3. Admin Master Data Router (/api/v1/admin)
export const adminMasterDataRouter = Router();
const requireMasterDataAdmin = [
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
];

adminMasterDataRouter.get('/departments', ...requireMasterDataAdmin, VisitController.getDepartments);
adminMasterDataRouter.post('/departments', ...requireMasterDataAdmin, VisitController.createDepartment);
adminMasterDataRouter.delete('/departments/:id', ...requireMasterDataAdmin, VisitController.softDeleteDepartment);

adminMasterDataRouter.get('/locations', ...requireMasterDataAdmin, VisitController.getLocations);
adminMasterDataRouter.get('/doctors', ...requireMasterDataAdmin, VisitController.getDoctors);
adminMasterDataRouter.get('/kiosks', ...requireMasterDataAdmin, VisitController.getKiosks);
adminMasterDataRouter.get('/schedules', ...requireMasterDataAdmin, VisitController.getSchedules);

adminMasterDataRouter.get('/events/dead-letter', ...requireMasterDataAdmin, VisitController.getDeadLetterQueue);
adminMasterDataRouter.post('/events/replay', ...requireMasterDataAdmin, VisitController.replayDeadLetter);
