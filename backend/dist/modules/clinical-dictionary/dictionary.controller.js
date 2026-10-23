"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalDictionaryController = void 0;
const dictionary_service_js_1 = require("./dictionary.service.js");
const drift_checker_service_js_1 = require("./drift-checker.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class ClinicalDictionaryController {
    // Helper to set dictionary version header
    static setVersionHeader(res) {
        res.setHeader('X-Dictionary-Version', dictionary_service_js_1.ClinicalDictionaryService.getVersion());
    }
    // ---------------------------------------------------------------------------
    // Read-Only Cached Endpoints for Consuming Modules
    // ---------------------------------------------------------------------------
    static getSections(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getSections();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Sections retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getQuestions(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getQuestions();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Questions retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getOptionCodes(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const questionCode = req.query.questionCode;
            const result = dictionary_service_js_1.ClinicalDictionaryService.getOptionCodes(questionCode);
            response_util_js_1.ResponseUtil.success(res, result.data, 'Option codes retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getFactKeys(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getFactKeys();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Fact keys retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getSummaryKeys(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getSummaryKeys();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Summary keys retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getFieldTypes(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getDocumentFieldTypes();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Field types retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getUnits(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getUnits();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Units retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getPatterns(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getPatterns();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Patterns retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getAbbreviations(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getAbbreviations();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Abbreviations retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getDrugs(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getDrugs();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Drugs retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getLabTests(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const result = dictionary_service_js_1.ClinicalDictionaryService.getLabTests();
            response_util_js_1.ResponseUtil.success(res, result.data, 'Lab tests retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    static getReferenceRanges(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const labTestCode = req.query.labTestCode;
            const result = dictionary_service_js_1.ClinicalDictionaryService.getReferenceRanges(labTestCode);
            response_util_js_1.ResponseUtil.success(res, result.data, 'Reference ranges retrieved successfully', 200, { version: result.version });
        }
        catch (err) {
            next(err);
        }
    }
    // ---------------------------------------------------------------------------
    // Safety Resolution Endpoints
    // ---------------------------------------------------------------------------
    static resolveAbbreviation(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const { abbreviation, context } = req.body;
            if (!abbreviation) {
                throw new app_error_js_1.ValidationError('abbreviation string is required.');
            }
            const result = dictionary_service_js_1.ClinicalDictionaryService.resolveAbbreviation(abbreviation, context);
            response_util_js_1.ResponseUtil.success(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static convertUnit(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const { value, fromUnit, toUnit, analyte } = req.body;
            if (value === undefined || !fromUnit || !toUnit || !analyte) {
                throw new app_error_js_1.ValidationError('value, fromUnit, toUnit, and analyte are required.');
            }
            const result = dictionary_service_js_1.ClinicalDictionaryService.convertUnit(Number(value), fromUnit, toUnit, analyte);
            response_util_js_1.ResponseUtil.success(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static evaluateLasa(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const { topMatchDrugCode, topMatchScore, runnerUpDrugCode, runnerUpScore, marginThreshold } = req.body;
            if (!topMatchDrugCode || topMatchScore === undefined) {
                throw new app_error_js_1.ValidationError('topMatchDrugCode and topMatchScore are required.');
            }
            const result = dictionary_service_js_1.ClinicalDictionaryService.evaluateLasaMatchSafety(topMatchDrugCode, Number(topMatchScore), runnerUpDrugCode || null, runnerUpScore !== undefined ? Number(runnerUpScore) : null, marginThreshold ? Number(marginThreshold) : 0.10);
            response_util_js_1.ResponseUtil.success(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    // ---------------------------------------------------------------------------
    // Governance Workflow Endpoints (Admin, Super Admin, Clinical Reviewer)
    // ---------------------------------------------------------------------------
    static createDraft(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const authorId = req.user?.id || req.body.createdBy || 'clinical-author';
            const created = dictionary_service_js_1.ClinicalDictionaryService.createDraft(req.body, authorId);
            response_util_js_1.ResponseUtil.created(res, created, 'Draft created successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static submitForReview(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const reviewerId = req.user?.id || 'reviewer-lead';
            const code = req.params.code;
            const updated = dictionary_service_js_1.ClinicalDictionaryService.submitForReview(code, reviewerId);
            response_util_js_1.ResponseUtil.success(res, updated, 'Submitted for review');
        }
        catch (err) {
            next(err);
        }
    }
    static activate(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const approverId = req.user?.id || req.body.approverId || 'pharmacist-reviewer-01';
            const code = req.params.code;
            const activated = dictionary_service_js_1.ClinicalDictionaryService.activate(code, approverId);
            response_util_js_1.ResponseUtil.success(res, activated, 'Dictionary entry activated');
        }
        catch (err) {
            next(err);
        }
    }
    static retire(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const retiredById = req.user?.id || 'admin-user';
            const code = req.params.code;
            const reason = req.body.reason || 'Clinical terminology superseded';
            const retired = dictionary_service_js_1.ClinicalDictionaryService.retire(code, reason, retiredById);
            response_util_js_1.ResponseUtil.success(res, retired, 'Dictionary entry retired');
        }
        catch (err) {
            next(err);
        }
    }
    static getImpact(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const code = req.params.code;
            const impact = dictionary_service_js_1.ClinicalDictionaryService.getImpactAnalysis(code);
            response_util_js_1.ResponseUtil.success(res, impact);
        }
        catch (err) {
            next(err);
        }
    }
    static runDryRunImport(req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const { sourceDataset, candidateEntries } = req.body;
            if (!sourceDataset || !Array.isArray(candidateEntries)) {
                throw new app_error_js_1.ValidationError('sourceDataset string and candidateEntries array required.');
            }
            const report = dictionary_service_js_1.ClinicalDictionaryService.runDryRunImport(sourceDataset, candidateEntries);
            response_util_js_1.ResponseUtil.success(res, report, 'Dry-run report generated');
        }
        catch (err) {
            next(err);
        }
    }
    static scanDrift(_req, res, next) {
        try {
            ClinicalDictionaryController.setVersionHeader(res);
            const scanResult = drift_checker_service_js_1.DriftCheckerService.scanAllModules();
            response_util_js_1.ResponseUtil.success(res, scanResult, 'Drift scan completed');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ClinicalDictionaryController = ClinicalDictionaryController;
