import { SeverityTier, SeverityTiers, AlertStatus, AlertStatuses } from '../redflags.types.js';

export interface EscalationConfig {
  immediateTimeoutSeconds: number;
  manualTimeoutSeconds: number;
  urgentTimeoutSeconds: number;
  staffCheckTimeoutSeconds: number;
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  immediateTimeoutSeconds: 180, // 3 minutes
  manualTimeoutSeconds: 120, // 2 minutes
  urgentTimeoutSeconds: 600, // 10 minutes
  staffCheckTimeoutSeconds: 1200, // 20 minutes
};

export class EscalationService {
  /**
   * Calculates whether an unacknowledged alert has expired its SLA and requires escalation
   */
  public static shouldEscalate(
    severityTier: SeverityTier,
    status: AlertStatus,
    raisedAt: Date,
    config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
    now: Date = new Date()
  ): boolean {
    // Only unacknowledged or stalled alerts escalate
    if (status !== AlertStatuses.RAISED) {
      return false;
    }

    const elapsedSeconds = (now.getTime() - raisedAt.getTime()) / 1000;
    const threshold = this.getThresholdSeconds(severityTier, config);

    return elapsedSeconds >= threshold;
  }

  public static getThresholdSeconds(
    tier: SeverityTier,
    config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
  ): number {
    switch (tier) {
      case SeverityTiers.IMMEDIATE:
        return config.immediateTimeoutSeconds;
      case SeverityTiers.MANUAL:
        return config.manualTimeoutSeconds;
      case SeverityTiers.URGENT:
        return config.urgentTimeoutSeconds;
      case SeverityTiers.STAFF_CHECK:
        return config.staffCheckTimeoutSeconds;
      default:
        return 600;
    }
  }
}
