"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackRedflagsStore = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const redflags_types_js_1 = require("./redflags.types.js");
const illustrative_rules_js_1 = require("./seed/illustrative-rules.js");
class DevFallbackRedflagsStore {
    rules = new Map();
    alerts = new Map();
    devices = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        // 1. Devices
        const dev1 = {
            id: 'kiosk-dev-001',
            deviceCode: 'KIOSK-01',
            locationDescription: 'Kiosk 1, OPD Block A - Main Waiting Hall',
            department: 'General OPD',
            isActive: true,
        };
        const dev2 = {
            id: 'kiosk-dev-002',
            deviceCode: 'KIOSK-02',
            locationDescription: 'Kiosk 2, OPD Block B - Triage Station',
            department: 'General OPD',
            isActive: true,
        };
        this.devices.set(dev1.id, dev1);
        this.devices.set(dev2.id, dev2);
        // 2. Illustrative Seed Rules
        for (const seed of illustrative_rules_js_1.ILLUSTRATIVE_SEED_RULES) {
            const id = node_crypto_1.default.randomUUID();
            const rule = {
                id,
                ruleCode: seed.ruleCode,
                name: seed.name,
                description: seed.description,
                severityTier: seed.severityTier,
                conditionTree: seed.conditionTree,
                testCases: seed.testCases || null,
                raiseOnIndeterminate: seed.raiseOnIndeterminate,
                recommendedStaffAction: seed.recommendedStaffAction,
                status: redflags_types_js_1.RuleStatuses.DRAFT, // MUST be DRAFT per Section 27
                version: 1,
                isIllustrative: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.rules.set(id, rule);
        }
    }
    // Device methods
    getDeviceById(id) {
        return this.devices.get(id) || null;
    }
    getDeviceByCode(code) {
        for (const d of this.devices.values()) {
            if (d.deviceCode === code)
                return d;
        }
        return null;
    }
    getDefaultLocation() {
        return 'Kiosk 1, OPD Block A - Main Hall';
    }
    // Rule methods
    listRules() {
        return Array.from(this.rules.values());
    }
    getRuleById(id) {
        return this.rules.get(id) || null;
    }
    getRuleByCode(ruleCode) {
        for (const r of this.rules.values()) {
            if (r.ruleCode === ruleCode)
                return r;
        }
        return null;
    }
    getActiveRules() {
        return Array.from(this.rules.values()).filter((r) => r.status === redflags_types_js_1.RuleStatuses.ACTIVE);
    }
    saveRule(rule) {
        this.rules.set(rule.id, { ...rule, updatedAt: new Date().toISOString() });
        return this.rules.get(rule.id);
    }
    updateRule(id, updates) {
        const existing = this.rules.get(id);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        this.rules.set(id, updated);
        return updated;
    }
    // Alert methods
    listAlerts(filters) {
        let list = Array.from(this.alerts.values());
        if (filters?.status) {
            list = list.filter((a) => a.status === filters.status);
        }
        if (filters?.severityTier) {
            list = list.filter((a) => a.severityTier === filters.severityTier);
        }
        if (filters?.visitId) {
            list = list.filter((a) => a.visitId === filters.visitId);
        }
        // Sort by severity tier precedence (IMMEDIATE > URGENT > MANUAL > STAFF_CHECK), then by raisedAt desc
        const tierWeight = {
            IMMEDIATE: 4,
            MANUAL: 3,
            URGENT: 2,
            STAFF_CHECK: 1,
        };
        return list.sort((a, b) => {
            const weightDiff = (tierWeight[b.severityTier] || 0) - (tierWeight[a.severityTier] || 0);
            if (weightDiff !== 0)
                return weightDiff;
            return new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime();
        });
    }
    getAlertById(id) {
        return this.alerts.get(id) || null;
    }
    findOpenAlertForVisitAndRule(visitId, ruleId) {
        const openStatuses = [
            redflags_types_js_1.AlertStatuses.RAISED,
            redflags_types_js_1.AlertStatuses.ACKNOWLEDGED,
            redflags_types_js_1.AlertStatuses.IN_ASSESSMENT,
            redflags_types_js_1.AlertStatuses.ESCALATED,
        ];
        for (const alert of this.alerts.values()) {
            if (alert.visitId === visitId && alert.ruleId === ruleId && openStatuses.includes(alert.status)) {
                return alert;
            }
        }
        return null;
    }
    findOpenAlertForVisit(visitId) {
        const openStatuses = [
            redflags_types_js_1.AlertStatuses.RAISED,
            redflags_types_js_1.AlertStatuses.ACKNOWLEDGED,
            redflags_types_js_1.AlertStatuses.IN_ASSESSMENT,
            redflags_types_js_1.AlertStatuses.ESCALATED,
        ];
        for (const alert of this.alerts.values()) {
            if (alert.visitId === visitId && openStatuses.includes(alert.status)) {
                return alert;
            }
        }
        return null;
    }
    createAlert(params) {
        const id = node_crypto_1.default.randomUUID();
        const now = new Date().toISOString();
        const alert = {
            id,
            visitId: params.visitId,
            kioskDeviceId: params.kioskDeviceId || null,
            kioskLocation: params.kioskLocation,
            ruleId: params.ruleId || null,
            ruleCode: params.ruleCode || null,
            ruleVersion: params.ruleVersion || null,
            severityTier: params.severityTier,
            triggerType: params.triggerType,
            status: redflags_types_js_1.AlertStatuses.RAISED,
            raisedAt: now,
            escalationLevel: 0,
            ruleDescription: params.ruleDescription || null,
            recommendedStaffAction: params.recommendedStaffAction || null,
            evidences: params.evidences.map((e) => ({
                id: node_crypto_1.default.randomUUID(),
                sourceType: e.sourceType,
                sourceId: e.sourceId,
                factKey: e.factKey,
                factValueSnippet: e.factValueSnippet || null,
                createdAt: now,
            })),
            events: [
                {
                    id: node_crypto_1.default.randomUUID(),
                    eventType: params.triggerType === 'MANUAL' ? redflags_types_js_1.AlertEventTypes.MANUAL_HELP_REQUESTED : redflags_types_js_1.AlertEventTypes.ALERT_RAISED,
                    toStatus: redflags_types_js_1.AlertStatuses.RAISED,
                    timestamp: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        };
        this.alerts.set(id, alert);
        return alert;
    }
    saveAlert(alert) {
        this.alerts.set(alert.id, alert);
        return alert;
    }
    addEvidenceToAlert(alertId, evidences) {
        const alert = this.alerts.get(alertId);
        if (!alert)
            return null;
        const now = new Date().toISOString();
        for (const e of evidences) {
            // Check if evidence already recorded
            const exists = alert.evidences.some((ev) => ev.sourceId === e.sourceId && ev.factKey === e.factKey);
            if (!exists) {
                alert.evidences.push({
                    id: node_crypto_1.default.randomUUID(),
                    sourceType: e.sourceType,
                    sourceId: e.sourceId,
                    factKey: e.factKey,
                    factValueSnippet: e.factValueSnippet || null,
                    createdAt: now,
                });
            }
        }
        alert.events.push({
            id: node_crypto_1.default.randomUUID(),
            eventType: redflags_types_js_1.AlertEventTypes.ALERT_DEDUPLICATED,
            timestamp: now,
            details: { newEvidencesCount: evidences.length },
        });
        alert.updatedAt = now;
        return alert;
    }
    updateAlertStatus(alertId, status, actorId, actorRole, details) {
        const alert = this.alerts.get(alertId);
        if (!alert)
            return null;
        const fromStatus = alert.status;
        const now = new Date().toISOString();
        alert.status = status;
        alert.updatedAt = now;
        if (status === redflags_types_js_1.AlertStatuses.ACKNOWLEDGED) {
            alert.acknowledgedBy = actorId || 'staff-system';
            alert.acknowledgedAt = now;
        }
        else if (status === redflags_types_js_1.AlertStatuses.RESOLVED) {
            alert.resolvedBy = actorId || 'staff-system';
            alert.resolvedAt = now;
            if (details?.resolutionType)
                alert.resolutionType = details.resolutionType;
            if (details?.resolutionNote)
                alert.resolutionNote = details.resolutionNote;
        }
        else if (status === redflags_types_js_1.AlertStatuses.DISMISSED) {
            alert.resolvedBy = actorId || 'staff-system';
            alert.resolvedAt = now;
            if (details?.dismissalReason)
                alert.dismissalReason = details.dismissalReason;
            if (details?.resolutionNote)
                alert.resolutionNote = details.resolutionNote;
        }
        else if (status === redflags_types_js_1.AlertStatuses.ESCALATED) {
            alert.escalationLevel = (alert.escalationLevel || 0) + 1;
            alert.lastEscalatedAt = now;
        }
        alert.events.push({
            id: node_crypto_1.default.randomUUID(),
            eventType: this.statusToEventType(status),
            fromStatus,
            toStatus: status,
            actorId: actorId || null,
            actorRole: actorRole || null,
            details,
            timestamp: now,
        });
        return alert;
    }
    statusToEventType(status) {
        switch (status) {
            case redflags_types_js_1.AlertStatuses.ACKNOWLEDGED:
                return redflags_types_js_1.AlertEventTypes.ALERT_ACKNOWLEDGED;
            case redflags_types_js_1.AlertStatuses.IN_ASSESSMENT:
                return redflags_types_js_1.AlertEventTypes.ALERT_ASSESSMENT_STARTED;
            case redflags_types_js_1.AlertStatuses.ESCALATED:
                return redflags_types_js_1.AlertEventTypes.ALERT_ESCALATED;
            case redflags_types_js_1.AlertStatuses.RESOLVED:
                return redflags_types_js_1.AlertEventTypes.ALERT_RESOLVED;
            case redflags_types_js_1.AlertStatuses.DISMISSED:
                return redflags_types_js_1.AlertEventTypes.ALERT_DISMISSED;
            default:
                return 'ALERT_STATUS_CHANGED';
        }
    }
    clearAll() {
        this.alerts.clear();
        this.rules.clear();
        this.seedDefaults();
    }
}
exports.devFallbackRedflagsStore = new DevFallbackRedflagsStore();
