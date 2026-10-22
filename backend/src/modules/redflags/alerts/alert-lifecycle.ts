import {
  AlertStatus,
  AlertStatuses,
  ControlledDismissalReason,
  ControlledDismissalReasons,
  ControlledResolutionType,
  ControlledResolutionTypes,
} from '../redflags.types.js';
import { ValidationError } from '../../../errors/app-error.js';

export class AlertLifecycle {
  private static readonly VALID_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
    [AlertStatuses.RAISED]: [
      AlertStatuses.ACKNOWLEDGED,
      AlertStatuses.ESCALATED,
    ],
    [AlertStatuses.ACKNOWLEDGED]: [
      AlertStatuses.IN_ASSESSMENT,
      AlertStatuses.RESOLVED,
      AlertStatuses.DISMISSED,
      AlertStatuses.ESCALATED,
    ],
    [AlertStatuses.IN_ASSESSMENT]: [
      AlertStatuses.RESOLVED,
      AlertStatuses.DISMISSED,
      AlertStatuses.ESCALATED,
    ],
    [AlertStatuses.ESCALATED]: [
      AlertStatuses.ACKNOWLEDGED,
      AlertStatuses.IN_ASSESSMENT,
      AlertStatuses.RESOLVED,
      AlertStatuses.DISMISSED,
    ],
    [AlertStatuses.RESOLVED]: [], // Terminal state
    [AlertStatuses.DISMISSED]: [], // Terminal state
  };

  /**
   * Validates if transition from currentStatus to nextStatus is permitted
   */
  public static validateTransition(currentStatus: AlertStatus, nextStatus: AlertStatus): void {
    if (currentStatus === nextStatus) return;

    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new ValidationError(
        `Invalid alert lifecycle transition: Cannot move alert from '${currentStatus}' to '${nextStatus}'. Alerts must be acknowledged before resolution.`
      );
    }
  }

  /**
   * Validates dismissal parameters
   */
  public static validateDismissal(reason: string): ControlledDismissalReason {
    const valid = Object.values(ControlledDismissalReasons).includes(reason as ControlledDismissalReason);
    if (!valid) {
      throw new ValidationError(
        `Invalid dismissal reason: '${reason}'. Controlled reason from catalog required: ${Object.values(ControlledDismissalReasons).join(', ')}`
      );
    }
    return reason as ControlledDismissalReason;
  }

  /**
   * Validates resolution parameters
   */
  public static validateResolution(type: string): ControlledResolutionType {
    const valid = Object.values(ControlledResolutionTypes).includes(type as ControlledResolutionType);
    if (!valid) {
      throw new ValidationError(
        `Invalid resolution type: '${type}'. Controlled resolution type required: ${Object.values(ControlledResolutionTypes).join(', ')}`
      );
    }
    return type as ControlledResolutionType;
  }
}
