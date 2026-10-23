"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedFlagsRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_redflags_store_js_1 = require("./dev-fallback-redflags-store.js");
const uuid_util_js_1 = require("../../utils/uuid.util.js");
let isDbReachable = null;
let lastDbCheck = 0;
async function checkDatabaseAvailability() {
    const now = Date.now();
    if (isDbReachable !== null && now - lastDbCheck < 15000) {
        return isDbReachable;
    }
    try {
        const checkPromise = prisma_js_1.prisma.$queryRaw `SELECT 1`;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout')), 300));
        await Promise.race([checkPromise, timeoutPromise]);
        isDbReachable = true;
    }
    catch {
        isDbReachable = false;
    }
    lastDbCheck = now;
    return isDbReachable;
}
class RedFlagsRepository {
    // ============================================================================
    // KIOSK DEVICE
    // ============================================================================
    static async getKioskLocation(deviceId) {
        if (!deviceId) {
            return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getDefaultLocation();
        }
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(deviceId)) {
            try {
                const device = await prisma_js_1.prisma.kioskDevice.findUnique({
                    where: { id: deviceId },
                });
                if (device)
                    return device.location_description;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to query kioskDevice from DB, using fallback', { error: String(err) });
            }
        }
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getDeviceById(deviceId);
        return inMem?.locationDescription || dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getDefaultLocation();
    }
    // ============================================================================
    // RULES
    // ============================================================================
    static async listRules() {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rules = await prisma_js_1.prisma.redFlagRule.findMany({
                    orderBy: { created_at: 'desc' },
                });
                return rules.map(this.mapDbRuleToDto);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to list rules from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.listRules();
    }
    static async getRuleById(id) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getRuleById(id);
        if (inMem)
            return inMem;
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(id)) {
            try {
                const rule = await prisma_js_1.prisma.redFlagRule.findUnique({
                    where: { id },
                });
                return rule ? this.mapDbRuleToDto(rule) : null;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to get rule by id from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getRuleById(id);
    }
    static async getRuleByCode(ruleCode) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rule = await prisma_js_1.prisma.redFlagRule.findUnique({
                    where: { rule_code: ruleCode },
                });
                return rule ? this.mapDbRuleToDto(rule) : null;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to get rule by code from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getRuleByCode(ruleCode);
    }
    static async getActiveRules() {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const rules = await prisma_js_1.prisma.redFlagRule.findMany({
                    where: { status: 'ACTIVE' },
                });
                return rules.map(this.mapDbRuleToDto);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to get active rules from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getActiveRules();
    }
    static async createRule(data) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const created = await prisma_js_1.prisma.redFlagRule.create({
                    data: {
                        rule_code: data.ruleCode,
                        name: data.name,
                        description: data.description,
                        severity_tier: data.severityTier,
                        condition_tree: data.conditionTree,
                        test_cases: data.testCases || null,
                        raise_on_indeterminate: data.raiseOnIndeterminate,
                        recommended_staff_action: data.recommendedStaffAction,
                        is_illustrative: data.isIllustrative ?? false,
                        status: 'DRAFT',
                        version: 1,
                        created_by: data.createdBy && (0, uuid_util_js_1.isUuid)(data.createdBy) ? data.createdBy : undefined,
                    },
                });
                const dto = this.mapDbRuleToDto(created);
                if (data.createdBy && !dto.createdBy) {
                    dto.createdBy = data.createdBy;
                }
                dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveRule(dto);
                return dto;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to create rule in DB, using fallback', { error: String(err) });
            }
        }
        const inMemRule = {
            id: `rule-${Date.now()}`,
            ruleCode: data.ruleCode,
            name: data.name,
            description: data.description,
            severityTier: data.severityTier,
            conditionTree: data.conditionTree,
            testCases: data.testCases || null,
            raiseOnIndeterminate: data.raiseOnIndeterminate,
            recommendedStaffAction: data.recommendedStaffAction,
            status: 'DRAFT',
            version: 1,
            isIllustrative: data.isIllustrative ?? false,
            createdBy: data.createdBy || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveRule(inMemRule);
    }
    static async updateRule(id, data) {
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(id)) {
            try {
                const updated = await prisma_js_1.prisma.redFlagRule.update({
                    where: { id },
                    data: {
                        name: data.name,
                        description: data.description,
                        severity_tier: data.severityTier,
                        condition_tree: data.conditionTree ? data.conditionTree : undefined,
                        test_cases: data.testCases ? data.testCases : undefined,
                        raise_on_indeterminate: data.raiseOnIndeterminate,
                        recommended_staff_action: data.recommendedStaffAction,
                        status: data.status,
                        version: data.version,
                        clinically_reviewed_by: data.clinicallyReviewedBy && (0, uuid_util_js_1.isUuid)(data.clinicallyReviewedBy) ? data.clinicallyReviewedBy : undefined,
                        clinically_reviewed_at: data.clinicallyReviewedAt ? new Date(data.clinicallyReviewedAt) : undefined,
                        effective_from: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
                    },
                });
                const dto = this.mapDbRuleToDto(updated);
                const prev = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getRuleById(id);
                if (prev?.createdBy && !dto.createdBy) {
                    dto.createdBy = prev.createdBy;
                }
                if (data.clinicallyReviewedBy && !dto.clinicallyReviewedBy) {
                    dto.clinicallyReviewedBy = data.clinicallyReviewedBy;
                }
                dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveRule(dto);
                return dto;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to update rule in DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.updateRule(id, data);
    }
    // ============================================================================
    // ALERTS
    // ============================================================================
    static async listAlerts(filters) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const where = {};
                if (filters?.status)
                    where.status = filters.status;
                if (filters?.severityTier)
                    where.severity_tier = filters.severityTier;
                if (filters?.visitId)
                    where.visit_id = filters.visitId;
                const alerts = await prisma_js_1.prisma.redFlagAlert.findMany({
                    where,
                    include: {
                        evidences: true,
                        events: { orderBy: { timestamp: 'asc' } },
                        rule: true,
                    },
                    orderBy: { raised_at: 'desc' },
                });
                if (alerts.length > 0) {
                    return alerts.map(this.mapDbAlertToDto);
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to list alerts from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.listAlerts(filters);
    }
    static async getAlertById(id) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getAlertById(id);
        if (inMem)
            return inMem;
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(id)) {
            try {
                const alert = await prisma_js_1.prisma.redFlagAlert.findUnique({
                    where: { id },
                    include: {
                        evidences: true,
                        events: { orderBy: { timestamp: 'asc' } },
                        rule: true,
                    },
                });
                if (alert)
                    return this.mapDbAlertToDto(alert);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to get alert by id from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getAlertById(id);
    }
    static async findOpenAlertForVisitAndRule(visitId, ruleId) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.findOpenAlertForVisitAndRule(visitId, ruleId);
        if (inMem)
            return inMem;
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const where = {
                    visit_id: visitId,
                    status: { in: ['RAISED', 'ACKNOWLEDGED', 'IN_ASSESSMENT', 'ESCALATED'] },
                };
                if ((0, uuid_util_js_1.isUuid)(ruleId)) {
                    where.rule_id = ruleId;
                }
                else {
                    where.rule_code = ruleId;
                }
                const alert = await prisma_js_1.prisma.redFlagAlert.findFirst({
                    where,
                    include: {
                        evidences: true,
                        events: { orderBy: { timestamp: 'asc' } },
                        rule: true,
                    },
                });
                if (alert)
                    return this.mapDbAlertToDto(alert);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to find open alert from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.findOpenAlertForVisitAndRule(visitId, ruleId);
    }
    static async findOpenAlertForVisit(visitId) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.findOpenAlertForVisit(visitId);
        if (inMem)
            return inMem;
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const alert = await prisma_js_1.prisma.redFlagAlert.findFirst({
                    where: {
                        visit_id: visitId,
                        status: { in: ['RAISED', 'ACKNOWLEDGED', 'IN_ASSESSMENT', 'ESCALATED'] },
                    },
                    include: {
                        evidences: true,
                        events: { orderBy: { timestamp: 'asc' } },
                        rule: true,
                    },
                });
                if (alert)
                    return this.mapDbAlertToDto(alert);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to find open alert for visit from DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.findOpenAlertForVisit(visitId);
    }
    static async createAlert(params) {
        const available = await checkDatabaseAvailability();
        if (available) {
            try {
                const created = await prisma_js_1.prisma.$transaction(async (tx) => {
                    const alert = await tx.redFlagAlert.create({
                        data: {
                            visit_id: params.visitId,
                            kiosk_device_id: params.kioskDeviceId && (0, uuid_util_js_1.isUuid)(params.kioskDeviceId) ? params.kioskDeviceId : undefined,
                            kiosk_location: params.kioskLocation,
                            rule_id: params.ruleId && (0, uuid_util_js_1.isUuid)(params.ruleId) ? params.ruleId : undefined,
                            rule_code: params.ruleCode,
                            rule_version: params.ruleVersion,
                            severity_tier: params.severityTier,
                            trigger_type: params.triggerType,
                            status: 'RAISED',
                            evidences: {
                                create: params.evidences.map((e) => ({
                                    source_type: e.sourceType,
                                    source_id: e.sourceId,
                                    fact_key: e.factKey,
                                    fact_value_snippet: e.factValueSnippet,
                                })),
                            },
                            events: {
                                create: {
                                    event_type: params.triggerType === 'MANUAL' ? 'MANUAL_HELP_REQUESTED' : 'ALERT_RAISED',
                                    to_status: 'RAISED',
                                },
                            },
                        },
                        include: {
                            evidences: true,
                            events: true,
                            rule: true,
                        },
                    });
                    return alert;
                });
                const dto = this.mapDbAlertToDto(created);
                if (params.ruleId && !dto.ruleId) {
                    dto.ruleId = params.ruleId;
                }
                if (params.ruleDescription && !dto.ruleDescription) {
                    dto.ruleDescription = params.ruleDescription;
                }
                if (params.recommendedStaffAction && !dto.recommendedStaffAction) {
                    dto.recommendedStaffAction = params.recommendedStaffAction;
                }
                dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveAlert(dto);
                return dto;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to create alert in DB transaction, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.createAlert(params);
    }
    static async addEvidenceToAlert(alertId, evidences) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getAlertById(alertId);
        if (inMem) {
            return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.addEvidenceToAlert(alertId, evidences);
        }
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(alertId)) {
            try {
                await prisma_js_1.prisma.$transaction(async (tx) => {
                    for (const ev of evidences) {
                        await tx.redFlagAlertEvidence.create({
                            data: {
                                alert_id: alertId,
                                source_type: ev.sourceType,
                                source_id: ev.sourceId,
                                fact_key: ev.factKey,
                                fact_value_snippet: ev.factValueSnippet,
                            },
                        });
                    }
                    await tx.redFlagAlertEvent.create({
                        data: {
                            alert_id: alertId,
                            event_type: 'ALERT_DEDUPLICATED',
                            details: { newEvidencesCount: evidences.length },
                        },
                    });
                });
                const updated = await this.getAlertById(alertId);
                if (updated)
                    dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveAlert(updated);
                return updated;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to add evidence in DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.addEvidenceToAlert(alertId, evidences);
    }
    static async updateAlertStatus(alertId, status, actorId, actorRole, details) {
        const inMem = dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.getAlertById(alertId);
        if (inMem && !(0, uuid_util_js_1.isUuid)(alertId)) {
            return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
        }
        const available = await checkDatabaseAvailability();
        if (available && (0, uuid_util_js_1.isUuid)(alertId)) {
            try {
                const alert = await prisma_js_1.prisma.redFlagAlert.findUnique({ where: { id: alertId } });
                if (!alert) {
                    return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
                }
                const updateData = {
                    status,
                };
                if (status === 'ACKNOWLEDGED') {
                    updateData.acknowledged_by = actorId && (0, uuid_util_js_1.isUuid)(actorId) ? actorId : null;
                    updateData.acknowledged_at = new Date();
                }
                else if (status === 'RESOLVED') {
                    updateData.resolved_by = actorId && (0, uuid_util_js_1.isUuid)(actorId) ? actorId : null;
                    updateData.resolved_at = new Date();
                    if (details?.resolutionType)
                        updateData.resolution_type = details.resolutionType;
                    if (details?.resolutionNote)
                        updateData.resolution_note = details.resolutionNote;
                }
                else if (status === 'DISMISSED') {
                    updateData.resolved_by = actorId && (0, uuid_util_js_1.isUuid)(actorId) ? actorId : null;
                    updateData.resolved_at = new Date();
                    if (details?.dismissalReason)
                        updateData.dismissal_reason = details.dismissalReason;
                    if (details?.resolutionNote)
                        updateData.resolution_note = details.resolutionNote;
                }
                else if (status === 'ESCALATED') {
                    updateData.escalation_level = (alert.escalation_level || 0) + 1;
                    updateData.last_escalated_at = new Date();
                }
                const updated = await prisma_js_1.prisma.$transaction(async (tx) => {
                    const res = await tx.redFlagAlert.update({
                        where: { id: alertId },
                        data: updateData,
                        include: {
                            evidences: true,
                            events: { orderBy: { timestamp: 'asc' } },
                            rule: true,
                        },
                    });
                    await tx.redFlagAlertEvent.create({
                        data: {
                            alert_id: alertId,
                            event_type: status === 'ACKNOWLEDGED' ? 'ALERT_ACKNOWLEDGED' : status === 'ESCALATED' ? 'ALERT_ESCALATED' : status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_DISMISSED',
                            from_status: alert.status,
                            to_status: status,
                            actor_id: actorId && (0, uuid_util_js_1.isUuid)(actorId) ? actorId : undefined,
                            actor_role: actorRole,
                            details: details ? details : undefined,
                        },
                    });
                    return res;
                });
                const resDto = this.mapDbAlertToDto(updated);
                dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.saveAlert(resDto);
                return resDto;
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to update alert status in DB, using fallback', { error: String(err) });
            }
        }
        return dev_fallback_redflags_store_js_1.devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
    }
    // ============================================================================
    // MAPPERS
    // ============================================================================
    static mapDbRuleToDto(db) {
        return {
            id: db.id,
            ruleCode: db.rule_code,
            name: db.name,
            description: db.description,
            severityTier: db.severity_tier,
            conditionTree: db.condition_tree,
            testCases: db.test_cases,
            raiseOnIndeterminate: db.raise_on_indeterminate,
            recommendedStaffAction: db.recommended_staff_action,
            status: db.status,
            version: db.version,
            isIllustrative: db.is_illustrative,
            clinicallyReviewedBy: db.clinically_reviewed_by,
            clinicallyReviewedAt: db.clinically_reviewed_at?.toISOString(),
            effectiveFrom: db.effective_from?.toISOString(),
            createdBy: db.created_by,
            updatedBy: db.updated_by,
            createdAt: db.created_at.toISOString(),
            updatedAt: db.updated_at.toISOString(),
        };
    }
    static mapDbAlertToDto(db) {
        return {
            id: db.id,
            visitId: db.visit_id,
            kioskDeviceId: db.kiosk_device_id,
            kioskLocation: db.kiosk_location,
            ruleId: db.rule_id,
            ruleCode: db.rule_code,
            ruleVersion: db.rule_version,
            severityTier: db.severity_tier,
            triggerType: db.trigger_type,
            status: db.status,
            raisedAt: db.raised_at.toISOString(),
            acknowledgedBy: db.acknowledged_by,
            acknowledgedAt: db.acknowledged_at?.toISOString(),
            resolvedBy: db.resolved_by,
            resolvedAt: db.resolved_at?.toISOString(),
            resolutionType: db.resolution_type,
            resolutionNote: db.resolution_note,
            dismissalReason: db.dismissal_reason,
            escalationLevel: db.escalation_level,
            lastEscalatedAt: db.last_escalated_at?.toISOString(),
            ruleDescription: db.rule?.description || null,
            recommendedStaffAction: db.rule?.recommended_staff_action || null,
            evidences: (db.evidences || []).map((e) => ({
                id: e.id,
                sourceType: e.source_type,
                sourceId: e.source_id,
                factKey: e.fact_key,
                factValueSnippet: e.fact_value_snippet,
                createdAt: e.created_at.toISOString(),
            })),
            events: (db.events || []).map((ev) => ({
                id: ev.id,
                eventType: ev.event_type,
                fromStatus: ev.from_status,
                toStatus: ev.to_status,
                actorId: ev.actor_id,
                actorRole: ev.actor_role,
                details: ev.details,
                timestamp: ev.timestamp.toISOString(),
            })),
            createdAt: db.created_at.toISOString(),
            updatedAt: db.updated_at.toISOString(),
        };
    }
}
exports.RedFlagsRepository = RedFlagsRepository;
