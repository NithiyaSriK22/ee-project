"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDictionaryRouter = exports.dictionaryRouter = void 0;
const express_1 = require("express");
const dictionary_controller_js_1 = require("./dictionary.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
// ---------------------------------------------------------------------------
// 1. Read-Only Dictionary Router for Modules (/api/v1/dictionary)
// ---------------------------------------------------------------------------
exports.dictionaryRouter = (0, express_1.Router)();
exports.dictionaryRouter.get('/sections', dictionary_controller_js_1.ClinicalDictionaryController.getSections);
exports.dictionaryRouter.get('/questions', dictionary_controller_js_1.ClinicalDictionaryController.getQuestions);
exports.dictionaryRouter.get('/option-codes', dictionary_controller_js_1.ClinicalDictionaryController.getOptionCodes);
exports.dictionaryRouter.get('/fact-keys', dictionary_controller_js_1.ClinicalDictionaryController.getFactKeys);
exports.dictionaryRouter.get('/summary-keys', dictionary_controller_js_1.ClinicalDictionaryController.getSummaryKeys);
exports.dictionaryRouter.get('/field-types', dictionary_controller_js_1.ClinicalDictionaryController.getFieldTypes);
exports.dictionaryRouter.get('/units', dictionary_controller_js_1.ClinicalDictionaryController.getUnits);
exports.dictionaryRouter.get('/patterns', dictionary_controller_js_1.ClinicalDictionaryController.getPatterns);
exports.dictionaryRouter.get('/abbreviations', dictionary_controller_js_1.ClinicalDictionaryController.getAbbreviations);
exports.dictionaryRouter.get('/drugs', dictionary_controller_js_1.ClinicalDictionaryController.getDrugs);
exports.dictionaryRouter.get('/lab-tests', dictionary_controller_js_1.ClinicalDictionaryController.getLabTests);
exports.dictionaryRouter.get('/reference-ranges', dictionary_controller_js_1.ClinicalDictionaryController.getReferenceRanges);
exports.dictionaryRouter.post('/abbreviations/resolve', dictionary_controller_js_1.ClinicalDictionaryController.resolveAbbreviation);
exports.dictionaryRouter.post('/units/convert', dictionary_controller_js_1.ClinicalDictionaryController.convertUnit);
exports.dictionaryRouter.post('/lasa/evaluate', dictionary_controller_js_1.ClinicalDictionaryController.evaluateLasa);
// ---------------------------------------------------------------------------
// 2. Admin & Clinical Governance Router (/api/v1/admin/dictionary)
// ---------------------------------------------------------------------------
exports.adminDictionaryRouter = (0, express_1.Router)();
const requireDictionaryAdmin = [
    auth_middleware_js_1.authenticateStaff,
    (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN, auth_types_js_1.UserRoles.DOCTOR),
];
exports.adminDictionaryRouter.post('/draft', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.createDraft);
exports.adminDictionaryRouter.post('/:code/review', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.submitForReview);
exports.adminDictionaryRouter.post('/:code/activate', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.activate);
exports.adminDictionaryRouter.post('/:code/retire', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.retire);
exports.adminDictionaryRouter.get('/:code/impact', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.getImpact);
exports.adminDictionaryRouter.post('/import/dry-run', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.runDryRunImport);
exports.adminDictionaryRouter.get('/drift-scan', ...requireDictionaryAdmin, dictionary_controller_js_1.ClinicalDictionaryController.scanDrift);
