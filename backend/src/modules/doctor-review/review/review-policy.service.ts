import { ReviewPolicyConfig } from '../doctor-review.types.js';

export const DEFAULT_REVIEW_POLICY: ReviewPolicyConfig = {
  version: 'POLICY-v1.0.0',
  name: 'Standard Hospital OPD Clinical Review Policy',
  isActive: true,
  gateOnCriticalUnverifiedDocumentFields: true,
  gateOnCriticalUnreadableDocumentFields: true,
  gateOnCriticalMismatchDocumentFields: true,
  gateOnCriticalDeclinedAnswers: true,
  gateOnConflictMarkers: true,
  gateOnUnacknowledgedOpenAlerts: true,
  attestationVersion: 'ATTEST-v1.0.0',
  attestationText:
    'I, the treating physician, confirm that I have reviewed the clinical case details, verified sources, resolved outstanding critical flags, and approved this record as accurate for clinical documentation.',
};

export class ReviewPolicyService {
  private static activePolicy: ReviewPolicyConfig = { ...DEFAULT_REVIEW_POLICY };

  public static getActivePolicy(): ReviewPolicyConfig {
    return { ...this.activePolicy };
  }

  public static setActivePolicy(policy: ReviewPolicyConfig): void {
    this.activePolicy = { ...policy };
  }

  public static getAttestationText(): { version: string; text: string } {
    return {
      version: this.activePolicy.attestationVersion,
      text: this.activePolicy.attestationText,
    };
  }
}
