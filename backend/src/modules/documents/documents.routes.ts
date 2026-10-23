import { Router } from 'express';
import { DocumentsController } from './documents.controller.js';
import { FormularyAdminController } from './formulary/formulary.controller.js';
import { authenticateStaff, authorizeRoles, authenticateKioskSession } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRoles } from '../../types/auth.types.js';
import {
  createFormularyVersionSchema,
  addFormularyDrugSchema,
  importFormularyDrugsSchema,
} from './documents.schemas.js';

import { optionalUploadMiddleware } from '../../middleware/upload.middleware.js';

// Kiosk Document Capture & Validation Router
const kioskDocumentsRouter = Router();

kioskDocumentsRouter.use(authenticateKioskSession);

kioskDocumentsRouter.post('/upload', optionalUploadMiddleware, DocumentsController.uploadDocument);
kioskDocumentsRouter.get('/', DocumentsController.listVisitDocuments);
kioskDocumentsRouter.get('/:id/status', DocumentsController.getDocumentStatus);
kioskDocumentsRouter.get('/:id/file', DocumentsController.streamDocumentFile);
kioskDocumentsRouter.get('/:id/image', DocumentsController.streamDocumentFile);
kioskDocumentsRouter.get('/:id/validated-fields', DocumentsController.getValidatedFields);
kioskDocumentsRouter.post('/:id/revalidate', DocumentsController.revalidate);

// Admin Formulary Management Router
const adminFormularyRouter = Router();

adminFormularyRouter.use(
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
);

adminFormularyRouter.get('/', FormularyAdminController.listVersions);
adminFormularyRouter.get('/:id', FormularyAdminController.getVersionById);
adminFormularyRouter.post(
  '/',
  validateRequest({ body: createFormularyVersionSchema }),
  FormularyAdminController.createVersion
);
adminFormularyRouter.post('/:id/activate', FormularyAdminController.activateVersion);
adminFormularyRouter.post(
  '/:id/drugs',
  validateRequest({ body: addFormularyDrugSchema }),
  FormularyAdminController.addDrug
);
adminFormularyRouter.post(
  '/:id/import',
  validateRequest({ body: importFormularyDrugsSchema }),
  FormularyAdminController.importDrugs
);

export { kioskDocumentsRouter, adminFormularyRouter };
