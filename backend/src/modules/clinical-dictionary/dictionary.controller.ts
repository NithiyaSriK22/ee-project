import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { ClinicalDictionaryService } from './dictionary.service.js';
import { DriftCheckerService } from './drift-checker.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { ValidationError } from '../../errors/app-error.js';

export class ClinicalDictionaryController {
  // Helper to set dictionary version header
  private static setVersionHeader(res: Response): void {
    res.setHeader('X-Dictionary-Version', ClinicalDictionaryService.getVersion());
  }

  // ---------------------------------------------------------------------------
  // Read-Only Cached Endpoints for Consuming Modules
  // ---------------------------------------------------------------------------

  public static getSections(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getSections();
      ResponseUtil.success(res, result.data, 'Sections retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getQuestions(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getQuestions();
      ResponseUtil.success(res, result.data, 'Questions retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getOptionCodes(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const questionCode = req.query.questionCode as string | undefined;
      const result = ClinicalDictionaryService.getOptionCodes(questionCode);
      ResponseUtil.success(res, result.data, 'Option codes retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getFactKeys(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getFactKeys();
      ResponseUtil.success(res, result.data, 'Fact keys retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getSummaryKeys(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getSummaryKeys();
      ResponseUtil.success(res, result.data, 'Summary keys retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getFieldTypes(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getDocumentFieldTypes();
      ResponseUtil.success(res, result.data, 'Field types retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getUnits(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getUnits();
      ResponseUtil.success(res, result.data, 'Units retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getPatterns(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getPatterns();
      ResponseUtil.success(res, result.data, 'Patterns retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getAbbreviations(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getAbbreviations();
      ResponseUtil.success(res, result.data, 'Abbreviations retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getDrugs(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getDrugs();
      ResponseUtil.success(res, result.data, 'Drugs retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getLabTests(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const result = ClinicalDictionaryService.getLabTests();
      ResponseUtil.success(res, result.data, 'Lab tests retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  public static getReferenceRanges(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const labTestCode = req.query.labTestCode as string | undefined;
      const result = ClinicalDictionaryService.getReferenceRanges(labTestCode);
      ResponseUtil.success(res, result.data, 'Reference ranges retrieved successfully', 200, { version: result.version });
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Safety Resolution Endpoints
  // ---------------------------------------------------------------------------

  public static resolveAbbreviation(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const { abbreviation, context } = req.body;
      if (!abbreviation) {
        throw new ValidationError('abbreviation string is required.');
      }
      const result = ClinicalDictionaryService.resolveAbbreviation(abbreviation, context);
      ResponseUtil.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static convertUnit(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const { value, fromUnit, toUnit, analyte } = req.body;
      if (value === undefined || !fromUnit || !toUnit || !analyte) {
        throw new ValidationError('value, fromUnit, toUnit, and analyte are required.');
      }
      const result = ClinicalDictionaryService.convertUnit(Number(value), fromUnit, toUnit, analyte);
      ResponseUtil.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  public static evaluateLasa(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const { topMatchDrugCode, topMatchScore, runnerUpDrugCode, runnerUpScore, marginThreshold } =
        req.body;
      if (!topMatchDrugCode || topMatchScore === undefined) {
        throw new ValidationError('topMatchDrugCode and topMatchScore are required.');
      }
      const result = ClinicalDictionaryService.evaluateLasaMatchSafety(
        topMatchDrugCode,
        Number(topMatchScore),
        runnerUpDrugCode || null,
        runnerUpScore !== undefined ? Number(runnerUpScore) : null,
        marginThreshold ? Number(marginThreshold) : 0.10
      );
      ResponseUtil.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Governance Workflow Endpoints (Admin, Super Admin, Clinical Reviewer)
  // ---------------------------------------------------------------------------

  public static createDraft(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const authorId = req.user?.id || req.body.createdBy || 'clinical-author';
      const created = ClinicalDictionaryService.createDraft(req.body, authorId);
      ResponseUtil.created(res, created, 'Draft created successfully');
    } catch (err) {
      next(err);
    }
  }

  public static submitForReview(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const reviewerId = req.user?.id || 'reviewer-lead';
      const code = req.params.code as string;
      const updated = ClinicalDictionaryService.submitForReview(code, reviewerId);
      ResponseUtil.success(res, updated, 'Submitted for review');
    } catch (err) {
      next(err);
    }
  }

  public static activate(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const approverId = req.user?.id || req.body.approverId || 'pharmacist-reviewer-01';
      const code = req.params.code as string;
      const activated = ClinicalDictionaryService.activate(code, approverId);
      ResponseUtil.success(res, activated, 'Dictionary entry activated');
    } catch (err) {
      next(err);
    }
  }

  public static retire(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const retiredById = req.user?.id || 'admin-user';
      const code = req.params.code as string;
      const reason = req.body.reason || 'Clinical terminology superseded';
      const retired = ClinicalDictionaryService.retire(code, reason, retiredById);
      ResponseUtil.success(res, retired, 'Dictionary entry retired');
    } catch (err) {
      next(err);
    }
  }

  public static getImpact(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const code = req.params.code as string;
      const impact = ClinicalDictionaryService.getImpactAnalysis(code);
      ResponseUtil.success(res, impact);
    } catch (err) {
      next(err);
    }
  }

  public static runDryRunImport(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const { sourceDataset, candidateEntries } = req.body;
      if (!sourceDataset || !Array.isArray(candidateEntries)) {
        throw new ValidationError('sourceDataset string and candidateEntries array required.');
      }
      const report = ClinicalDictionaryService.runDryRunImport(sourceDataset, candidateEntries);
      ResponseUtil.success(res, report, 'Dry-run report generated');
    } catch (err) {
      next(err);
    }
  }

  public static scanDrift(_req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ClinicalDictionaryController.setVersionHeader(res);
      const scanResult = DriftCheckerService.scanAllModules();
      ResponseUtil.success(res, scanResult, 'Drift scan completed');
    } catch (err) {
      next(err);
    }
  }
}
