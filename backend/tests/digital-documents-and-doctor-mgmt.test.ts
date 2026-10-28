import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { DigitalDocumentExtractorService } from '../src/modules/documents/digital/digital-document-extractor.service.js';
import { EmailGeneratorUtil } from '../src/utils/email-generator.util.js';
import { prisma } from '../src/database/prisma.js';

function buildDigitalPdf(content: string): Buffer {
  const streamContent = `BT /F1 12 Tf 50 700 Td (${content}) Tj ET`;
  const streamLength = streamContent.length;

  const raw = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000236 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(raw, 'utf-8');
}

describe('THUNAI: Digital Document Processing & Doctor Management', () => {
  const app = createApp();

  describe('1. Digital Document Text Extraction (Native PDF)', () => {
    it('Should extract selectable text from a digital PDF successfully', async () => {
      const sampleClinicalReport = 'Patient: Jane Doe, Age: 38. Clinical Notes: Persistent cough for 3 days. Rx: Azithromycin 500mg OD for 3 days.';
      const pdfBuffer = buildDigitalPdf(sampleClinicalReport);

      const result = await DigitalDocumentExtractorService.extractFromPdf(pdfBuffer);

      expect(result.success).toBe(true);
      expect(result.documentClassification).toBe('DIGITAL');
      expect(result.extractionStatus).toBe('SUCCESS');
      expect(result.ocrStatus).toBe('NOT_REQUIRED');
      expect(result.statusMessage).toBe('Digital text extracted successfully.');
      expect(result.fullText).toContain('Azithromycin 500mg');
      expect(result.errorMessage).toBeNull();
      // Ensure no handwriting warnings
      expect(result.statusMessage.toLowerCase()).not.toContain('handwritten');
    });

    it('Should handle short but valid clinical text without discarding it', async () => {
      const shortPrescription = 'Rx: PCM 650mg TDS';
      const pdfBuffer = buildDigitalPdf(shortPrescription);

      const result = await DigitalDocumentExtractorService.extractFromPdf(pdfBuffer);

      expect(result.success).toBe(true);
      expect(result.extractionStatus).toBe('SUCCESS');
      expect(result.fullText).toContain('PCM 650mg TDS');
      expect(result.extractedFields.length).toBeGreaterThan(0);
    });

    it('Should cleanly report failure on empty or corrupted PDF buffer without handwriting warning', async () => {
      const corruptedBuffer = Buffer.from('NOT_A_VALID_PDF_STREAM');

      const result = await DigitalDocumentExtractorService.extractFromPdf(corruptedBuffer);

      expect(result.success).toBe(false);
      expect(result.extractionStatus).toBe('FAILED');
      expect(result.statusMessage).toBe('Digital text could not be extracted. Please upload a text-based PDF or another supported digital document.');
      expect(result.statusMessage.toLowerCase()).not.toContain('handwritten');
    });
  });

  describe('2. Short Email Generation Utility', () => {
    it('Should clean doctor full name into concise local part', () => {
      expect(EmailGeneratorUtil.cleanLocalPart('Dr. Priya Sharma')).toBe('priya');
      expect(EmailGeneratorUtil.cleanLocalPart('Dr. Arun Kumar')).toBe('arun');
      expect(EmailGeneratorUtil.cleanLocalPart('Dr. K. Meena Raj')).toBe('meena');
    });

    it('Should generate unique short email address with fallback domain', async () => {
      const email = await EmailGeneratorUtil.generateUniqueShortEmail('Dr. Vikram Rao');
      expect(email).toMatch(/^vikram[0-9]*@medbrief\.test$/);
    });
  });

  describe('3. Doctor Authentication & Management Endpoints', () => {
    it('Should suggest short email via POST /api/v1/auth/suggest-email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/suggest-email')
        .send({ fullName: 'Dr. Sanjay Gupta' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('sanjay@medbrief.test');
    });

    it('Should authenticate seeded development doctor (arun@medbrief.test) with password doctor123 and full profile fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'arun@medbrief.test',
          password: 'doctor123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();

      const user = res.body.data.user;
      expect(user.fullName).toBe('Dr. Arun Kumar');
      expect(user.email).toBe('arun@medbrief.test');
      expect(user.role).toBe('DOCTOR');
      expect(user.medicalRegistrationNumber).toBe('TEST-NMC-2012-001');
      expect(user.qualification).toBe('MBBS, MD');
      expect(user.experienceYears).toBe(12);
      expect(user.hospitalName).toBe('MEDBRIEF General Care');
      expect(user.designation).toBe('Senior Consultant');
    });

    it('Should authenticate doctor using alias doctor1@medbrief.test and reject invalid password', async () => {
      // Alias login
      const aliasRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor1@medbrief.test',
          password: 'doctor123',
        });

      expect(aliasRes.status).toBe(200);
      expect(aliasRes.body.data.user.email).toBe('arun@medbrief.test');

      // Invalid password rejection
      const invalidRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'arun@medbrief.test',
          password: 'wrong_password_999',
        });

      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body.success).toBe(false);
    });

    it('Should register new doctor, persist all doctor fields, and allow login', async () => {
      const testEmail = `doctor_${Date.now()}@medbrief.test`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Dr. Anand Raman',
          email: testEmail,
          password: 'doctor123',
          confirmPassword: 'doctor123',
          medicalRegistrationNumber: 'TEST-MCI-99881',
          specialization: 'Neurology',
          hospitalName: 'Apollo Speciality Hospitals',
          qualification: 'MBBS, DM (Neurology)',
          experienceYears: 9,
          designation: 'Consultant Neurologist',
          phoneNumber: '+91 98401 99999',
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.data.email).toBe(testEmail);
      expect(regRes.body.data.medicalRegistrationNumber).toBe('TEST-MCI-99881');
      expect(regRes.body.data.qualification).toBe('MBBS, DM (Neurology)');
      expect(regRes.body.data.experienceYears).toBe(9);

      // Verify login with newly registered doctor
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'doctor123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.email).toBe(testEmail);
      expect(loginRes.body.data.user.designation).toBe('Consultant Neurologist');
    });

    it('Should reject duplicate doctor email with 409 Conflict', async () => {
      const dupRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Dr. Duplicate',
          email: 'arun@medbrief.test', // already exists
          password: 'doctor123',
          confirmPassword: 'doctor123',
          medicalRegistrationNumber: 'TEST-DUP-01',
          specialization: 'General Medicine',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
    });

    it('Should reject registration when passwords do not match', async () => {
      const mismatchRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Dr. Mismatch',
          email: `mismatch_${Date.now()}@medbrief.test`,
          password: 'doctor123',
          confirmPassword: 'DifferentPassword@123',
        });

      expect(mismatchRes.status).toBe(400);
      expect(mismatchRes.body.success).toBe(false);
    });
  });
});
