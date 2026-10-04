import { Response, NextFunction } from 'express';
import { AppRequest } from '../../../types/api.types.js';
import { FormularyService } from './formulary.service.js';
import { ResponseUtil } from '../../../utils/response.util.js';
import { ValidationError } from '../../../errors/app-error.js';

export class FormularyAdminController {
  public static async listVersions(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const versions = await FormularyService.listVersions();
      ResponseUtil.success(res, versions, 'Formulary versions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getVersionById(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Version ID is required');
      const version = await FormularyService.getVersionById(id);
      ResponseUtil.success(res, version, 'Formulary version retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createVersion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await FormularyService.createVersion(req.body, req.user?.id);
      ResponseUtil.created(res, created, 'Formulary version created successfully (DRAFT)');
    } catch (error) {
      next(error);
    }
  }

  public static async activateVersion(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Version ID is required');
      const activated = await FormularyService.activateVersion(id, req.user?.id);
      ResponseUtil.success(res, activated, 'Formulary version activated for live validation');
    } catch (error) {
      next(error);
    }
  }

  public static async addDrug(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Version ID is required');
      const drug = await FormularyService.addDrug(id, req.body);
      ResponseUtil.created(res, drug, 'Drug added to formulary version');
    } catch (error) {
      next(error);
    }
  }

  public static async importDrugs(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Version ID is required');
      const result = await FormularyService.importDrugs(id, req.body.drugs);
      ResponseUtil.success(res, result, 'Formulary drugs imported successfully');
    } catch (error) {
      next(error);
    }
  }
}
