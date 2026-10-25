import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { prisma } from '../src/database/prisma.js';
import { DocumentStorageService } from '../src/modules/documents/storage/document-storage.service.js';
import { DocumentsRepository } from '../src/modules/documents/documents.repository.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';
import { OcrProviderFactory } from '../src/modules/documents/ocr/ocr-provider-adapter.js';
import { SummaryService } from '../src/modules/summary/summary.service.js';
import { SummarizationProvider, SummarizationProviderResponse } from '../src/modules/summary/generation/summarization-provider.js';

describe('PHASE 5: COMPLETE PRODUCT WORKFLOW & AI VERIFICATION', () => {
  const app = createApp();

  // Synthetic Doctor Staff Authentication Token
  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  // Synthetic valid electronic PDF #1: Outpatient Prescription
  const syntheticPdf1 = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 220 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Dr. Rajesh Kumar MBBS MD) Tj\n0 -20 Td\n(Date: 12/04/2026) Tj\n0 -20 Td\n(Rx: Metformin 500mg 1 tab twice daily) Tj\n0 -20 Td\n(Fasting Blood Glucose 142 mg/dL) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000183 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n450\n%%EOF`
  ).toString('base64');

  // Synthetic valid electronic PDF #2: Diagnostic Follow-up Lab Report
  const syntheticPdf2 = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 230 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Dr. Rajesh Kumar MBBS MD) Tj\n0 -20 Td\n(Date: 18/06/2026) Tj\n0 -20 Td\n(Rx: Metformin 850mg 1 tab twice daily) Tj\n0 -20 Td\n(HbA1c 7.4 %) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000183 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n460\n%%EOF`
  ).toString('base64');

  let patientId: string;
  let visitId: string;
  let sessionToken: string;
  let doc1Id: string;
  let doc2Id: string;

  let otherPatientSessionToken: string;
  let otherVisitId: string;

  beforeAll(async () => {
    // Configure Tesseract OCR provider
    const tesseractProvider = OcrProviderFactory.getProvider('TESSERACT');
    OcrService.setProvider(tesseractProvider);
  });

  afterAll(async () => {
    SummaryService.setProvider(null);
  });

  it('Step 1: Patient Registers at Kiosk with AI and Doctor Consents', async () => {
    const res = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'Meenakshi Sundaram',
        gender: 'FEMALE',
        age: 54,
        contactNumber: '9840998877',
        preferredLanguage: 'en',
        isCompanionAssisted: false,
        consentGranted: true,
        consentGrantedVia: 'patient',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session).toBeDefined();

    patientId = res.body.data.patient.id;
    visitId = res.body.data.session.visitId;
    sessionToken = res.body.data.session.sessionToken;
    expect(patientId).toBeTruthy();
    expect(visitId).toBeTruthy();
    expect(sessionToken).toBeTruthy();

    // Start a second separate patient for cross-patient isolation testing
    const otherRes = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'Unrelated Patient B',
        gender: 'MALE',
        age: 30,
        contactNumber: '9840111122',
        preferredLanguage: 'en',
        consentGranted: true,
      });

    otherPatientSessionToken = otherRes.body.data.session.sessionToken;
    otherVisitId = otherRes.body.data.session.visitId;
    expect(otherPatientSessionToken).toBeTruthy();
    expect(otherVisitId).toBeTruthy();
  });

  it('Step 2: Upload Synthetic Medical PDF #1 and Verify Storage, Visit Association & OCR', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        fileBase64: syntheticPdf1,
        fileName: 'metformin_prescription_april.pdf',
        mimeType: 'application/pdf',
        documentType: 'PRESCRIPTION',
      });

    expect([200, 201]).toContain(uploadRes.status);
    expect(uploadRes.body.success).toBe(true);
    const doc = uploadRes.body.data.document;
    expect(doc).toBeDefined();
    doc1Id = doc.id;
    expect(doc1Id).toBeTruthy();

    // Verify patient and visit associations via Repository
    const dbDoc = await DocumentsRepository.findDocumentById(doc1Id);
    expect(dbDoc).toBeTruthy();
    expect(dbDoc.patient_id).toBe(patientId);
    expect(dbDoc.visit_id).toBe(visitId);

    // Verify physical file stored permanently on disk
    const storageRef = dbDoc.storage_reference;
    expect(storageRef).toBeTruthy();
    const resolvedPath = DocumentStorageService.resolveDocumentFile(storageRef);
    expect(resolvedPath).toBeTruthy();

    // Verify OCR extraction
    expect(dbDoc.ocr_status).toBe('COMPLETED');
    expect(['FULLY_VERIFIED', 'NEEDS_PHYSICIAN_REVIEW']).toContain(dbDoc.overall_status);
    expect(Array.isArray(dbDoc.validated_fields)).toBe(true);

    const verified = (dbDoc.validated_fields as any[]) || [];
    const hasMetformin = verified.some((f) => {
      const match = f.matched_reference_value || f.matchedReferenceValue || f.raw_text || f.rawText;
      return match?.toLowerCase().includes('metformin');
    });
    expect(hasMetformin).toBe(true);
  }, 45000);

  it('Step 3: Individual Summary Generation with Live LLM Fallback (Server Unavailable produces TEMPLATE_FALLBACK)', async () => {
    // Simulate LLM service offline / connection refused
    const offlineLlmProvider: SummarizationProvider = {
      providerId: 'LOCAL_LLM',
      modelId: 'llama3.2:1b',
      modelVersion: '2026.01',
      isMock: false,
      generate: async () => {
        throw new Error('LLM provider service unavailable at http://localhost:11434/v1: connect ECONNREFUSED 127.0.0.1:11434');
      },
    };

    SummaryService.setProvider(offlineLlmProvider);

    // Clear cached summary on document in memory & DB so offline fallback is tested
    await prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = NULL WHERE id = $1::uuid`, doc1Id);
    const diskMeta = await DocumentsRepository.findDocumentById(doc1Id);
    if (diskMeta) {
      delete (diskMeta as any).summary;
      await DocumentStorageService.saveDocumentMetadata(visitId, diskMeta);
    }

    const res = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const summary = res.body.data;
    expect(summary).toBeDefined();
    expect(summary.documentId).toBe(doc1Id);

    // Must be marked honestly as TEMPLATE_FALLBACK (not claimed as successful AI)
    expect(summary.isMock).toBe(false);
    expect(summary.modelId).toBe('TEMPLATE_FALLBACK');
    expect(summary.medications.length).toBeGreaterThan(0);
    expect(summary.medications[0].name.toLowerCase()).toContain('metformin');
  }, 45000);

  it('Step 4: Individual Summary Generation with Successful Real AI Inference', async () => {
    // Simulate real AI LLM response
    const realLlmProvider: SummarizationProvider = {
      providerId: 'LOCAL_LLM',
      modelId: 'llama3.2:1b',
      modelVersion: '2026.01',
      isMock: false,
      generate: async (_userPayload: string, _systemPrompt: string): Promise<SummarizationProviderResponse> => {
        return {
          rawOutput: JSON.stringify({
            importantFindings: [
              'AI: Patient prescribed Metformin 500mg BID for glycemic control',
              'AI: Fasting Blood Glucose is elevated at 142 mg/dL',
            ],
            clinicalObservations: [
              'AI: Consistent with Type 2 Diabetes Mellitus management protocol.',
            ],
          }),
          modelId: 'llama3.2:1b',
          modelVersion: '2026.01',
          tokensUsed: { promptTokens: 45, completionTokens: 38, totalTokens: 83 },
          latencyMs: 120,
        };
      },
    };

    SummaryService.setProvider(realLlmProvider);

    // Clear cached summary on document in memory & DB
    await prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = NULL WHERE id = $1::uuid`, doc1Id);
    const diskMeta = await DocumentsRepository.findDocumentById(doc1Id);
    if (diskMeta) {
      delete (diskMeta as any).summary;
      await DocumentStorageService.saveDocumentMetadata(visitId, diskMeta);
    }

    const res = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const summary = res.body.data;
    expect(summary).toBeDefined();

    // Genuine AI status verified
    expect(summary.isMock).toBe(false);
    expect(summary.modelId).toBe('llama3.2:1b');
    expect(summary.importantFindings.some((f: string) => f.includes('Metformin'))).toBe(true);
  }, 45000);

  it('Step 5: Upload Second Synthetic Record for Same Patient (Lab Report & Dosage Escalation)', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        fileBase64: syntheticPdf2,
        fileName: 'metformin_lab_followup_june.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAB_REPORT',
      });

    expect([200, 201]).toContain(uploadRes.status);
    expect(uploadRes.body.success).toBe(true);
    doc2Id = uploadRes.body.data.document.id;
    expect(doc2Id).toBeTruthy();

    const dbDoc2 = await DocumentsRepository.findDocumentById(doc2Id);
    expect(dbDoc2).toBeTruthy();
    expect(dbDoc2.patient_id).toBe(patientId);
    expect(dbDoc2.visit_id).toBe(visitId);
    expect(dbDoc2.ocr_status).toBe('COMPLETED');
  }, 45000);

  it('Step 6: Generate and Verify Multi-Document Combined Summary Across Both Records', async () => {
    const res = await request(app)
      .post(`/api/v1/doctor/visits/${visitId}/combined-summary/regenerate`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const combined = res.body.data;
    expect(combined).toBeDefined();

    // Verify multi-document consolidation
    expect(combined.totalDocumentsCount).toBe(2);
    expect(combined.includedDocuments.length).toBe(2);

    // Verify source document references preserved
    expect(combined.activeMedications.length).toBeGreaterThan(0);
    combined.activeMedications.forEach((med: any) => {
      expect(med.sourceDocument).toBeDefined();
      expect(typeof med.sourceDocument).toBe('string');
    });

    // Verify discrepancy detection (Metformin 500mg in doc1 vs 850mg in doc2)
    expect(combined.potentialInconsistencies.length).toBeGreaterThan(0);
    const discrepancy = combined.potentialInconsistencies.find((i: string) => i.toLowerCase().includes('metformin'));
    expect(discrepancy).toBeDefined();
    expect(discrepancy).toContain('Dosage discrepancy detected');

    // Verify status
    expect(combined.doctorReviewStatus).toBe('PENDING_REVIEW');
    expect(combined.generationMode).toBe('LLM');
  }, 45000);

  it('Step 7: Doctor Review Workspace Verification (Records, Previews & Summaries)', async () => {
    // 1. Fetch all medical records for the visit
    const recsRes = await request(app)
      .get(`/api/v1/doctor/visits/${visitId}/medical-records`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(recsRes.status).toBe(200);
    expect(recsRes.body.success).toBe(true);
    expect(recsRes.body.data.length).toBe(2);

    // 2. Fetch combined summary via GET endpoint
    const combRes = await request(app)
      .get(`/api/v1/doctor/visits/${visitId}/combined-summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(combRes.status).toBe(200);
    expect(combRes.body.data.totalDocumentsCount).toBe(2);

    // 3. Verify original document preview/download works
    const fileRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/file`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(fileRes.status).toBe(200);
    expect(fileRes.headers['content-type']).toContain('application/pdf');
    expect(fileRes.body.length).toBeGreaterThan(50);
  });

  it('Step 8: Doctor Approves Combined Summary with Clinical Notes', async () => {
    const approveRes = await request(app)
      .post(`/api/v1/doctor/visits/${visitId}/combined-summary/approve`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        notes: 'Reviewed and confirmed. Patient escalated to Metformin 850mg following HbA1c elevation to 7.4%.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.doctorReviewStatus).toBe('APPROVED');
    expect(approveRes.body.data.doctorNotes).toContain('Metformin 850mg');
  });

  it('Step 9: Patient Isolation Test — Unauthorized Patient Cannot Access Documents or Summaries', async () => {
    // Attempt to access Patient A's document summary using Patient B's kiosk session
    const unauthorizedRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${otherPatientSessionToken}`);

    // Kiosk patient role is strictly blocked from reading clinical summaries / doctor endpoints
    expect([401, 403]).toContain(unauthorizedRes.status);
  });
});
