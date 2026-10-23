import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { prisma, checkDatabaseHealth } from '../src/database/prisma.js';
import { DocumentStorageService } from '../src/modules/documents/storage/document-storage.service.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';
import { MockOcrProvider } from '../src/modules/documents/ocr/mock-ocr-provider.js';
import { IOcrProvider, OcrExtractionResult } from '../src/modules/documents/ocr/ocr-provider.interface.js';
import { ReviewPolicyService } from '../src/modules/doctor-review/review/review-policy.service.js';
import { DoctorReviewRepository } from '../src/modules/doctor-review/doctor-review.repository.js';
import { QueueStatuses } from '../src/modules/doctor-review/doctor-review.types.js';

describe('STAGE 6: COMPLETE WORKFLOW INTEGRATION (KIOSK TO DOCTOR PORTAL)', () => {
  const app = createApp();

  // Synthetic Doctor Staff Authentication Token
  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  // Synthetic 1x1 PNG image buffer for valid prescription scan
  const validPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Synthetic corrupted/smudged PNG buffer for unreadable scan
  const smudgedPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  let initialOcrProvider: IOcrProvider;

  beforeAll(async () => {
    initialOcrProvider = OcrService.getProvider();
  });

  afterAll(async () => {
    OcrService.setProvider(initialOcrProvider);
  });

  // ============================================================================
  // JOURNEY 1: COMPLETE SUCCESSFUL PATIENT INTAKE TO PHYSICIAN SIGN-OFF
  // ============================================================================
  describe('Journey 1: Successful Patient Intake, Upload, Summary & Doctor Confirmation', () => {
    let visitId: string;
    let patientId: string;
    let hospitalRegistrationNumber: string;
    let sessionToken: string;
    let documentId: string;
    let reviewId: string;
    let summaryId: string;
    let firstStatementId: string;
    let confirmedRecordId: string;

    it('Step 1: Patient Registers as a New Patient at Kiosk', async () => {
      const res = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Kavitha Ramaswamy',
          gender: 'FEMALE',
          age: 42,
          contactNumber: '9840112233',
          preferredLanguage: 'ta',
          isCompanionAssisted: false,
          consentGranted: true,
          consentGrantedVia: 'patient',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.sessionToken).toBeDefined();
      expect(res.body.data.patient.hospitalRegistrationNumber).toMatch(/^MK-\d{4}-\d+/);

      visitId = res.body.data.session.visitId;
      patientId = res.body.data.patient.id;
      hospitalRegistrationNumber = res.body.data.patient.hospitalRegistrationNumber;
      sessionToken = res.body.data.session.sessionToken;

      expect(visitId).toBeDefined();
    });

    it('Step 2: Patient Completes Guided Symptom Interview via Kiosk', async () => {
      // 1. Start interview
      const startRes = await request(app)
        .post('/api/v1/kiosk/interview/start')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({});

      expect(startRes.status).toBe(200);
      expect(startRes.body.success).toBe(true);

      const currentQ = startRes.body.data.currentQuestion;
      expect(currentQ).toBeDefined();

      // 2. Answer question
      const answerRes = await request(app)
        .post('/api/v1/kiosk/interview/answer')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          questionId: currentQ.id,
          answerValue: 'High fever and severe sore throat for 3 days',
          answeredVia: 'TOUCH',
          languageUsed: 'ta',
          isSkipped: false,
        });

      expect(answerRes.status).toBe(200);

      // 3. Complete interview
      const completeRes = await request(app)
        .post('/api/v1/kiosk/interview/complete')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({});

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.success).toBe(true);
    });

    it('Step 3: Patient Uploads Past Prescription Document at Kiosk', async () => {
      const res = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          fileBase64: validPngBase64,
          fileName: 'apollo_rx_2026.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toBeDefined();
      expect(res.body.data.document.id).toBeDefined();
      
      const storageRef = res.body.data.document.storage_reference || res.body.data.document.storageReference;
      expect(storageRef).toBeDefined();

      documentId = res.body.data.document.id;

      // Verify physical file was written to disk
      const resolved = DocumentStorageService.resolveDocumentFile(storageRef);
      expect(resolved).toBeTruthy();
    });

    it('Step 4: Case Appears in Doctor Queue with Patient Identity and READY_FOR_REVIEW Status', async () => {
      const res = await request(app)
        .get('/api/v1/doctor/queue')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const entry = res.body.data.find((e: any) => e.visitId === visitId);
      expect(entry).toBeDefined();
      expect(entry.queueStatus).toBe('READY_FOR_REVIEW');
      expect(entry.patientTokenOrName).toContain('Kavitha Ramaswamy');
    });

    it('Step 5: Doctor Claims Visit and Inspects Clinical Review Workspace', async () => {
      // 1. Claim visit
      const claimRes = await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(claimRes.status).toBe(200);
      expect(claimRes.body.success).toBe(true);

      // 2. Load workspace
      const wsRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(wsRes.status).toBe(200);
      expect(wsRes.body.success).toBe(true);
      expect(wsRes.body.data.visitHeader).toBeDefined();
      expect(wsRes.body.data.visitHeader.visitId).toBe(visitId);
      expect(wsRes.body.data.summary).toBeDefined();
      expect(wsRes.body.data.summary.status).toBe('PENDING_DOCTOR_REVIEW');

      summaryId = wsRes.body.data.summary.id;
      const ccSection = wsRes.body.data.summary.sections[0];
      expect(ccSection).toBeDefined();
      firstStatementId = ccSection.statements[0].id;
      expect(firstStatementId).toBeDefined();
    });

    it('Step 6: Doctor Inspects Original Digitized Document via Cryptographic Signed Snippet Token', async () => {
      // 1. Request signed snippet
      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/snippet?visitId=${visitId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(snippetRes.status).toBe(200);
      expect(snippetRes.body.success).toBe(true);
      expect(snippetRes.body.data.signedUrl).toContain(`/api/v1/doctor/documents/${documentId}/image?token=`);

      const signedToken = snippetRes.body.data.signedToken;
      expect(signedToken).toBeDefined();

      // 2. Stream original binary file using the signed query token (simulates browser <img> render)
      const streamRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/image?token=${signedToken}`);

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers['content-type']).toContain('image/png');
      expect(streamRes.body.length).toBeGreaterThan(0);
    });

    it('Step 7: Doctor Edits Draft Statement and Confirms Review with Mandatory Attestation', async () => {
      // 1. Start review session
      const startReviewRes = await request(app)
        .post(`/api/v1/doctor/visits/${visitId}/review/start`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(startReviewRes.status).toBe(200);
      expect(startReviewRes.body.success).toBe(true);
      reviewId = startReviewRes.body.data.id || startReviewRes.body.data.reviewId;
      expect(reviewId).toBeDefined();

      // 2. Doctor edits first statement text
      const editRes = await request(app)
        .patch(`/api/v1/doctor/reviews/${reviewId}/statements/${firstStatementId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          editedText: 'Patient presents with severe acute febrile illness and pharyngitis for 3 days. Clinically verified.',
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.success).toBe(true);

      // 3. Attempt confirmation without attestation -> MUST FAIL
      const unconfirmedRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/confirm`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ attestationAccepted: false });

      expect(unconfirmedRes.status).toBe(400);

      // 4. Confirm with physician attestation
      const confirmRes = await request(app)
        .post(`/api/v1/doctor/reviews/${reviewId}/confirm`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ attestationAccepted: true });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.id).toBeDefined();
      expect(confirmRes.body.data.visitId).toBe(visitId);

      confirmedRecordId = confirmRes.body.data.id;

      // Verify edited statement has origin DOCTOR_EDITED
      const editedStmt = confirmRes.body.data.statements.find((s: any) =>
        s.text.includes('severe acute febrile illness')
      );
      expect(editedStmt).toBeDefined();
      expect(editedStmt.origin).toBe('DOCTOR_EDITED');
    });

    it('Step 8: Confirmed Record is Persistently Stored and Accessible by Visit ID', async () => {
      const res = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/confirmed-record`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(confirmedRecordId);
      expect(res.body.data.visitId).toBe(visitId);
    });
  });

  // ============================================================================
  // JOURNEY 2: RETURNING PATIENT LOOKUP & OCR FAILURE / MANUAL REVIEW FLOW
  // ============================================================================
  describe('Journey 2: Returning Patient Lookup & OCR Failure / Manual Review Fallback', () => {
    let registeredUhid: string;
    let returningVisitId: string;
    let returningSessionToken: string;
    let failedDocId: string;

    it('Step 1: Patient Looked Up via Hospital Registration Number (UHID)', async () => {
      // 1. Initial creation
      const regRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Balamurugan Natarajan',
          gender: 'MALE',
          age: 58,
          contactNumber: '9443210987',
          preferredLanguage: 'ta',
          consentGranted: true,
        });

      expect([200, 201]).toContain(regRes.status);
      registeredUhid = regRes.body.data.patient.hospitalRegistrationNumber;

      // 2. Returning patient look-up with UHID
      const returningRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          hospitalRegistrationNumber: registeredUhid,
          preferredLanguage: 'ta',
          consentGranted: true,
        });

      expect([200, 201]).toContain(returningRes.status);
      expect(returningRes.body.data.patient.fullName).toBe('Balamurugan Natarajan');
      expect(returningRes.body.data.session.visitId).toBeDefined();

      returningVisitId = returningRes.body.data.session.visitId;
      returningSessionToken = returningRes.body.data.session.sessionToken;
    });

    it('Step 2: Patient Completes Interview and Uploads an Illegible Prescription That Fails OCR Extraction', async () => {
      // 1. Patient completes guided symptom interview
      const startRes = await request(app)
        .post('/api/v1/kiosk/interview/start')
        .set('Authorization', `Bearer ${returningSessionToken}`)
        .send({});

      expect([200, 201]).toContain(startRes.status);
      const q = startRes.body.data.currentQuestion;

      await request(app)
        .post('/api/v1/kiosk/interview/answer')
        .set('Authorization', `Bearer ${returningSessionToken}`)
        .send({
          questionId: q.id,
          answerValue: 'Follow-up for chronic diabetes management and foot pain',
          answeredVia: 'TOUCH',
          languageUsed: 'ta',
          isSkipped: false,
        });

      await request(app)
        .post('/api/v1/kiosk/interview/complete')
        .set('Authorization', `Bearer ${returningSessionToken}`)
        .send({});

      // 2. Mock provider returning OCR failure
      const failingOcrProvider: IOcrProvider = {
        name: 'FailingOcrSimulation',
        version: '1.0',
        extractText: async () => ({
          success: false,
          rawText: '',
          confidence: 0.12,
          extractedFields: [],
          errorMessage: 'Document is illegible due to heavy ink smudging and low camera lighting.',
        }),
      };

      OcrService.setProvider(failingOcrProvider);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${returningSessionToken}`)
        .send({
          fileBase64: smudgedPngBase64,
          fileName: 'faded_old_prescription.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect([200, 201]).toContain(uploadRes.status);
      expect(uploadRes.body.success).toBe(true);
      const docStatus = uploadRes.body.data.document.overall_status || uploadRes.body.data.document.overallStatus;
      expect(docStatus).toBe('EXTRACTION_FAILED');

      failedDocId = uploadRes.body.data.document.id;

      // Original document MUST still be stored safely on disk despite OCR failure
      const docStorageRef = uploadRes.body.data.document.storage_reference || uploadRes.body.data.document.storageReference;
      const fileStored = DocumentStorageService.resolveDocumentFile(docStorageRef);
      expect(fileStored).toBeTruthy();

      // Reset OCR provider
      OcrService.setProvider(initialOcrProvider);
    });

    it('Step 3: OCR Failure Document Appears in Doctor Review for Manual Inspection and Resolution', async () => {
      // 1. Doctor opens workspace
      const wsRes = await request(app)
        .get(`/api/v1/doctor/visits/${returningVisitId}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(wsRes.status).toBe(200);
      expect(wsRes.body.success).toBe(true);

      // Verify that mustResolveItems contains the unreadable document item
      const failedDocItem = wsRes.body.data.mustResolveItems.find(
        (i: any) => i.sourceRef === failedDocId || i.itemRef === `doc-failed:${failedDocId}`
      );
      expect(failedDocItem).toBeDefined();
      expect(failedDocItem.verificationState).toBe('UNREADABLE');
      expect(failedDocItem.title).toContain('Document could not be reliably digitized');

      // 2. Doctor opens original document snippet to inspect illegible scan directly
      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${failedDocId}/snippet?visitId=${returningVisitId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(snippetRes.status).toBe(200);
      expect(snippetRes.body.data.signedUrl).toBeDefined();

      const token = snippetRes.body.data.signedToken;
      const streamRes = await request(app)
        .get(`/api/v1/doctor/documents/${failedDocId}/image?token=${token}`);

      expect(streamRes.status).toBe(200);
      expect(streamRes.body.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTEGRATION SAFETY GATES & RESILIENCE
  // ============================================================================
  describe('Integration Safety Gates & Error Resilience', () => {
    it('Refusal of Consent: Uploading without document consent must be blocked with 403 Forbidden', async () => {
      // Start session with consentGranted = false
      const sessionRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Anand Kumar',
          gender: 'MALE',
          age: 35,
          contactNumber: '9944001122',
          consentGranted: false,
        });

      const token = sessionRes.body.data.session.sessionToken;

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileBase64: validPngBase64,
          fileName: 'rx_declined.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(403);
      expect(uploadRes.body.error.code).toBe('FORBIDDEN');
    });

    it('Unauthorized Doctor Review: Non-doctor staff cannot confirm medical records', async () => {
      const attendantToken = TokenUtil.generateStaffAccessToken({
        sub: 'c0000000-0000-4000-a000-000000000004',
        email: 'staff@hospital.org',
        role: 'STAFF_ATTENDANT',
        fullName: 'OPD Attendant',
      });

      const res = await request(app)
        .post('/api/v1/doctor/reviews/fake-review-id/confirm')
        .set('Authorization', `Bearer ${attendantToken}`)
        .send({ attestationAccepted: true });

      expect(res.status).toBe(403);
    });

    it('Empty Upload Payload: Proper 400 Validation Error returned without server crash', async () => {
      const sessionRes = await request(app)
        .post('/api/v1/kiosk/session/start')
        .send({
          fullName: 'Test Empty Upload',
          gender: 'MALE',
          age: 29,
          contactNumber: '9000011111',
          consentGranted: true,
        });

      const token = sessionRes.body.data.session.sessionToken;

      const res = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileBase64: '',
          fileName: 'empty.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
