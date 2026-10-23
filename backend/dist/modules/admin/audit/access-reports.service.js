"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessReportsService = void 0;
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
class AccessReportsService {
    /**
     * Generates objective access audit reports for AUDITOR & SUPER_ADMIN review.
     * Reports are purely factual and non-judgmental.
     */
    static async generateAccessReport(filters) {
        const { logs } = dev_fallback_admin_store_js_1.devFallbackAdminStore.getAuditLogs({
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            limit: 1000,
        });
        const items = [];
        const deniedCountsByActor = {};
        for (const log of logs) {
            // 1. Out-of-queue accesses
            if (log.action === 'OUT_OF_QUEUE_ACCESS') {
                items.push({
                    id: log.id,
                    occurredAt: log.occurredAt,
                    actorId: log.actorId || 'UNKNOWN',
                    actorRole: log.actorRole || 'UNKNOWN',
                    action: log.action,
                    visitRef: log.visitRef || 'UNSPECIFIED',
                    reasonCode: log.reasonCode,
                    reasonText: log.reasonText,
                    anomalyType: 'OUT_OF_QUEUE_ACCESS',
                    explanation: 'Patient record opened out-of-turn from waiting queue with recorded justification reason.',
                });
            }
            // 2. Cross-department views
            if (log.action === 'CROSS_DEPARTMENT_VIEW' || (log.metadata && log.metadata.cross_department)) {
                items.push({
                    id: log.id,
                    occurredAt: log.occurredAt,
                    actorId: log.actorId || 'UNKNOWN',
                    actorRole: log.actorRole || 'UNKNOWN',
                    action: log.action,
                    visitRef: log.visitRef || 'UNSPECIFIED',
                    reasonCode: log.reasonCode,
                    reasonText: log.reasonText,
                    anomalyType: 'CROSS_DEPARTMENT_VIEW',
                    explanation: 'Patient record viewed by clinician assigned to a different hospital department.',
                });
            }
            // 3. Review take-overs
            if (log.action === 'REVIEW_TAKEN_OVER') {
                items.push({
                    id: log.id,
                    occurredAt: log.occurredAt,
                    actorId: log.actorId || 'UNKNOWN',
                    actorRole: log.actorRole || 'UNKNOWN',
                    action: log.action,
                    visitRef: log.visitRef || 'UNSPECIFIED',
                    reasonCode: log.reasonCode,
                    reasonText: log.reasonText,
                    anomalyType: 'REVIEW_TAKEOVER',
                    explanation: 'Active clinical review session was transferred or overridden by another physician.',
                });
            }
            // 4. Repeated denied access attempts
            if (log.result === 'DENIED') {
                const actorKey = log.actorId || log.ipAddress || 'UNKNOWN';
                deniedCountsByActor[actorKey] = (deniedCountsByActor[actorKey] || 0) + 1;
                if (deniedCountsByActor[actorKey] >= 3) {
                    items.push({
                        id: log.id,
                        occurredAt: log.occurredAt,
                        actorId: log.actorId || 'ANONYMOUS',
                        actorRole: log.actorRole || 'UNKNOWN',
                        action: log.action,
                        visitRef: log.visitRef || 'NONE',
                        anomalyType: 'REPEATED_DENIED_ACCESS',
                        explanation: `Multiple denied access attempts recorded for this actor (${deniedCountsByActor[actorKey]} events).`,
                    });
                }
            }
            // 5. Access outside operating hours (default 20:00 to 07:00 IST)
            const hour = new Date(log.occurredAt).getUTCHours(); // approximate check
            if ((hour >= 15 || hour < 2) && log.action.includes('VIEW')) {
                items.push({
                    id: log.id,
                    occurredAt: log.occurredAt,
                    actorId: log.actorId || 'UNKNOWN',
                    actorRole: log.actorRole || 'UNKNOWN',
                    action: log.action,
                    visitRef: log.visitRef || 'UNSPECIFIED',
                    anomalyType: 'OUTSIDE_OPERATING_HOURS',
                    explanation: 'Record accessed outside standard daytime clinic hours.',
                });
            }
        }
        // Filter by requested anomaly type if specified
        const filtered = filters?.anomalyType
            ? items.filter((i) => i.anomalyType === filters.anomalyType)
            : items;
        // Calculate summary statistics
        const summary = {
            OUT_OF_QUEUE_ACCESS: items.filter((i) => i.anomalyType === 'OUT_OF_QUEUE_ACCESS').length,
            CROSS_DEPARTMENT_VIEW: items.filter((i) => i.anomalyType === 'CROSS_DEPARTMENT_VIEW').length,
            REVIEW_TAKEOVER: items.filter((i) => i.anomalyType === 'REVIEW_TAKEOVER').length,
            REPEATED_DENIED_ACCESS: items.filter((i) => i.anomalyType === 'REPEATED_DENIED_ACCESS').length,
            OUTSIDE_OPERATING_HOURS: items.filter((i) => i.anomalyType === 'OUTSIDE_OPERATING_HOURS').length,
        };
        return {
            reportItems: filtered,
            summary,
            generatedAt: new Date().toISOString(),
        };
    }
}
exports.AccessReportsService = AccessReportsService;
