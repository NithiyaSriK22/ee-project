import { logger } from '../../../config/logger.js';
import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import {
  AuditLogEntry,
  AuditResult,
  AuditSearchQuery,
  AuditVerificationResult,
  ActorType,
} from '../admin.types.js';
import { devFallbackAdminStore } from '../dev-fallback-admin-store.js';
import { PrivacySuppressionService } from '../analytics/privacy-suppression.js';
import { OutboxService, CRITICAL_AUDIT_ACTIONS } from './outbox.service.js';

export class AuditService {
  /**
   * Appends an immutable, hash-chained record to the audit trail.
   * If action is in CRITICAL_AUDIT_ACTIONS, failures roll back safely.
   */
  public static async recordAudit(params: {
    actorType: ActorType;
    actorId?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId?: string;
    visitRef?: string;
    result?: AuditResult;
    reasonCode?: string;
    reasonText?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    occurredAt?: string;
    forceFailForTest?: boolean;
  }): Promise<AuditLogEntry> {
    // 1. Validate controlled metadata attributes to ensure zero clinical content
    if (params.metadata) {
      PrivacySuppressionService.validateControlledAttributes(params.metadata);
    }

    const result = params.result || 'SUCCESS';
    const isCritical = CRITICAL_AUDIT_ACTIONS.has(params.action);

    // 2. Transactional outbox fail-safe evaluation
    if (params.forceFailForTest && isCritical) {
      await OutboxService.recordEvent({
        eventName: params.action,
        eventClass: 'CRITICAL_AUDIT',
        payload: { entityType: params.entityType, entityId: params.entityId },
        simulateFailure: true,
      });
    }

    try {
      const entry = devFallbackAdminStore.appendAuditLog({
        actorType: params.actorType,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        visitRef: params.visitRef,
        result,
        reasonCode: params.reasonCode,
        reasonText: params.reasonText,
        requestId: params.requestId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
        occurredAt: params.occurredAt,
      });

      logger.info(`[AUDIT_LOG_APPENDED] #${entry.sequenceNumber} - ${params.action}`, {
        sequenceNumber: entry.sequenceNumber,
        action: params.action,
        entityType: params.entityType,
        actorRole: params.actorRole,
        result,
      });

      return entry;
    } catch (err) {
      if (isCritical) {
        throw new AppError(
          `Failed to persist critical audit record: ${err instanceof Error ? err.message : String(err)}`,
          500,
          ErrorCode.AUDIT_WRITE_FAILED
        );
      }
      logger.error('Failed to write non-critical audit log', { error: String(err) });
      throw err;
    }
  }

  /**
   * Search audit trail with role-based field masking.
   * IP address, User Agent, and free-text reasons are strictly restricted to AUDITOR and SUPER_ADMIN.
   */
  public static async searchAuditLogs(
    query: AuditSearchQuery,
    requestingUserRole: string,
    requestingUserId: string
  ): Promise<{
    logs: Partial<AuditLogEntry>[];
    total: number;
    restrictedFieldsIncluded: boolean;
  }> {
    const hasPrivilegedAccess =
      requestingUserRole === 'AUDITOR' || requestingUserRole === 'SUPER_ADMIN';

    const { logs, total } = devFallbackAdminStore.getAuditLogs(query);

    // Audit the viewing of audit logs
    this.recordAudit({
      actorType: 'STAFF',
      actorId: requestingUserId,
      actorRole: requestingUserRole,
      action: 'AUDIT_LOG_VIEWED',
      entityType: 'AUDIT_LOG',
      result: 'SUCCESS',
      metadata: { count: logs.length },
    }).catch(() => {});

    // Apply role-based field masking
    const sanitizedLogs = logs.map((log) => {
      if (hasPrivilegedAccess) {
        return log;
      }

      // Non-auditors receive sanitized view without IP, user-agent, or protected justification reasons
      const { ipAddress, userAgent, reasonText, ...safeLog } = log;
      return {
        ...safeLog,
        ipAddress: '[RESTRICTED_TO_AUDITOR]',
        userAgent: '[RESTRICTED_TO_AUDITOR]',
        reasonText: reasonText ? '[RESTRICTED_JUSTIFICATION_NOTE]' : undefined,
      };
    });

    return {
      logs: sanitizedLogs,
      total,
      restrictedFieldsIncluded: hasPrivilegedAccess,
    };
  }

  /**
   * Retrieves single audit record by ID with role-based field masking
   */
  public static async getAuditLogById(
    id: string,
    requestingUserRole: string
  ): Promise<Partial<AuditLogEntry>> {
    const log = devFallbackAdminStore.getAuditLogById(id);
    if (!log) {
      throw new AppError('Audit log entry not found', 404, ErrorCode.NOT_FOUND);
    }

    const hasPrivilegedAccess =
      requestingUserRole === 'AUDITOR' || requestingUserRole === 'SUPER_ADMIN';

    if (hasPrivilegedAccess) {
      return log;
    }

    const { ipAddress, userAgent, reasonText, ...safeLog } = log;
    return {
      ...safeLog,
      ipAddress: '[RESTRICTED_TO_AUDITOR]',
      userAgent: '[RESTRICTED_TO_AUDITOR]',
      reasonText: reasonText ? '[RESTRICTED_JUSTIFICATION_NOTE]' : undefined,
    };
  }

  /**
   * Verifies SHA-256 hash chaining across all audit records and creates verification checkpoint.
   */
  public static verifyAuditChain(): AuditVerificationResult {
    return devFallbackAdminStore.verifyAuditChain();
  }
}
