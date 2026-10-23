import { Router } from 'express';
import { ClinicalDictionaryController } from './dictionary.controller.js';
import { authenticateStaff, authorizeRoles } from '../../middleware/auth.middleware.js';
import { UserRoles } from '../../types/auth.types.js';

// ---------------------------------------------------------------------------
// 1. Read-Only Dictionary Router for Modules (/api/v1/dictionary)
// ---------------------------------------------------------------------------
export const dictionaryRouter = Router();

dictionaryRouter.get('/sections', ClinicalDictionaryController.getSections);
dictionaryRouter.get('/questions', ClinicalDictionaryController.getQuestions);
dictionaryRouter.get('/option-codes', ClinicalDictionaryController.getOptionCodes);
dictionaryRouter.get('/fact-keys', ClinicalDictionaryController.getFactKeys);
dictionaryRouter.get('/summary-keys', ClinicalDictionaryController.getSummaryKeys);
dictionaryRouter.get('/field-types', ClinicalDictionaryController.getFieldTypes);
dictionaryRouter.get('/units', ClinicalDictionaryController.getUnits);
dictionaryRouter.get('/patterns', ClinicalDictionaryController.getPatterns);
dictionaryRouter.get('/abbreviations', ClinicalDictionaryController.getAbbreviations);
dictionaryRouter.get('/drugs', ClinicalDictionaryController.getDrugs);
dictionaryRouter.get('/lab-tests', ClinicalDictionaryController.getLabTests);
dictionaryRouter.get('/reference-ranges', ClinicalDictionaryController.getReferenceRanges);

dictionaryRouter.post('/abbreviations/resolve', ClinicalDictionaryController.resolveAbbreviation);
dictionaryRouter.post('/units/convert', ClinicalDictionaryController.convertUnit);
dictionaryRouter.post('/lasa/evaluate', ClinicalDictionaryController.evaluateLasa);

// ---------------------------------------------------------------------------
// 2. Admin & Clinical Governance Router (/api/v1/admin/dictionary)
// ---------------------------------------------------------------------------
export const adminDictionaryRouter = Router();

const requireDictionaryAdmin = [
  authenticateStaff,
  authorizeRoles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.DOCTOR),
];

adminDictionaryRouter.post('/draft', ...requireDictionaryAdmin, ClinicalDictionaryController.createDraft);
adminDictionaryRouter.post('/:code/review', ...requireDictionaryAdmin, ClinicalDictionaryController.submitForReview);
adminDictionaryRouter.post('/:code/activate', ...requireDictionaryAdmin, ClinicalDictionaryController.activate);
adminDictionaryRouter.post('/:code/retire', ...requireDictionaryAdmin, ClinicalDictionaryController.retire);
adminDictionaryRouter.get('/:code/impact', ...requireDictionaryAdmin, ClinicalDictionaryController.getImpact);
adminDictionaryRouter.post('/import/dry-run', ...requireDictionaryAdmin, ClinicalDictionaryController.runDryRunImport);
adminDictionaryRouter.get('/drift-scan', ...requireDictionaryAdmin, ClinicalDictionaryController.scanDrift);
