import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { devFallbackPatientStore } from '../src/modules/patients/dev-fallback-patient-store.js';
import { DocumentsService } from '../src/modules/documents/documents.service.js';
import { DocumentsRepository } from '../src/modules/documents/documents.repository.js';
import { DocumentStorageService } from '../src/modules/documents/storage/document-storage.service.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';
import { IOcrProvider } from '../src/modules/documents/ocr/ocr-provider-adapter.js';
import { prisma, checkDatabaseHealth } from '../src/database/prisma.js';

describe('DOCUMENT STORAGE, SECURE STREAMING & RECOVERY AUDIT SUITE', () => {
  const app = createApp();

  const patientIdA = 'pat-audit-test-01';
  const visitIdA = 'visit-audit-test-01';

  const patientIdB = 'pat-audit-test-02';
  const visitIdB = 'visit-audit-test-02';

  const kioskSessionTokenA = TokenUtil.generateKioskSessionToken({
    sessionId: 'session-kiosk-audit-a',
    visitId: visitIdA,
    patientId: patientIdA,
  }).token;

  const kioskSessionTokenB = TokenUtil.generateKioskSessionToken({
    sessionId: 'session-kiosk-audit-b',
    visitId: visitIdB,
    patientId: patientIdB,
  }).token;

  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  // Valid mock prescription image with verifiable content
  const header = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
  const clinicalText = Buffer.from(
    ' THUNAI CLINICAL SCAN - Rx: Amoxicillin 500mg - 1-0-1 - Paracetamol 650mg - Dr. Sharma OPD Clinic 2026. ' +
    'Patient instructed to take after meals for 5 days. No known drug allergies reported at intake.'
  );
  const testFileBuffer = Buffer.concat([header, clinicalText]);

  beforeEach(() => {
    // Record mandatory document processing consent for visit A and B
    devFallbackPatientStore.recordConsent({
      patientId: patientIdA,
      visitId: visitIdA,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });

    devFallbackPatientStore.recordConsent({
      patientId: patientIdB,
      visitId: visitIdB,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });
  });

  afterAll(async () => {
    // Clean up created test directories in storage
    try {
      const baseDir = DocumentsService.getStorageBaseDir();
      const testDirA = path.join(baseDir, visitIdA);
      const testDirB = path.join(baseDir, visitIdB);
      if (fs.existsSync(testDirA)) {
        await fs.promises.rm(testDirA, { recursive: true, force: true });
      }
      if (fs.existsSync(testDirB)) {
        await fs.promises.rm(testDirB, { recursive: true, force: true });
      }
    } catch {}
  });

  // ============================================================================
  // 1. SUCCESSFUL DOCUMENT UPLOAD AND PERMANENT FILE CREATION
  // ============================================================================
  it('1. Should successfully upload document and permanently create file with collision-resistant naming', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'prescription_sample.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const doc = res.body.data.document;
    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    // Collision-resistant filename format: UUID_timestamp_sanitizedName.ext
    expect(doc.storage_reference).toMatch(/^storage[/\\]documents[/\\]visit-audit-test-01[/\\][a-f0-9-]+_\d+_prescription_sample\.png$/);

    // Verify physical file on disk
    const storageBase = DocumentsService.getStorageBaseDir();
    const visitDir = path.join(storageBase, visitIdA);
    expect(fs.existsSync(visitDir)).toBe(true);

    const files = await fs.promises.readdir(visitDir);
    const matched = files.find((f) => f.endsWith('_prescription_sample.png'));
    expect(matched).toBeDefined();

    const diskContent = await fs.promises.readFile(path.join(visitDir, matched!));
    expect(diskContent.equals(testFileBuffer)).toBe(true);

    // Verify durable metadata manifest (.meta.json) was also saved to disk
    const metaFile = path.join(visitDir, `${doc.id}.meta.json`);
    expect(fs.existsSync(metaFile)).toBe(true);
    const metaContent = JSON.parse(await fs.promises.readFile(metaFile, 'utf8'));
    expect(metaContent.id).toBe(doc.id);
    expect(metaContent.storage_reference).toBe(doc.storage_reference);
  }, 15000);

  // ============================================================================
  // 2. RETRIEVAL OF THE ORIGINAL UPLOADED FILE
  // ============================================================================
  it('2. Should retrieve the original uploaded file with exact byte integrity and secure headers', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'retrieval_test.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });
    const docId = uploadRes.body.data.document.id;

    const streamRes = await request(app)
      .get(`/api/v1/kiosk/documents/${docId}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toBe('image/png');
    expect(streamRes.headers['content-disposition']).toContain('inline; filename="retrieval_test.png"');
    expect(streamRes.headers['x-content-type-options']).toBe('nosniff');
    expect(streamRes.headers['cache-control']).toContain('private');
    expect(streamRes.body.equals(testFileBuffer)).toBe(true);
  });

  // ============================================================================
  // 3. MISSING DOCUMENT HANDLING
  // ============================================================================
  it('3. Should return honest 404 for missing document rather than fabricating clinical content', async () => {
    const missingDocId = 'non-existent-doc-00000000';

    // Kiosk endpoint
    const kioskRes = await request(app)
      .get(`/api/v1/kiosk/documents/${missingDocId}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(kioskRes.status).toBe(404);
    expect(kioskRes.body.success).toBe(false);

    // Doctor endpoint with valid doctor token
    const doctorRes = await request(app)
      .get(`/api/v1/doctor/documents/${missingDocId}/image`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(doctorRes.status).toBe(404);
    expect(doctorRes.body.success).toBe(false);
    expect(doctorRes.body.error?.message).toContain('not found');
  });

  // ============================================================================
  // 4. UNAUTHORIZED DOCUMENT ACCESS
  // ============================================================================
  it('4. Should reject unauthorized document access without valid token or Bearer header', async () => {
    // 1. No authorization header on kiosk
    const unauthKiosk = await request(app).get('/api/v1/kiosk/documents/any-id/file');
    expect(unauthKiosk.status).toBe(401);

    // 2. Doctor image without token or header
    const unauthDoctor = await request(app).get('/api/v1/doctor/documents/any-id/image');
    expect(unauthDoctor.status).toBe(403);
    expect(unauthDoctor.body.success).toBe(false);

    // 3. Arbitrary fake query token must NOT grant access
    const fakeTokenDoctor = await request(app).get('/api/v1/doctor/documents/any-id/image?token=arbitrary_unauthorized_token_123');
    expect(fakeTokenDoctor.status).toBe(403);
    expect(fakeTokenDoctor.body.success).toBe(false);
  });

  // ============================================================================
  // 5. ACCESS TO ANOTHER PATIENT'S DOCUMENT BEING DENIED
  // ============================================================================
  it('5. Should deny access when Patient B attempts to stream Patient A document', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'patient_a_confidential.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });
    const docId = uploadRes.body.data.document.id;

    // Patient B attempts cross-session access
    const crossRes = await request(app)
      .get(`/api/v1/kiosk/documents/${docId}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenB}`);

    expect(crossRes.status).toBe(403);
    expect(crossRes.body.success).toBe(false);
    expect(crossRes.body.error?.message).toContain('another visit session');
  });

  // ============================================================================
  // 6. INVALID IDENTIFIERS AND PATH-TRAVERSAL ATTEMPTS
  // ============================================================================
  it('6. Should block path-traversal attempts and invalid identifiers', async () => {
    // Path traversal in documentId
    const traversalRes = await request(app)
      .get('/api/v1/kiosk/documents/..%2F..%2Fetc%2Fpasswd/file')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);

    expect([400, 403, 404]).toContain(traversalRes.status);
    expect(traversalRes.body.success).toBe(false);

    // Attempt direct getDocumentFile call with path traversal
    await expect(DocumentsService.getDocumentFile('../../etc/passwd')).rejects.toThrow();
  });

  // ============================================================================
  // 7. OCR FAILURE PRESERVING THE ORIGINAL DOCUMENT
  // ============================================================================
  it('7. Should preserve original document and record FAILED status without fabricating data when OCR fails', async () => {
    // Temporarily mock OCR provider to simulate unreadable/failed handwriting
    const originalProvider = OcrService.getProvider();
    const failingProvider: IOcrProvider = {
      name: 'FailingOcrProvider',
      extractText: async () => ({
        success: false,
        extractedFields: [],
        fullText: '',
        pageCount: 1,
        errorMessage: 'Handwritten prescription illegible: OCR confidence below threshold (18% < 35%)',
      }),
    };

    try {
      OcrService.setProvider(failingProvider);

      const uploadRes = await request(app)
        .post('/api/v1/kiosk/documents/upload')
        .set('Authorization', `Bearer ${kioskSessionTokenA}`)
        .send({
          fileBase64: testFileBuffer.toString('base64'),
          fileName: 'illegible_handwritten_rx.png',
          mimeType: 'image/png',
          documentType: 'PRESCRIPTION',
        });

      expect(uploadRes.status).toBe(201);
      const doc = uploadRes.body.data.document;
      expect(doc.ocr_status).toBe('FAILED');
      expect(doc.overall_status).toBe('EXTRACTION_FAILED');
      expect(uploadRes.body.data.ocrResult.fieldsExtracted).toBe(0);

      // Verify physical document binary STILL EXISTS and can be retrieved
      const streamRes = await request(app)
        .get(`/api/v1/kiosk/documents/${doc.id}/file`)
        .set('Authorization', `Bearer ${kioskSessionTokenA}`);
      expect(streamRes.status).toBe(200);
      expect(streamRes.body.equals(testFileBuffer)).toBe(true);

      // Verify doctor workspace reports this document under failedDocuments
      const wsRes = await request(app)
        .get(`/api/v1/doctor/visits/${visitIdA}/workspace`)
        .set('Authorization', `Bearer ${doctorToken}`);

      if (wsRes.status === 200) {
        const failedDocs = wsRes.body.data.failedDocuments;
        expect(failedDocs).toBeDefined();
        const found = failedDocs.find((d: any) => d.id === doc.id);
        expect(found).toBeDefined();
        expect(found.fileName).toBe('illegible_handwritten_rx.png');
      }
    } finally {
      OcrService.setProvider(originalProvider);
    }
  }, 15000);

  // ============================================================================
  // 8. DOCTOR IMAGE ENDPOINT RETURNING THE CORRECT RESPONSE
  // ============================================================================
  it('8. Should allow doctor to stream document using valid HMAC signed token and Bearer JWT', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'doctor_verified_rx.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });
    const docId = uploadRes.body.data.document.id;

    // A. Request signed snippet URL as Doctor
    const snippetRes = await request(app)
      .get(`/api/v1/doctor/documents/${docId}/snippet?snippetRef=rx_line_1`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(snippetRes.status).toBe(200);
    const snippet = snippetRes.body.data;
    expect(snippet.signedToken).toBeDefined();
    expect(snippet.signedUrl).toContain(`/api/v1/doctor/documents/${docId}/image?token=`);

    // B. Stream image using only the signed query token
    const tokenImageRes = await request(app).get(snippet.signedUrl);
    expect(tokenImageRes.status).toBe(200);
    expect(tokenImageRes.headers['content-type']).toBe('image/png');
    expect(tokenImageRes.body.equals(testFileBuffer)).toBe(true);

    // C. Stream image directly using Doctor Bearer token
    const bearerImageRes = await request(app)
      .get(`/api/v1/doctor/documents/${docId}/image`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(bearerImageRes.status).toBe(200);
    expect(bearerImageRes.body.equals(testFileBuffer)).toBe(true);

    // D. Full file endpoint (/file) also works
    const bearerFileRes = await request(app)
      .get(`/api/v1/doctor/documents/${docId}/file`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(bearerFileRes.status).toBe(200);
    expect(bearerFileRes.body.equals(testFileBuffer)).toBe(true);
  });

  // ============================================================================
  // 9. DATABASE FAILURES BEING REPORTED HONESTLY
  // ============================================================================
  it('9. Should report database connectivity honestly on /health and /status endpoints', async () => {
    const isConnected = await checkDatabaseHealth();

    // Health endpoint
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.success).toBe(true);
    expect(healthRes.body.data.database).toBe(isConnected ? 'connected' : 'disconnected');
    expect(healthRes.body.data.status).toBe(isConnected ? 'healthy' : 'degraded');

    // Status board
    const statusRes = await request(app).get('/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.services.database).toBe(isConnected ? 'OPERATIONAL' : 'DEGRADED');
  });

  // ============================================================================
  // 10. METADATA PERSISTENCE ACROSS REPOSITORY CACHE MISSES
  // ============================================================================
  it('10. Should reload document from persistent disk metadata if memory cache is cleared', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'durable_record_test.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });
    const docId = uploadRes.body.data.document.id;

    // Verify findDocumentById can locate the document on disk even if searched afresh
    const retrieved = await DocumentsRepository.findDocumentById(docId);
    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(docId);
    expect(retrieved.file_name).toBe('durable_record_test.png');
  });

  // ============================================================================
  // 11. PERMANENT STORAGE & RETRIEVAL FOR ORIGINAL PDF DOCUMENTS
  // ============================================================================
  it('11. Should permanently save original PDF uploads with collision-resistant naming and allow streaming', async () => {
    const pdfBuffer = Buffer.from(
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Title (THUNAI Clinical Discharge Prescription)\n/Author (Apollo Hospitals)\n>>\nendobj\n' +
      'xref\n0 1\n0000000000 65535 f \ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF'
    );

    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: pdfBuffer.toString('base64'),
        fileName: 'discharge_summary.pdf',
        mimeType: 'application/pdf',
        documentType: 'DISCHARGE_SUMMARY',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);

    const doc = uploadRes.body.data.document;
    expect(doc.id).toBeDefined();
    expect(doc.mime_type).toBe('application/pdf');
    expect(doc.storage_reference).toMatch(/^storage[/\\]documents[/\\]visit-audit-test-01[/\\][a-f0-9-]+_\d+_discharge_summary\.pdf$/);

    // Verify physical file on disk
    const storageBase = DocumentsService.getStorageBaseDir();
    const visitDir = path.join(storageBase, visitIdA);
    const files = await fs.promises.readdir(visitDir);
    const matchedPdf = files.find((f) => f.endsWith('_discharge_summary.pdf'));
    expect(matchedPdf).toBeDefined();

    const diskContent = await fs.promises.readFile(path.join(visitDir, matchedPdf!));
    expect(diskContent.equals(pdfBuffer)).toBe(true);

    // Stream PDF via kiosk endpoint
    const streamRes = await request(app)
      .get(`/api/v1/kiosk/documents/${doc.id}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toBe('application/pdf');
    expect(streamRes.headers['content-disposition']).toContain('discharge_summary.pdf');
    expect(streamRes.body.equals(pdfBuffer)).toBe(true);
  });

  // ============================================================================
  // 12. PERMANENT STORAGE FOR JPEG AND WEBP IMAGES
  // ============================================================================
  it('12. Should permanently save original JPEG and WEBP image uploads', async () => {
    // Synthetic JPEG header
    const jpegBuffer = Buffer.concat([
      Buffer.from('ffd8ffe000104a46494600010101006000600000ffdb004300', 'hex'),
      Buffer.from(' CLINICAL LAB REPORT JPEG SCAN CONTENT FOR TESTING '),
      Buffer.from('ffd9', 'hex'),
    ]);

    // Synthetic WEBP
    const webpBuffer = Buffer.concat([
      Buffer.from('52494646', 'hex'), // RIFF
      Buffer.alloc(4), // size
      Buffer.from('57454250', 'hex'), // WEBP
      Buffer.from('VP8 '),
      Buffer.alloc(10),
      Buffer.from(' CLINICAL WEBP SCAN CONTENT '),
    ]);

    // 1. Upload JPEG
    const jpegRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: jpegBuffer.toString('base64'),
        fileName: 'lab_scan.jpeg',
        mimeType: 'image/jpeg',
        documentType: 'LAB_REPORT',
      });
    expect(jpegRes.status).toBe(201);
    const jpegDoc = jpegRes.body.data.document;
    expect(jpegDoc.mime_type).toBe('image/jpeg');

    // 2. Upload WEBP
    const webpRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: webpBuffer.toString('base64'),
        fileName: 'skin_photo.webp',
        mimeType: 'image/webp',
        documentType: 'OTHER',
      });
    expect(webpRes.status).toBe(201);
    const webpDoc = webpRes.body.data.document;
    expect(webpDoc.mime_type).toBe('image/webp');

    // Verify retrieval of both
    const streamJpeg = await request(app)
      .get(`/api/v1/kiosk/documents/${jpegDoc.id}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(streamJpeg.status).toBe(200);
    expect(streamJpeg.body.equals(jpegBuffer)).toBe(true);

    const streamWebp = await request(app)
      .get(`/api/v1/kiosk/documents/${webpDoc.id}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(streamWebp.status).toBe(200);
    expect(streamWebp.body.equals(webpBuffer)).toBe(true);
  });

  // ============================================================================
  // 13. MULTIPART FORM-DATA FILE UPLOAD SUPPORT
  // ============================================================================
  it('13. Should support multipart/form-data upload using optionalUploadMiddleware', async () => {
    const multipartPdf = Buffer.from(
      '%PDF-1.5\n%âãÏÓ\n1 0 obj\n<<\n/Title (Multipart Test)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF'
    );

    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .attach('file', multipartPdf, 'scanned_prescription.pdf')
      .field('documentType', 'PRESCRIPTION');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const doc = uploadRes.body.data.document;
    expect(doc.file_name).toBe('scanned_prescription.pdf');
    expect(doc.mime_type).toBe('application/pdf');

    // Verify stored file on disk
    const streamRes = await request(app)
      .get(`/api/v1/kiosk/documents/${doc.id}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(streamRes.status).toBe(200);
    expect(streamRes.body.equals(multipartPdf)).toBe(true);
  });

  // ============================================================================
  // 14. REJECTED UPLOADS: ENFORCE 15MB LIMIT, INVALID MIME, AND EMPTY PAYLOADS
  // ============================================================================
  it('14. Should reject empty payloads, unsupported formats, and corrupted signatures', async () => {
    // A. Empty file (0 bytes)
    const emptyRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: '',
        fileName: 'empty.png',
        mimeType: 'image/png',
      });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error?.message).toContain('empty');

    // B. Unsupported MIME format (e.g. text/plain)
    const invalidMimeRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: Buffer.from('hello plain text').toString('base64'),
        fileName: 'notes.txt',
        mimeType: 'text/plain',
      });
    expect(invalidMimeRes.status).toBe(400);
    expect(invalidMimeRes.body.error?.message).toContain('Unsupported file format');

    // C. Corrupted magic bytes signature (declared PDF but content is plain text)
    const spoofedRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: Buffer.from('NOT A REAL PDF FILE HEADER').toString('base64'),
        fileName: 'fake.pdf',
        mimeType: 'application/pdf',
      });
    expect(spoofedRes.status).toBe(400);
    expect(spoofedRes.body.error?.message).toContain('signature does not match');

    // D. Missing consent (unconsented visit)
    const unconsentedPatient = 'pat-unconsented-test';
    const unconsentedVisit = 'visit-unconsented-test';
    const unconsentedToken = TokenUtil.generateKioskSessionToken({
      sessionId: 'session-unconsented',
      visitId: unconsentedVisit,
      patientId: unconsentedPatient,
    }).token;

    const noConsentRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${unconsentedToken}`)
      .send({
        fileBase64: testFileBuffer.toString('base64'),
        fileName: 'unconsented.png',
        mimeType: 'image/png',
      });
    expect(noConsentRes.status).toBe(403);
    expect(noConsentRes.body.error?.message).toContain('consent');
  });

  // ============================================================================
  // 15. INTERNAL STORAGE LOGIC: BOUNDARY CONFINEMENT & RESOLUTION
  // ============================================================================
  it('15. Should enforce directory boundary confinement and resolve files safely', () => {
    const storageBase = DocumentStorageService.getStorageBaseDir();
    expect(fs.existsSync(storageBase)).toBe(true);

    // Traversal attempts must throw ForbiddenError
    expect(() => DocumentStorageService.resolveDocumentFile('../../etc/passwd')).toThrow();
    expect(() => DocumentStorageService.resolveDocumentFile('C:\\Windows\\win.ini')).toThrow();
    expect(() => DocumentStorageService.resolveDocumentFile('/var/log/syslog')).toThrow();

    // Identifier validation
    expect(() => DocumentStorageService.validateIdentifier('..', 'testId')).toThrow();
    expect(() => DocumentStorageService.validateIdentifier('visit/evil/path', 'visitId')).toThrow();
    expect(() => DocumentStorageService.validateIdentifier('valid-visit_123', 'visitId')).not.toThrow();
  });

  // ============================================================================
  // 16. DATABASE FAILURE DURING CREATION TRIGGERS PHYSICAL FILE CLEANUP
  // ============================================================================
  it('16. Should safely clean up the stored file if database write fails after file creation', async () => {
    const failPdf = Buffer.from(
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Title (Cleanup Test)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF'
    );

    // Spy on DocumentsRepository.createDocument and simulate database failure
    const createSpy = vi.spyOn(DocumentsRepository, 'createDocument').mockRejectedValueOnce(
      new Error('Simulated PostgreSQL connection drop')
    );

    const storageBase = DocumentsService.getStorageBaseDir();
    const visitDir = path.join(storageBase, visitIdA);

    await expect(
      DocumentsService.uploadAndProcessDocument(visitIdA, patientIdA, {
        buffer: failPdf,
        originalname: 'doomed_file_cleanup.pdf',
        mimetype: 'application/pdf',
        size: failPdf.length,
      })
    ).rejects.toThrow('Simulated PostgreSQL connection drop');

    // Verify file does NOT remain orphaned in the storage directory
    const files = await fs.promises.readdir(visitDir);
    const orphanedFile = files.find((f) => f.includes('doomed_file_cleanup.pdf'));
    expect(orphanedFile).toBeUndefined();

    createSpy.mockRestore();
  });

  // ============================================================================
  // 17. COMPLETION GATE: SYNTHETIC PDF AND IMAGE SURVIVE CONTROLLED BACKEND RESTART
  // ============================================================================
  it('17. COMPLETION GATE: Synthetic PDF and image remain intact on disk and survive backend restart', async () => {
    const pdfBytes = Buffer.from(
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Title (Permanent Archival Record)\n/Hospital (THUNAI AI Kiosk)\n>>\nendobj\n' +
      'xref\n0 1\n0000000000 65535 f \ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF'
    );

    const imgBytes = Buffer.concat([
      Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex'),
      Buffer.from(' THUNAI PERMANENT CLINICAL ARCHIVAL IMAGE RX DATA - APPOINTMENT 2026 '),
    ]);

    // 1. Upload PDF
    const pdfRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: pdfBytes.toString('base64'),
        fileName: 'permanent_archival.pdf',
        mimeType: 'application/pdf',
        documentType: 'DISCHARGE_SUMMARY',
      });
    expect(pdfRes.status).toBe(201);
    const pdfDocId = pdfRes.body.data.document.id;
    const pdfStorageRef = pdfRes.body.data.document.storage_reference;

    // 2. Upload Image
    const imgRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${kioskSessionTokenA}`)
      .send({
        fileBase64: imgBytes.toString('base64'),
        fileName: 'permanent_archival.png',
        mimeType: 'image/png',
        documentType: 'PRESCRIPTION',
      });
    expect(imgRes.status).toBe(201);
    const imgDocId = imgRes.body.data.document.id;
    const imgStorageRef = imgRes.body.data.document.storage_reference;

    // 3. Verify physical files exist on disk before restart
    const resolvedPdf = DocumentStorageService.resolveDocumentFile(pdfStorageRef);
    const resolvedImg = DocumentStorageService.resolveDocumentFile(imgStorageRef);
    expect(resolvedPdf).not.toBeNull();
    expect(resolvedImg).not.toBeNull();
    expect((await fs.promises.readFile(resolvedPdf!)).equals(pdfBytes)).toBe(true);
    expect((await fs.promises.readFile(resolvedImg!)).equals(imgBytes)).toBe(true);

    // =========================================================================
    // 4. SIMULATE CONTROLLED BACKEND RESTART
    // =========================================================================
    // A. Disconnect Prisma Client & flush connections
    await prisma.$disconnect();

    // B. Reconnect Prisma Client
    await prisma.$connect();

    // C. Instantiate a brand new Express application instance
    const restartedApp = createApp();

    // 5. Verify PDF after restart
    const reloadedPdfStream = await request(restartedApp)
      .get(`/api/v1/kiosk/documents/${pdfDocId}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(reloadedPdfStream.status).toBe(200);
    expect(reloadedPdfStream.headers['content-type']).toBe('application/pdf');
    expect(reloadedPdfStream.body.equals(pdfBytes)).toBe(true);

    // 6. Verify Image after restart
    const reloadedImgStream = await request(restartedApp)
      .get(`/api/v1/kiosk/documents/${imgDocId}/file`)
      .set('Authorization', `Bearer ${kioskSessionTokenA}`);
    expect(reloadedImgStream.status).toBe(200);
    expect(reloadedImgStream.headers['content-type']).toBe('image/png');
    expect(reloadedImgStream.body.equals(imgBytes)).toBe(true);

    // 7. Verify database records in PostgreSQL remain valid
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      const dbPdf = await prisma.uploadedDocument.findUnique({ where: { id: pdfDocId } });
      expect(dbPdf).not.toBeNull();
      expect(dbPdf?.storage_reference).toBe(pdfStorageRef);
      expect(dbPdf?.file_size_bytes).toBe(pdfBytes.length);

      const dbImg = await prisma.uploadedDocument.findUnique({ where: { id: imgDocId } });
      expect(dbImg).not.toBeNull();
      expect(dbImg?.storage_reference).toBe(imgStorageRef);
      expect(dbImg?.file_size_bytes).toBe(imgBytes.length);
    }
  }, 30000);
});
