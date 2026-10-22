import { Router } from 'express';
import { DoctorReviewController } from './doctor-review.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  claimVisitSchema,
  releaseVisitSchema,
  startReviewSchema,
  submitResolutionSchema,
  editStatementSchema,
  addStatementSchema,
  removeStatementSchema,
  rejectDraftSchema,
  requestRegenerationSchema,
  confirmReviewSchema,
  amendConfirmedRecordSchema,
} from './doctor-review.schemas.js';

const router = Router();

// All Doctor Review routes require staff authentication
router.use(authenticateStaff);

// ============================================================================
// QUEUE ENDPOINTS
// ============================================================================
router.get(
  '/queue',
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  DoctorReviewController.getQueue
);

router.post(
  '/queue/:visitId/claim',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: claimVisitSchema.shape.params,
    body: claimVisitSchema.shape.body,
  }),
  DoctorReviewController.claimVisit
);

router.post(
  '/queue/:visitId/release',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: releaseVisitSchema.shape.params,
  }),
  DoctorReviewController.releaseVisit
);

// ============================================================================
// WORKSPACE & RAW VIEW ENDPOINTS
// ============================================================================
router.get(
  '/visits/:visitId/workspace',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  DoctorReviewController.getWorkspace
);

router.get(
  '/visits/:visitId/raw-view',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  DoctorReviewController.getRawView
);

router.post(
  '/visits/:visitId/review/start',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: startReviewSchema.shape.params,
    body: startReviewSchema.shape.body,
  }),
  DoctorReviewController.startReview
);

// ============================================================================
// REVIEW ACTIONS ENDPOINTS
// ============================================================================
router.post(
  '/reviews/:reviewId/resolutions',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: submitResolutionSchema.shape.params,
    body: submitResolutionSchema.shape.body,
  }),
  DoctorReviewController.submitResolution
);

router.patch(
  '/reviews/:reviewId/statements/:statementId',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: editStatementSchema.shape.params,
    body: editStatementSchema.shape.body,
  }),
  DoctorReviewController.editStatement
);

router.post(
  '/reviews/:reviewId/statements',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: addStatementSchema.shape.params,
    body: addStatementSchema.shape.body,
  }),
  DoctorReviewController.addStatement
);

router.delete(
  '/reviews/:reviewId/statements/:statementId',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: removeStatementSchema.shape.params,
  }),
  DoctorReviewController.removeStatement
);

router.post(
  '/reviews/:reviewId/reject',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: rejectDraftSchema.shape.params,
    body: rejectDraftSchema.shape.body,
  }),
  DoctorReviewController.rejectDraft
);

router.post(
  '/reviews/:reviewId/request-regeneration',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: requestRegenerationSchema.shape.params,
    body: requestRegenerationSchema.shape.body,
  }),
  DoctorReviewController.requestRegeneration
);

router.post(
  '/reviews/:reviewId/confirm',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: confirmReviewSchema.shape.params,
    body: confirmReviewSchema.shape.body,
  }),
  DoctorReviewController.confirmReview
);

// ============================================================================
// CONFIRMED RECORDS & AMENDMENT ENDPOINTS
// ============================================================================
router.get(
  '/visits/:visitId/confirmed-record',
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  DoctorReviewController.getLatestConfirmedRecord
);

router.get(
  '/confirmed-records/:id',
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  DoctorReviewController.getConfirmedRecordById
);

router.get(
  '/confirmed-records/:id/versions',
  authorizeRoles('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'),
  DoctorReviewController.getConfirmedRecordVersions
);

router.post(
  '/confirmed-records/:id/amend',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  validateRequest({
    params: amendConfirmedRecordSchema.shape.params,
    body: amendConfirmedRecordSchema.shape.body,
  }),
  DoctorReviewController.amendConfirmedRecord
);

// ============================================================================
// PROVENANCE & SIGNED DOCUMENT SNIPPET ENDPOINTS
// ============================================================================
router.get(
  '/statements/:statementId/sources',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  DoctorReviewController.getStatementSources
);

router.get(
  '/documents/:documentId/snippet',
  authorizeRoles('DOCTOR', 'SUPER_ADMIN'),
  DoctorReviewController.getDocumentSnippet
);

export const doctorReviewRoutes = router;
