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
  IOcrProvider,
} from '../src/modules/documents/ocr/ocr-provider-adapter.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';
import { DocumentsRepository } from '../src/modules/documents/documents.repository.js';

describe('PRIORITY 2 — PLUGGABLE OCR ADAPTER & DOCTOR FALLBACK BANNER', () => {
  const app = createApp();

  const patientId = 'pat-p2-test-01';
  const visitId = 'visit-p2-test-01';

  const kioskSessionToken = TokenUtil.generateKioskSessionToken({
    sessionId: 'session-kiosk-p2',
    visitId,
    patientId,
  }).token;

  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  const originalProvider = OcrService.getProvider();

  beforeEach(() => {
    devFallbackDoctorReviewStore.clearAll();
    devFallbackPatientStore.recordConsent({
      patientId,
      visitId,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });
  });

  afterEach(() => {
    OcrService.setProvider(originalProvider);
  });

  // ============================================================================
  // P2.1: PLUGGABLE EXTERNAL OCR ADAPTER
  // ============================================================================
  describe('P2.1 — Pluggable External OCR Adapter & Factory', () => {
    it('Should instantiate StandardClinicalOcrProvider by default for offline / test stability', () => {
      const provider = OcrProviderFactory.getProvider('STANDARD');
      expect(provider).toBeInstanceOf(StandardClinicalOcrProvider);
      expect(provider.name).toBe('StandardClinicalOcrProvider');
    });

    it('Should instantiate TesseractOcrProvider when external engine is requested', () => {
      const provider = OcrProviderFactory.getProvider('TESSERACT');
      expect(provider).toBeInstanceOf(TesseractOcrProvider);
      expect(provider.name).toBe('TesseractOcrProvider');
    });

    it('Should allow hot-swapping OCR providers at runtime via OcrService.setProvider', () => {
      const customMockProvider: IOcrProvider = {
        name: 'CustomCloudOcrProvider',
        extractText: async () => ({
          success: true,
          extractedFields: [
            {
              fieldType: 'drug_name',
              rawText: 'Azithromycin 500mg',
              confidence: 0.96,
              sourceSnippetRef: 'custom_line_1',
            },
          ],
          fullText: 'Azithromycin 500mg - OD for 3 days',
          pageCount: 1,
        }),
      };

      OcrService.setProvider(customMockProvider);
      expect(OcrService.getProvider().name).toBe('CustomCloudOcrProvider');
    });

    it('TesseractOcrProvider should return unreadable error for illegible handwriting below threshold', async () => {
      const provider = new TesseractOcrProvider();

      // Buffer under minimal size threshold
      const tinyBuffer = Buffer.from('tiny illegible data');
      const res = await provider.extractText(tinyBuffer, 'image/jpeg');

      expect(res.success).toBe(false);
      expect(res.extractedFields).toHaveLength(0);
      expect(res.errorMessage).toContain('Handwritten prescription could not be automatically digitized');
    });
  });

  // ============================================================================
  // P2.2: PROMINENT DOCTOR FALLBACK BANNER & WORKSPACE INTEGRATION
  // ============================================================================
  describe('P2.2 — Prominent Fallback Doctor Banner for Failed Handwritten Scans', () => {
    it('When OCR fails, workspace should populate failedDocuments and inject mandatory must-resolve item', async () => {
      // 1. Configure Mock Provider that simulates unreadable cursive handwritten prescription
      const unreadableHandwritingProvider: IOcrProvider = {
        name: 'UnreadableHandwritingProvider',
        extractText: async () => ({
          success: false,
          extractedFields: [],
          fullText: '??? illegible ink marks ???',
          pageCount: 1,
          errorMessage: 'Handwritten prescription could not be automatically digitized. Low OCR legibility score.',
        }),
      };
      OcrService.setProvider(unreadableHandwritingProvider);

      // 2. Upload handwritten prescription document via kiosk
      const header = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
      const body = Buffer.from('HANDWRITTEN UNREADABLE CLINICAL SLIP CONTENT > 100 bytes of data for testing failure banner');
      const uploadBuffer = Buffer.concat([header, body]);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionToken}`)
        .send({
          fileBase64: uploadBuffer.toString('base64'),
          fileName: 'illegible_handwritten_rx.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      const doc = uploadRes.body.data.document;
      expect(doc.ocr_status).toBe('FAILED');
      expect(doc.overall_status).toBe('EXTRACTION_FAILED');

      // 3. Doctor starts review and loads workspace
      await request(app)
        .post(`/api/v1/doctor/queue/${visitId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      const wsRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitId}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(wsRes.status).toBe(200);
      expect(wsRes.body.success).toBe(true);
      const ws = wsRes.body.data;

      // 4. Verify failedDocuments array is present on workspace
      expect(ws.failedDocuments).toBeDefined();
      expect(ws.failedDocuments.length).toBeGreaterThanOrEqual(1);

      const failedDoc = ws.failedDocuments.find((d: any) => d.id === doc.id);
      expect(failedDoc).toBeDefined();
      expect(failedDoc.fileName).toBe('illegible_handwritten_rx.png');
      expect(failedDoc.ocrStatus).toBe('FAILED');

      // 5. Verify prominent Must-Resolve card is automatically generated
      const mustResolveItem = ws.mustResolveItems.find(
        (m: any) => m.itemRef === `doc-failed:${doc.id}`
      );
      expect(mustResolveItem).toBeDefined();
      expect(mustResolveItem.title).toBe('Handwritten prescription could not be automatically digitized');
      expect(mustResolveItem.verificationState).toBe('UNREADABLE');
      expect(mustResolveItem.isResolved).toBe(false);

      // 6. Verify original high-resolution scan can be inspected via signed token
      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${doc.id}/snippet`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(snippetRes.status).toBe(200);
      const imageRes = await request(app).get(snippetRes.body.data.signedUrl);
      expect(imageRes.status).toBe(200);
      expect(imageRes.body.equals(uploadBuffer)).toBe(true);
    }, 15000);
  });
});
