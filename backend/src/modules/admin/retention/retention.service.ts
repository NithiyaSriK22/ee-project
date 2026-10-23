import { AppError } from '../../../errors/app-error.js';
import { ErrorCode } from '../../../errors/error-codes.js';
import { LegalHoldDTO, RetentionSettingDTO } from '../admin.types.js';
import { devFallbackAdminStore } from '../dev-fallback-admin-store.js';
import { AuditService } from '../audit/audit.service.js';

export class RetentionService {
  /**
   * Retrieves current retention configurations and legal holds.
   * Explicitly returns the open governance decision notice.
   */
  public static async getRetentionOverview(): Promise<{
    settings: RetentionSettingDTO[];
    legalHolds: LegalHoldDTO[];
    governanceNotice: string;
  }> {
    return {
      settings: devFallbackAdminStore.getRetentionSettings(),
      legalHolds: devFallbackAdminStore.getLegalHolds(),
      governanceNotice:
        'IMPORTANT GOVERNANCE NOTICE: Health-record access audit log retention duration is a hospital policy and medico-legal decision. The default policy of 7 years (2,555 days) must be reviewed and formally signed off by hospital legal counsel, medical records committee, and clinical leads prior to live deployment.',
    };
  }

  /**
   * Updates a retention setting policy. Audited as a critical configuration action.
   */
  public static async updateRetentionSetting(params: {
    settingKey: string;
    settingValue: number;
    updatedBy: string;
    userRole: string;
  }): Promise<RetentionSettingDTO> {
    if (params.settingValue < 1) {
      throw new AppError(
        'Retention period must be a positive integer value.',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updated = devFallbackAdminStore.updateRetentionSetting(
      params.settingKey,
      params.settingValue,
      params.updatedBy
    );

    await AuditService.recordAudit({
      actorType: 'STAFF',
      actorId: params.updatedBy,
      actorRole: params.userRole,
      action: 'RETENTION_SETTING_UPDATED',
      entityType: 'RETENTION_SETTING',
      entityId: params.settingKey,
      result: 'SUCCESS',
      metadata: {
        setting_key: params.settingKey,
        new_retention_days: params.settingValue,
      },
    });

    return updated;
  }

  /**
   * Places a legal hold to immediately suspend all automated data pruning for the given scope.
   */
  public static async placeLegalHold(params: {
    scope: string;
    reason: string;
    placedBy: string;
    userRole: string;
  }): Promise<LegalHoldDTO> {
    if (!params.reason || params.reason.trim().length < 10) {
      throw new AppError(
        'A comprehensive legal justification reason (minimum 10 characters) is required to place a legal hold.',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const hold = devFallbackAdminStore.placeLegalHold({
      scope: params.scope,
      reason: params.reason,
      placedBy: params.placedBy,
    });

    await AuditService.recordAudit({
      actorType: 'STAFF',
      actorId: params.placedBy,
      actorRole: params.userRole,
      action: 'LEGAL_HOLD_SET',
      entityType: 'LEGAL_HOLD',
      entityId: hold.id,
      result: 'SUCCESS',
      reasonText: params.reason,
      metadata: { scope: params.scope },
    });

    return hold;
  }

  /**
   * Releases an active legal hold.
   */
  public static async releaseLegalHold(params: {
    holdId: string;
    releasedBy: string;
    userRole: string;
  }): Promise<LegalHoldDTO> {
    const hold = devFallbackAdminStore.releaseLegalHold(params.holdId, params.releasedBy);
    if (!hold) {
      throw new AppError('Legal hold not found', 404, ErrorCode.NOT_FOUND);
    }

    await AuditService.recordAudit({
      actorType: 'STAFF',
      actorId: params.releasedBy,
      actorRole: params.userRole,
      action: 'LEGAL_HOLD_RELEASED',
      entityType: 'LEGAL_HOLD',
      entityId: hold.id,
      result: 'SUCCESS',
      metadata: { scope: hold.scope },
    });

    return hold;
  }
}
