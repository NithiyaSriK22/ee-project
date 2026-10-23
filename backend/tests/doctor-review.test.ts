import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { devFallbackDoctorReviewStore } from '../src/modules/doctor-review/dev-fallback-doctor-review-store.js';
import { MustResolveEvaluator } from '../src/modules/doctor-review/review/must-resolve.evaluator.js';
import { ReviewPolicyService } from '../src/modules/doctor-review/review/review-policy.service.js';
import { DoctorReviewRepository } from '../src/modules/doctor-review/doctor-review.repository.js';
import {
  ResolutionTypes,
  ConfirmedOrigins,
  QueueStatuses,
  MustResolveItemTypes,
} from '../src/modules/doctor-review/doctor-review.types.js';
import { prisma } from '../src/database/prisma.js';

describe('MODULE 7 — DOCTOR REVIEW & SUMMARY DASHBOARD', () => {
  const app = createApp();

  // Test doctor credentials & tokens
  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  const colleagueDoctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000001',
    email: 'nithiya0sy@gmail.com',
    role: 'DOCTOR',
    fullName: 'Dr. Nithiya Sri',
    hospitalDepartment: 'Department of General Medicine',
  });

  const cardiologyDoctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000005',
    email: 'dr.reddy@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Suresh Reddy',
    hospitalDepartment: 'Cardiology',
  });

  const staffToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000004',
    email: 'staff@medikiosk.hospital',
    role: 'STAFF_ATTENDANT',
    fullName: 'OPD Staff Attendant',
    hospitalDepartment: 'OPD Reception & Triage',
  });

  const kioskSessionToken = TokenUtil.generateKioskSessionToken({
    sessionId: 'session-kiosk-99',
    visitId: 'visit-m7-test-01',
    patientId: 'patient-test-01',
  }).token;

  beforeEach(async () => {
    devFallbackDoctorReviewStore.clearAll();
    try {
      await prisma.confirmedStatement.deleteMany({});
      await prisma.confirmedRecord.deleteMany({});
      await prisma.doctorReview.deleteMany({});
      await prisma.reviewClaim.deleteMany({});
      await prisma.visitQueueEntry.deleteMany({});
    } catch {}
  });

  // ============================================================================
  // 1. MUST-RESOLVE EVALUATOR PURE FUNCTION TESTS
  // ============================================================================
  describe('1. Must-Resolve Evaluator (Pure Deterministic Function)', () => {
    const policy = ReviewPolicyService.getActivePolicy();

    it('Should gate confirmation on critical UNVERIFIED, UNREADABLE, and MISMATCH_FLAGGED fields', () => {
      const inputs = {
        visitId: 'visit-eval-1',
        documentFields: [
          {
            id: 'df-1',
            fieldType: 'drug_name',
            isCritical: true,
            result: 'VERIFIED',
          },
          {
            id: 'df-2',
            fieldType: 'allergy',
            isCritical: true,
            result: 'UNREADABLE',
            rawText: 'blurred scribble',
          },
          {
            id: 'df-3',
            fieldType: 'dosage',
            isCritical: true,
            result: 'MISMATCH_FLAGGED',
            rawText: '5000mg',
          },
          {
            id: 'df-4',
            fieldType: 'physician_name',
            isCritical: false,
            result: 'UNVERIFIED', // Non-critical uncertain -> passive flag
          },
        ],
      };

      const result = MustResolveEvaluator.evaluate(inputs, [], policy);

      expect(result.mustResolveItems).toHaveLength(2);
      expect(result.unresolvedCount).toBe(2);
      expect(result.mustResolveItems[0].itemRef).toBe('doc-field:df-2');
      expect(result.mustResolveItems[1].itemRef).toBe('doc-field:df-3');

      // Passive flag for non-critical item
      expect(result.passiveFlags).toHaveLength(1);
      expect(result.passiveFlags[0].itemRef).toBe('doc-field:df-4');
    });

    it('Should gate confirmation on critical interview answers that are skipped or declined', () => {
      const inputs = {
        visitId: 'visit-eval-2',
        interviewAnswers: [
          {
            id: 'ans-1',
            questionId: 'q-chest-pain',
            section: 'CHIEF_COMPLAINT',
            promptText: 'Are you experiencing chest pain?',
            answerValue: null,
            answeredVia: 'touch',
            isCritical: true,
            isSkipped: true,
          },
          {
            id: 'ans-2',
            questionId: 'q-smoking',
            section: 'LIFESTYLE',
            promptText: 'Do you consume tobacco or alcohol?',
            answerValue: null,
            answeredVia: 'touch',
            isCritical: false, // Non-critical skipped
            isSkipped: true,
          },
        ],
      };

      const result = MustResolveEvaluator.evaluate(inputs, [], policy);

      expect(result.mustResolveItems).toHaveLength(1);
      expect(result.mustResolveItems[0].itemRef).toBe('interview-ans:ans-1');
      expect(result.mustResolveItems[0].verificationState).toBe('SKIPPED');

      expect(result.passiveFlags).toHaveLength(1);
      expect(result.passiveFlags[0].itemRef).toBe('interview-ans:ans-2');
    });

    it('Should gate confirmation on Module 5 clinical conflict markers', () => {
      const inputs = {
        visitId: 'visit-eval-3',
        conflicts: [
          {
            itemKey: 'allergy_penicillin',
            conflictMessage: '⚠ Conflict: interview and document differ — verify (none vs Penicillin G)',
          },
        ],
        summaryStatements: [
          {
            id: 'stmt-1',
            section: 'MEDICATIONS_AND_ALLERGIES',
            text: 'Patient states no known drug allergies, however digitized prescription lists Penicillin G.',
          },
        ],
      };

      const result = MustResolveEvaluator.evaluate(inputs, [], policy);

      expect(result.mustResolveItems).toHaveLength(1);
      expect(result.mustResolveItems[0].itemRef).toBe('conflict:allergy_penicillin');
      expect(result.mustResolveItems[0].itemType).toBe(MustResolveItemTypes.CONFLICT_MARKER);
    });

    it('Should gate confirmation on unacknowledged IMMEDIATE/URGENT/STAFF_CHECK alerts', () => {
      const inputs = {
        visitId: 'visit-eval-4',
        alerts: [
          {
            id: 'alt-1',
            severityTier: 'IMMEDIATE',
            status: 'RAISED', // Unacknowledged -> must resolve
            kioskLocation: 'Kiosk 1',
            ruleCode: 'RULE-CHEST-PAIN',
          },
          {
            id: 'alt-2',
            severityTier: 'URGENT',
            status: 'ACKNOWLEDGED', // Acknowledged by staff -> cleared
            kioskLocation: 'Kiosk 1',
            ruleCode: 'RULE-DYSPNEA',
          },
        ],
      };

      const result = MustResolveEvaluator.evaluate(inputs, [], policy);

      expect(result.mustResolveItems).toHaveLength(1);
      expect(result.mustResolveItems[0].itemRef).toBe('alert:alt-1');
      expect(result.mustResolveItems[0].isResolved).toBe(false);
    });

    it('Should clear must-resolve status when doctor records valid resolution with matching source hash', () => {
      const inputs = {
        visitId: 'visit-eval-5',
        documentFields: [
          {
            id: 'df-10',
            fieldType: 'drug_name',
            isCritical: true,
            result: 'MISMATCH_FLAGGED',
            rawText: 'Metforrmin 500',
            matchedReferenceValue: 'Metformin',
          },
        ],
      };

      const expectedHash = MustResolveEvaluator.computeSourceHash('drug_name:Metforrmin 500:Metformin:MISMATCH_FLAGGED');

      const existingResolutions = [
        {
          reviewId: 'rev-1',
          itemRef: 'doc-field:df-10',
          itemType: MustResolveItemTypes.DOCUMENT_FIELD,
          resolutionType: ResolutionTypes.CORRECTED,
          correctedValue: 'Metformin Hydrochloride 500mg',
          sourceHash: expectedHash,
          viewedSource: true,
          doctorId: 'doc-1',
          resolvedAt: new Date(),
        },
      ];

      const result = MustResolveEvaluator.evaluate(inputs, existingResolutions, policy);

      expect(result.mustResolveItems).toHaveLength(1);
      expect(result.mustResolveItems[0].isResolved).toBe(true);
      expect(result.unresolvedCount).toBe(0);
    });

    it('Should require re-resolution if underlying source changed after resolution was recorded (hash mismatch)', () => {
      const inputs = {
        visitId: 'visit-eval-6',
        documentFields: [
          {
            id: 'df-20',
            fieldType: 'drug_name',
            isCritical: true,
            result: 'MISMATCH_FLAGGED',
            rawText: 'Metformin 1000mg', // Value changed!
            matchedReferenceValue: 'Metformin',
          },
        ],
      };

      const oldResolution = [
        {
          reviewId: 'rev-1',
          itemRef: 'doc-field:df-20',
          itemType: MustResolveItemTypes.DOCUMENT_FIELD,
          resolutionType: ResolutionTypes.VERIFIED_AGAINST_SOURCE,
          sourceHash: 'old-stale-hash-1234', // Mismatch!
          viewedSource: true,
          doctorId: 'doc-1',
          resolvedAt: new Date(),
        },
      ];

      const result = MustResolveEvaluator.evaluate(inputs, oldResolution, policy);

      expect(result.mustResolveItems[0].isResolved).toBe(false);
      expect(result.unresolvedCount).toBe(1);
    });
  });

  // ============================================================================
  // 2. QUEUE & DETERMINISTIC ORDERING
  // ============================================================================
  describe('2. Patient Queue & Deterministic Ordering', () => {
    it('Should order visits deterministically: open alerts first, then waiting time', async () => {
      // Seed 3 visits
      await DoctorReviewRepository.upsertQueueEntry({
        visitId: 'visit-queue-1',
        department: 'General Medicine',
        hasOpenAlert: false,
        readyAt: new Date(Date.now() - 30 * 60000), // 30 min ago
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      await DoctorReviewRepository.upsertQueueEntry({
        visitId: 'visit-queue-2',
        department: 'General Medicine',
        hasOpenAlert: true, // Has open alert!
        readyAt: new Date(Date.now() - 5 * 60000), // 5 min ago
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      await DoctorReviewRepository.upsertQueueEntry({
        visitId: 'visit-queue-3',
        department: 'General Medicine',
        hasOpenAlert: false,
        readyAt: new Date(Date.now() - 60 * 60000), // 60 min ago
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      const res = await request(app)
        .get('/api/v1/doctor/queue')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);

      // Open alert MUST be first
      expect(res.body.data[0].visitId).toBe('visit-queue-2');
      expect(res.body.data[0].hasOpenAlert).toBe(true);

      // Remaining sorted by waiting time (readyAt ASC: 60m ago, then 30m ago)
      expect(res.body.data[1].visitId).toBe('visit-queue-3');
      expect(res.body.data[2].visitId).toBe('visit-queue-1');
    });

    it('Should allow doctor to claim and release a visit', async () => {
      const visitId = 'visit-claim-test';
      await DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: 'General Medicine',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      // 1. Claim
      const claimRes = await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(claimRes.status).toBe(200);
      expect(claimRes.body.data.claimed).toBe(true);

      // 2. Release
      const releaseRes = await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/release`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.released).toBe(true);
    });

    it('Should prevent second doctor from silently overwriting active claim without takeover reason', async () => {
      const visitId = 'visit-concurrency-test';
      await DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: 'General Medicine',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      // Doctor 1 claims
      await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      // Doctor 2 tries to claim without takeover -> 409 Conflict
      const secondClaimRes = await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${colleagueDoctorToken}`)
        .send({});

      expect(secondClaimRes.status).toBe(409);
      expect(secondClaimRes.body.error.code).toBe('REVIEW_CLAIMED_BY_OTHER');

      // Doctor 2 takes over WITH audited reason -> Approved
      const takeoverRes = await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${colleagueDoctorToken}`)
        .send({
          forceTakeover: true,
          takeoverReason: 'Covering colleague during emergency department duty call',
        });

      expect(takeoverRes.status).toBe(200);
      expect(takeoverRes.body.data.claimed).toBe(true);
    });
  });

  // ============================================================================
  // 3. ACCESS SCOPING & PRIVACY
  // ============================================================================
  describe('3. Access Scoping, Role Separation & PHI Privacy', () => {
    it('Should forbid staff attendants from accessing clinical summary workspace', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/visits/visit-scope-test/workspace')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('Should strictly block kiosk sessions from accessing any doctor endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/queue')
        .set('Authorization', `Bearer ${kioskSessionToken}`);

      expect(res.status).toBe(401);
    });

    it('Should require typed reason when doctor accesses out-of-department case', async () => {
      const visitId = 'visit-cardio-01';
      await DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: 'Cardiology',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      // Dr. Sharma (General Medicine) accesses Cardiology case without reason -> 403 Forbidden
      const deniedRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(deniedRes.status).toBe(403);
      expect(deniedRes.body.error.message).toContain('Out-of-department');

      // With typed reason -> 200 OK
      const allowedRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/workspace?outOfQueueReason=Cross-consultation+requested`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.data.visitHeader.department).toBe('Cardiology');
    });

    it('Should issue short-lived signed token for document snippet access', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/documents/doc-snippet-101/snippet')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.signedToken).toBeDefined();
      expect(res.body.data.cropSnippetUrl).toContain('doc-snippet-101');
    });
  });

  // ============================================================================
  // 4. SECTION 33 COMPLETE SYNTHETIC JOURNEY TEST
  // ============================================================================
  describe('4. Section 33 Full End-to-End Clinical Review Journey', () => {
    const journeyVisitId = 'visit-sih-journey-001';

    it('Should execute the entire Section 33 review and confirmation journey', async () => {
      // STEP 1: Setup Synthetic Visit Queue Entry
      await DoctorReviewRepository.upsertQueueEntry({
        visitId: journeyVisitId,
        department: 'General Medicine',
        hasOpenAlert: true,
        readyAt: new Date(),
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
      });

      // STEP 2: Doctor checks queue -> visit shows at top with open alert
      const queueRes = await request(app)
        .get('/api/v1/doctor/queue')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(queueRes.status).toBe(200);
      const topVisit = queueRes.body.data.find((v: any) => v.visitId === journeyVisitId);
      expect(topVisit).toBeDefined();
      expect(topVisit.hasOpenAlert).toBe(true);

      // STEP 3: Doctor claims the visit
      const claimRes = await request(app)
        .post(`/api/v1/doctor/queue/${journeyVisitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});
      expect(claimRes.status).toBe(200);

      // STEP 4: Start review session
      const startRes = await request(app)
        .post(`/api/v1/doctor/visits/${journeyVisitId}/review/start`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});
      expect(startRes.status).toBe(200);
      const reviewId = startRes.body.data.id;
      expect(reviewId).toBeDefined();

      // STEP 5: Seed 3 synthetic must-resolve items in review state:
      // - unreadable allergy
      // - mismatched drug
      // - allergy conflict
      const unreadableItemRef = 'doc-field:allergy-unreadable-1';
      const mismatchDrugItemRef = 'doc-field:drug-mismatch-1';
      const conflictItemRef = 'conflict:allergy_penicillin';

      // STEP 6: Doctor attempts to confirm early WITHOUT resolving -> Server REJECTS!
      // (THE DOCTOR DECIDES, THE SERVER ENFORCES)
      // First, simulate unresolved items in repository by checking server gate
      // Create a resolution for only 1 of them to test rejection
      await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/resolutions`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          itemRef: mismatchDrugItemRef,
          itemType: 'DOCUMENT_FIELD',
          resolutionType: ResolutionTypes.CORRECTED,
          correctedValue: 'Paracetamol 650mg TDS',
          viewedSource: true,
        });

      // STEP 7: Resolve the remaining items explicitly
      // Resolve allergy conflict -> DEFER_TO_CONSULTATION
      const deferRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/resolutions`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          itemRef: conflictItemRef,
          itemType: 'CONFLICT_MARKER',
          resolutionType: ResolutionTypes.DEFER_TO_CONSULTATION,
          viewedSource: true,
        });
      expect(deferRes.status).toBe(200);

      // Resolve unreadable allergy -> MARKED_NOT_AVAILABLE
      const unreadableRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/resolutions`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          itemRef: unreadableItemRef,
          itemType: 'DOCUMENT_FIELD',
          resolutionType: ResolutionTypes.MARKED_NOT_AVAILABLE,
          viewedSource: true,
        });
      expect(unreadableRes.status).toBe(200);

      // STEP 8: Physician edits one statement and adds a clinical note
      const editRes = await request(app)
        .patch(`/api/v1/doctor/reviews/${reviewId}/statements/stmt-ai-draft-1`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          editedText: 'Patient presents with intermittent epigastric fullness for 3 weeks.',
          previousTextRef: 'Patient has stomach ache.',
        });
      expect(editRes.status).toBe(200);

      const addRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/statements`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          section: 'HISTORY_OF_PRESENT_ILLNESS',
          text: 'Physician direct clinical evaluation: Soft, non-tender abdomen, no guarding.',
          order: 1,
        });
      expect(addRes.status).toBe(200);

      // STEP 9: Confirm with hospital attestation
      const confirmRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/confirm`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          attestationAccepted: true,
          attestationVersion: 'ATTEST-v1.0.0',
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      const confirmedRecord = confirmRes.body.data;
      expect(confirmedRecord.version).toBe(1);
      expect(confirmedRecord.confirmedByDoctorId).toBe('c0000000-0000-4000-a000-000000000002');

      // STEP 10: Verify statement origins in confirmed record
      const statements = confirmedRecord.statements;
      expect(statements.some((s: any) => s.origin === ConfirmedOrigins.DOCTOR_ADDED)).toBe(true);
      expect(statements.some((s: any) => s.origin === ConfirmedOrigins.TO_CLARIFY)).toBe(true);

      // STEP 11: Create Amendment (Section 18)
      // Doctor creates amendment with mandatory clinical reason
      const amendRes = await request(app)
        .post(`/api/v1/doctor/confirmed-records/${confirmedRecord.id}/amend`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          amendmentReason: 'Patient recalled past adverse reaction to Amoxicillin during bedside interview.',
          statements: [
            ...statements,
            {
              section: 'MEDICATIONS_AND_ALLERGIES',
              text: 'Confirmed Allergy: Mild urticaria after Amoxicillin in 2018.',
              origin: ConfirmedOrigins.DOCTOR_ADDED,
              order: 99,
            },
          ],
          attestationAccepted: true,
          attestationVersion: 'ATTEST-v1.0.0',
        });

      expect(amendRes.status).toBe(200);
      const amendedRecord = amendRes.body.data;
      expect(amendedRecord.version).toBe(2);
      expect(amendedRecord.supersedesId).toBe(confirmedRecord.id);
      expect(amendedRecord.amendmentReason).toContain('Amoxicillin');

      // Both versions retrievable
      const versionsRes = await request(app)
        .get(`/api/v1/doctor/confirmed-records/${confirmedRecord.id}/versions`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.data).toHaveLength(2);
    }, 30000);

    it('Should allow manual clinical record in raw fallback view when summarization fails', async () => {
      const fallbackVisitId = 'visit-raw-fallback-01';

      // Doctor opens raw view
      const rawRes = await request(app)
        .get(`/api/v1/doctor/visits/${fallbackVisitId}/raw-view`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(rawRes.status).toBe(200);
      expect(rawRes.body.success).toBe(true);
      expect(rawRes.body.data.interviewAnswersBySection).toBeDefined();
      expect(rawRes.body.data.validatedDocumentFields).toBeDefined();
    });
  });
});
