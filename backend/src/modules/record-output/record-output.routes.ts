import { Router } from 'express';
import { RecordOutputController } from './record-output.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRoles } from '../../types/auth.types.js';
import {
  exportQuerySchema,
  manualPushSchema,
  generatePatientCopyLinkSchema,
} from './record-output.schemas.js';

const router = Router();

// ==========================================
// 1. DOCTOR-SCOPED RECORD OUTPUT ENDPOINTS
// ==========================================

// PDF / Accessible Printable Record
router.get(
  '/records/:id/export/pdf',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest({ query: exportQuerySchema }),
  RecordOutputController.exportPdf
);

// Paste-Ready Sectioned Copy Blocks
router.get(
  '/records/:id/export/copy-blocks',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  RecordOutputController.exportCopyBlocks
);

// Versioned Structured JSON
router.get(
  '/records/:id/export/json',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest({ query: exportQuerySchema }),
  RecordOutputController.exportStructuredJson
);

// Optional FHIR R4 Bundle
router.get(
  '/records/:id/export/fhir',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  RecordOutputController.exportFhirR4
);

// Outbound Hospital EHR Push Trigger
router.post(
  '/records/:id/push',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest({ body: manualPushSchema }),
  RecordOutputController.pushToHospital
);

// Patient Copy Link Generation
router.post(
  '/records/:id/patient-copy/generate-link',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest({ body: generatePatientCopyLinkSchema }),
  RecordOutputController.generatePatientCopyLink
);

// ==========================================
// 2. ADMIN HOSPITAL FAILURE QUEUE ENDPOINTS
// ==========================================

router.get(
  '/hospital-system/failure-queue',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  RecordOutputController.getFailureQueue
);

router.post(
  '/hospital-system/failure-queue/:queueId/retry',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  RecordOutputController.retryFailureQueueItem
);

// ==========================================
// 3. PUBLIC EXPIRING PATIENT DOWNLOAD LINK
// ==========================================

router.get(
  '/patient-copy/download/:token',
  RecordOutputController.downloadPatientCopy
);

export const recordOutputRoutes = router;
