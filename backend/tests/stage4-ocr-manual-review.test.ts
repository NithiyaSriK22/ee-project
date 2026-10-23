import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { devFallbackPatientStore } from '../src/modules/patients/dev-fallback-patient-store.js';
import { devFallbackDoctorReviewStore } from '../src/modules/doctor-review/dev-fallback-doctor-review-store.js';
import {
  OcrProviderFactory,
  StandardClinicalOcrProvider,
  TesseractOcrProvider,
  LowConfidenceOcrProvider,
  HandwrittenUnreadableOcrProvider,
  UnavailableOcrProvider,
  CorruptedDocOcrProvider,
  IOcrProvider,
} from '../src/modules/documents/ocr/ocr-provider-adapter.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';
import { DocumentsService } from '../src/modules/documents/documents.service.js';
import { ValidationGateService } from '../src/modules/documents/validation/validation-gate.service.js';
import { prisma } from '../src/database/prisma.js';

describe('STAGE 4: OCR EXTRACTION & MANUAL REVIEW GATING', () => {
  const app = createApp();

  const doctorId = 'c0000000-0000-4000-a000-000000000002';
  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: doctorId,
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  const patientId = 'pat-stage4-001';
  const visitId = 'visit-stage4-001';

  const kioskSessionToken = TokenUtil.generateKioskSessionToken({
    sessionId: 'session-stage4-01',
    visitId,
    patientId,
  }).token;

  const originalProvider = OcrService.getProvider();

  // Synthetic valid PNG header
  const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');

  beforeEach(async () => {
    devFallbackDoctorReviewStore.clearAll();
    devFallbackPatientStore.recordConsent({
      patientId,
      visitId,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });

    try {
      await prisma.reviewClaim.deleteMany({});
      await prisma.doctorReview.deleteMany({});
    } catch {}
  });

  afterEach(() => {
    OcrService.setProvider(originalProvider);
  });

  // ============================================================================
  // 1. PLUGGABLE OCR PROVIDER CONFIGURATION
  // ============================================================================
  describe('1. Pluggable OCR Provider Architecture', () => {
    it('Should support configuring OCR providers via OcrProviderFactory', () => {
      const standardProvider = OcrProviderFactory.getProvider('STANDARD');
      expect(standardProvider).toBeInstanceOf(StandardClinicalOcrProvider);
      expect(standardProvider.name).toBe('StandardClinicalOcrProvider');

      const tesseractProvider = OcrProviderFactory.getProvider('TESSERACT');
      expect(tesseractProvider).toBeInstanceOf(TesseractOcrProvider);
      expect(tesseractProvider.name).toBe('TesseractOcrProvider');

      const lowConfProvider = OcrProviderFactory.getProvider('LOW_CONFIDENCE');
      expect(lowConfProvider).toBeInstanceOf(LowConfidenceOcrProvider);

      const unavailableProvider = OcrProviderFactory.getProvider('UNAVAILABLE');
      expect(unavailableProvider).toBeInstanceOf(UnavailableOcrProvider);
    });

    it('Should allow hot-swapping OCR providers at runtime without restarting service', () => {
      OcrService.setProvider(new LowConfidenceOcrProvider());
      expect(OcrService.getProvider().name).toBe('LowConfidenceOcrProvider');

      OcrService.setProvider(new StandardClinicalOcrProvider());
      expect(OcrService.getProvider().name).toBe('StandardClinicalOcrProvider');
    });
  });

  // ============================================================================
  // 2. CLEAR SYNTHETIC PRINTED DOCUMENT EXTRACTION
  // ============================================================================
  describe('2. Clear Synthetic Printed Document Extraction', () => {
    it('Should extract source-grounded clinical entities from printed prescription text', () => {
      const provider = new TesseractOcrProvider();
      const printedClinicalText =
        'APOLLO CLINIC OPD PRESCRIPTION\n' +
        'Date: 24/10/2026\n' +
        'Dr. Ramesh Kumar, MD\n' +
        'Rx: Amoxicillin 500mg 1-0-1 for 5 days\n' +
        'Paracetamol 650mg SOS for fever\n' +
        'Allergies: No known allergies';

      const fields = provider.parseClinicalEntities(printedClinicalText);

      expect(fields.length).toBeGreaterThanOrEqual(4);
      expect(fields.some((f) => f.fieldType === 'drug_name' && f.rawText.includes('Amoxicillin'))).toBe(true);
      expect(fields.some((f) => f.fieldType === 'dosage' && f.rawText === '1-0-1')).toBe(true);
      expect(fields.some((f) => f.fieldType === 'date' && f.rawText === '24/10/2026')).toBe(true);
      expect(fields.some((f) => f.fieldType === 'physician_name' && f.rawText.includes('Dr. Ramesh Kumar'))).toBe(true);
      expect(fields.some((f) => f.fieldType === 'allergy' && f.rawText.includes('No known allergies'))).toBe(true);
    });

    it('Should extract lab test names and values from synthetic printed lab report text', () => {
      const provider = new TesseractOcrProvider();
      const printedLabReport =
        'METROPOLIS DIAGNOSTIC LABS\n' +
        'Investigation: Fasting Blood Glucose\n' +
        'Result: 142 mg/dL (Reference: 70 - 100 mg/dL)\n' +
        'Date: 24/10/2026\n' +
        'Doctor: Dr. Suresh Reddy';

      const fields = provider.parseClinicalEntities(printedLabReport);

      expect(fields.some((f) => f.fieldType === 'lab_test_name' && f.rawText === 'Fasting Blood Glucose')).toBe(true);
      expect(fields.some((f) => f.fieldType === 'lab_value' && f.rawText === '142 mg/dL')).toBe(true);
    });
  });

  // ============================================================================
  // 3. SYNTHETIC LOW-QUALITY & BLURRY SCAN HANDLING
  // ============================================================================
  describe('3. Low-Quality Scan & Low-Confidence Gating', () => {
    it('Should reject low-confidence scan without hallucinating clinical entities', async () => {
      OcrService.setProvider(new LowConfidenceOcrProvider());

      const noisyBuffer = Buffer.concat([pngHeader, Buffer.from('noisy blurry scan data below quality threshold')]);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: noisyBuffer.toString('base64'),
          fileName: 'blurry_low_quality_scan.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      const doc = uploadRes.body.data.document;
      expect(doc.ocr_status).toBe('FAILED');
      expect(doc.overall_status).toBe('EXTRACTION_FAILED');
      expect(doc.ocr_error_message).toContain('Legibility confidence is below clinical threshold');
      expect(doc.raw_fields).toHaveLength(0);
    });
  });

  // ============================================================================
  // 4. SYNTHETIC HANDWRITTEN-STYLE NOTE (SAFETY GATING)
  // ============================================================================
  describe('4. Synthetic Handwritten Note Safety Gating', () => {
    it('Should route unreadable handwritten note for manual review without fabricating facts', async () => {
      OcrService.setProvider(new HandwrittenUnreadableOcrProvider());

      const handwrittenBuffer = Buffer.concat([
        pngHeader,
        Buffer.from('SYNTHETIC HANDWRITTEN CURSIVE DOCTOR NOTE ILLEGIBLE SYMBOLS'),
      ]);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: handwrittenBuffer.toString('base64'),
          fileName: 'handwritten_cursive_rx.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      const doc = uploadRes.body.data.document;
      expect(doc.ocr_status).toBe('FAILED');
      expect(doc.overall_status).toBe('EXTRACTION_FAILED');

      // Doctor claims visit and inspects workspace
      await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      const wsRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(wsRes.status).toBe(200);
      const ws = wsRes.body.data;

      // 1. Failed documents list includes the document
      const failedDoc = ws.failedDocuments.find((d: any) => d.id === doc.id);
      expect(failedDoc).toBeDefined();
      expect(failedDoc.fileName).toBe('handwritten_cursive_rx.png');
      expect(failedDoc.unverifiedNotice).toContain('Document could not be reliably digitized');
      expect(failedDoc.missingFields).toBeDefined();
      expect(failedDoc.missingFields.length).toBeGreaterThan(0);

      // 2. Must-resolve card requires explicit doctor review
      const mustResolve = ws.mustResolveItems.find((m: any) => m.itemRef === `doc-failed:${doc.id}`);
      expect(mustResolve).toBeDefined();
      expect(mustResolve.verificationState).toBe('UNREADABLE');
      expect(mustResolve.rawExtractedValue).toBe('[HANDWRITTEN UNREADABLE]');
      expect(mustResolve.isResolved).toBe(false);
    });
  });

  // ============================================================================
  // 5. CORRUPTED PDF & UNSUPPORTED FILE FORMAT DEFENSE
  // ============================================================================
  describe('5. Corrupted PDF & Unsupported File Type Protection', () => {
    it('Should reject corrupted PDF claiming to be PDF but missing valid PDF header', async () => {
      const provider = new TesseractOcrProvider();
      const corruptedPdfBuffer = Buffer.from('NOT_A_REAL_PDF_GARBAGE_HEADER_123456789012345678901234567890');

      const res = await provider.extractText(corruptedPdfBuffer, 'application/pdf');

      expect(res.success).toBe(false);
      expect(res.extractedFields).toHaveLength(0);
      expect(res.errorMessage).toContain('Corrupted or invalid PDF document');
    });

    it('Should reject unsupported file formats (e.g. audio/video/zip)', async () => {
      const provider = new TesseractOcrProvider();
      const zipBuffer = Buffer.from('PK\x03\x04unsupported_archive_file_bytes_over_32_bytes_long');

      const res = await provider.extractText(zipBuffer, 'application/zip');

      expect(res.success).toBe(false);
      expect(res.extractedFields).toHaveLength(0);
      expect(res.errorMessage).toContain('Unsupported document format');
    });
  });

  // ============================================================================
  // 6. EMPTY EXTRACTION OUTPUT DEFENSE
  // ============================================================================
  describe('6. Empty Extraction Output Defense', () => {
    it('Should reject tiny or blank files under 32 bytes without fabricating data', async () => {
      const provider = new TesseractOcrProvider();
      const tinyBuffer = Buffer.from('tiny');

      const res = await provider.extractText(tinyBuffer, 'image/png');

      expect(res.success).toBe(false);
      expect(res.extractedFields).toHaveLength(0);
      expect(res.errorMessage).toContain('File below minimal resolution threshold');
    });
  });

  // ============================================================================
  // 7. OCR SERVICE UNAVAILABLE / EXCEPTION HANDLING
  // ============================================================================
  describe('7. OCR Service Unavailability Resilience', () => {
    it('Should catch OCR service crashes cleanly and record FAILED status without crashing API', async () => {
      OcrService.setProvider(new UnavailableOcrProvider());

      const uploadBuffer = Buffer.concat([pngHeader, Buffer.from('crash testing buffer with sufficient bytes')]);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: uploadBuffer.toString('base64'),
          fileName: 'service_crash_test.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      const doc = uploadRes.body.data.document;
      expect(doc.ocr_status).toBe('FAILED');
      expect(doc.overall_status).toBe('EXTRACTION_FAILED');
      expect(doc.ocr_error_message).toContain('OCR optical engine subprocess crashed');
    });
  });

  // ============================================================================
  // 8. ORIGINAL DOCUMENT RETRIEVAL AFTER OCR FAILURE
  // ============================================================================
  describe('8. Original Document Retrieval After OCR Failure', () => {
    it('Should preserve physical scan on disk and allow doctor retrieval even after OCR failure', async () => {
      OcrService.setProvider(new HandwrittenUnreadableOcrProvider());

      const originalPayload = Buffer.concat([
        pngHeader,
        Buffer.from('ORIGINAL PHYSICIAN SCAN REMAINS ACCESSIBLE IN HIGH RES'),
      ]);

      // 1. Upload fails OCR
      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: originalPayload.toString('base64'),
          fileName: 'original_scan_intact.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      const documentId = uploadRes.body.data.document.id;

      // 2. Treating doctor requests signed retrieval URL
      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/snippet?visitId=${visitId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(snippetRes.status).toBe(200);
      const signedUrl = snippetRes.body.data.signedUrl;

      // 3. Doctor streams original file and receives exact byte integrity
      const streamRes = await request(app).get(signedUrl);

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers['content-type']).toBe('image/png');
      expect(streamRes.body).toEqual(originalPayload);
    });
  });

  // ============================================================================
  // 9. UNVERIFIED INFORMATION CANNOT SILENTLY BECOME CONFIRMED FACTS
  // ============================================================================
  describe('9. Clinical Fact Grounding & Safety Gating', () => {
    it('Validation gate should refuse to validate documents that failed OCR extraction', async () => {
      OcrService.setProvider(new LowConfidenceOcrProvider());

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: Buffer.concat([pngHeader, Buffer.from('unreadable test buffer')]).toString('base64'),
          fileName: 'failed_val_gate.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      const documentId = uploadRes.body.data.document.id;

      // Attempting to run validation gate on a failed document must throw ValidationError
      await expect(ValidationGateService.validateDocument(documentId)).rejects.toThrow(
        /Cannot validate document: OCR extraction failed/
      );
    });
  });
});
