"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorReviewRoutes = void 0;
const express_1 = require("express");
const doctor_review_controller_js_1 = require("./doctor-review.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const doctor_review_schemas_js_1 = require("./doctor-review.schemas.js");
const upload_middleware_js_1 = require("../../middleware/upload.middleware.js");
const router = (0, express_1.Router)();
// ============================================================================
// SIGNED DOCUMENT & SNIPPET IMAGE STREAMING (P1.3)
// Accessible via short-lived query token (?token=...) or Bearer JWT
// ============================================================================
router.get('/documents/:documentId/image', doctor_review_controller_js_1.DoctorReviewController.streamDocumentImage);
router.get('/documents/:documentId/file', doctor_review_controller_js_1.DoctorReviewController.streamDocumentImage);
router.get('/documents/:documentId/view', doctor_review_controller_js_1.DoctorReviewController.streamDocumentImage);
// All other Doctor Review routes require staff authentication
router.use(auth_middleware_js_1.authenticateStaff);
// ============================================================================
// QUEUE ENDPOINTS
// ============================================================================
router.get('/dashboard/stats', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getDashboardStats);
router.get('/stats', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getDashboardStats);
router.post('/quick-note', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.createQuickNote);
router.post('/visits/:visitId/documents/upload', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), upload_middleware_js_1.optionalUploadMiddleware, doctor_review_controller_js_1.DoctorReviewController.uploadVisitDocument);
router.get('/queue', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getQueue);
router.post('/queue/:visitId/claim', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.claimVisitSchema.shape.params,
    body: doctor_review_schemas_js_1.claimVisitSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.claimVisit);
router.post('/queue/:visitId/release', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.releaseVisitSchema.shape.params,
}), doctor_review_controller_js_1.DoctorReviewController.releaseVisit);
// ============================================================================
// WORKSPACE & RAW VIEW ENDPOINTS
// ============================================================================
router.get('/visits/:visitId/workspace', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getWorkspace);
router.get('/visits/:visitId/raw-view', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getRawView);
router.post('/visits/:visitId/review/start', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.startReviewSchema.shape.params,
    body: doctor_review_schemas_js_1.startReviewSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.startReview);
// ============================================================================
// REVIEW ACTIONS ENDPOINTS
// ============================================================================
router.post('/reviews/:reviewId/resolutions', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.submitResolutionSchema.shape.params,
    body: doctor_review_schemas_js_1.submitResolutionSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.submitResolution);
router.patch('/reviews/:reviewId/statements/:statementId', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.editStatementSchema.shape.params,
    body: doctor_review_schemas_js_1.editStatementSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.editStatement);
router.post('/reviews/:reviewId/statements', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.addStatementSchema.shape.params,
    body: doctor_review_schemas_js_1.addStatementSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.addStatement);
router.delete('/reviews/:reviewId/statements/:statementId', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.removeStatementSchema.shape.params,
}), doctor_review_controller_js_1.DoctorReviewController.removeStatement);
router.post('/reviews/:reviewId/reject', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.rejectDraftSchema.shape.params,
    body: doctor_review_schemas_js_1.rejectDraftSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.rejectDraft);
router.post('/reviews/:reviewId/request-regeneration', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.requestRegenerationSchema.shape.params,
    body: doctor_review_schemas_js_1.requestRegenerationSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.requestRegeneration);
router.post('/reviews/:reviewId/confirm', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.confirmReviewSchema.shape.params,
    body: doctor_review_schemas_js_1.confirmReviewSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.confirmReview);
// ============================================================================
// CONFIRMED RECORDS & AMENDMENT ENDPOINTS
// ============================================================================
router.get('/visits/:visitId/confirmed-record', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getLatestConfirmedRecord);
router.get('/confirmed-records/:id', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getConfirmedRecordById);
router.get('/confirmed-records/:id/versions', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getConfirmedRecordVersions);
router.post('/confirmed-records/:id/amend', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), (0, validate_middleware_js_1.validateRequest)({
    params: doctor_review_schemas_js_1.amendConfirmedRecordSchema.shape.params,
    body: doctor_review_schemas_js_1.amendConfirmedRecordSchema.shape.body,
}), doctor_review_controller_js_1.DoctorReviewController.amendConfirmedRecord);
// ============================================================================
// PROVENANCE & SIGNED DOCUMENT SNIPPET ENDPOINTS
// ============================================================================
router.get('/statements/:statementId/sources', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getStatementSources);
router.get('/documents/:documentId/snippet', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getDocumentSnippet);
// ============================================================================
// MEDICAL RECORDS & AI SUMMARIES (Patient-Doctor Portal Integration)
// ============================================================================
router.get('/visits/:visitId/medical-records', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getMedicalRecordsForVisit);
router.get('/documents/:documentId/summary', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getIndividualDocumentSummary);
router.get('/visits/:visitId/combined-summary', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.getCombinedRecordSummary);
router.post('/visits/:visitId/combined-summary/regenerate', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.regenerateCombinedRecordSummary);
router.post('/visits/:visitId/combined-summary/approve', (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'SUPER_ADMIN'), doctor_review_controller_js_1.DoctorReviewController.approveCombinedRecordSummary);
exports.doctorReviewRoutes = router;
