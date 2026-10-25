import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { ConsentTypes } from '../src/types/auth.types.js';

describe('Step 5 Verification: Patient Kiosk Interview Startup & Resilience', () => {
  const app = createApp();
  let validSessionToken: string;
  let validVisitId: string;
  let validPatientId: string;
  let noConsentSessionToken: string;
  let noConsentVisitId: string;
  let noConsentPatientId: string;

  beforeAll(async () => {
    // 1. Setup a valid registered patient with consent
    const regRes = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'Interview Test Patient',
        gender: 'FEMALE',
        age: 28,
        contactNumber: '9840199887',
        preferredLanguage: 'en',
        consentGranted: true,
        consentGrantedVia: 'patient',
      });

    expect([200, 201]).toContain(regRes.status);
    validVisitId = regRes.body.data.session.visitId;
    validPatientId = regRes.body.data.patient.id;
    validSessionToken = regRes.body.data.session.sessionToken;

    // 2. Setup a patient WITHOUT data collection consent
    const regNoConsentRes = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'No Consent Patient',
        gender: 'MALE',
        age: 32,
        contactNumber: '9840199888',
        preferredLanguage: 'en',
        consentGranted: false,
        consentGrantedVia: 'patient',
      });

    expect([200, 201]).toContain(regNoConsentRes.status);
    noConsentVisitId = regNoConsentRes.body.data.session.visitId;
    noConsentPatientId = regNoConsentRes.body.data.patient.id;
    noConsentSessionToken = regNoConsentRes.body.data.session.sessionToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Backend Health
  it('1. Backend health endpoint returns healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  // Test 2: Database Health
  it('2. Database connectivity is verified and operational', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('connected');
  });

  // Test 3: Interview Startup for a Valid Registered Patient
  it('3. Starts interview successfully for a valid registered patient with active consent', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .set('Authorization', `Bearer ${validSessionToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.session.visitId).toBe(validVisitId);
    expect(res.body.data.session.patientId).toBe(validPatientId);
    expect(res.body.data.session.status).toBe('IN_PROGRESS');
    expect(res.body.data.currentQuestion).toBeDefined();
    expect(res.body.data.allQuestions).toBeDefined();
    expect(res.body.data.allQuestions.length).toBeGreaterThan(0);
    expect(res.body.data.progress).toBeDefined();
    expect(res.body.data.progress.isComplete).toBe(false);
  });

  // Test 4: Interview Startup when Consent is Missing
  it('4. Rejects interview startup with 403 Forbidden when patient consent is missing', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .set('Authorization', `Bearer ${noConsentSessionToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/consent.*required/i);
  });

  // Test 5: Interview Startup when Token / Identifier is Missing or Invalid
  it('5. Rejects interview startup with 401 Unauthorized when kiosk token is missing', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Kiosk session token required');
  });

  it('5b. Rejects interview startup with 401 Unauthorized when kiosk token is forged/malformed', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .set('Authorization', 'Bearer invalid-token-xyz')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid or expired kiosk session token');
  });

  // Test 6: Retry Behavior After Temporary Failure (Resuming In-Progress Session)
  it('6. Repeating interview start on an existing in-progress session resumes cleanly without duplicates', async () => {
    // Calling start again on validVisitId
    const res = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .set('Authorization', `Bearer ${validSessionToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.visitId).toBe(validVisitId);
    expect(res.body.data.session.status).toBe('IN_PROGRESS');

    // Confirm in DB that only exactly ONE session exists for this visit
    const sessionCount = await prisma.interviewSession.count({
      where: { visit_id: validVisitId },
    });
    expect(sessionCount).toBe(1);
  });

  // Test 7: Re-Calling Interview Start on a Completed Session (Review Screen Resilience)
  it('7. Calling interview start on a completed visit returns completed state without P2002 error', async () => {
    // 1. Answer a question and complete interview for validVisitId
    const currentQRes = await request(app)
      .get('/api/v1/kiosk/interview/current-question')
      .set('Authorization', `Bearer ${validSessionToken}`);

    const qId = currentQRes.body.data.currentQuestion.id;

    await request(app)
      .post('/api/v1/kiosk/interview/answer')
      .set('Authorization', `Bearer ${validSessionToken}`)
      .send({
        questionId: qId,
        answerValue: 'High fever for 2 days',
        answeredVia: 'TOUCH',
        languageUsed: 'en',
      });

    const completeRes = await request(app)
      .post('/api/v1/kiosk/interview/complete')
      .set('Authorization', `Bearer ${validSessionToken}`)
      .send({});

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.completedAt).toBeDefined();

    // 2. Now call /start again on the COMPLETED session (simulating page reload or return)
    const restartRes = await request(app)
      .post('/api/v1/kiosk/interview/start')
      .set('Authorization', `Bearer ${validSessionToken}`)
      .send({});

    // Must NOT crash with 500 P2002 Unique Constraint violation!
    expect(restartRes.status).toBe(200);
    expect(restartRes.body.success).toBe(true);
    expect(restartRes.body.data.session.status).toBe('COMPLETED');
    expect(restartRes.body.data.progress.isComplete).toBe(true);
  });

  // Test 8: Duplicate-Submission Protection (Concurrent Start Requests)
  it('8. Duplicate concurrent start requests are safely handled idempotently', async () => {
    // Create another fresh patient
    const freshReg = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'Concurrent Patient',
        gender: 'MALE',
        age: 40,
        contactNumber: '9840199889',
        preferredLanguage: 'en',
        consentGranted: true,
        consentGrantedVia: 'patient',
      });

    const freshToken = freshReg.body.data.session.sessionToken;
    const freshVisitId = freshReg.body.data.session.visitId;

    // Send 3 concurrent start requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      request(app).post('/api/v1/kiosk/interview/start').set('Authorization', `Bearer ${freshToken}`).send({}),
      request(app).post('/api/v1/kiosk/interview/start').set('Authorization', `Bearer ${freshToken}`).send({}),
      request(app).post('/api/v1/kiosk/interview/start').set('Authorization', `Bearer ${freshToken}`).send({}),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    // Verify exactly ONE session created in DB
    const count = await prisma.interviewSession.count({
      where: { visit_id: freshVisitId },
    });
    expect(count).toBe(1);
  });

  // Test 9: Correct Patient and Visit Association
  it('9. Preserves strict isolation and associates interview session to the correct patient and visit', async () => {
    const sessionInDb = await prisma.interviewSession.findUnique({
      where: { visit_id: validVisitId },
      include: { template: true },
    });

    expect(sessionInDb).toBeDefined();
    expect(sessionInDb?.patient_id).toBe(validPatientId);
    expect(sessionInDb?.visit_id).toBe(validVisitId);
    expect(sessionInDb?.template).toBeDefined();
  });
});
