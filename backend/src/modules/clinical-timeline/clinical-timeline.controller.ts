import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { ClinicalTimelineService } from './clinical-timeline.service.js';
import { LabFlaggingService } from './lab-flagging.service.js';
import { CarryForwardService } from './carry-forward.service.js';
import { LongitudinalDiffService } from './longitudinal-diff.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AuthenticationError, ValidationError } from '../../errors/app-error.js';

export class ClinicalTimelineController {
  /**
   * Retrieves the full chronological patient timeline
   */
  public static async getTimeline(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        throw new ValidationError('Patient ID is required');
      }

      const timeline = await ClinicalTimelineService.getPatientTimeline(patientId, {
        patientAge: req.query.age ? Number(req.query.age) : undefined,
        patientGender: req.query.gender ? String(req.query.gender) : undefined,
      });

      ResponseUtil.success(res, timeline, 'Patient longitudinal timeline retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves longitudinal trends for a specific lab test
   */
  public static async getLabTrends(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId } = req.params;
      const test = req.query.test ? String(req.query.test) : 'LAB_FASTING_GLUCOSE';

      if (!patientId) {
        throw new ValidationError('Patient ID is required');
      }

      const trends = await ClinicalTimelineService.getLabTrends(patientId, test);
      ResponseUtil.success(res, trends, `Longitudinal trends for test "${test}" retrieved successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves deterministic "Changed Since Last Visit" diff
   */
  public static async getVisitDiff(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, visitId } = req.params;
      const priorVisitId = req.query.priorVisitId ? String(req.query.priorVisitId) : undefined;

      if (!patientId || !visitId) {
        throw new ValidationError('Patient ID and Visit ID are required');
      }

      const diff = await LongitudinalDiffService.computeVisitDiff(patientId, visitId, priorVisitId);
      ResponseUtil.success(res, diff, 'Longitudinal visit diff computed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Evaluates a single lab value against reference ranges (utility endpoint)
   */
  public static async evaluateLabValue(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { testCodeOrName, rawValue, rawUnit, isVerified, reportPrintedRange, patientAge, patientGender } = req.body;

      if (!testCodeOrName || rawValue === undefined) {
        throw new ValidationError('testCodeOrName and rawValue are required');
      }

      const result = LabFlaggingService.evaluateLabResult({
        testCodeOrName,
        rawValue,
        rawUnit,
        isVerified: Boolean(isVerified ?? true),
        reportPrintedRange,
        patientAge,
        patientGender,
      });

      ResponseUtil.success(res, result, 'Lab reference range evaluation completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kiosk: Retrieves carry-forward candidate questions from prior visits
   */
  public static async getCarryForwardCandidates(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { visitId, patientId } = req.kioskSession;
      const candidates = await CarryForwardService.getCarryForwardCandidates(patientId, visitId);

      ResponseUtil.success(res, candidates, 'Carry-forward candidate questions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kiosk: Confirms or changes a prior answer for the current visit
   */
  public static async confirmCarryForward(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }

      const { visitId, patientId } = req.kioskSession;
      const result = await CarryForwardService.processCarryForwardConfirmation(visitId, patientId, req.body);

      ResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
