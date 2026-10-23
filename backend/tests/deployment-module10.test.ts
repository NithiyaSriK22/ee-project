import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { FeatureFlagsService } from '../src/modules/deployment/feature-flags.service.js';
import { ReleaseGatesService } from '../src/modules/deployment/release-gates.service.js';
import { KioskHardeningService } from '../src/modules/deployment/kiosk-hardening.service.js';
import { RestoreDrillService } from '../src/modules/deployment/restore-drill.service.js';
import { devFallbackAdminStore } from '../src/modules/admin/dev-fallback-admin-store.js';

const app = createApp();

describe('MODULE 10 — PRODUCTION DEPLOYMENT, SECURITY, CLINICAL SAFETY RELEASE & PILOT READINESS', { timeout: 20000 }, () => {

  let adminToken: string;
  let doctorToken: string;

  beforeEach(() => {
    adminToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000010',
      email: 'ops.admin@hospital.gov.in',
      fullName: 'Hospital Ops Administrator',
      role: 'ADMIN',
      department: 'Hospital IT Operations',
      status: 'ACTIVE',
    });

    doctorToken = TokenUtil.generateStaffAccessToken({
      sub: 'c0000000-0000-4000-a000-000000000002',
      email: 'dr.ananya@hospital.gov.in',
      fullName: 'Dr. Ananya Sharma',
      role: 'DOCTOR',
      department: 'General OPD',
      status: 'ACTIVE',
    });

    // Ensure intake pause is clear before each test
    FeatureFlagsService.setGlobalIntakePause(false, { id: 'test-admin', role: 'ADMIN' }, 'Test setup');
  });

  describe('1. Cross-Patient Isolation & Security Enforcement', () => {
    it('should strictly isolate sessions so Patient A cannot view Patient B data', async () => {

      // 1. Generate Token for Patient A
      const tokenA = TokenUtil.generateKioskSessionToken({
        sessionId: 'sess-patient-a-01',
        visitId: 'visit-iso-patient-a',
        patientId: 'pat-patient-a',
      }).token;

      // 2. Generate Token for Patient B
      const tokenB = TokenUtil.generateKioskSessionToken({
        sessionId: 'sess-patient-b-02',
        visitId: 'visit-iso-patient-b',
        patientId: 'pat-patient-b',
      }).token;

      // 3. Verify Token A retrieves Patient A session me
      const meARes = await request(app)
        .get('/api/v1/kiosk/session/me')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(meARes.status).toBe(200);
      expect(meARes.body.data.session.visitId).toBe('visit-iso-patient-a');

      // 4. Verify Token B retrieves Patient B session me
      const meBRes = await request(app)
        .get('/api/v1/kiosk/session/me')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(meBRes.status).toBe(200);
      expect(meBRes.body.data.session.visitId).toBe('visit-iso-patient-b');

      // 5. Attempt Cross-Patient Access: Patient A cannot query Patient B visits or documents
      const crossDocRes = await request(app)
        .get('/api/v1/kiosk/documents/visit/visit-iso-patient-b')
        .set('Authorization', `Bearer ${tokenA}`);
      expect([401, 403, 404]).toContain(crossDocRes.status);
    });

    it('should inject modern hardening headers: CSP, HSTS, X-Frame-Options, Permissions-Policy', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);


      // Verify strict security headers
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['permissions-policy']).toContain('camera=(self)');
      expect(res.headers['permissions-policy']).toContain('microphone=(self)');
    });
  });


  describe('2. Server-Controlled Kill Switches & Feature Flags', () => {
    it('should list all feature flags and verify clinical safety metadata', async () => {
      const res = await request(app).get('/api/v1/deployment/flags');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const flags = res.body.data;
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBeGreaterThanOrEqual(8);

      const summarizationFlag = flags.find((f: any) => f.key === 'AI_SUMMARIZATION_ENABLED');
      expect(summarizationFlag).toBeDefined();
      expect(summarizationFlag.effectWhenOff).toContain('fallback');

      const ocrFlag = flags.find((f: any) => f.key === 'OCR_ENABLED');
      expect(ocrFlag).toBeDefined();

      const intakeFlag = flags.find((f: any) => f.key === 'KIOSK_INTAKE_ENABLED');
      expect(intakeFlag).toBeDefined();
    });

    it('should toggle a feature flag with tamper-evident audit logging', async () => {
      const res = await request(app)
        .patch('/api/v1/deployment/flags/OCR_ENABLED')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: false,
          reason: 'Scheduled maintenance of vision OCR pipeline',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(false);

      // Check that FeatureFlagsService reflects state
      expect(FeatureFlagsService.isFlagEnabled('OCR_ENABLED')).toBe(false);

      // Reset back to true for other tests
      FeatureFlagsService.updateFlag(
        'OCR_ENABLED',
        true,
        { id: 'ops-admin', role: 'ADMIN' },
        'Restoring OCR enabled'
      );
      expect(FeatureFlagsService.isFlagEnabled('OCR_ENABLED')).toBe(true);
    });

    it('should prevent unauthorized users from changing feature flags', async () => {
      const res = await request(app)
        .patch('/api/v1/deployment/flags/AI_SUMMARIZATION_ENABLED')
        .send({ enabled: false, reason: 'Malicious toggle' });

      expect(res.status).toBe(401);
    });
  });

  describe('3. Global Intake Pause & Emergency Degradation', () => {
    it('should pause intake, blocking new kiosk sessions with 503 and clear human directions', async () => {
      // 1. Activate global intake pause
      const pauseRes = await request(app)
        .post('/api/v1/deployment/intake-pause')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isPaused: true,
          reason: 'Emergency hospital network load shedding in progress',
          estimatedResumeTime: '11:30 AM',
        });

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.isPaused).toBe(true);

      // 2. Attempting to start a new kiosk session must be rejected with 503
      const startRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Emergency Arrival Patient',
          age: 39,
          gender: 'MALE',
          contactNumber: '9988776655',
        });

      expect(startRes.status).toBe(503);
      const errorMsg = startRes.body.error?.message || startRes.body.message || '';
      expect(errorMsg).toContain('reception counter');

      // 3. Crucial Safety Rule: Existing visits can still be reviewed by doctors
      const doctorQueueRes = await request(app)
        .get('/api/v1/doctor/queue')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(doctorQueueRes.status).toBe(200);


      // 4. Emergency help button must NEVER be blocked during intake pause
      const helpRes = await request(app)
        .post('/api/v1/kiosk/help-request')
        .send({
          reason: 'Patient feels severe dizzy spells while waiting at desk',
          triggerType: 'MANUAL',
        });
      expect([200, 201]).toContain(helpRes.status);


      // 5. Resume intake
      const resumeRes = await request(app)
        .post('/api/v1/deployment/intake-pause')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPaused: false, reason: 'Network restored' });
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.isPaused).toBe(false);

      // 6. Starting a new session now succeeds
      const newSessionRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Normal Registration Patient',
          age: 31,
          gender: 'FEMALE',
          contactNumber: '9988776655',
        });
      expect(newSessionRes.status).toBe(201);

    });
  });

  describe('4. Clinical Safety Release Gates Verification', () => {
    it('should evaluate all 10 release gates and report comprehensive results', async () => {
      const res = await request(app).get('/api/v1/deployment/release-gates');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const evaluation = res.body.data;
      expect(evaluation.totalGates).toBe(10);
      expect(evaluation.gates.length).toBe(10);
      expect(evaluation.platformVersion).toBeDefined();

      const expectedGateKeys = [
        'ACTIVE_RED_FLAG_RULES',
        'EVALUATED_SUMMARY_PROMPT',
        'ALL_ENABLED_LANGUAGES_APPROVED',
        'ACTIVE_FORMULARY_VERSION',
        'PUBLISHED_INTERVIEW_TEMPLATE',
        'REVIEW_POLICY_CONFIGURED',
        'AUDIT_HASH_CHAIN_VERIFIED',
        'RESTORE_DRILL_CURRENT',
        'SYNTHETIC_ALERT_CHECK_PASSED',
        'NO_CRITICAL_SECURITY_FINDINGS',
      ];

      for (const expectedKey of expectedGateKeys) {
        const found = evaluation.gates.find((g: any) => g.gateKey === expectedKey);
        expect(found).toBeDefined();
        expect(found.details).toBeDefined();
        expect(found.passed).toBe(true);
      }

      expect(evaluation.overallPassed).toBe(true);
    });

    it('should require clinical lead sign-off and justification for emergency override', async () => {
      // Attempt override without clinical lead approval
      const rejectedRes = await request(app)
        .post('/api/v1/deployment/release-gates/override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          justification: 'Short override reason',
          approvedByClinicalLead: false,
          overrideCode: 'EMERGENCY-2026-DISASTER',
        });
      expect([400, 500]).toContain(rejectedRes.status);

      // Approved override
      const validRes = await request(app)
        .post('/api/v1/deployment/release-gates/override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          justification: 'Emergency deployment authorized by Dr. Chief Medical Officer for mass casualty OPD triage support.',
          approvedByClinicalLead: true,
          overrideCode: 'EMERGENCY-2026-DISASTER',
        });
      expect(validRes.status).toBe(200);
      expect(validRes.body.data.emergencyOverride.isOverridden).toBe(true);
    });
  });

  describe('5. Kiosk Device Hardening & Consecutive Session Wipe Verification', () => {
    it('should verify that a wiped session completely revokes credentials with zero residual leakage', async () => {
      // 1. Session 1 token on KIOSK-OPD-A1
      const token1 = TokenUtil.generateKioskSessionToken({
        sessionId: 'sess-kiosk-wipe-1',
        visitId: 'visit-kiosk-wipe-alpha',
        patientId: 'pat-kiosk-wipe-alpha',
      }).token;

      // Verify token1 works
      const me1Res = await request(app)
        .get('/api/v1/kiosk/session/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(me1Res.status).toBe(200);
      expect(me1Res.body.data.session.visitId).toBe('visit-kiosk-wipe-alpha');

      // 2. Kiosk triggers session wipe on completion, timeout, abandon or reboot
      const wipeRes = await request(app)
        .post('/api/v1/deployment/kiosks/session/wipe')
        .send({
          visitId: 'visit-kiosk-wipe-alpha',
          deviceCode: 'KIOSK-OPD-A1',
          wipeTrigger: 'COMPLETED',
        });
      expect(wipeRes.status).toBe(200);
      expect(wipeRes.body.data.cachesPurged).toBe(true);
      expect(wipeRes.body.data.credentialsRevoked).toBe(true);

      // 3. CRITICAL AUTOMATED TEST: Following request with token1 MUST be 401 Unauthorized
      const postWipeRes = await request(app)
        .get('/api/v1/kiosk/session/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(postWipeRes.status).toBe(401);
      expect(postWipeRes.body.error.message).toContain('wiped');

      // 4. Session 2 on the same kiosk starts cleanly
      const token2 = TokenUtil.generateKioskSessionToken({
        sessionId: 'sess-kiosk-wipe-2',
        visitId: 'visit-kiosk-wipe-beta',
        patientId: 'pat-kiosk-wipe-beta',
      }).token;

      const me2Res = await request(app)
        .get('/api/v1/kiosk/session/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(me2Res.status).toBe(200);
      expect(me2Res.body.data.session.visitId).toBe('visit-kiosk-wipe-beta');
      expect(JSON.stringify(me2Res.body)).not.toContain('visit-kiosk-wipe-alpha');
    });


    it('should enroll and revoke kiosk hardware devices', async () => {
      // Enroll
      const enrollRes = await request(app)
        .post('/api/v1/deployment/kiosks/enroll')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deviceCode: 'KIOSK-EMERGENCY-E1',
          facilityName: 'District Hospital Trauma Ward',
          locationDescription: 'Triage Entrance Bay E',
        });
      expect(enrollRes.status).toBe(201);
      expect(enrollRes.body.data.device.deviceCode).toBe('KIOSK-EMERGENCY-E1');
      expect(enrollRes.body.data.deviceApiKey).toMatch(/^mk_kiosk_/);

      // Revoke
      const revokeRes = await request(app)
        .post('/api/v1/deployment/kiosks/KIOSK-EMERGENCY-E1/revoke')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Hardware maintenance and OS security re-image' });
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.status).toBe('REVOKED');
      expect(KioskHardeningService.isDeviceActive('KIOSK-EMERGENCY-E1')).toBe(false);
    });
  });

  describe('6. Public Downtime Status Board & Alert Pipeline Canary', () => {
    it('should serve an unauthenticated status board with plain-text patient & staff guidance', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);

      const status = res.body.data;
      expect(status.overallStatus).toBeDefined();
      expect(status.intakeActive).toBe(true);
      expect(status.emergencyBanner).toContain('EMERGENCY ADVISORY');
      expect(status.patientGuidance).toBeDefined();
      expect(status.staffGuidance).toBeDefined();

      // Zero Secret Leakage: Ensure no sensitive keys exist in status payload
      const serialized = JSON.stringify(status);
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('postgresql://');
    });

    it('should return alert pipeline health with sub-second delivery verification', async () => {
      const res = await request(app).get('/api/v1/deployment/alert-pipeline/health');
      expect(res.status).toBe(200);
      expect(res.body.data.alertPipelineStatus).toBe('OPERATIONAL');
      expect(res.body.data.p95DeliveryLatencyMs).toBeLessThan(1000); // Latency well within 5s target
    });
  });

  describe('7. Disaster Recovery & Restore Drill Management', () => {
    it('should verify restore drill currency within configured threshold', async () => {
      const res = await request(app).get('/api/v1/deployment/restore-drills');
      expect(res.status).toBe(200);
      expect(res.body.data.currency.current).toBe(true);
      expect(res.body.data.currency.ageDays).toBeLessThanOrEqual(30);
      expect(res.body.data.latest.databaseRestored).toBe(true);
      expect(res.body.data.latest.auditChainValid).toBe(true);
    });

    it('should record a new isolated database restore drill with cryptographic verification', async () => {
      const res = await request(app)
        .post('/api/v1/deployment/restore-drills')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          environment: 'ISOLATED_RECOVERY_ENCLAVE',
          databaseRestored: true,
          auditChainValid: true,
          documentStorageVerified: true,
          applicationBootSuccessful: true,
          rpoActualMinutes: 3.5,
          rtoActualMinutes: 14.2,
          notes: 'Pre-pilot recovery drill rehearsal in isolated staging enclave.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.verifiedHash).toBeDefined();
    });
  });
});
