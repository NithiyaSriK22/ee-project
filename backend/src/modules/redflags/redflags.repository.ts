import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { logger } from '../../config/logger.js';
import { devFallbackRedflagsStore } from './dev-fallback-redflags-store.js';
import { isUuid } from '../../utils/uuid.util.js';
import {
  RedFlagRuleDTO,
  RedFlagAlertDTO,
  AlertStatus,
  SeverityTier,
  TriggerType,
  ControlledResolutionType,
  ControlledDismissalReason,
  RuleStatus,
} from './redflags.types.js';

async function checkDatabaseAvailability(): Promise<boolean> {
  return checkDatabaseHealth();
}

export class RedFlagsRepository {
  // ============================================================================
  // KIOSK DEVICE
  // ============================================================================

  public static async getKioskLocation(deviceId?: string | null): Promise<string> {
    if (!deviceId) {
      return devFallbackRedflagsStore.getDefaultLocation();
    }

    const available = await checkDatabaseAvailability();
    if (available && isUuid(deviceId)) {
      try {
        const device = await prisma.kioskDevice.findUnique({
          where: { id: deviceId },
        });
        if (device) return device.location_description;
      } catch (err) {
        logger.warn('Failed to query kioskDevice from DB, using fallback', { error: String(err) });
      }
    }

    const inMem = devFallbackRedflagsStore.getDeviceById(deviceId);
    return inMem?.locationDescription || devFallbackRedflagsStore.getDefaultLocation();
  }

  // ============================================================================
  // RULES
  // ============================================================================

  public static async listRules(): Promise<RedFlagRuleDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rules = await prisma.redFlagRule.findMany({
          orderBy: { created_at: 'desc' },
        });
        return rules.map(this.mapDbRuleToDto);
      } catch (err) {
        logger.warn('Failed to list rules from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.listRules();
  }

  public static async getRuleById(id: string): Promise<RedFlagRuleDTO | null> {
    const inMem = devFallbackRedflagsStore.getRuleById(id);
    if (inMem) return inMem;

    const available = await checkDatabaseAvailability();
    if (available && isUuid(id)) {
      try {
        const rule = await prisma.redFlagRule.findUnique({
          where: { id },
        });
        return rule ? this.mapDbRuleToDto(rule) : null;
      } catch (err) {
        logger.warn('Failed to get rule by id from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.getRuleById(id);
  }

  public static async getRuleByCode(ruleCode: string): Promise<RedFlagRuleDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rule = await prisma.redFlagRule.findUnique({
          where: { rule_code: ruleCode },
        });
        return rule ? this.mapDbRuleToDto(rule) : null;
      } catch (err) {
        logger.warn('Failed to get rule by code from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.getRuleByCode(ruleCode);
  }

  public static async getActiveRules(): Promise<RedFlagRuleDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const rules = await prisma.redFlagRule.findMany({
          where: { status: 'ACTIVE' },
        });
        return rules.map(this.mapDbRuleToDto);
      } catch (err) {
        logger.warn('Failed to get active rules from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.getActiveRules();
  }

  public static async createRule(data: {
    ruleCode: string;
    name: string;
    description: string;
    severityTier: SeverityTier;
    conditionTree: any;
    testCases?: any;
    raiseOnIndeterminate: boolean;
    recommendedStaffAction: string;
    isIllustrative?: boolean;
    createdBy?: string;
  }): Promise<RedFlagRuleDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const created = await prisma.redFlagRule.create({
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
            created_by: data.createdBy && isUuid(data.createdBy) ? data.createdBy : undefined,
          },
        });
        const dto = this.mapDbRuleToDto(created);
        if (data.createdBy && !dto.createdBy) {
          dto.createdBy = data.createdBy;
        }
        devFallbackRedflagsStore.saveRule(dto);
        return dto;
      } catch (err) {
        logger.warn('Failed to create rule in DB, using fallback', { error: String(err) });
      }
    }

    const inMemRule: RedFlagRuleDTO = {
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
    return devFallbackRedflagsStore.saveRule(inMemRule);
  }

  public static async updateRule(
    id: string,
    data: Partial<RedFlagRuleDTO>
  ): Promise<RedFlagRuleDTO | null> {
    const available = await checkDatabaseAvailability();
    if (available && isUuid(id)) {
      try {
        const updated = await prisma.redFlagRule.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            severity_tier: data.severityTier,
            condition_tree: data.conditionTree ? (data.conditionTree as any) : undefined,
            test_cases: data.testCases ? (data.testCases as any) : undefined,
            raise_on_indeterminate: data.raiseOnIndeterminate,
            recommended_staff_action: data.recommendedStaffAction,
            status: data.status,
            version: data.version,
            clinically_reviewed_by: data.clinicallyReviewedBy && isUuid(data.clinicallyReviewedBy) ? data.clinicallyReviewedBy : undefined,
            clinically_reviewed_at: data.clinicallyReviewedAt ? new Date(data.clinicallyReviewedAt) : undefined,
            effective_from: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
          },
        });
        const dto = this.mapDbRuleToDto(updated);
        const prev = devFallbackRedflagsStore.getRuleById(id);
        if (prev?.createdBy && !dto.createdBy) {
          dto.createdBy = prev.createdBy;
        }
        if (data.clinicallyReviewedBy && !dto.clinicallyReviewedBy) {
          dto.clinicallyReviewedBy = data.clinicallyReviewedBy;
        }
        devFallbackRedflagsStore.saveRule(dto);
        return dto;
      } catch (err) {
        logger.warn('Failed to update rule in DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.updateRule(id, data);
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  public static async listAlerts(filters?: {
    status?: string;
    severityTier?: string;
    visitId?: string;
  }): Promise<RedFlagAlertDTO[]> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.severityTier) where.severity_tier = filters.severityTier;
        if (filters?.visitId) where.visit_id = filters.visitId;

        const alerts = await prisma.redFlagAlert.findMany({
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
      } catch (err) {
        logger.warn('Failed to list alerts from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.listAlerts(filters);
  }

  public static async getAlertById(id: string): Promise<RedFlagAlertDTO | null> {
    const inMem = devFallbackRedflagsStore.getAlertById(id);
    if (inMem) return inMem;

    const available = await checkDatabaseAvailability();
    if (available && isUuid(id)) {
      try {
        const alert = await prisma.redFlagAlert.findUnique({
          where: { id },
          include: {
            evidences: true,
            events: { orderBy: { timestamp: 'asc' } },
            rule: true,
          },
        });
        if (alert) return this.mapDbAlertToDto(alert);
      } catch (err) {
        logger.warn('Failed to get alert by id from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.getAlertById(id);
  }

  public static async findOpenAlertForVisitAndRule(
    visitId: string,
    ruleId: string
  ): Promise<RedFlagAlertDTO | null> {
    const inMem = devFallbackRedflagsStore.findOpenAlertForVisitAndRule(visitId, ruleId);
    if (inMem) return inMem;

    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const where: any = {
          visit_id: visitId,
          status: { in: ['RAISED', 'ACKNOWLEDGED', 'IN_ASSESSMENT', 'ESCALATED'] },
        };
        if (isUuid(ruleId)) {
          where.rule_id = ruleId;
        } else {
          where.rule_code = ruleId;
        }

        const alert = await prisma.redFlagAlert.findFirst({
          where,
          include: {
            evidences: true,
            events: { orderBy: { timestamp: 'asc' } },
            rule: true,
          },
        });
        if (alert) return this.mapDbAlertToDto(alert);
      } catch (err) {
        logger.warn('Failed to find open alert from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.findOpenAlertForVisitAndRule(visitId, ruleId);
  }

  public static async findOpenAlertForVisit(visitId: string): Promise<RedFlagAlertDTO | null> {
    const inMem = devFallbackRedflagsStore.findOpenAlertForVisit(visitId);
    if (inMem) return inMem;

    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const alert = await prisma.redFlagAlert.findFirst({
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
        if (alert) return this.mapDbAlertToDto(alert);
      } catch (err) {
        logger.warn('Failed to find open alert for visit from DB, using fallback', { error: String(err) });
      }
    }
    return devFallbackRedflagsStore.findOpenAlertForVisit(visitId);
  }

  public static async createAlert(params: {
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
  }): Promise<RedFlagAlertDTO> {
    const available = await checkDatabaseAvailability();
    if (available) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          const alert = await tx.redFlagAlert.create({
            data: {
              visit_id: params.visitId,
              kiosk_device_id: params.kioskDeviceId && isUuid(params.kioskDeviceId) ? params.kioskDeviceId : undefined,
              kiosk_location: params.kioskLocation,
              rule_id: params.ruleId && isUuid(params.ruleId) ? params.ruleId : undefined,
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
        devFallbackRedflagsStore.saveAlert(dto);
        return dto;
      } catch (err) {
        logger.warn('Failed to create alert in DB transaction, using fallback', { error: String(err) });
      }
    }

    return devFallbackRedflagsStore.createAlert(params);
  }

  public static async addEvidenceToAlert(
    alertId: string,
    evidences: Array<{
      sourceType: string;
      sourceId: string;
      factKey: string;
      factValueSnippet?: string | null;
    }>
  ): Promise<RedFlagAlertDTO | null> {
    const inMem = devFallbackRedflagsStore.getAlertById(alertId);
    if (inMem) {
      return devFallbackRedflagsStore.addEvidenceToAlert(alertId, evidences);
    }

    const available = await checkDatabaseAvailability();
    if (available && isUuid(alertId)) {
      try {
        await prisma.$transaction(async (tx) => {
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
        if (updated) devFallbackRedflagsStore.saveAlert(updated);
        return updated;
      } catch (err) {
        logger.warn('Failed to add evidence in DB, using fallback', { error: String(err) });
      }
    }

    return devFallbackRedflagsStore.addEvidenceToAlert(alertId, evidences);
  }

  public static async updateAlertStatus(
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
  ): Promise<RedFlagAlertDTO | null> {
    const inMem = devFallbackRedflagsStore.getAlertById(alertId);
    if (inMem && !isUuid(alertId)) {
      return devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
    }

    const available = await checkDatabaseAvailability();
    if (available && isUuid(alertId)) {
      try {
        const alert = await prisma.redFlagAlert.findUnique({ where: { id: alertId } });
        if (!alert) {
          return devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
        }

        const updateData: any = {
          status,
        };

        if (status === 'ACKNOWLEDGED') {
          updateData.acknowledged_by = actorId && isUuid(actorId) ? actorId : null;
          updateData.acknowledged_at = new Date();
        } else if (status === 'RESOLVED') {
          updateData.resolved_by = actorId && isUuid(actorId) ? actorId : null;
          updateData.resolved_at = new Date();
          if (details?.resolutionType) updateData.resolution_type = details.resolutionType;
          if (details?.resolutionNote) updateData.resolution_note = details.resolutionNote;
        } else if (status === 'DISMISSED') {
          updateData.resolved_by = actorId && isUuid(actorId) ? actorId : null;
          updateData.resolved_at = new Date();
          if (details?.dismissalReason) updateData.dismissal_reason = details.dismissalReason;
          if (details?.resolutionNote) updateData.resolution_note = details.resolutionNote;
        } else if (status === 'ESCALATED') {
          updateData.escalation_level = (alert.escalation_level || 0) + 1;
          updateData.last_escalated_at = new Date();
        }

        const updated = await prisma.$transaction(async (tx) => {
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
              actor_id: actorId && isUuid(actorId) ? actorId : undefined,
              actor_role: actorRole,
              details: details ? (details as any) : undefined,
            },
          });

          return res;
        });

        const resDto = this.mapDbAlertToDto(updated);
        devFallbackRedflagsStore.saveAlert(resDto);
        return resDto;
      } catch (err) {
        logger.warn('Failed to update alert status in DB, using fallback', { error: String(err) });
      }
    }

    return devFallbackRedflagsStore.updateAlertStatus(alertId, status, actorId, actorRole, details);
  }


  // ============================================================================
  // MAPPERS
  // ============================================================================

  private static mapDbRuleToDto(db: any): RedFlagRuleDTO {
    return {
      id: db.id,
      ruleCode: db.rule_code,
      name: db.name,
      description: db.description,
      severityTier: db.severity_tier as SeverityTier,
      conditionTree: db.condition_tree,
      testCases: db.test_cases,
      raiseOnIndeterminate: db.raise_on_indeterminate,
      recommendedStaffAction: db.recommended_staff_action,
      status: db.status as RuleStatus,
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

  private static mapDbAlertToDto(db: any): RedFlagAlertDTO {
    return {
      id: db.id,
      visitId: db.visit_id,
      kioskDeviceId: db.kiosk_device_id,
      kioskLocation: db.kiosk_location,
      ruleId: db.rule_id,
      ruleCode: db.rule_code,
      ruleVersion: db.rule_version,
      severityTier: db.severity_tier as SeverityTier,
      triggerType: db.trigger_type as TriggerType,
      status: db.status as AlertStatus,
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
      evidences: (db.evidences || []).map((e: any) => ({
        id: e.id,
        sourceType: e.source_type,
        sourceId: e.source_id,
        factKey: e.fact_key,
        factValueSnippet: e.fact_value_snippet,
        createdAt: e.created_at.toISOString(),
      })),
      events: (db.events || []).map((ev: any) => ({
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
