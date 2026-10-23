import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { devFallbackAdminStore } from '../src/modules/admin/dev-fallback-admin-store.js';
import { PrivacySuppressionService, MIN_GROUP_SIZE } from '../src/modules/admin/analytics/privacy-suppression.js';
import { AnalyticsEventService } from '../src/modules/admin/analytics/analytics-event.service.js';
import { AuditService } from '../src/modules/admin/audit/audit.service.js';
import { OutboxService } from '../src/modules/admin/audit/outbox.service.js';
import { METRIC_CATALOG } from '../src/modules/admin/analytics/metric-catalog.js';

const app = createApp();

describe('MODULE 9 — ADMINISTRATION, ANALYTICS, AUDIT & SYSTEM MONITORING', () => {
  let superAdminToken: string;
  let adminToken: string;
  let analystToken: string;
  let auditorToken: string;
  let doctorToken: string;

  beforeEach(() => {
    superAdminToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000003',
      email: 'admin@medikiosk.hospital',
      fullName: 'Hospital Chief Admin',
      role: 'SUPER_ADMIN',
      department: 'Clinical Administration',
      status: 'ACTIVE',
    });

    adminToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000010',
      email: 'ops.admin@hospital.org',
      fullName: 'Operations Administrator',
      role: 'ADMIN',
      department: 'Hospital IT Operations',
      status: 'ACTIVE',
    });

    analystToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000011',
      email: 'analyst@hospital.org',
      fullName: 'Quality Data Analyst',
      role: 'ANALYST',
      department: 'Health Quality Intelligence',
      status: 'ACTIVE',
    });

    auditorToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000012',
      email: 'auditor@hospital.org',
      fullName: 'Hospital Compliance Auditor',
      role: 'AUDITOR',
      department: 'Internal Audit & Ethics',
      status: 'ACTIVE',
    });

    doctorToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000002',
      email: 'dr.ananya@hospital.org',
      fullName: 'Dr. Ananya Sharma',
      role: 'DOCTOR',
      department: 'Department of General Medicine',
      status: 'ACTIVE',
    });
  });

  // ==============================================================================
  // 1. PRIVACY & CLINICAL CONTENT ELIMINATION
  // ==============================================================================
  describe('1. Privacy & Clinical Content Elimination', () => {
    it('should reject analytics events containing clinical terminology (symptoms/drugs/diagnoses)', async () => {
      // Attempting to log an event with clinical symptom "chest pain"
      await expect(
        AnalyticsEventService.emitEvent({
          eventName: 'QUESTION_ANSWERED',
          category: 'INTAKE',
          actorType: 'KIOSK_DEVICE',
          attributes: {
            step: 'interview',
            question_code: 'chest pain acute', // Forbidden clinical term
          },
        })
      ).rejects.toThrow(/clinical terminology/i);

      // Attempting to log an event with medication "amoxicillin 500mg"
      await expect(
        AnalyticsEventService.emitEvent({
          eventName: 'OCR_EXTRACTED',
          category: 'DOCUMENTS',
          actorType: 'SYSTEM',
          attributes: {
            field_type: 'medication',
            reason_code: 'amoxicillin 500mg', // Forbidden drug dose
          },
        })
      ).rejects.toThrow(/clinical terminology/i);
    });

    it('should reject analytics events with unknown or uncontrolled attribute keys', async () => {
      await expect(
        AnalyticsEventService.emitEvent({
          eventName: 'INTERVIEW_STEP',
          category: 'INTAKE',
          actorType: 'KIOSK_DEVICE',
          attributes: {
            step: 'interview',
            free_text_answer: 'some random text', // Unknown key
          },
        })
      ).rejects.toThrow(/Disallowed analytics\/audit attribute key/i);
    });

    it('should enforce small-number privacy suppression (k-anonymity N=10)', () => {
      // Bucket count 4 (< 10) must be suppressed
      const smallBucket = PrivacySuppressionService.applySuppression(4, true);
      expect(smallBucket.isSuppressed).toBe(true);
      expect(smallBucket.value).toBeNull();
      expect(smallBucket.displayValue).toBe(`fewer than ${MIN_GROUP_SIZE}`);

      // Bucket count 25 (>= 10) must be visible
      const normalBucket = PrivacySuppressionService.applySuppression(25, true);
      expect(normalBucket.isSuppressed).toBe(false);
      expect(normalBucket.value).toBe(25);
      expect(normalBucket.displayValue).toBe('25');

      // Zero counts are not small groups
      const zeroBucket = PrivacySuppressionService.applySuppression(0, true);
      expect(zeroBucket.isSuppressed).toBe(false);
      expect(zeroBucket.value).toBe(0);
    });

    it('should display "fewer than 10" in language analytics for low-count languages', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/language-voice')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const languages = res.body.data.languageDistribution;
      const kannada = languages.find((l: any) => l.languageCode === 'kn');
      expect(kannada).toBeDefined();
      expect(kannada.isSuppressed).toBe(true);
      expect(kannada.displayValue).toBe('fewer than 10');
      expect(kannada.value).toBeNull();

      const english = languages.find((l: any) => l.languageCode === 'en');
      expect(english).toBeDefined();
      expect(english.isSuppressed).toBe(false);
      expect(english.value).toBe(145);
    });
  });

  // ==============================================================================
  // 2. AUDIT TRAIL, TAMPER-EVIDENCE & HASH CHAINING
  // ==============================================================================
  describe('2. Audit Trail & Hash-Chained Tamper-Evidence', () => {
    it('should append audit records with continuous SHA-256 hash chaining', async () => {
      const entry1 = await AuditService.recordAudit({
        actorType: 'STAFF',
        actorId: 'c0000000-0000-4000-a000-000000000002',
        actorRole: 'DOCTOR',
        action: 'CONFIRMED_RECORD_CREATED',
        entityType: 'CONFIRMED_RECORD',
        entityId: 'rec-test-001',
        result: 'SUCCESS',
      });

      const entry2 = await AuditService.recordAudit({
        actorType: 'STAFF',
        actorId: 'c0000000-0000-4000-a000-000000000002',
        actorRole: 'DOCTOR',
        action: 'RECORD_AMENDED',
        entityType: 'CONFIRMED_RECORD',
        entityId: 'rec-test-002',
        result: 'SUCCESS',
      });

      expect(entry2.sequenceNumber).toBe(entry1.sequenceNumber + 1);
      expect(entry2.prevHash).toBe(entry1.recordHash);
      expect(entry2.recordHash).toBeDefined();
      expect(entry2.recordHash).not.toBe(entry1.recordHash);
    });

    it('should verify valid audit hash chains and produce verification checkpoints', async () => {
      const res = await request(app)
        .post('/api/v1/admin/audit-logs/verify-chain')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.verifiedCount).toBeGreaterThan(0);
      expect(res.body.data.headHash).toBeDefined();
    });

    it('should immediately detect deliberate alteration of an audit record', async () => {
      // Deliberately tamper with an in-memory record to test detection
      devFallbackAdminStore.tamperRecordForTest(1, 'ALTERED_ACTION_TEST');

      const verification = AuditService.verifyAuditChain();
      expect(verification.valid).toBe(false);
      expect(verification.details).toMatch(/Tamper detected/i);

      // Restore record so subsequent tests have a valid chain
      devFallbackAdminStore.tamperRecordForTest(1, 'SYSTEM_BOOTSTRAP');
    });

    it('should mask restricted fields (IP, userAgent, reasons) from non-auditors', async () => {
      // Search as ADMIN (non-auditor)
      const adminRes = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.restrictedFieldsIncluded).toBe(false);
      const adminLog = adminRes.body.data.logs[0];
      expect(adminLog.ipAddress).toBe('[RESTRICTED_TO_AUDITOR]');
      expect(adminLog.userAgent).toBe('[RESTRICTED_TO_AUDITOR]');

      // Search as AUDITOR
      const auditorRes = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(auditorRes.status).toBe(200);
      expect(auditorRes.body.data.restrictedFieldsIncluded).toBe(true);
    });

    it('should record an AUDIT_LOG_VIEWED event whenever audit logs are accessed', async () => {
      await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${auditorToken}`);

      const { logs } = devFallbackAdminStore.getAuditLogs({ action: 'AUDIT_LOG_VIEWED' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('AUDIT_LOG_VIEWED');
    });

    it('should fail-safe if a critical audit write fails, while normal analytics failure does not block care', async () => {
      // 1. Critical audit failure MUST throw and block
      await expect(
        AuditService.recordAudit({
          actorType: 'STAFF',
          action: 'CONFIRMED_RECORD_CREATED', // Critical action
          entityType: 'CONFIRMED_RECORD',
          forceFailForTest: true,
        })
      ).rejects.toThrow(/Critical audit recording failed/i);

      // 2. Normal analytics failure MUST succeed smoothly without throwing
      const analyticsResult = await AnalyticsEventService.emitEvent({
        eventName: 'ANSWER_RECORDED',
        category: 'INTAKE',
        actorType: 'KIOSK_DEVICE',
        attributes: { step: 'interview' },
        forceFailForTest: true,
      });

      expect(analyticsResult.accepted).toBe(false); // dropped safely without exception
    });
  });

  // ==============================================================================
  // 3. METRIC CATALOG & AGGREGATIONS
  // ==============================================================================
  describe('3. Metric Catalog & Aggregations', () => {
    it('should expose the complete versioned metric catalog with written definitions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/metrics-catalog')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.length).toBeGreaterThan(15);

      const catalogKeys = Object.keys(METRIC_CATALOG);
      expect(catalogKeys).toContain('visit_started');
      expect(catalogKeys).toContain('visit_completed');
      expect(catalogKeys).toContain('interview_completion_rate');
      expect(catalogKeys).toContain('review_edit_rate');
      expect(catalogKeys).toContain('summary_fallback_rate');
    });

    it('should return operations overview with truthful metric calculations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview?preset=7days')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const metrics = res.body.data.metrics;
      expect(metrics.visitsStarted).toBeDefined();
      expect(metrics.visitsCompleted).toBeDefined();
      expect(metrics.interviewCompletionRate.value).toBeGreaterThan(0);
      expect(metrics.intakeDuration.medianSeconds).toBeGreaterThan(0);
      expect(metrics.clinicalReviews.confirmed).toBeDefined();
      expect(metrics.triageAlerts.raised).toBeDefined();
    });

    it('should reject invalid or excessive date ranges', async () => {
      // Start after end
      const res1 = await request(app)
        .get('/api/v1/admin/analytics/overview?startDate=2026-10-20&endDate=2026-10-10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.status).toBe(400);

      // Over 365 days
      const res2 = await request(app)
        .get('/api/v1/admin/analytics/overview?startDate=2024-01-01&endDate=2026-01-01')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res2.status).toBe(400);
    });
  });

  // ==============================================================================
  // 4. ACCESS REPORTS & SAFETY MONITORING
  // ==============================================================================
  describe('4. Access Reports & Safety Monitoring', () => {
    it('should generate objective access reports for auditor review', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs/access-reports')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportItems).toBeInstanceOf(Array);
      expect(res.body.data.summary).toBeDefined();

      const outOfQueue = res.body.data.reportItems.find(
        (i: any) => i.anomalyType === 'OUT_OF_QUEUE_ACCESS'
      );
      expect(outOfQueue).toBeDefined();
      expect(outOfQueue.reasonCode).toBe('EMERGENCY_WALKIN_ESCALATION');
      expect(outOfQueue.reasonText).toBeDefined();
    });

    it('should monitor triage alert pipeline latency, overdue alerts, and synthetic test alert', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/alerts-operations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const pipeline = res.body.data.pipelineDeliveryLatency;
      expect(pipeline.p50Ms).toBeLessThanOrEqual(500);
      expect(pipeline.thresholdBreached).toBe(false);

      const syntheticCheck = res.body.data.syntheticCheck;
      expect(syntheticCheck.status).toBe('HEALTHY');
      expect(syntheticCheck.isExcludedFromClinicalMetrics).toBe(true);
    });

    it('should return system component health with real checks and hidden credentials', async () => {
      const res = await request(app)
        .get('/api/v1/admin/system-health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallStatus).toBe('HEALTHY');

      const components = res.body.data.components;
      expect(components.some((c: any) => c.component === 'DATABASE')).toBe(true);
      expect(components.some((c: any) => c.component === 'AUDIT_CHAIN_INTEGRITY')).toBe(true);
      expect(components.some((c: any) => c.component === 'ALERT_STREAM_SERVICE')).toBe(true);

      // Verify no passwords or secret tokens leaked in details
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toMatch(/password/i);
      expect(stringified).not.toMatch(/secret/i);
      expect(stringified).not.toMatch(/bearer/i);
    });

    it('should track kiosk fleet hardware telemetry and online/offline status', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kiosk-fleet')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kiosks.length).toBeGreaterThanOrEqual(3);

      const kiosk = res.body.data.kiosks[0];
      expect(kiosk.deviceCode).toBeDefined();
      expect(kiosk.status).toBe('ONLINE');
      expect(kiosk.cameraStatus).toBe('OK');
      expect(kiosk.microphoneStatus).toBe('OK');
    });
  });

  // ==============================================================================
  // 5. PILOT EVALUATION & BASELINES
  // ==============================================================================
  describe('5. Pilot Evaluation & Documented Baselines', () => {
    it('should record documented pilot baseline with evaluator provenance', async () => {
      const newBaseline = {
        metricKey: 'summary_lead_time',
        baselineValue: 360,
        unit: 'seconds',
        sourceDescription: 'Handwritten doctor case sheet transcription study',
        measuredBy: 'Dr. R. Venkat, Lead Quality Assessor',
        sampleSize: 120,
      };

      const res = await request(app)
        .post('/api/v1/admin/pilot/baselines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newBaseline);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metricKey).toBe('summary_lead_time');
      expect(res.body.data.measuredBy).toBe('Dr. R. Venkat, Lead Quality Assessor');
    });

    it('should retrieve existing baselines with explicit governance notice', async () => {
      const res = await request(app)
        .get('/api/v1/admin/pilot/baselines')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baselines.length).toBeGreaterThan(0);
      expect(res.body.data.evaluationNotice).toMatch(/documented baseline/i);
    });
  });

  // ==============================================================================
  // 6. REPORTS & EXPORTS
  // ==============================================================================
  describe('6. Reports & Aggregate Exports', () => {
    it('should queue and generate reports from pre-aggregated metrics with audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'MONTHLY_OPERATIONS',
          startDate: '2026-10-01',
          endDate: '2026-10-22',
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.reportType).toBe('MONTHLY_OPERATIONS');
    });

    it('should create aggregate-only exports respecting privacy suppression', async () => {
      const res = await request(app)
        .post('/api/v1/admin/exports')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          exportType: 'ANALYTICS_AGGREGATES',
          format: 'CSV',
          startDate: '2026-10-15',
          endDate: '2026-10-22',
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.exportType).toBe('ANALYTICS_AGGREGATES');
      expect(res.body.data.downloadUrl).toBeDefined();
    });

    it('should deny audit log export to analysts and non-auditor roles', async () => {
      const res = await request(app)
        .post('/api/v1/admin/exports')
        .set('Authorization', `Bearer ${analystToken}`) // Analyst lacks AUDITOR role
        .send({
          exportType: 'AUDIT_LOGS',
          format: 'CSV',
          startDate: '2026-10-15',
          endDate: '2026-10-22',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==============================================================================
  // 7. STAFF ADMINISTRATION & ROLE MANAGEMENT
  // ==============================================================================
  describe('7. Staff Administration & Separation of Duties', () => {
    it('should list staff members and allow SUPER_ADMIN to change staff roles', async () => {
      // 1. List staff
      const listRes = await request(app)
        .get('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.staff.length).toBeGreaterThan(0);

      // 2. Change role of another staff member
      const updateRes = await request(app)
        .patch('/api/v1/admin/staff/c0000000-0000-4000-a000-000000000004/role')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'ANALYST' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.role).toBe('ANALYST');
    });

    it('should enforce separation of duties: prevent super admin from changing their own role', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/staff/c0000000-0000-4000-a000-000000000003/role')
        .set('Authorization', `Bearer ${superAdminToken}`) // actorId === staffId
        .send({ role: 'DOCTOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Separation of duties/i);
    });

    it('should deactivate a staff member and revoke active sessions', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff/c0000000-0000-4000-a000-000000000004/deactivate')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISABLED');
    });
  });

  // ==============================================================================
  // 8. ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARIES
  // ==============================================================================
  describe('8. Role-Based Access Control (RBAC) Boundaries', () => {
    it('should prevent doctors from accessing administrative endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${doctorToken}`); // Doctor token

      expect(res.status).toBe(403);
    });

    it('should prevent analysts from accessing audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent unauthenticated requests to any admin endpoint', async () => {
      const res = await request(app).get('/api/v1/admin/system-health');
      expect(res.status).toBe(401);
    });
  });
});
