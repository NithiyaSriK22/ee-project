import { Router } from 'express';
import { PatientsController } from './patients.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { updatePatientProfileSchema, updateConsentSchema } from './patients.schemas.js';
import { authenticateKioskSession, authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';

// Kiosk Profile Sub-Router (/api/v1/kiosk/profile)
export const kioskProfileRoutes = Router();

kioskProfileRoutes.use(authenticateKioskSession);

kioskProfileRoutes.get('/', PatientsController.getKioskProfile);
kioskProfileRoutes.put('/', validateRequest({ body: updatePatientProfileSchema }), PatientsController.updateKioskProfile);
kioskProfileRoutes.patch('/', validateRequest({ body: updatePatientProfileSchema }), PatientsController.updateKioskProfile);
kioskProfileRoutes.get('/completion', PatientsController.getProfileCompletion);

// Consents Sub-Router (/api/v1/consents)
export const consentsRoutes = Router();

consentsRoutes.use(authenticateKioskSession);

consentsRoutes.get('/', PatientsController.getConsents);
consentsRoutes.patch('/:type', validateRequest({ body: updateConsentSchema }), PatientsController.updateConsent);

// Staff Patients Sub-Router (/api/v1/patients)
export const patientRoutes = Router();

patientRoutes.get(
  '/',
  authenticateStaff,
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  PatientsController.listPatients
);

patientRoutes.get(
  '/:id',
  authenticateStaff,
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  PatientsController.getPatientForStaff
);
