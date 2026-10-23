import { Router } from 'express';
import { EvaluationController } from './evaluation.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';
import {
  registerDatasetSchema,
  addRecordSchema,
  submitAnnotationSchema,
  adjudicateConflictSchema,
  executeCalibrationSchema,
  executeEvaluationSchema,
  signReportSchema,
  driftAnalysisSchema,
} from './evaluation.schemas.js';

const router = Router();

// ==========================================
// 1. DATASET REGISTRY ENDPOINTS
// ==========================================
router.get('/datasets', EvaluationController.listDatasets);
router.get('/datasets/:id', EvaluationController.getDataset);
router.post(
  '/datasets',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  validateRequest({ body: registerDatasetSchema }),
  EvaluationController.registerDataset
);
router.post(
  '/datasets/records',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  validateRequest({ body: addRecordSchema }),
  EvaluationController.addRecord
);

// ==========================================
// 2. ANNOTATION & ADJUDICATION ENDPOINTS
// ==========================================
router.post(
  '/annotations',
  authenticateStaff,
  validateRequest({ body: submitAnnotationSchema }),
  EvaluationController.submitAnnotation
);
router.post(
  '/annotations/adjudicate',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN),
  validateRequest({ body: adjudicateConflictSchema }),
  EvaluationController.adjudicateConflict
);
router.get('/annotations/agreement', EvaluationController.getAgreementMetrics);

// ==========================================
// 3. SAMPLE SIZE CALCULATOR (SECTION 5)
// ==========================================
router.get('/sample-size-calculator', EvaluationController.calculateSampleSize);
router.post('/sample-size-calculator', EvaluationController.calculateSampleSize);

// ==========================================
// 4. CALIBRATION PROTOCOL (SECTION 6)
// ==========================================
router.post(
  '/calibrate',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  validateRequest({ body: executeCalibrationSchema }),
  EvaluationController.runCalibration
);

// ==========================================
// 5. EVALUATION RUNNER & REPORTS (SECTION 7)
// ==========================================
router.post(
  '/run',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  validateRequest({ body: executeEvaluationSchema }),
  EvaluationController.runEvaluation
);
router.get('/reports', EvaluationController.listReports);
router.get('/reports/compare', EvaluationController.compareReports);
router.get('/reports/:id', EvaluationController.getReport);

// ==========================================
// 6. GOVERNANCE & SIGN-OFF (SECTION 8)
// ==========================================
router.post(
  '/reports/sign',
  authenticateStaff,
  authorizeRoles(UserRoles.DOCTOR, UserRoles.ADMIN),
  validateRequest({ body: signReportSchema }),
  EvaluationController.signReport
);
router.get('/release-gate', EvaluationController.verifyReleaseGate);

// ==========================================
// 7. CI RUNNER (SECTION 7)
// ==========================================
router.post('/ci/run', EvaluationController.runCiEvaluation);

// ==========================================
// 8. DRIFT MONITORING (SECTION 7)
// ==========================================
router.post(
  '/drift/analyze',
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.DOCTOR),
  validateRequest({ body: driftAnalysisSchema }),
  EvaluationController.analyzeDrift
);
router.get('/drift/samples', EvaluationController.listDriftSamples);

export const evaluationRoutes = router;
