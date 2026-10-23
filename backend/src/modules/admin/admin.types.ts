import { StaffRole } from '../../types/auth.types.js';

export type AdminRole = StaffRole;

export type EventCategory =
  | 'INTAKE'
  | 'DOCUMENTS'
  | 'SUMMARY'
  | 'ALERTS'
  | 'REVIEW'
  | 'LANGUAGE'
  | 'SYSTEM'
  | 'AUDIT'
  | 'AUTH';

export type EventClass = 'CRITICAL_AUDIT' | 'NORMAL_ANALYTICS';

export type ActorType = 'STAFF' | 'KIOSK_DEVICE' | 'SYSTEM';

export type AuditResult = 'SUCCESS' | 'DENIED' | 'FAILED';

export interface ControlledAttributes {
  [key: string]: string | number | boolean | null | undefined;
}

export interface MetricDefinitionDTO {
  metricKey: string;
  name: string;
  description: string;
  category: EventCategory;
  unit: string;
  numeratorDef?: string;
  denominatorDef?: string;
  sourceEvents: string[];
  dimensionsAllowed: string[];
  minGroupSizeApplies: boolean;
  version: number;
}

export interface DailyAggregateDTO {
  id: string;
  date: string;
  metricKey: string;
  dimensions?: Record<string, string>;
  value: number;
  sampleCount: number;
  isSuppressed?: boolean;
}

export interface AnalyticsQueryFilters {
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  timezone?: string;
  dimensions?: Record<string, string>;
}

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  occurredAt: string;
  actorType: ActorType;
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  visitRef?: string;
  result: AuditResult;
  reasonCode?: string;
  reasonText?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  prevHash: string;
  recordHash: string;
}

export interface AuditSearchQuery {
  actorId?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  visitRef?: string;
  result?: AuditResult;
  requestId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditVerificationResult {
  valid: boolean;
  verifiedCount: number;
  headSequenceNumber: number;
  headHash: string;
  checkpointSequence?: number;
  corruptedRecordId?: string;
  corruptedSequenceNumber?: number;
  details: string;
  timestamp: string;
}

export interface AccessReportItem {
  id: string;
  occurredAt: string;
  actorId: string;
  actorRole: string;
  action: string;
  visitRef: string;
  reasonCode?: string;
  reasonText?: string;
  anomalyType:
    | 'OUT_OF_QUEUE_ACCESS'
    | 'CROSS_DEPARTMENT_VIEW'
    | 'REVIEW_TAKEOVER'
    | 'REPEATED_DENIED_ACCESS'
    | 'OUTSIDE_OPERATING_HOURS';
  explanation: string;
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface ComponentHealth {
  component: string;
  status: HealthStatus;
  latencyMs: number;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface SystemHealthSummary {
  overallStatus: HealthStatus;
  checkedAt: string;
  components: ComponentHealth[];
}

export interface KioskDeviceStatus {
  id: string;
  deviceCode: string;
  facilityName: string;
  locationDescription: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  ipAddress?: string;
  softwareVersion?: string;
  cacheVersion?: string;
  cameraStatus: 'OK' | 'WARN' | 'FAIL';
  microphoneStatus: 'OK' | 'WARN' | 'FAIL';
  speakerStatus: 'OK' | 'WARN' | 'FAIL';
  offlineSessionsQueued: number;
  lastHeartbeatAt: string;
}

export interface AlertPipelineHealth {
  deliveryLatencyP50Ms: number;
  deliveryLatencyP95Ms: number;
  deliveryLatencyMaxMs: number;
  activeAlertsCount: number;
  undeliveredAlertsCount: number;
  overdueAlertsCount: number;
  escalatedAlertsCount: number;
  staffStreamConnections: number;
  helpRequestsCount: number;
  syntheticCheckLatencyMs?: number;
  syntheticCheckStatus: HealthStatus;
  thresholdBreached: boolean;
  breachReason?: string;
}

export interface PilotBaselineDTO {
  id?: string;
  metricKey: string;
  baselineValue: number;
  unit: string;
  sourceDescription: string;
  measuredBy: string;
  sampleSize: number;
  measuredAt: string;
}

export interface RetentionSettingDTO {
  settingKey: string;
  settingValue: number;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LegalHoldDTO {
  id: string;
  scope: string;
  reason: string;
  active: boolean;
  placedBy: string;
  releasedBy?: string;
  createdAt: string;
  releasedAt?: string;
}
