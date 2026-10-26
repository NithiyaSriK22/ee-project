import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { PatientsService } from './patients.service.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { AuthenticationError, ValidationError } from '../../errors/app-error.js';

export class PatientsController {
  public static async getKioskProfile(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const profile = await PatientsService.getKioskProfile(
        req.kioskSession.patientId,
        req.kioskSession.visitId
      );
      ResponseUtil.success(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateKioskProfile(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const updated = await PatientsService.updateKioskProfile(
        req.kioskSession.patientId,
        req.kioskSession.visitId,
        req.body
      );
      ResponseUtil.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getProfileCompletion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const completion = await PatientsService.getProfileCompletion(
        req.kioskSession.patientId,
        req.kioskSession.visitId
      );
      ResponseUtil.success(res, completion, 'Profile completion status retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async getConsents(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const consents = await PatientsService.getConsents(
        req.kioskSession.patientId,
        req.kioskSession.visitId
      );
      ResponseUtil.success(res, consents, 'Consents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateConsent(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.kioskSession) {
        throw new AuthenticationError('Active kiosk session required');
      }
      const { type } = req.params;
      if (!type) {
        throw new ValidationError('Consent type parameter is required');
      }
      const result = await PatientsService.updateConsent(
        req.kioskSession.patientId,
        req.kioskSession.visitId,
        type,
        req.body
      );
      ResponseUtil.success(res, result, 'Consent updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getPatientForStaff(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Patient ID parameter is required');
      }
      const patient = await PatientsService.getPatientForStaff(id);
      ResponseUtil.success(res, patient, 'Patient retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async listPatients(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const result = await PatientsService.listPatients({ search, limit, offset });
      ResponseUtil.success(res, result, 'Patients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
