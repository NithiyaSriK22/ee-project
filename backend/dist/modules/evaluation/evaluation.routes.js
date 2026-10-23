"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationRoutes = void 0;
const express_1 = require("express");
const evaluation_controller_js_1 = require("./evaluation.controller.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const evaluation_schemas_js_1 = require("./evaluation.schemas.js");
const router = (0, express_1.Router)();
// ==========================================
// 1. DATASET REGISTRY ENDPOINTS
// ==========================================
router.get('/datasets', evaluation_controller_js_1.EvaluationController.listDatasets);
router.get('/datasets/:id', evaluation_controller_js_1.EvaluationController.getDataset);
router.post('/datasets', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.registerDatasetSchema }), evaluation_controller_js_1.EvaluationController.registerDataset);
router.post('/datasets/records', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.addRecordSchema }), evaluation_controller_js_1.EvaluationController.addRecord);
// ==========================================
// 2. ANNOTATION & ADJUDICATION ENDPOINTS
// ==========================================
router.post('/annotations', auth_middleware_js_1.authenticateStaff, (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.submitAnnotationSchema }), evaluation_controller_js_1.EvaluationController.submitAnnotation);
router.post('/annotations/adjudicate', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.adjudicateConflictSchema }), evaluation_controller_js_1.EvaluationController.adjudicateConflict);
router.get('/annotations/agreement', evaluation_controller_js_1.EvaluationController.getAgreementMetrics);
// ==========================================
// 3. SAMPLE SIZE CALCULATOR (SECTION 5)
// ==========================================
router.get('/sample-size-calculator', evaluation_controller_js_1.EvaluationController.calculateSampleSize);
router.post('/sample-size-calculator', evaluation_controller_js_1.EvaluationController.calculateSampleSize);
// ==========================================
// 4. CALIBRATION PROTOCOL (SECTION 6)
// ==========================================
router.post('/calibrate', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.executeCalibrationSchema }), evaluation_controller_js_1.EvaluationController.runCalibration);
// ==========================================
// 5. EVALUATION RUNNER & REPORTS (SECTION 7)
// ==========================================
router.post('/run', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.executeEvaluationSchema }), evaluation_controller_js_1.EvaluationController.runEvaluation);
router.get('/reports', evaluation_controller_js_1.EvaluationController.listReports);
router.get('/reports/compare', evaluation_controller_js_1.EvaluationController.compareReports);
router.get('/reports/:id', evaluation_controller_js_1.EvaluationController.getReport);
// ==========================================
// 6. GOVERNANCE & SIGN-OFF (SECTION 8)
// ==========================================
router.post('/reports/sign', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.signReportSchema }), evaluation_controller_js_1.EvaluationController.signReport);
router.get('/release-gate', evaluation_controller_js_1.EvaluationController.verifyReleaseGate);
// ==========================================
// 7. CI RUNNER (SECTION 7)
// ==========================================
router.post('/ci/run', evaluation_controller_js_1.EvaluationController.runCiEvaluation);
// ==========================================
// 8. DRIFT MONITORING (SECTION 7)
// ==========================================
router.post('/drift/analyze', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), (0, validate_middleware_js_1.validateRequest)({ body: evaluation_schemas_js_1.driftAnalysisSchema }), evaluation_controller_js_1.EvaluationController.analyzeDrift);
router.get('/drift/samples', evaluation_controller_js_1.EvaluationController.listDriftSamples);
exports.evaluationRoutes = router;
