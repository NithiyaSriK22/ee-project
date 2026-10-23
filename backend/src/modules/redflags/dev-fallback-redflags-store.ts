import crypto from 'node:crypto';
import {
  RedFlagRuleDTO,
  RedFlagAlertDTO,
  AlertStatus,
  AlertStatuses,
  RuleStatuses,
  SeverityTier,
  TriggerType,
  ControlledResolutionType,
  ControlledDismissalReason,
  AlertEventTypes,
} from './redflags.types.js';
import { ILLUSTRATIVE_SEED_RULES } from './seed/illustrative-rules.js';

export interface InMemKioskDevice {
  id: string;
  deviceCode: string;
  locationDescription: string;
  department: string;
  isActive: boolean;
}

class DevFallbackRedflagsStore {
  private rules: Map<string, RedFlagRuleDTO> = new Map();
  private alerts: Map<string, RedFlagAlertDTO> = new Map();
  private devices: Map<string, InMemKioskDevice> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // 1. Devices
    const dev1: InMemKioskDevice = {
      id: 'kiosk-dev-001',
      deviceCode: 'KIOSK-01',
      locationDescription: 'Kiosk 1, OPD Block A - Main Waiting Hall',
      department: 'General OPD',
      isActive: true,
    };
    const dev2: InMemKioskDevice = {
      id: 'kiosk-dev-002',
      deviceCode: 'KIOSK-02',
      locationDescription: 'Kiosk 2, OPD Block B - Triage Station',
      department: 'General OPD',
      isActive: true,
    };
    this.devices.set(dev1.id, dev1);
    this.devices.set(dev2.id, dev2);

    // 2. Illustrative Seed Rules
    for (const seed of ILLUSTRATIVE_SEED_RULES) {
      const id = crypto.randomUUID();
      const rule: RedFlagRuleDTO = {
        id,
        ruleCode: seed.ruleCode,
        name: seed.name,
        description: seed.description,
        severityTier: seed.severityTier,
        conditionTree: seed.conditionTree,
        testCases: seed.testCases || null,
        raiseOnIndeterminate: seed.raiseOnIndeterminate,
        recommendedStaffAction: seed.recommendedStaffAction,
        status: RuleStatuses.DRAFT, // MUST be DRAFT per Section 27
        version: 1,
        isIllustrative: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.rules.set(id, rule);
    }
  }

  // Device methods
  public getDeviceById(id: string): InMemKioskDevice | null {
    return this.devices.get(id) || null;
  }

  public getDeviceByCode(code: string): InMemKioskDevice | null {
    for (const d of this.devices.values()) {
      if (d.deviceCode === code) return d;
    }
    return null;
  }

  public getDefaultLocation(): string {
    return 'Kiosk 1, OPD Block A - Main Hall';
  }

  // Rule methods
  public listRules(): RedFlagRuleDTO[] {
    return Array.from(this.rules.values());
  }

  public getRuleById(id: string): RedFlagRuleDTO | null {
    return this.rules.get(id) || null;
  }

  public getRuleByCode(ruleCode: string): RedFlagRuleDTO | null {
    for (const r of this.rules.values()) {
      if (r.ruleCode === ruleCode) return r;
    }
    return null;
  }

  public getActiveRules(): RedFlagRuleDTO[] {
    return Array.from(this.rules.values()).filter((r) => r.status === RuleStatuses.ACTIVE);
  }

  public saveRule(rule: RedFlagRuleDTO): RedFlagRuleDTO {
    this.rules.set(rule.id, { ...rule, updatedAt: new Date().toISOString() });
    return this.rules.get(rule.id)!;
  }

  public updateRule(id: string, updates: Partial<RedFlagRuleDTO>): RedFlagRuleDTO | null {
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(id, updated);
    return updated;
  }

  // Alert methods
  public listAlerts(filters?: { status?: string; severityTier?: string; visitId?: string }): RedFlagAlertDTO[] {
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
    const tierWeight: Record<string, number> = {
      IMMEDIATE: 4,
      MANUAL: 3,
      URGENT: 2,
      STAFF_CHECK: 1,
    };

    return list.sort((a, b) => {
      const weightDiff = (tierWeight[b.severityTier] || 0) - (tierWeight[a.severityTier] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime();
    });
  }

  public getAlertById(id: string): RedFlagAlertDTO | null {
    return this.alerts.get(id) || null;
  }

  public findOpenAlertForVisitAndRule(visitId: string, ruleId: string): RedFlagAlertDTO | null {
    const openStatuses: AlertStatus[] = [
      AlertStatuses.RAISED,
      AlertStatuses.ACKNOWLEDGED,
      AlertStatuses.IN_ASSESSMENT,
      AlertStatuses.ESCALATED,
    ];

    for (const alert of this.alerts.values()) {
      if (alert.visitId === visitId && alert.ruleId === ruleId && openStatuses.includes(alert.status)) {
        return alert;
      }
    }
    return null;
  }

  public findOpenAlertForVisit(visitId: string): RedFlagAlertDTO | null {
    const openStatuses: AlertStatus[] = [
      AlertStatuses.RAISED,
      AlertStatuses.ACKNOWLEDGED,
      AlertStatuses.IN_ASSESSMENT,
      AlertStatuses.ESCALATED,
    ];

    for (const alert of this.alerts.values()) {
      if (alert.visitId === visitId && openStatuses.includes(alert.status)) {
        return alert;
      }
    }
    return null;
  }

  public createAlert(params: {
    visitId: string;
    kioskDeviceId?: string | null;
    kioskLocation: string;
    ruleId?: string | null;
    ruleCode?: string | null;
    ruleVersion?: number | null;
    severityTier: SeverityTier;
    triggerType: TriggerType;
    ruleDescription?: string | null;
    recommendedStaffAction?: string | null;
    evidences: Array<{
      sourceType: string;
      sourceId: string;
      factKey: string;
      factValueSnippet?: string | null;
    }>;
  }): RedFlagAlertDTO {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const alert: RedFlagAlertDTO = {
      id,
      visitId: params.visitId,
      kioskDeviceId: params.kioskDeviceId || null,
      kioskLocation: params.kioskLocation,
      ruleId: params.ruleId || null,
      ruleCode: params.ruleCode || null,
      ruleVersion: params.ruleVersion || null,
      severityTier: params.severityTier,
      triggerType: params.triggerType,
      status: AlertStatuses.RAISED,
      raisedAt: now,
      escalationLevel: 0,
      ruleDescription: params.ruleDescription || null,
      recommendedStaffAction: params.recommendedStaffAction || null,
      evidences: params.evidences.map((e) => ({
        id: crypto.randomUUID(),
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        factKey: e.factKey,
        factValueSnippet: e.factValueSnippet || null,
        createdAt: now,
      })),
      events: [
        {
          id: crypto.randomUUID(),
          eventType: params.triggerType === 'MANUAL' ? AlertEventTypes.MANUAL_HELP_REQUESTED : AlertEventTypes.ALERT_RAISED,
          toStatus: AlertStatuses.RAISED,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.alerts.set(id, alert);
    return alert;
  }

  public saveAlert(alert: RedFlagAlertDTO): RedFlagAlertDTO {
    this.alerts.set(alert.id, alert);
    return alert;
  }

  public addEvidenceToAlert(
    alertId: string,
    evidences: Array<{
      sourceType: string;
      sourceId: string;
      factKey: string;
      factValueSnippet?: string | null;
    }>
  ): RedFlagAlertDTO | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    const now = new Date().toISOString();
    for (const e of evidences) {
      // Check if evidence already recorded
      const exists = alert.evidences.some((ev) => ev.sourceId === e.sourceId && ev.factKey === e.factKey);
      if (!exists) {
        alert.evidences.push({
          id: crypto.randomUUID(),
          sourceType: e.sourceType,
          sourceId: e.sourceId,
          factKey: e.factKey,
          factValueSnippet: e.factValueSnippet || null,
          createdAt: now,
        });
      }
    }

    alert.events.push({
      id: crypto.randomUUID(),
      eventType: AlertEventTypes.ALERT_DEDUPLICATED,
      timestamp: now,
      details: { newEvidencesCount: evidences.length },
    });

    alert.updatedAt = now;
    return alert;
  }

  public updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    actorId?: string,
    actorRole?: string,
    details?: {
      resolutionType?: ControlledResolutionType;
      resolutionNote?: string;
      dismissalReason?: ControlledDismissalReason;
      escalationLevel?: number;
    }
  ): RedFlagAlertDTO | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    const fromStatus = alert.status;
    const now = new Date().toISOString();

    alert.status = status;
    alert.updatedAt = now;

    if (status === AlertStatuses.ACKNOWLEDGED) {
      alert.acknowledgedBy = actorId || 'staff-system';
      alert.acknowledgedAt = now;
    } else if (status === AlertStatuses.RESOLVED) {
      alert.resolvedBy = actorId || 'staff-system';
      alert.resolvedAt = now;
      if (details?.resolutionType) alert.resolutionType = details.resolutionType;
      if (details?.resolutionNote) alert.resolutionNote = details.resolutionNote;
    } else if (status === AlertStatuses.DISMISSED) {
      alert.resolvedBy = actorId || 'staff-system';
      alert.resolvedAt = now;
      if (details?.dismissalReason) alert.dismissalReason = details.dismissalReason;
      if (details?.resolutionNote) alert.resolutionNote = details.resolutionNote;
    } else if (status === AlertStatuses.ESCALATED) {
      alert.escalationLevel = (alert.escalationLevel || 0) + 1;
      alert.lastEscalatedAt = now;
    }

    alert.events.push({
      id: crypto.randomUUID(),
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

  private statusToEventType(status: AlertStatus): string {
    switch (status) {
      case AlertStatuses.ACKNOWLEDGED:
        return AlertEventTypes.ALERT_ACKNOWLEDGED;
      case AlertStatuses.IN_ASSESSMENT:
        return AlertEventTypes.ALERT_ASSESSMENT_STARTED;
      case AlertStatuses.ESCALATED:
        return AlertEventTypes.ALERT_ESCALATED;
      case AlertStatuses.RESOLVED:
        return AlertEventTypes.ALERT_RESOLVED;
      case AlertStatuses.DISMISSED:
        return AlertEventTypes.ALERT_DISMISSED;
      default:
        return 'ALERT_STATUS_CHANGED';
    }
  }

  public clearAll() {
    this.alerts.clear();
    this.rules.clear();
    this.seedDefaults();
  }
}

export const devFallbackRedflagsStore = new DevFallbackRedflagsStore();
