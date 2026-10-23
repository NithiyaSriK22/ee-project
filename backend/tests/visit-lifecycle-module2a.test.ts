import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { UserRoles } from '../src/types/auth.types.js';
import {
  VisitStateMachine,
  VisitService,
  MasterDataService,
  TokenService,
  CanonicalEventBus,
  IdentitySafetyService,
  VisitOrchestratorService,
} from '../src/modules/visit-lifecycle/index.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../src/errors/app-error.js';

describe('MODULE 2A — VISIT LIFECYCLE, PATIENT IDENTITY SAFETY, MASTER DATA & EVENT ORCHESTRATION', () => {
  const app = createApp();

  const adminToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000010',
    email: 'ops.admin@hospital.org',
    role: UserRoles.ADMIN,
    fullName: 'Operations Administrator',
  });

  const staffToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000004',
    email: 'staff@medikiosk.hospital',
    role: UserRoles.STAFF_ATTENDANT,
    fullName: 'OPD Staff Attendant',
  });

  beforeEach(() => {
    TokenService.resetSequences();
    CanonicalEventBus.resetState();
    IdentitySafetyService.resetState();
    VisitOrchestratorService.resetState();
    VisitService.resetState();
    VisitOrchestratorService.initialize();
  });

  // ---------------------------------------------------------------------------
  // 1. Visit State Machine
  // ---------------------------------------------------------------------------
  describe('1. Visit State Machine & Transitions', () => {
    it('should permit valid forward transitions along the clinical intake path', () => {
      expect(VisitStateMachine.canTransition('CREATED', 'CHECKED_IN')).toBe(true);
      expect(VisitStateMachine.canTransition('CHECKED_IN', 'INTAKE_IN_PROGRESS')).toBe(true);
      expect(VisitStateMachine.canTransition('INTAKE_IN_PROGRESS', 'INTAKE_COMPLETE')).toBe(true);
      expect(VisitStateMachine.canTransition('INTAKE_COMPLETE', 'READY_FOR_REVIEW')).toBe(true);
      expect(VisitStateMachine.canTransition('READY_FOR_REVIEW', 'IN_CONSULTATION')).toBe(true);
      expect(VisitStateMachine.canTransition('IN_CONSULTATION', 'COMPLETED')).toBe(true);
    });

    it('should reject invalid state skips and illegal transitions with ValidationError', () => {
      // Cannot jump from CREATED straight to COMPLETED or READY_FOR_REVIEW
      expect(() =>
        VisitStateMachine.validateTransition('vis-test-01', 'CREATED', 'COMPLETED')
      ).toThrow(ValidationError);

      expect(() =>
        VisitStateMachine.validateTransition('vis-test-01', 'CHECKED_IN', 'READY_FOR_REVIEW')
      ).toThrow(ValidationError);

      // Terminal state COMPLETED cannot transition to anything
      expect(() =>
        VisitStateMachine.validateTransition('vis-test-01', 'COMPLETED', 'INTAKE_IN_PROGRESS')
      ).toThrow(ValidationError);
    });

    it('should correctly identify terminal visit states', () => {
      expect(VisitStateMachine.isTerminal('COMPLETED')).toBe(true);
      expect(VisitStateMachine.isTerminal('CANCELLED')).toBe(true);
      expect(VisitStateMachine.isTerminal('INTAKE_ABANDONED')).toBe(true);
      expect(VisitStateMachine.isTerminal('EXPIRED')).toBe(true);
      expect(VisitStateMachine.isTerminal('NO_SHOW')).toBe(true);
      expect(VisitStateMachine.isTerminal('READY_FOR_REVIEW')).toBe(false);
      expect(VisitStateMachine.isTerminal('INTAKE_IN_PROGRESS')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Identity Safety: 2nd Factor Lookup & Anti-Enumeration Lockout
  // ---------------------------------------------------------------------------
  describe('2. Patient Identity Safety & Anti-Enumeration', () => {
    it('should reject returning patient lookup without leaking stored data if 2nd factor fails', () => {
      // Known reg number: MK-2026-100201 (Aarav Sharma, DOB 1985-06-15)
      // Provide wrong DOB
      expect(() =>
        IdentitySafetyService.verifyReturningPatient({
          hospitalRegistrationNumber: 'MK-2026-100201',
          secondFactor: { dateOfBirth: '1999-01-01' },
          deviceCode: 'KIOSK-DEV-01',
        })
      ).toThrow('Patient identification could not be verified');
    });

    it('should lock out device after 3 consecutive failed lookups to prevent enumeration attacks', () => {
      const device = 'KIOSK-ATTACK-01';

      // 1st failure
      expect(() =>
        IdentitySafetyService.verifyReturningPatient({
          hospitalRegistrationNumber: 'MK-2026-UNKNOWN-1',
          secondFactor: { dateOfBirth: '1990-01-01' },
          deviceCode: device,
        })
      ).toThrow();

      // 2nd failure
      expect(() =>
        IdentitySafetyService.verifyReturningPatient({
          hospitalRegistrationNumber: 'MK-2026-UNKNOWN-2',
          secondFactor: { dateOfBirth: '1990-01-01' },
          deviceCode: device,
        })
      ).toThrow();

      // 3rd failure
      expect(() =>
        IdentitySafetyService.verifyReturningPatient({
          hospitalRegistrationNumber: 'MK-2026-UNKNOWN-3',
          secondFactor: { dateOfBirth: '1990-01-01' },
          deviceCode: device,
        })
      ).toThrow();

      // 4th attempt: Should be locked out with UnauthorizedError
      expect(() =>
        IdentitySafetyService.verifyReturningPatient({
          hospitalRegistrationNumber: 'MK-2026-100201',
          secondFactor: { dateOfBirth: '1985-06-15' }, // even with correct credentials!
          deviceCode: device,
        })
      ).toThrow(/locked out/i);
    });

    it('should successfully verify patient with valid 2nd factor and return minimal masked confirmation', () => {
      const result = IdentitySafetyService.verifyReturningPatient({
        hospitalRegistrationNumber: 'MK-2026-100201',
        secondFactor: { dateOfBirth: '1985-06-15' },
        deviceCode: 'KIOSK-SAFE-01',
      });

      expect(result.verified).toBe(true);
      expect(result.patientId).toBe('pat_demo_001');
      // Name masked e.g. "A**** S*****"
      expect(result.minimalNameConfirmation).toContain('A');
      expect(result.minimalNameConfirmation).toContain('*');
      expect(result.minimalNameConfirmation).not.toBe('Aarav Sharma'); // Never unmasked
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Duplicate Detection & Provisional Identity
  // ---------------------------------------------------------------------------
  describe('3. Duplicate Detection & Provisional Identity State', () => {
    it('should flag potential duplicates on new registration without auto-merging', () => {
      // pat_demo_001 contact is +919876543210
      const dupCheck = IdentitySafetyService.detectPotentialDuplicates({
        fullName: 'Aarav Sharma',
        contactNumber: '+91 98765 43210',
      });

      expect(dupCheck.hasPotentialDuplicate).toBe(true);
      expect(dupCheck.matches.length).toBeGreaterThan(0);
      expect(dupCheck.matches[0].patientId).toBe('pat_demo_001');
    });

    it('should register kiosk-created patient as PROVISIONAL and allow staff reconciliation', async () => {
      const reg = IdentitySafetyService.registerPatient({
        fullName: 'Devika Patel',
        gender: 'FEMALE',
        contactNumber: '+919988776655',
        source: 'KIOSK',
      });

      expect(reg.identity_state).toBe('PROVISIONAL');
      expect(reg.hospital_registration_number.startsWith('PROV-')).toBe(true);

      // Reconcile by staff
      const reconciled = IdentitySafetyService.reconcileProvisionalPatient(
        reg.id,
        'MK-2026-554433',
        'staff_nurse_01'
      );

      expect(reconciled.identity_state).toBe('CONFIRMED');
      expect(reconciled.hospital_registration_number).toBe('MK-2026-554433');
    });

    it('should merge patients, re-point references, and allow reversal within window', async () => {
      const p1 = IdentitySafetyService.registerPatient({
        fullName: 'Karan Mehra',
        gender: 'MALE',
        contactNumber: '+919111222333',
        source: 'KIOSK',
      });

      const p2 = IdentitySafetyService.registerPatient({
        fullName: 'Karan Mehra',
        gender: 'MALE',
        contactNumber: '+919111222333',
        source: 'STAFF_DESK',
      });

      // Merge p1 into p2
      const mergeRecord = await VisitService.mergePatients(p1.id, p2.id, 'Duplicate registration at kiosk', 'admin-01');
      expect(mergeRecord.status).toBe('ACTIVE');

      const p1Updated = (IdentitySafetyService as any).patientDirectory.get(p1.id);
      expect(p1Updated.status).toBe('MERGED');
      expect(p1Updated.merged_into_id).toBe(p2.id);

      // Reverse merge
      const reversed = IdentitySafetyService.reverseMerge(mergeRecord.id, 'Mistaken identity review', 'admin-01');
      expect(reversed.status).toBe('REVERSED');
      expect(p1Updated.status).toBe('ACTIVE');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Token Generator & Concurrency
  // ---------------------------------------------------------------------------
  describe('4. Token Number Concurrency & Slips', () => {
    it('should generate sequential, collision-free tokens for a department on the same date', () => {
      const tokens: string[] = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(TokenService.generateDailyToken('GENMED'));
      }

      expect(tokens[0]).toBe('GENMED-001');
      expect(tokens[1]).toBe('GENMED-002');
      expect(tokens[9]).toBe('GENMED-010');
      // Set size equals 10 means all are unique
      expect(new Set(tokens).size).toBe(10);
    });

    it('should format a token slip without any clinical symptoms or complaints', () => {
      const dept = MasterDataService.getDepartmentByCode('GENMED')!;
      const visit: any = {
        id: 'vis-101',
        token_number: 'GENMED-042',
        opened_at: new Date(),
      };

      const slip = TokenService.generateTokenSlip(visit, dept, 'Rahul Dravid');

      expect(slip.tokenNumber).toBe('GENMED-042');
      expect(slip.departmentName).toBe('General Medicine');
      expect(slip.patientNameMinimal).toBe('Rahul D***');
      // Slip should never contain clinical diagnosis or symptoms
      expect((slip as any).symptoms).toBeUndefined();
      expect((slip as any).chiefComplaint).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Two-Kiosk Conflict Handling & Resumed Visits
  // ---------------------------------------------------------------------------
  describe('5. Two-Kiosk Conflict & Visit Resumption', () => {
    it('should block a second kiosk from opening intake for an already active patient', () => {
      IdentitySafetyService.acquireKioskLock('pat_101', 'KIOSK-01', 'vis_101');

      // Second kiosk attempts to acquire lock
      expect(() =>
        IdentitySafetyService.acquireKioskLock('pat_101', 'KIOSK-02', 'vis_102')
      ).toThrow(ConflictError);
    });

    it('should resume existing active visit if patient starts again on same department today', async () => {
      const start1 = await VisitService.startKioskVisit({
        departmentCode: 'GENMED',
        hospitalRegistrationNumber: 'MK-2026-100201',
        secondFactor: { dateOfBirth: '1985-06-15' },
        kioskDeviceId: 'KIOSK-01',
      });

      expect(start1.isResumed).toBe(false);

      // Patient comes back to same kiosk
      const start2 = await VisitService.startKioskVisit({
        departmentCode: 'GENMED',
        hospitalRegistrationNumber: 'MK-2026-100201',
        secondFactor: { dateOfBirth: '1985-06-15' },
        kioskDeviceId: 'KIOSK-01',
      });

      expect(start2.isResumed).toBe(true);
      expect(start2.visit.id).toBe(start1.visit.id);
      expect(start2.visit.token_number).toBe(start1.visit.token_number);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Canonical Event Bus & Transactional Outbox
  // ---------------------------------------------------------------------------
  describe('6. Canonical Event Bus, Deduplication & DLQ Replay', () => {
    it('should publish events through outbox and deduplicate identical events for consumers', async () => {
      let consumerCallCount = 0;

      CanonicalEventBus.subscribe('VISIT_CREATED', async () => {
        consumerCallCount++;
      });

      const event = CanonicalEventBus.createEvent('VISIT_CREATED', 'vis_101', 'pat_101', {
        tokenNumber: 'GENMED-001',
      });

      await CanonicalEventBus.publish(event);
      expect(consumerCallCount).toBe(1);

      // Re-publishing the exact same event object (same eventId) should be deduplicated
      await (CanonicalEventBus as any).deliverMessage({
        id: 'out_dup_01',
        eventId: event.eventId,
        eventName: event.eventName,
        visitId: event.visitId,
        payload: event,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
      });

      expect(consumerCallCount).toBe(1); // Not incremented!
    });

    it('should route failing events to DLQ after 3 retries and permit admin replay', async () => {
      let attempts = 0;
      CanonicalEventBus.subscribe('SUMMARY_FAILED', async () => {
        attempts++;
        if (attempts <= 3) {
          throw new Error('Simulated inference worker crash');
        }
      });

      const event = CanonicalEventBus.createEvent('SUMMARY_FAILED', 'vis_err_01', 'pat_01', {
        error: 'Timeout',
      });

      await CanonicalEventBus.publish(event);

      const dlq = CanonicalEventBus.getDeadLetterQueue();
      expect(dlq.length).toBeGreaterThan(0);
      expect(dlq[0].eventId).toBe(event.eventId);
      expect(dlq[0].status).toBe('DEAD_LETTER');

      // Replay DLQ message as Admin
      const replayed = await CanonicalEventBus.replayDeadLetterEvent(dlq[0].id, 'admin-tester');
      expect(replayed).toBe(true);
      expect(CanonicalEventBus.getDeadLetterQueue().length).toBe(0); // Cleared from DLQ
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Orchestrator Event-Driven Lifecycle Derivation & Stuck Detection
  // ---------------------------------------------------------------------------
  describe('7. Event-Driven Orchestration & Stuck-Visit Detection', () => {
    it('should derive visit status from interview and document events and trigger summary', async () => {
      const visitRes = await VisitService.startKioskVisit({
        departmentCode: 'GENMED',
        hospitalRegistrationNumber: 'MK-2026-100201',
        secondFactor: { dateOfBirth: '1985-06-15' },
      });

      const visitId = visitRes.visit.id;
      const patientId = visitRes.visit.patient_id;

      // Event 1: Answer recorded -> INTAKE_IN_PROGRESS
      const ansEvent = CanonicalEventBus.createEvent('INTERVIEW_ANSWER_RECORDED', visitId, patientId, {
        questionId: 'q-symptom-01',
        answerId: 'ans-01',
      });
      await CanonicalEventBus.publish(ansEvent);

      let currentVisit = VisitOrchestratorService.getVisit(visitId);
      expect(currentVisit?.status).toBe('INTAKE_IN_PROGRESS');

      // Event 2: Document uploaded -> Document pending
      const docUploadEvent = CanonicalEventBus.createEvent('DOCUMENT_UPLOADED', visitId, patientId, {
        documentId: 'doc-rx-01',
      });
      await CanonicalEventBus.publish(docUploadEvent);

      // Event 3: Interview completes while doc is still validating
      const interviewCompEvent = CanonicalEventBus.createEvent('INTERVIEW_COMPLETED', visitId, patientId, {
        templateId: 'tmpl-genmed-01',
      });
      await CanonicalEventBus.publish(interviewCompEvent);

      // Should still be waiting for document
      currentVisit = VisitOrchestratorService.getVisit(visitId);
      expect(currentVisit?.status).toBe('INTAKE_IN_PROGRESS');

      // Event 4: Document validates -> Transitions to READY_FOR_REVIEW and publishes SUMMARY_REQUESTED
      let summaryRequestedFired = false;
      CanonicalEventBus.subscribe('SUMMARY_REQUESTED', async (e) => {
        if (e.visitId === visitId) summaryRequestedFired = true;
      });

      const docValEvent = CanonicalEventBus.createEvent('DOCUMENT_VALIDATED', visitId, patientId, {
        documentId: 'doc-rx-01',
        validationResult: 'FULLY_VERIFIED',
      });
      await CanonicalEventBus.publish(docValEvent);

      currentVisit = VisitOrchestratorService.getVisit(visitId);
      expect(currentVisit?.status).toBe('READY_FOR_REVIEW');
      expect(summaryRequestedFired).toBe(true);

      // Event 5: Doctor opens workspace -> IN_CONSULTATION
      const reviewStartEvent = CanonicalEventBus.createEvent('REVIEW_STARTED', visitId, patientId, {
        reviewId: 'rev-01',
        doctorId: 'doc-01',
      });
      await CanonicalEventBus.publish(reviewStartEvent);

      currentVisit = VisitOrchestratorService.getVisit(visitId);
      expect(currentVisit?.status).toBe('IN_CONSULTATION');

      // Event 6: Doctor confirms record -> COMPLETED
      const confirmedEvent = CanonicalEventBus.createEvent('RECORD_CONFIRMED', visitId, patientId, {
        recordId: 'rec-01',
        version: 1,
        doctorId: 'doc-01',
      });
      await CanonicalEventBus.publish(confirmedEvent);

      currentVisit = VisitOrchestratorService.getVisit(visitId);
      expect(currentVisit?.status).toBe('COMPLETED');
    });

    it('should detect visits stuck in intake beyond 45 minutes and alert staff', () => {
      const pastDate = new Date(Date.now() - 50 * 60 * 1000); // 50 mins ago
      const stuckVisit: any = {
        id: 'vis_stuck_01',
        patient_id: 'pat_01',
        token_number: 'GENMED-099',
        status: 'INTAKE_IN_PROGRESS',
        updated_at: pastDate,
      };

      VisitOrchestratorService.registerVisit(stuckVisit);

      const stuckList = VisitOrchestratorService.detectStuckVisits();
      expect(stuckList.length).toBe(1);
      expect(stuckList[0].visitId).toBe('vis_stuck_01');
      expect(stuckList[0].durationMinutes).toBeGreaterThanOrEqual(45);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Wrong-Patient Quarantine & Doctor Notification
  // ---------------------------------------------------------------------------
  describe('8. Wrong-Patient Quarantine Procedure', () => {
    it('should quarantine a visit, cancel its status, and record audit notification trail', async () => {
      const startRes = await VisitService.startKioskVisit({
        departmentCode: 'GENMED',
        hospitalRegistrationNumber: 'MK-2026-100201',
        secondFactor: { dateOfBirth: '1985-06-15' },
      });

      const visitId = startRes.visit.id;

      const qResult = await VisitService.quarantineWrongPatientVisit(
        visitId,
        'Patient selected wrong identity at check-in',
        'supervising_nurse_01'
      );

      expect(qResult.quarantined).toBe(true);

      const visit = VisitService.getVisitById(visitId);
      expect(visit?.status).toBe('CANCELLED');
      expect(visit?.is_quarantined).toBe(true);
      expect(visit?.quarantine_reason).toContain('wrong identity');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. HTTP API Endpoints Integration
  // ---------------------------------------------------------------------------
  describe('9. Module 2A HTTP API Routes', () => {
    it('POST /api/v1/kiosk/visits/start should start a new visit and issue token slip', async () => {
      const res = await request(app)
        .post('/api/v1/kiosk/visits/start')
        .send({
          departmentCode: 'GENMED',
          newPatient: {
            fullName: 'Sunil Gavaskar',
            gender: 'MALE',
            contactNumber: '+919876500000',
            dateOfBirth: '1949-07-10',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.visit.token_number).toMatch(/^GENMED-\d{3}$/);
      expect(res.body.data.tokenSlip.patientNameMinimal).toBe('Sunil G***');
    });

    it('GET /api/v1/desk/visits should list desk queue without exposing clinical text', async () => {
      const res = await request(app)
        .get('/api/v1/desk/visits')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item.tokenNumber).toBeDefined();
        expect(item.status).toBeDefined();
        // Clinical details must never be exposed on desk queue
        expect(item.symptoms).toBeUndefined();
        expect(item.clinicalSummary).toBeUndefined();
      }
    });

    it('GET /api/v1/admin/departments should return master departments list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((d: any) => d.code === 'GENMED')).toBe(true);
    });
  });
});
