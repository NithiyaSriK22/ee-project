import crypto from 'crypto';
import {
  AuditLogEntry,
  AuditResult,
  AuditVerificationResult,
  DailyAggregateDTO,
  KioskDeviceStatus,
  PilotBaselineDTO,
  RetentionSettingDTO,
  LegalHoldDTO,
  EventCategory,
  ActorType,
} from './admin.types.js';

export interface StoredAnalyticsEvent {
  id: string;
  eventName: string;
  category: EventCategory;
  actorType: ActorType;
  actorRef?: string;
  visitRef?: string;
  entityType: string;
  entityId?: string;
  occurredAt: string;
  requestId?: string;
  attributes: Record<string, any>;
}

export interface StoredReportRun {
  id: string;
  reportType: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  reportingTimezone: string;
  parameters?: Record<string, any>;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  dataSummary?: Record<string, any>;
  expiresAt: string;
  generatedBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface StoredExportJob {
  id: string;
  exportType: string;
  format: 'CSV' | 'JSON';
  filters?: Record<string, any>;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  rowCount: number;
  expiresAt: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  completedAt?: string;
  dataContent?: string;
}

export interface StoredAuditCheckpoint {
  id: string;
  checkpointSequence: number;
  headSequenceNumber: number;
  headHash: string;
  verifiedCount: number;
  status: 'VERIFIED' | 'CORRUPTED';
  verifiedAt: string;
  createdAt: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class DevFallbackAdminStore {
  private auditLogs: AuditLogEntry[] = [];
  private checkpoints: StoredAuditCheckpoint[] = [];
  private analyticsEvents: StoredAnalyticsEvent[] = [];
  private dailyAggregates: Map<string, DailyAggregateDTO> = new Map();
  private reports: StoredReportRun[] = [];
  private exports: StoredExportJob[] = [];
  private retentionSettings: Map<string, RetentionSettingDTO> = new Map();
  private legalHolds: Map<string, LegalHoldDTO> = new Map();
  private pilotBaselines: Map<string, PilotBaselineDTO> = new Map();
  private kioskFleet: Map<string, KioskDeviceStatus> = new Map();
  private nextSequenceNumber = 1;
  private nextCheckpointSequence = 1;

  constructor() {
    this.seedDefaultSettings();
    this.seedKiosks();
    this.seedBaselines();
    this.seedInitialAggregatesAndEvents();
  }

  // --- HASH COMPUTATION FOR TAMPER-EVIDENCE ---
  public computeRecordHash(data: {
    sequenceNumber: number;
    occurredAt: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    result: string;
    prevHash: string;
  }): string {
    const raw = `${data.sequenceNumber}|${data.occurredAt}|${data.actorId || ''}|${data.action}|${data.entityType}|${data.entityId || ''}|${data.result}|${data.prevHash}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // --- AUDIT LOGS (APPEND-ONLY) ---
  public appendAuditLog(entry: {
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
    occurredAt?: string;
  }): AuditLogEntry {
    const sequenceNumber = this.nextSequenceNumber++;
    const occurredAt = entry.occurredAt || new Date().toISOString();

    const prevHash =
      this.auditLogs.length > 0 && this.auditLogs[this.auditLogs.length - 1]
        ? this.auditLogs[this.auditLogs.length - 1]!.recordHash
        : GENESIS_HASH;

    const recordHash = this.computeRecordHash({
      sequenceNumber,
      occurredAt,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      result: entry.result,
      prevHash,
    });

    const record: AuditLogEntry = {
      id: crypto.randomUUID(),
      sequenceNumber,
      occurredAt,
      actorType: entry.actorType,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      visitRef: entry.visitRef,
      result: entry.result,
      reasonCode: entry.reasonCode,
      reasonText: entry.reasonText,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      prevHash,
      recordHash,
    };

    this.auditLogs.push(record);
    return record;
  }

  public getAuditLogs(filters?: {
    actorId?: string;
    actorRole?: string;
    action?: string;
    entityType?: string;
    visitRef?: string;
    result?: AuditResult;
    requestId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { logs: AuditLogEntry[]; total: number } {
    let result = [...this.auditLogs];

    if (filters?.actorId) {
      result = result.filter((l) => l.actorId === filters.actorId);
    }
    if (filters?.actorRole) {
      result = result.filter((l) => l.actorRole === filters.actorRole);
    }
    if (filters?.action) {
      result = result.filter((l) => l.action.toLowerCase() === filters.action!.toLowerCase());
    }
    if (filters?.entityType) {
      result = result.filter((l) => l.entityType.toLowerCase() === filters.entityType!.toLowerCase());
    }
    if (filters?.visitRef) {
      result = result.filter((l) => l.visitRef === filters.visitRef);
    }
    if (filters?.result) {
      result = result.filter((l) => l.result === filters.result);
    }
    if (filters?.requestId) {
      result = result.filter((l) => l.requestId === filters.requestId);
    }
    if (filters?.startDate) {
      result = result.filter((l) => l.occurredAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter((l) => l.occurredAt < filters.endDate!);
    }

    // Sort descending by sequence number
    result.sort((a, b) => b.sequenceNumber - a.sequenceNumber);

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginated = result.slice(offset, offset + limit);

    return { logs: paginated, total };
  }

  public getAuditLogById(id: string): AuditLogEntry | undefined {
    return this.auditLogs.find((l) => l.id === id);
  }

  // Chain Verification & Checkpoint Creation
  public verifyAuditChain(): AuditVerificationResult {
    if (this.auditLogs.length === 0) {
      return {
        valid: true,
        verifiedCount: 0,
        headSequenceNumber: 0,
        headHash: GENESIS_HASH,
        details: 'Audit chain is empty. Verification passed.',
        timestamp: new Date().toISOString(),
      };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < this.auditLogs.length; i++) {
      const record = this.auditLogs[i];
      if (!record) continue;

      // Check linkage
      if (record.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          verifiedCount: i,
          headSequenceNumber: record.sequenceNumber,
          headHash: record.recordHash,
          corruptedRecordId: record.id,
          corruptedSequenceNumber: record.sequenceNumber,
          details: `Hash chain broken at record #${record.sequenceNumber}: prevHash mismatch. Expected '${expectedPrevHash}', found '${record.prevHash}'.`,
          timestamp: new Date().toISOString(),
        };
      }

      // Check integrity of hash
      const computed = this.computeRecordHash({
        sequenceNumber: record.sequenceNumber,
        occurredAt: record.occurredAt,
        actorId: record.actorId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        result: record.result,
        prevHash: record.prevHash,
      });

      if (computed !== record.recordHash) {
        return {
          valid: false,
          verifiedCount: i,
          headSequenceNumber: record.sequenceNumber,
          headHash: record.recordHash,
          corruptedRecordId: record.id,
          corruptedSequenceNumber: record.sequenceNumber,
          details: `Tamper detected at record #${record.sequenceNumber}: recorded hash does not match recomputed SHA-256 payload digest.`,
          timestamp: new Date().toISOString(),
        };
      }

      expectedPrevHash = record.recordHash;
    }

    const headRecord = this.auditLogs[this.auditLogs.length - 1];
    if (!headRecord) {
      return {
        valid: true,
        verifiedCount: 0,
        headSequenceNumber: 0,
        headHash: GENESIS_HASH,
        details: 'Audit chain is empty. Verification passed.',
        timestamp: new Date().toISOString(),
      };
    }

    const checkpointSeq = this.nextCheckpointSequence++;
    const checkpoint: StoredAuditCheckpoint = {
      id: crypto.randomUUID(),
      checkpointSequence: checkpointSeq,
      headSequenceNumber: headRecord.sequenceNumber,
      headHash: headRecord.recordHash,
      verifiedCount: this.auditLogs.length,
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.checkpoints.push(checkpoint);

    return {
      valid: true,
      verifiedCount: this.auditLogs.length,
      headSequenceNumber: headRecord.sequenceNumber,
      headHash: headRecord.recordHash,
      checkpointSequence: checkpointSeq,
      details: `Successfully verified all ${this.auditLogs.length} audit records. Checkpoint #${checkpointSeq} generated.`,
      timestamp: checkpoint.verifiedAt,
    };
  }

  // Method to simulate deliberate tamper for testing detection
  public tamperRecordForTest(sequenceNumber: number, alteredAction: string): void {
    const record = this.auditLogs.find((l) => l.sequenceNumber === sequenceNumber);
    if (record) {
      record.action = alteredAction;
    }
  }

  // --- ANALYTICS EVENTS & AGGREGATES ---
  public appendAnalyticsEvent(event: {
    eventName: string;
    category: EventCategory;
    actorType: ActorType;
    actorRef?: string;
    visitRef?: string;
    entityType: string;
    entityId?: string;
    requestId?: string;
    attributes: Record<string, any>;
    occurredAt?: string;
  }): StoredAnalyticsEvent {
    const record: StoredAnalyticsEvent = {
      id: crypto.randomUUID(),
      eventName: event.eventName,
      category: event.category,
      actorType: event.actorType,
      actorRef: event.actorRef,
      visitRef: event.visitRef,
      entityType: event.entityType,
      entityId: event.entityId,
      occurredAt: event.occurredAt || new Date().toISOString(),
      requestId: event.requestId,
      attributes: event.attributes,
    };
    this.analyticsEvents.push(record);
    return record;
  }

  public getDailyAggregates(filters: {
    startDate: string;
    endDate: string;
    metricKeys?: string[];
    dimensionKey?: string;
    dimensionValue?: string;
  }): DailyAggregateDTO[] {
    const results: DailyAggregateDTO[] = [];

    for (const agg of this.dailyAggregates.values()) {
      if (agg.date >= filters.startDate && agg.date < filters.endDate) {
        if (filters.metricKeys && !filters.metricKeys.includes(agg.metricKey)) {
          continue;
        }
        if (filters.dimensionKey && filters.dimensionValue) {
          if (!agg.dimensions || agg.dimensions[filters.dimensionKey] !== filters.dimensionValue) {
            continue;
          }
        }
        results.push(agg);
      }
    }

    return results;
  }

  public setDailyAggregate(agg: DailyAggregateDTO): void {
    const dimKey = agg.dimensions
      ? Object.entries(agg.dimensions)
          .sort()
          .map(([k, v]) => `${k}:${v}`)
          .join('|')
      : 'global';
    const key = `${agg.date}#${agg.metricKey}#${dimKey}`;
    this.dailyAggregates.set(key, agg);
  }

  // --- KIOSK FLEET REGISTRY ---
  public listKiosks(): KioskDeviceStatus[] {
    return Array.from(this.kioskFleet.values());
  }

  public getKiosk(deviceCode: string): KioskDeviceStatus | undefined {
    return this.kioskFleet.get(deviceCode);
  }

  public updateKioskHeartbeat(
    deviceCode: string,
    updates: Partial<KioskDeviceStatus>
  ): KioskDeviceStatus {
    const existing = this.kioskFleet.get(deviceCode) || {
      id: crypto.randomUUID(),
      deviceCode,
      facilityName: 'Main General OPD',
      locationDescription: 'Kiosk Booth',
      status: 'ONLINE',
      cameraStatus: 'OK',
      microphoneStatus: 'OK',
      speakerStatus: 'OK',
      offlineSessionsQueued: 0,
      lastHeartbeatAt: new Date().toISOString(),
    };

    const updated: KioskDeviceStatus = {
      ...existing,
      ...updates,
      lastHeartbeatAt: new Date().toISOString(),
    };
    this.kioskFleet.set(deviceCode, updated);
    return updated;
  }

  // --- RETENTION & LEGAL HOLD ---
  public getRetentionSettings(): RetentionSettingDTO[] {
    return Array.from(this.retentionSettings.values());
  }

  public updateRetentionSetting(
    key: string,
    value: number,
    updatedBy: string
  ): RetentionSettingDTO {
    const existing = this.retentionSettings.get(key) || {
      settingKey: key,
      settingValue: value,
    };
    const updated: RetentionSettingDTO = {
      ...existing,
      settingValue: value,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.retentionSettings.set(key, updated);
    return updated;
  }

  public getLegalHolds(): LegalHoldDTO[] {
    return Array.from(this.legalHolds.values());
  }

  public placeLegalHold(hold: {
    scope: string;
    reason: string;
    placedBy: string;
  }): LegalHoldDTO {
    const id = crypto.randomUUID();
    const entry: LegalHoldDTO = {
      id,
      scope: hold.scope,
      reason: hold.reason,
      active: true,
      placedBy: hold.placedBy,
      createdAt: new Date().toISOString(),
    };
    this.legalHolds.set(id, entry);
    return entry;
  }

  public releaseLegalHold(id: string, releasedBy: string): LegalHoldDTO | undefined {
    const hold = this.legalHolds.get(id);
    if (!hold) return undefined;
    hold.active = false;
    hold.releasedBy = releasedBy;
    hold.releasedAt = new Date().toISOString();
    return hold;
  }

  public isLegalHoldActive(scope?: string): boolean {
    for (const hold of this.legalHolds.values()) {
      if (hold.active) {
        if (!scope || hold.scope === 'ALL' || hold.scope === scope) {
          return true;
        }
      }
    }
    return false;
  }

  // --- PILOT BASELINE RECORDS ---
  public getPilotBaselines(): PilotBaselineDTO[] {
    return Array.from(this.pilotBaselines.values());
  }

  public getPilotBaseline(metricKey: string): PilotBaselineDTO | undefined {
    return this.pilotBaselines.get(metricKey);
  }

  public setPilotBaseline(baseline: PilotBaselineDTO): PilotBaselineDTO {
    const entry = {
      ...baseline,
      id: baseline.id || crypto.randomUUID(),
    };
    this.pilotBaselines.set(baseline.metricKey, entry);
    return entry;
  }

  // --- REPORT RUNS & EXPORT JOBS ---
  public createReportRun(report: Omit<StoredReportRun, 'id' | 'createdAt'>): StoredReportRun {
    const run: StoredReportRun = {
      ...report,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.reports.push(run);
    return run;
  }

  public getReportRuns(): StoredReportRun[] {
    return [...this.reports].reverse();
  }

  public getReportRunById(id: string): StoredReportRun | undefined {
    return this.reports.find((r) => r.id === id);
  }

  public createExportJob(job: Omit<StoredExportJob, 'id' | 'createdAt'>): StoredExportJob {
    const entry: StoredExportJob = {
      ...job,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.exports.push(entry);
    return entry;
  }

  public getExportJobById(id: string): StoredExportJob | undefined {
    return this.exports.find((e) => e.id === id);
  }

  // --- SEEDERS ---
  private seedDefaultSettings(): void {
    const defaults = [
      { key: 'ANALYTICS_EVENT_RETENTION_DAYS', val: 30, desc: 'Raw event retention policy' },
      { key: 'DAILY_AGGREGATE_RETENTION_DAYS', val: 365, desc: 'Aggregated analytics retention' },
      { key: 'AUDIT_LOG_RETENTION_DAYS', val: 2555, desc: 'Health data access audit trail (7 years - subject to hospital governance)' },
      { key: 'HEALTH_SAMPLE_RETENTION_DAYS', val: 14, desc: 'Telemetry & component latency logs' },
      { key: 'REPORT_RETENTION_DAYS', val: 90, desc: 'Generated PDF/CSV report artifacts' },
    ];
    for (const d of defaults) {
      this.retentionSettings.set(d.key, {
        settingKey: d.key,
        settingValue: d.val,
        description: d.desc,
        updatedBy: 'SYSTEM',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private seedKiosks(): void {
    const kiosks: KioskDeviceStatus[] = [
      {
        id: 'kiosk-unit-001',
        deviceCode: 'KIOSK-OPD-A1',
        facilityName: 'District Hospital - OPD Gate 1',
        locationDescription: 'Main Intake Counter A',
        status: 'ONLINE',
        ipAddress: '192.168.10.45',
        softwareVersion: 'v2.4.1',
        cacheVersion: 'v1.0.8',
        cameraStatus: 'OK',
        microphoneStatus: 'OK',
        speakerStatus: 'OK',
        offlineSessionsQueued: 0,
        lastHeartbeatAt: new Date().toISOString(),
      },
      {
        id: 'kiosk-unit-002',
        deviceCode: 'KIOSK-OPD-A2',
        facilityName: 'District Hospital - OPD Gate 1',
        locationDescription: 'Main Intake Counter B',
        status: 'ONLINE',
        ipAddress: '192.168.10.46',
        softwareVersion: 'v2.4.1',
        cacheVersion: 'v1.0.8',
        cameraStatus: 'OK',
        microphoneStatus: 'OK',
        speakerStatus: 'OK',
        offlineSessionsQueued: 0,
        lastHeartbeatAt: new Date().toISOString(),
      },
      {
        id: 'kiosk-unit-003',
        deviceCode: 'KIOSK-EMR-01',
        facilityName: 'District Hospital - Triage Wing',
        locationDescription: 'Emergency Intake Annex',
        status: 'ONLINE',
        ipAddress: '192.168.20.12',
        softwareVersion: 'v2.4.1',
        cacheVersion: 'v1.0.8',
        cameraStatus: 'OK',
        microphoneStatus: 'OK',
        speakerStatus: 'OK',
        offlineSessionsQueued: 1,
        lastHeartbeatAt: new Date().toISOString(),
      },
    ];
    for (const k of kiosks) {
      this.kioskFleet.set(k.deviceCode, k);
    }
  }

  private seedBaselines(): void {
    // Seed documented baseline for pilot evaluation
    this.pilotBaselines.set('intake_duration', {
      id: crypto.randomUUID(),
      metricKey: 'intake_duration',
      baselineValue: 480, // 8 minutes paper/manual OPD intake
      unit: 'seconds',
      sourceDescription: 'Pre-pilot time-and-motion study conducted at OPD Registration Desk 1 over 14 business days.',
      measuredBy: 'Dr. S. Ramanathan, Lead Clinical Quality Officer',
      sampleSize: 240,
      measuredAt: '2026-08-15T09:00:00Z',
    });

    this.pilotBaselines.set('review_duration', {
      id: crypto.randomUUID(),
      metricKey: 'review_duration',
      baselineValue: 300, // 5 minutes standard doctor consultation record taking
      unit: 'seconds',
      sourceDescription: 'Observed consultation documentation duration across 5 OPD chambers prior to MediKiosk deployment.',
      measuredBy: 'Quality Assurance Committee',
      sampleSize: 180,
      measuredAt: '2026-08-20T10:00:00Z',
    });
  }

  private seedInitialAggregatesAndEvents(): void {
    const toDateStr = (d: Date): string => d.toISOString().split('T')[0] ?? '';
    const pastDays = [0, 1, 2, 3, 4, 5, 6];

    for (const dayOffset of pastDays) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = toDateStr(d);

      // Seed global aggregates for each metric
      const seedData: Record<string, number> = {
        visit_started: 48 - dayOffset * 3,
        visit_completed: 44 - dayOffset * 3,
        visit_abandoned: 4,
        interview_completion_rate: 91.6,
        intake_duration_p50: 210 + dayOffset * 5,
        intake_duration_p90: 340 + dayOffset * 10,
        documents_uploaded: 62 - dayOffset * 4,
        documents_processed: 58 - dayOffset * 4,
        document_rescan_rate: 4.8,
        ocr_processing_duration_median: 1420,
        summaries_generated_llm: 41 - dayOffset * 3,
        summaries_generated_fallback: 3,
        summary_fallback_rate: 6.8,
        grounding_validation_failure_rate: 4.2,
        summary_generation_latency_p50: 1850,
        visits_reviewed: 42 - dayOffset * 3,
        visits_confirmed: 40 - dayOffset * 3,
        review_duration_median: 115 + dayOffset * 2,
        review_edit_rate: 14.5,
        review_rejection_rate: 2.3,
        review_amendment_rate: 1.8,
        alerts_raised: 6,
        alert_ack_time_median: 48,
        alert_delivery_latency_p95: 185,
        voice_usage_share: 58.0,
        voice_to_touch_fallback_rate: 8.5,
        readback_correction_rate: 6.2,
        stt_failure_rate: 3.1,
        accessibility_mode_usage: 12,
        kiosks_online_count: 3,
      };

      for (const [metricKey, val] of Object.entries(seedData)) {
        this.setDailyAggregate({
          id: crypto.randomUUID(),
          date: dateStr,
          metricKey,
          value: val,
          sampleCount: Math.round(val),
        });
      }

      // Seed language dimension aggregates to demonstrate minimum group size suppression
      // English: 25 (> 10, shown)
      this.setDailyAggregate({
        id: crypto.randomUUID(),
        date: dateStr,
        metricKey: 'sessions_by_language',
        dimensions: { language: 'en' },
        value: 25,
        sampleCount: 25,
      });
      // Tamil: 15 (> 10, shown)
      this.setDailyAggregate({
        id: crypto.randomUUID(),
        date: dateStr,
        metricKey: 'sessions_by_language',
        dimensions: { language: 'ta' },
        value: 15,
        sampleCount: 15,
      });
      // Hindi: 12 (> 10, shown)
      this.setDailyAggregate({
        id: crypto.randomUUID(),
        date: dateStr,
        metricKey: 'sessions_by_language',
        dimensions: { language: 'hi' },
        value: 12,
        sampleCount: 12,
      });
      // Kannada: 4 (< 10, MUST BE SUPPRESSED as "fewer than 10")
      this.setDailyAggregate({
        id: crypto.randomUUID(),
        date: dateStr,
        metricKey: 'sessions_by_language',
        dimensions: { language: 'kn' },
        value: 4,
        sampleCount: 4,
      });
    }

    // Seed initial audit log entries
    this.appendAuditLog({
      actorType: 'SYSTEM',
      actorId: 'sys-bootstrap',
      actorRole: 'SYSTEM',
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'PLATFORM',
      entityId: 'medikiosk-core',
      result: 'SUCCESS',
      occurredAt: '2026-10-22T08:00:00Z',
    });

    this.appendAuditLog({
      actorType: 'STAFF',
      actorId: 'c0000000-0000-4000-a000-000000000001',
      actorRole: 'ADMIN',
      action: 'RETENTION_CONFIG_CHECKED',
      entityType: 'RETENTION_SETTING',
      result: 'SUCCESS',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 AdminConsole',
      occurredAt: '2026-10-22T08:15:00Z',
    });

    this.appendAuditLog({
      actorType: 'STAFF',
      actorId: 'c0000000-0000-4000-a000-000000000002',
      actorRole: 'DOCTOR',
      action: 'OUT_OF_QUEUE_ACCESS',
      entityType: 'PATIENT_VISIT',
      visitRef: 'visit-ref-opaque-9921',
      reasonCode: 'EMERGENCY_WALKIN_ESCALATION',
      reasonText: 'Direct referral from triage desk for urgent acute chest review.',
      result: 'SUCCESS',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 DoctorPortal',
      occurredAt: '2026-10-22T09:30:00Z',
    });
  }
}

export const devFallbackAdminStore = new DevFallbackAdminStore();
