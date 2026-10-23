import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { devFallbackPatientStore } from '../src/modules/patients/dev-fallback-patient-store.js';
import { devFallbackDoctorReviewStore } from '../src/modules/doctor-review/dev-fallback-doctor-review-store.js';
import { DocumentsService } from '../src/modules/documents/documents.service.js';
import { DocumentStorageService } from '../src/modules/documents/storage/document-storage.service.js';
import { ClaimService } from '../src/modules/doctor-review/review/claim.service.js';
import { prisma } from '../src/database/prisma.js';

describe('STAGE 3: ORIGINAL DOCUMENT RETRIEVAL & DOCTOR PORTAL ACCESS CONTROL', () => {
  const app = createApp();

  const doctor1Id = 'c0000000-0000-4000-a000-000000000002';
  const doctor1Token = TokenUtil.generateStaffAccessToken({
    sub: doctor1Id,
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  const doctor2Id = 'c0000000-0000-4000-a000-000000000005';
  const doctor2Token = TokenUtil.generateStaffAccessToken({
    sub: doctor2Id,
    email: 'dr.reddy@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Suresh Reddy',
    hospitalDepartment: 'Cardiology',
  });

  const staffAttendantToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000004',
    email: 'staff@medikiosk.hospital',
    role: 'STAFF_ATTENDANT',
    fullName: 'OPD Staff Attendant',
    hospitalDepartment: 'OPD Reception & Triage',
  });

  const patientA = 'pat-stage3-001';
  const visitA = 'visit-stage3-001';

  const patientB = 'pat-stage3-002';
  const visitB = 'visit-stage3-002';

  // Real PDF binary test payload
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (THUNAI Clinical Prescription) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  
  // Real PNG binary test payload
  const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
  const clinicalImageContent = Buffer.from('THUNAI SCANNED RX - Dr. Sharma - Tab Metformin 500mg BID');
  const pngPayload = Buffer.concat([pngHeader, clinicalImageContent]);

  beforeEach(async () => {
    devFallbackDoctorReviewStore.clearAll();

    // Ensure processing consent for test patients
    devFallbackPatientStore.recordConsent({
      patientId: patientA,
      visitId: visitA,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });

    devFallbackPatientStore.recordConsent({
      patientId: patientB,
      visitId: visitB,
      consentType: 'DOCUMENT_PROCESSING',
      granted: true,
      grantedVia: 'KIOSK_DIGITAL',
    });

    try {
      await prisma.reviewClaim.deleteMany({});
      await prisma.doctorReview.deleteMany({});
    } catch {}
  });

  // ============================================================================
  // 1. VERIFY PREREQUISITE PERMANENT STORAGE
  // ============================================================================
  describe('1. Prerequisite: Permanent Document Storage Verification', () => {
    it('Should confirm permanent document storage directory is active and functional', async () => {
      const storageDir = DocumentStorageService.getStorageBaseDir();
      expect(fs.existsSync(storageDir)).toBe(true);

      const saved = await DocumentStorageService.saveDocumentBuffer(
        'prereq-visit',
        {
          originalname: 'prereq.txt',
          buffer: Buffer.from('Stage 1 and 2 storage integrity test'),
          mimetype: 'text/plain',
          size: 35,
        }
      );
      expect(fs.existsSync(saved.absoluteFilePath)).toBe(true);
    });
  });

  // ============================================================================
  // 2. AUTHORIZED DOCTOR VIEWING AN ASSIGNED CASE
  // ============================================================================
  describe('2. Authorized Doctor Retrieval & Image Streaming Routes', () => {
    it('Should allow treating doctor to request signed snippet URL and stream original PDF file', async () => {
      // 1. Upload original PDF
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pdfHeader,
          originalname: 'presc_stage3.pdf',
          mimetype: 'application/pdf',
          size: pdfHeader.length,
        }
      );
      const documentId = uploadRes.document.id;

      // 2. Request snippet data as authorized doctor
      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/snippet?visitId=${visitA}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(snippetRes.status).toBe(200);
      expect(snippetRes.body.success).toBe(true);
      expect(snippetRes.body.data.signedUrl).toContain(`/api/v1/doctor/documents/${documentId}/image?token=`);
      expect(snippetRes.body.data.mimeType).toBe('application/pdf');
      expect(snippetRes.body.data.fileName).toBe('presc_stage3.pdf');

      const signedUrl = snippetRes.body.data.signedUrl;

      // 3. Stream original PDF using the signed URL
      const streamRes = await request(app).get(signedUrl);

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers['content-type']).toBe('application/pdf');
      expect(streamRes.headers['content-disposition']).toContain('inline; filename="presc_stage3.pdf"');
      expect(streamRes.headers['x-content-type-options']).toBe('nosniff');
      expect(streamRes.headers['cache-control']).toBe('private, max-age=300');
      expect(streamRes.body.slice(0, 4).toString()).toBe('%PDF');
    });

    it('Should support authorized doctor retrieval directly using Bearer JWT header', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'rx_scan.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const directRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/image`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(directRes.status).toBe(200);
      expect(directRes.headers['content-type']).toBe('image/png');
      expect(directRes.headers['content-disposition']).toContain('inline; filename="rx_scan.png"');
      expect(directRes.body).toEqual(pngPayload);
    });

    it('Should support route aliases /documents/:documentId/file and /documents/:documentId/view', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'rx_alias.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const snippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/snippet`)
        .set('Authorization', `Bearer ${doctor1Token}`);
      const signedToken = snippetRes.body.data.signedToken;

      const fileRes = await request(app).get(`/api/v1/doctor/documents/${documentId}/file?token=${signedToken}`);
      expect(fileRes.status).toBe(200);
      expect(fileRes.headers['content-type']).toBe('image/png');

      const viewRes = await request(app).get(`/api/v1/doctor/documents/${documentId}/view?token=${signedToken}`);
      expect(viewRes.status).toBe(200);
      expect(viewRes.headers['content-type']).toBe('image/png');
    });
  });

  // ============================================================================
  // 3. UNAUTHORIZED USER ACCESS & ROLE ENFORCEMENT
  // ============================================================================
  describe('3. Unauthorized User Access Protection', () => {
    it('Should reject document stream requests without token or authorization with 403 Forbidden', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'secret_rx.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const unauthRes = await request(app).get(`/api/v1/doctor/documents/${documentId}/image`);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.success).toBe(false);
      expect(unauthRes.body.error.message).toContain('signed document access token');
    });

    it('Should reject non-physician staff roles (STAFF_ATTENDANT) attempting direct document retrieval', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'secret_rx2.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const staffRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/image`)
        .set('Authorization', `Bearer ${staffAttendantToken}`);

      expect(staffRes.status).toBe(403);
      expect(staffRes.body.error.message).toContain('restricted to physicians');
    });
  });

  // ============================================================================
  // 4. CROSS-PATIENT & CROSS-VISIT ACCESS CONTROL
  // ============================================================================
  describe('4. Cross-Patient & Cross-Visit Isolation Checks', () => {
    it('Should block doctor attempting to access Document A using an unrelated Visit B query', async () => {
      const uploadResA = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'patient_a_doc.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const docAId = uploadResA.document.id;

      // 1. Block cross-visit in snippet request
      const crossSnippetRes = await request(app)
        .get(`/api/v1/doctor/documents/${docAId}/snippet?visitId=${visitB}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(crossSnippetRes.status).toBe(403);
      expect(crossSnippetRes.body.error.message).toContain('Document does not belong to the requested visit session');

      // 2. Block cross-visit in image stream request
      const crossStreamRes = await request(app)
        .get(`/api/v1/doctor/documents/${docAId}/image?visitId=${visitB}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(crossStreamRes.status).toBe(403);
      expect(crossStreamRes.body.error.message).toContain('Document does not belong to the requested visit session');
    });

    it('Should block doctor attempting to access Document A using an unrelated Patient B query', async () => {
      const uploadResA = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'patient_a_doc2.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const docAId = uploadResA.document.id;

      const crossPatientRes = await request(app)
        .get(`/api/v1/doctor/documents/${docAId}/image?patientId=${patientB}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(crossPatientRes.status).toBe(403);
      expect(crossPatientRes.body.error.message).toContain('Document does not belong to the requested patient');
    });

    it('Should block another doctor from accessing document of an active claimed case without permission', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'claimed_case.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      // Doctor 1 claims the visit
      await ClaimService.claimVisit(visitA, doctor1Id, 'Dr. Ananya Sharma');

      // Doctor 2 attempts to retrieve document without out-of-queue reason
      const doc2Res = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/image`)
        .set('Authorization', `Bearer ${doctor2Token}`);

      expect(doc2Res.status).toBe(403);
      expect(doc2Res.body.error.message).toContain('Case is claimed by another physician');

      // Doctor 2 provides outOfQueueReason -> access is permitted
      const overrideRes = await request(app)
        .get(`/api/v1/doctor/documents/${documentId}/image?outOfQueueReason=Emergency+Cross-Specialty+Consult`)
        .set('Authorization', `Bearer ${doctor2Token}`);

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.headers['content-type']).toBe('image/png');
    });
  });

  // ============================================================================
  // 5. MISSING DOCUMENT & PATH TRAVERSAL DEFENSE
  // ============================================================================
  describe('5. Missing Document & Path Traversal Security', () => {
    it('Should return honest 404 for missing document without leaking filesystem paths or PHI', async () => {
      const missingDocId = 'c0000000-0000-4000-a000-000000000999';

      const res = await request(app)
        .get(`/api/v1/doctor/documents/${missingDocId}/image`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(`Document not found: ${missingDocId}`);
      // Ensure no absolute file system paths are disclosed in error response
      expect(JSON.stringify(res.body)).not.toContain('C:\\');
      expect(JSON.stringify(res.body)).not.toContain('/Users/');
    });

    it('Should reject directory traversal sequences in documentId with 403 Forbidden', async () => {
      const traversalDocId = '..%2f..%2f..%2fetc%2fpasswd';

      const res = await request(app)
        .get(`/api/v1/doctor/documents/${traversalDocId}/image`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('path traversal');
    });
  });

  // ============================================================================
  // 6. TOKEN SECURITY: INVALID, TAMPERED & EXPIRED TOKENS
  // ============================================================================
  describe('6. Signed Token Cryptographic Security', () => {
    it('Should reject arbitrary untrusted query string tokens', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'tamper_test.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const arbitraryRes = await request(app).get(
        `/api/v1/doctor/documents/${documentId}/image?token=fake-token-12345`
      );
      expect(arbitraryRes.status).toBe(403);
      expect(arbitraryRes.body.error.message).toContain('signed document access token');
    });

    it('Should reject cryptographically tampered signed tokens', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'tamper_sig.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      const { token } = TokenUtil.generateSignedDocumentToken(documentId, doctor1Id, 15 * 60 * 1000);
      // Tamper signature by modifying one character
      const tamperedToken = token.slice(0, -3) + 'XYZ';

      const tamperRes = await request(app).get(
        `/api/v1/doctor/documents/${documentId}/image?token=${tamperedToken}`
      );
      expect(tamperRes.status).toBe(403);
    });

    it('Should reject signed token issued for Document A when used to request Document B', async () => {
      const uploadResA = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'doc_a.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const uploadResB = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'doc_b.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );

      const { token: tokenA } = TokenUtil.generateSignedDocumentToken(
        uploadResA.document.id,
        doctor1Id,
        15 * 60 * 1000
      );

      // Attempt to access Document B with Token A
      const crossDocRes = await request(app).get(
        `/api/v1/doctor/documents/${uploadResB.document.id}/image?token=${tokenA}`
      );
      expect(crossDocRes.status).toBe(403);
    });

    it('Should reject expired signed document retrieval tokens', async () => {
      const uploadRes = await DocumentsService.uploadAndProcessDocument(
        visitA,
        patientA,
        {
          buffer: pngPayload,
          originalname: 'expired_doc.png',
          mimetype: 'image/png',
          size: pngPayload.length,
        }
      );
      const documentId = uploadRes.document.id;

      // Token generated with negative expiry (expired 1 minute ago)
      const { token: expiredToken } = TokenUtil.generateSignedDocumentToken(
        documentId,
        doctor1Id,
        -60 * 1000
      );

      const expiredRes = await request(app).get(
        `/api/v1/doctor/documents/${documentId}/image?token=${expiredToken}`
      );
      expect(expiredRes.status).toBe(403);
      expect(expiredRes.body.error.message).toContain('signed document access token');
    });
  });
});
