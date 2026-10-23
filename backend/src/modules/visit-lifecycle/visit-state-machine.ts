import { VisitStatus } from './visit.types.js';
import { ValidationError } from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { devFallbackAdminStore } from '../admin/dev-fallback-admin-store.js';

export class VisitStateMachine {
  // Allowed transitions table
  private static readonly TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
    CREATED: ['CHECKED_IN', 'CANCELLED', 'EXPIRED'],
    CHECKED_IN: ['INTAKE_IN_PROGRESS', 'PAUSED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
    INTAKE_IN_PROGRESS: ['INTAKE_COMPLETE', 'PAUSED', 'INTAKE_ABANDONED', 'CANCELLED', 'EXPIRED'],
    INTAKE_COMPLETE: ['READY_FOR_REVIEW', 'PAUSED', 'CANCELLED', 'EXPIRED'],
    READY_FOR_REVIEW: ['IN_CONSULTATION', 'PAUSED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
    IN_CONSULTATION: ['COMPLETED', 'PAUSED', 'CANCELLED'],
    PAUSED: [
      'INTAKE_IN_PROGRESS',
      'READY_FOR_REVIEW',
      'IN_CONSULTATION',
      'INTAKE_ABANDONED',
      'CANCELLED',
      'EXPIRED',
    ],
    // Terminal states
    COMPLETED: [],
    INTAKE_ABANDONED: [],
    CANCELLED: [],
    EXPIRED: [],
    NO_SHOW: [],
  };

  public static canTransition(currentStatus: VisitStatus, targetStatus: VisitStatus): boolean {
    if (currentStatus === targetStatus) {
      return true;
    }
    const allowed = this.TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  public static validateTransition(
    visitId: string,
    currentStatus: VisitStatus,
    targetStatus: VisitStatus,
    actorRole: string = 'SYSTEM',
    actorId: string = 'system'
  ): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      const errorMsg = `Invalid visit state transition from '${currentStatus}' to '${targetStatus}' for visit '${visitId}'`;
      logger.warn('[INVALID_VISIT_STATE_TRANSITION]', {
        visitId,
        currentStatus,
        targetStatus,
        actorRole,
        actorId,
      });

      // Tamper-evident audit log of rejected state transition attempt
      try {
        devFallbackAdminStore.appendAuditLog({
          actorType: 'SYSTEM',
          actorId,
          actorRole,
          action: 'INVALID_VISIT_TRANSITION_REJECTED',
          entityType: 'VISIT',
          entityId: visitId,
          visitRef: visitId,
          result: 'FAILED',
          reasonCode: 'STATE_MACHINE_VIOLATION',
          reasonText: errorMsg,
          metadata: { currentStatus, targetStatus },
        });
      } catch {
        // Safe fallback in test mode
      }

      throw new ValidationError(errorMsg);
    }
  }

  public static isTerminal(status: VisitStatus): boolean {
    return ['COMPLETED', 'INTAKE_ABANDONED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(status);
  }
}
