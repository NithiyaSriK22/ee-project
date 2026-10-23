/**
 * Module 10: Production Deployment, Security, Clinical Safety Release & Pilot Readiness
 * Type definitions for feature flags, release gates, restore drills, and deployment state.
 */

export type FeatureFlagKey =
  | 'AI_SUMMARIZATION_ENABLED'
  | 'VOICE_ENABLED'
  | 'ASSISTANT_ENABLED'
  | 'OCR_ENABLED'
  | 'MACHINE_TRANSLATION_ENABLED'
  | 'SMS_ENABLED'
  | 'SYNTHETIC_ALERT_CHECK_ENABLED'
  | 'KIOSK_INTAKE_ENABLED'
  | 'HOSPITAL_FILE_DROP_ENABLED'
  | 'HOSPITAL_ENDPOINT_PUSH_ENABLED'
  | 'FHIR_R4_EXPORT_ENABLED'
  | 'PATIENT_COPY_ENABLED'
  | 'DEMO_MODE_ENABLED'
  | 'FAULT_INJECTION_ENABLED';

export interface FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  name: string;
  description: string;
  effectWhenOff: string;
  ownerRole: 'CLINICAL_LEAD' | 'ADMIN' | 'IT_OPERATIONS';
  lastModifiedAt: string;
  lastModifiedBy: string;
  changeReason?: string;
  rehearsedInStaging: boolean;
}

export interface GlobalIntakePauseState {
  isPaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  actorRole: string | null;
  reason: string | null;
  estimatedResumeTime?: string | null;
}

export type ReleaseGateKey =
  | 'ACTIVE_RED_FLAG_RULES'
  | 'EVALUATED_SUMMARY_PROMPT'
  | 'ALL_ENABLED_LANGUAGES_APPROVED'
  | 'ACTIVE_FORMULARY_VERSION'
  | 'PUBLISHED_INTERVIEW_TEMPLATE'
  | 'REVIEW_POLICY_CONFIGURED'
  | 'AUDIT_HASH_CHAIN_VERIFIED'
  | 'RESTORE_DRILL_CURRENT'
  | 'SYNTHETIC_ALERT_CHECK_PASSED'
  | 'NO_CRITICAL_SECURITY_FINDINGS';

export interface ReleaseGateResult {
  gateKey: ReleaseGateKey;
  name: string;
  passed: boolean;
  severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK';
  details: string;
  checkedAt: string;
  evaluatedModule: string;
}

export interface ReleaseGateEvaluation {
  overallPassed: boolean;
  platformVersion: string;
  evaluatedAt: string;
  environment: string;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  gates: ReleaseGateResult[];
  emergencyOverride: {
    isOverridden: boolean;
    overriddenBy?: string;
    justification?: string;
    overriddenAt?: string;
    approvedByClinicalLead?: boolean;
  };
}

export interface EmergencyOverridePayload {
  justification: string;
  approvedByClinicalLead: boolean;
  overrideCode: string;
}

export interface RestoreDrillRecord {
  id: string;
  executedAt: string;
  executedBy: string;
  environment: 'STAGING' | 'ISOLATED_RECOVERY_ENCLAVE';
  status: 'SUCCESS' | 'FAILED';
  databaseRestored: boolean;
  auditChainValid: boolean;
  documentStorageVerified: boolean;
  applicationBootSuccessful: boolean;
  rpoActualMinutes: number;
  rtoActualMinutes: number;
  notes: string;
  verifiedHash: string;
}

export interface KioskEnrollmentRecord {
  id: string;
  deviceCode: string;
  facilityName: string;
  locationDescription: string;
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
  ipAddress?: string;
  softwareVersion: string;
  enrolledAt: string;
  enrolledBy: string;
  lastHeartbeatAt: string;
  revocationReason?: string;
}

export interface StatusBoardSummary {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE_DOWNTIME';
  platformVersion: string;
  environment: string;
  intakeActive: boolean;
  checkedAt: string;
  services: {
    database: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
    alertPipeline: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
    llmSummarization: 'OPERATIONAL' | 'FALLBACK_MODE' | 'DISABLED';
    ocrService: 'OPERATIONAL' | 'FALLBACK_MODE' | 'DISABLED';
    speechServices: 'OPERATIONAL' | 'TOUCH_FALLBACK' | 'DISABLED';
    auditChain: 'VERIFIED' | 'TAMPER_ALERT';
  };
  patientGuidance: string;
  staffGuidance: string;
  emergencyBanner: string;
}
