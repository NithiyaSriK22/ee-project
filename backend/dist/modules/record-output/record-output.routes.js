"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordOutputRoutes = void 0;
const express_1 = require("express");
const record_output_controller_js_1 = require("./record-output.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const record_output_schemas_js_1 = require("./record-output.schemas.js");
const router = (0, express_1.Router)();
// ==========================================
// 1. DOCTOR-SCOPED RECORD OUTPUT ENDPOINTS
// ==========================================
// PDF / Accessible Printable Record
router.get('/records/:id/export/pdf', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({ query: record_output_schemas_js_1.exportQuerySchema }), record_output_controller_js_1.RecordOutputController.exportPdf);
// Paste-Ready Sectioned Copy Blocks
router.get('/records/:id/export/copy-blocks', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), record_output_controller_js_1.RecordOutputController.exportCopyBlocks);
// Versioned Structured JSON
router.get('/records/:id/export/json', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({ query: record_output_schemas_js_1.exportQuerySchema }), record_output_controller_js_1.RecordOutputController.exportStructuredJson);
// Optional FHIR R4 Bundle
router.get('/records/:id/export/fhir', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), record_output_controller_js_1.RecordOutputController.exportFhirR4);
// Outbound Hospital EHR Push Trigger
router.post('/records/:id/push', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({ body: record_output_schemas_js_1.manualPushSchema }), record_output_controller_js_1.RecordOutputController.pushToHospital);
// Patient Copy Link Generation
router.post('/records/:id/patient-copy/generate-link', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({ body: record_output_schemas_js_1.generatePatientCopyLinkSchema }), record_output_controller_js_1.RecordOutputController.generatePatientCopyLink);
// ==========================================
// 2. ADMIN HOSPITAL FAILURE QUEUE ENDPOINTS
// ==========================================
router.get('/hospital-system/failure-queue', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), record_output_controller_js_1.RecordOutputController.getFailureQueue);
router.post('/hospital-system/failure-queue/:queueId/retry', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), record_output_controller_js_1.RecordOutputController.retryFailureQueueItem);
// ==========================================
// 3. PUBLIC EXPIRING PATIENT DOWNLOAD LINK
// ==========================================
router.get('/patient-copy/download/:token', record_output_controller_js_1.RecordOutputController.downloadPatientCopy);
exports.recordOutputRoutes = router;
