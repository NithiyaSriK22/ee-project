"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const app_error_js_1 = require("../../errors/app-error.js");
const error_codes_js_1 = require("../../errors/error-codes.js");
const metric_catalog_js_1 = require("./analytics/metric-catalog.js");
const aggregation_service_js_1 = require("./analytics/aggregation.service.js");
const audit_service_js_1 = require("./audit/audit.service.js");
const access_reports_service_js_1 = require("./audit/access-reports.service.js");
const system_health_service_js_1 = require("./health/system-health.service.js");
const kiosk_fleet_service_js_1 = require("./kiosk-fleet/kiosk-fleet.service.js");
const reports_service_js_1 = require("./reports/reports.service.js");
const exports_service_js_1 = require("./exports/exports.service.js");
const retention_service_js_1 = require("./retention/retention.service.js");
const staff_admin_service_js_1 = require("./staff-admin/staff-admin.service.js");
const dev_fallback_admin_store_js_1 = require("./dev-fallback-admin-store.js");
class AdminController {
    // --- ANALYTICS DASHBOARDS ---
    static async getMetricsCatalog(_req, res, next) {
        try {
            const metrics = (0, metric_catalog_js_1.listAllMetricDefinitions)();
            res.json({
                success: true,
                data: {
                    metrics,
                    totalCount: metrics.length,
                    catalogVersion: '1.0.0',
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getOperationsOverview(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getOperationsOverview(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getIntakeAnalytics(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getIntakeAnalytics(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getLanguageVoiceAnalytics(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getLanguageVoiceAnalytics(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDocumentsAnalytics(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getDocumentsAnalytics(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSummariesReviewAnalytics(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getSummariesReviewAnalytics(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAlertsOperationsAnalytics(req, res, next) {
        try {
            const data = await aggregation_service_js_1.AggregationService.getAlertsOperationsAnalytics(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // --- AUDIT TRAIL ---
    static async searchAuditLogs(req, res, next) {
        try {
            const query = {
                actorId: req.query.actorId,
                actorRole: req.query.actorRole,
                action: req.query.action,
                entityType: req.query.entityType,
                visitRef: req.query.visitRef,
                result: req.query.result,
                requestId: req.query.requestId,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
                offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
            };
            const requestingRole = req.user?.role || 'AUDITOR';
            const requestingId = req.user?.id || 'sys';
            const result = await audit_service_js_1.AuditService.searchAuditLogs(query, requestingRole, requestingId);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAuditLogById(req, res, next) {
        try {
            const log = await audit_service_js_1.AuditService.getAuditLogById(req.params.id, req.user?.role || 'AUDITOR');
            res.json({ success: true, data: log });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAccessReports(req, res, next) {
        try {
            const reports = await access_reports_service_js_1.AccessReportsService.generateAccessReport(req.query);
            res.json({ success: true, data: reports });
        }
        catch (err) {
            next(err);
        }
    }
    static async verifyChain(_req, res, next) {
        try {
            const verification = audit_service_js_1.AuditService.verifyAuditChain();
            res.json({ success: true, data: verification });
        }
        catch (err) {
            next(err);
        }
    }
    // --- SYSTEM & KIOSK FLEET HEALTH ---
    static async getSystemHealth(_req, res, next) {
        try {
            const health = await system_health_service_js_1.SystemHealthService.checkSystemHealth();
            res.json({ success: true, data: health });
        }
        catch (err) {
            next(err);
        }
    }
    static async getKioskFleet(_req, res, next) {
        try {
            const kiosks = await kiosk_fleet_service_js_1.KioskFleetService.listKioskDevices();
            res.json({ success: true, data: { kiosks, count: kiosks.length } });
        }
        catch (err) {
            next(err);
        }
    }
    // --- REPORTS ---
    static async listReports(_req, res, next) {
        try {
            const reports = await reports_service_js_1.ReportsService.listReports();
            res.json({ success: true, data: { reports } });
        }
        catch (err) {
            next(err);
        }
    }
    static async queueReport(req, res, next) {
        try {
            const { reportType, startDate, endDate, reportingTimezone, parameters } = req.body;
            const report = await reports_service_js_1.ReportsService.queueReportGeneration({
                reportType,
                startDate,
                endDate,
                reportingTimezone,
                parameters,
                generatedBy: req.user?.id || 'admin',
                userRole: req.user?.role || 'ADMIN',
            });
            res.status(202).json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
    static async downloadReport(req, res, next) {
        try {
            const { report, content } = await reports_service_js_1.ReportsService.getReportDownload(req.params.id, req.user?.id || 'admin', req.user?.role || 'ADMIN');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${report.reportType}-${report.id}.csv"`);
            res.send(content);
        }
        catch (err) {
            next(err);
        }
    }
    // --- EXPORTS ---
    static async createExport(req, res, next) {
        try {
            const { exportType, format, startDate, endDate, filters } = req.body;
            const job = await exports_service_js_1.ExportsService.createExportJob({
                exportType,
                format,
                startDate,
                endDate,
                filters,
                userId: req.user?.id || 'admin',
                userRole: req.user?.role || 'ADMIN',
            });
            res.status(202).json({ success: true, data: job });
        }
        catch (err) {
            next(err);
        }
    }
    static async getExport(req, res, next) {
        try {
            const job = await exports_service_js_1.ExportsService.getExportJob(req.params.id);
            res.json({ success: true, data: job });
        }
        catch (err) {
            next(err);
        }
    }
    // --- STAFF ADMINISTRATION ---
    static async listStaff(_req, res, next) {
        try {
            const staff = await staff_admin_service_js_1.StaffAdminService.listStaff();
            res.json({ success: true, data: { staff, count: staff.length } });
        }
        catch (err) {
            next(err);
        }
    }
    static async createStaff(req, res, next) {
        try {
            const created = await staff_admin_service_js_1.StaffAdminService.createStaff({
                ...req.body,
                actorId: req.user?.id || 'admin',
                actorRole: req.user?.role || 'ADMIN',
            });
            res.status(201).json({ success: true, data: created });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStaffRole(req, res, next) {
        try {
            const updated = await staff_admin_service_js_1.StaffAdminService.updateStaffRole({
                staffId: req.params.id,
                newRole: req.body.role,
                actorId: req.user?.id || 'admin',
                actorRole: req.user?.role || 'SUPER_ADMIN',
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static async deactivateStaff(req, res, next) {
        try {
            const deactivated = await staff_admin_service_js_1.StaffAdminService.deactivateStaff({
                staffId: req.params.id,
                actorId: req.user?.id || 'admin',
                actorRole: req.user?.role || 'SUPER_ADMIN',
            });
            res.json({ success: true, data: deactivated });
        }
        catch (err) {
            next(err);
        }
    }
    // --- RETENTION & LEGAL HOLDS ---
    static async getRetentionSettings(_req, res, next) {
        try {
            const overview = await retention_service_js_1.RetentionService.getRetentionOverview();
            res.json({ success: true, data: overview });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateRetentionSetting(req, res, next) {
        try {
            const updated = await retention_service_js_1.RetentionService.updateRetentionSetting({
                settingKey: req.body.settingKey,
                settingValue: req.body.settingValue,
                updatedBy: req.user?.id || 'admin',
                userRole: req.user?.role || 'ADMIN',
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static async placeLegalHold(req, res, next) {
        try {
            const hold = await retention_service_js_1.RetentionService.placeLegalHold({
                scope: req.body.scope || 'ALL',
                reason: req.body.reason,
                placedBy: req.user?.id || 'admin',
                userRole: req.user?.role || 'ADMIN',
            });
            res.status(201).json({ success: true, data: hold });
        }
        catch (err) {
            next(err);
        }
    }
    // --- PILOT EVALUATION & BASELINES ---
    static async getPilotBaselines(_req, res, next) {
        try {
            const baselines = dev_fallback_admin_store_js_1.devFallbackAdminStore.getPilotBaselines();
            res.json({
                success: true,
                data: {
                    baselines,
                    evaluationNotice: 'All comparisons with pre-deployment workflow duration require an explicit documented baseline record with verified source, sample size, and evaluator provenance. No clinical efficacy or accuracy claims may be computed from this telemetry.',
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async recordPilotBaseline(req, res, next) {
        try {
            const { metricKey, baselineValue, unit, sourceDescription, measuredBy, sampleSize, measuredAt } = req.body;
            if (!metricKey || !baselineValue || !sourceDescription || !measuredBy) {
                throw new app_error_js_1.AppError('Complete baseline metadata (metricKey, baselineValue, sourceDescription, measuredBy) is mandatory.', 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
            }
            const recorded = dev_fallback_admin_store_js_1.devFallbackAdminStore.setPilotBaseline({
                metricKey,
                baselineValue,
                unit: unit || 'seconds',
                sourceDescription,
                measuredBy,
                sampleSize: sampleSize || 50,
                measuredAt: measuredAt || new Date().toISOString(),
            });
            res.status(201).json({ success: true, data: recorded });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AdminController = AdminController;
