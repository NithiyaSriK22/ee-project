import { Response, NextFunction } from 'express';
import { AppRequest } from '../../types/api.types.js';
import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { listAllMetricDefinitions } from './analytics/metric-catalog.js';
import { AggregationService } from './analytics/aggregation.service.js';
import { AuditService } from './audit/audit.service.js';
import { AccessReportsService } from './audit/access-reports.service.js';
import { SystemHealthService } from './health/system-health.service.js';
import { KioskFleetService } from './kiosk-fleet/kiosk-fleet.service.js';
import { ReportsService } from './reports/reports.service.js';
import { ExportsService } from './exports/exports.service.js';
import { RetentionService } from './retention/retention.service.js';
import { StaffAdminService } from './staff-admin/staff-admin.service.js';
import { devFallbackAdminStore } from './dev-fallback-admin-store.js';

export class AdminController {
  // --- ANALYTICS DASHBOARDS ---
  public static async getMetricsCatalog(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = listAllMetricDefinitions();
      res.json({
        success: true,
        data: {
          metrics,
          totalCount: metrics.length,
          catalogVersion: '1.0.0',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getOperationsOverview(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getOperationsOverview(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getIntakeAnalytics(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getIntakeAnalytics(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getLanguageVoiceAnalytics(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getLanguageVoiceAnalytics(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getDocumentsAnalytics(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getDocumentsAnalytics(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getSummariesReviewAnalytics(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getSummariesReviewAnalytics(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getAlertsOperationsAnalytics(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AggregationService.getAlertsOperationsAnalytics(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // --- AUDIT TRAIL ---
  public static async searchAuditLogs(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        actorId: req.query.actorId as string,
        actorRole: req.query.actorRole as string,
        action: req.query.action as string,
        entityType: req.query.entityType as string,
        visitRef: req.query.visitRef as string,
        result: req.query.result as any,
        requestId: req.query.requestId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      };

      const requestingRole = req.user?.role || 'AUDITOR';
      const requestingId = req.user?.id || 'sys';

      const result = await AuditService.searchAuditLogs(query, requestingRole, requestingId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogById(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const log = await AuditService.getAuditLogById(req.params.id as string, req.user?.role || 'AUDITOR');
      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  public static async getAccessReports(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await AccessReportsService.generateAccessReport(req.query as any);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyChain(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const verification = AuditService.verifyAuditChain();
      res.json({ success: true, data: verification });
    } catch (err) {
      next(err);
    }
  }

  // --- SYSTEM & KIOSK FLEET HEALTH ---
  public static async getSystemHealth(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await SystemHealthService.checkSystemHealth();
      res.json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }

  public static async getKioskFleet(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kiosks = await KioskFleetService.listKioskDevices();
      res.json({ success: true, data: { kiosks, count: kiosks.length } });
    } catch (err) {
      next(err);
    }
  }

  // --- REPORTS ---
  public static async listReports(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await ReportsService.listReports();
      res.json({ success: true, data: { reports } });
    } catch (err) {
      next(err);
    }
  }

  public static async queueReport(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportType, startDate, endDate, reportingTimezone, parameters } = req.body;
      const report = await ReportsService.queueReportGeneration({
        reportType,
        startDate,
        endDate,
        reportingTimezone,
        parameters,
        generatedBy: req.user?.id || 'admin',
        userRole: req.user?.role || 'ADMIN',
      });
      res.status(202).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public static async downloadReport(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { report, content } = await ReportsService.getReportDownload(
        req.params.id as string,
        req.user?.id || 'admin',
        req.user?.role || 'ADMIN'
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.reportType}-${report.id}.csv"`);
      res.send(content);
    } catch (err) {
      next(err);
    }
  }

  // --- EXPORTS ---
  public static async createExport(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { exportType, format, startDate, endDate, filters } = req.body;
      const job = await ExportsService.createExportJob({
        exportType,
        format,
        startDate,
        endDate,
        filters,
        userId: req.user?.id || 'admin',
        userRole: req.user?.role || 'ADMIN',
      });
      res.status(202).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  public static async getExport(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await ExportsService.getExportJob(req.params.id as string);
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  // --- STAFF ADMINISTRATION ---
  public static async listStaff(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await StaffAdminService.listStaff();
      res.json({ success: true, data: { staff, count: staff.length } });
    } catch (err) {
      next(err);
    }
  }

  public static async createStaff(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await StaffAdminService.createStaff({
        ...req.body,
        actorId: req.user?.id || 'admin',
        actorRole: req.user?.role || 'ADMIN',
      });
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStaffRole(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await StaffAdminService.updateStaffRole({
        staffId: req.params.id as string,
        newRole: req.body.role,
        actorId: req.user?.id || 'admin',
        actorRole: req.user?.role || 'SUPER_ADMIN',
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async deactivateStaff(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deactivated = await StaffAdminService.deactivateStaff({
        staffId: req.params.id as string,
        actorId: req.user?.id || 'admin',
        actorRole: req.user?.role || 'SUPER_ADMIN',
      });
      res.json({ success: true, data: deactivated });
    } catch (err) {
      next(err);
    }
  }

  // --- RETENTION & LEGAL HOLDS ---
  public static async getRetentionSettings(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await RetentionService.getRetentionOverview();
      res.json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }

  public static async updateRetentionSetting(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await RetentionService.updateRetentionSetting({
        settingKey: req.body.settingKey,
        settingValue: req.body.settingValue,
        updatedBy: req.user?.id || 'admin',
        userRole: req.user?.role || 'ADMIN',
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async placeLegalHold(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const hold = await RetentionService.placeLegalHold({
        scope: req.body.scope || 'ALL',
        reason: req.body.reason,
        placedBy: req.user?.id || 'admin',
        userRole: req.user?.role || 'ADMIN',
      });
      res.status(201).json({ success: true, data: hold });
    } catch (err) {
      next(err);
    }
  }

  // --- PILOT EVALUATION & BASELINES ---
  public static async getPilotBaselines(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const baselines = devFallbackAdminStore.getPilotBaselines();
      res.json({
        success: true,
        data: {
          baselines,
          evaluationNotice:
            'All comparisons with pre-deployment workflow duration require an explicit documented baseline record with verified source, sample size, and evaluator provenance. No clinical efficacy or accuracy claims may be computed from this telemetry.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async recordPilotBaseline(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { metricKey, baselineValue, unit, sourceDescription, measuredBy, sampleSize, measuredAt } = req.body;
      if (!metricKey || !baselineValue || !sourceDescription || !measuredBy) {
        throw new AppError(
          'Complete baseline metadata (metricKey, baselineValue, sourceDescription, measuredBy) is mandatory.',
          400,
          ErrorCode.VALIDATION_ERROR
        );
      }

      const recorded = devFallbackAdminStore.setPilotBaseline({
        metricKey,
        baselineValue,
        unit: unit || 'seconds',
        sourceDescription,
        measuredBy,
        sampleSize: sampleSize || 50,
        measuredAt: measuredAt || new Date().toISOString(),
      });

      res.status(201).json({ success: true, data: recorded });
    } catch (err) {
      next(err);
    }
  }
}
