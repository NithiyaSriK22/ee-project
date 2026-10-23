"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportsService = void 0;
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const aggregation_service_js_1 = require("../analytics/aggregation.service.js");
const privacy_suppression_js_1 = require("../analytics/privacy-suppression.js");
class ExportsService {
    static MAX_EXPORT_DAYS = 90;
    /**
     * Initiates a privacy-conscious, rate-limited aggregate export job.
     * Row-level patient or clinical data export is strictly forbidden.
     */
    static async createExportJob(params) {
        const format = params.format || 'CSV';
        // 1. Authorization check
        if (params.exportType === 'AUDIT_LOGS') {
            if (params.userRole !== 'AUDITOR' && params.userRole !== 'SUPER_ADMIN') {
                throw new app_error_js_1.AppError('Export of audit logs is restricted to AUDITOR and SUPER_ADMIN roles.', 403, error_codes_js_1.ErrorCode.ADMIN_ACCESS_DENIED);
            }
        }
        // 2. Validate date range
        const { startDate, endDate } = aggregation_service_js_1.AggregationService.resolveDateRange({
            startDate: params.startDate,
            endDate: params.endDate,
        });
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const diffDays = (endMs - startMs) / (1000 * 3600 * 24);
        if (diffDays > this.MAX_EXPORT_DAYS) {
            throw new app_error_js_1.AppError(`Export date range exceeds limit of ${this.MAX_EXPORT_DAYS} days.`, 400, error_codes_js_1.ErrorCode.RANGE_TOO_LARGE);
        }
        // 3. Build export data applying privacy suppression
        let exportContent = '';
        let rowCount = 0;
        if (params.exportType === 'ANALYTICS_AGGREGATES') {
            const aggregates = dev_fallback_admin_store_js_1.devFallbackAdminStore.getDailyAggregates({
                startDate,
                endDate,
            });
            // Apply suppression to every aggregate
            const sanitizedRows = aggregates.map((agg) => {
                const suppressed = privacy_suppression_js_1.PrivacySuppressionService.applySuppression(agg.value, true);
                return {
                    date: agg.date,
                    metric_key: agg.metricKey,
                    value: suppressed.displayValue,
                    dimensions: agg.dimensions ? JSON.stringify(agg.dimensions) : 'global',
                };
            });
            rowCount = sanitizedRows.length;
            if (format === 'JSON') {
                exportContent = JSON.stringify(sanitizedRows, null, 2);
            }
            else {
                exportContent = 'date,metric_key,value,dimensions\n' +
                    sanitizedRows
                        .map((r) => `"${r.date}","${r.metric_key}","${r.value}","${r.dimensions.replace(/"/g, '""')}"`)
                        .join('\n');
            }
        }
        else {
            // AUDIT_LOGS export
            const isPrivileged = params.userRole === 'AUDITOR' || params.userRole === 'SUPER_ADMIN';
            const { logs } = dev_fallback_admin_store_js_1.devFallbackAdminStore.getAuditLogs({
                startDate,
                endDate,
                limit: 5000,
            });
            const sanitizedLogs = logs.map((log) => ({
                sequence_number: log.sequenceNumber,
                occurred_at: log.occurredAt,
                actor_type: log.actorType,
                actor_id: log.actorId,
                actor_role: log.actorRole,
                action: log.action,
                entity_type: log.entityType,
                result: log.result,
                request_id: log.requestId,
                ip_address: isPrivileged ? log.ipAddress : '[RESTRICTED]',
                reason_text: isPrivileged ? log.reasonText : '[RESTRICTED]',
                record_hash: log.recordHash,
            }));
            rowCount = sanitizedLogs.length;
            if (format === 'JSON') {
                exportContent = JSON.stringify(sanitizedLogs, null, 2);
            }
            else {
                exportContent = 'sequence_number,occurred_at,actor_type,actor_id,actor_role,action,entity_type,result,request_id,ip_address,reason_text,record_hash\n' +
                    sanitizedLogs
                        .map((l) => `${l.sequence_number},"${l.occurred_at}","${l.actor_type}","${l.actor_id || ''}","${l.actor_role || ''}","${l.action}","${l.entity_type}","${l.result}","${l.request_id || ''}","${l.ip_address || ''}","${(l.reason_text || '').replace(/"/g, '""')}","${l.record_hash}"`)
                        .join('\n');
            }
        }
        // 4. Set expiring link (1 hour)
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        const job = dev_fallback_admin_store_js_1.devFallbackAdminStore.createExportJob({
            exportType: params.exportType,
            format,
            filters: params.filters,
            status: 'COMPLETED',
            downloadUrl: `/api/v1/admin/exports/download-simulated-${Date.now()}`,
            rowCount,
            expiresAt,
            createdBy: params.userId,
            createdByRole: params.userRole,
            completedAt: new Date().toISOString(),
            dataContent: exportContent,
        });
        // 5. Audit the export event (CRITICAL_AUDIT)
        const auditAction = params.exportType === 'AUDIT_LOGS' ? 'AUDIT_EXPORTED' : 'ANALYTICS_EXPORTED';
        await audit_service_js_1.AuditService.recordAudit({
            actorType: 'STAFF',
            actorId: params.userId,
            actorRole: params.userRole,
            action: auditAction,
            entityType: 'EXPORT_JOB',
            entityId: job.id,
            result: 'SUCCESS',
            metadata: {
                format,
                row_count: rowCount,
                start_date: startDate,
                end_date: endDate,
            },
        });
        return job;
    }
    static async getExportJob(jobId) {
        const job = dev_fallback_admin_store_js_1.devFallbackAdminStore.getExportJobById(jobId);
        if (!job) {
            throw new app_error_js_1.AppError('Export job not found', 404, error_codes_js_1.ErrorCode.NOT_FOUND);
        }
        if (new Date() > new Date(job.expiresAt)) {
            throw new app_error_js_1.AppError('Export download link has expired', 410, error_codes_js_1.ErrorCode.CONFLICT);
        }
        return job;
    }
}
exports.ExportsService = ExportsService;
