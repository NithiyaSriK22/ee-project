import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { LocalLlmAdapter } from '../src/modules/summary/generation/provider-adapters/local-llm-adapter.js';
import { SummaryService } from '../src/modules/summary/summary.service.js';
import { DocumentsRepository } from '../src/modules/documents/documents.repository.js';
import { prisma } from '../src/database/prisma.js';
import { GroundingValidator } from '../src/modules/summary/validation/grounding-validator.js';
import { mockSummarizationProvider } from '../src/modules/summary/generation/provider-adapters/mock-provider-adapter.js';
import { OcrProviderFactory } from '../src/modules/documents/ocr/ocr-provider-adapter.js';
import { OcrService } from '../src/modules/documents/ocr/ocr.service.js';

describe('LIVE REAL AI INFERENCE VERIFICATION (OLLAMA LLAMA3.2:1B)', () => {
  const app = createApp();

  const doctorToken = TokenUtil.generateStaffAccessToken({
    sub: 'c0000000-0000-4000-a000-000000000002',
    email: 'dr.ananya@hospital.org',
    role: 'DOCTOR',
    fullName: 'Dr. Ananya Sharma',
    hospitalDepartment: 'Department of General Medicine',
  });

  // Synthetic Prescription #1: Amlodipine 5mg
  const syntheticPdf1 = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 200 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Dr. Sundar Rajan MD) Tj\n0 -20 Td\n(Date: 20/09/2026) Tj\n0 -20 Td\n(Rx: Amlodipine 5mg 1 tablet daily) Tj\n0 -20 Td\n(Blood Pressure 148/92 mmHg) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000183 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n430\n%%EOF`
  ).toString('base64');

  // Synthetic Lab & Prescription #2: Follow-up with Amlodipine 10mg escalation
  const syntheticPdf2 = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 220 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Dr. Sundar Rajan MD) Tj\n0 -20 Td\n(Date: 15/10/2026) Tj\n0 -20 Td\n(Rx: Amlodipine 10mg 1 tablet daily) Tj\n0 -20 Td\n(Serum Creatinine 1.1 mg/dL) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000183 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n450\n%%EOF`
  ).toString('base64');

  let patientId: string;
  let visitId: string;
  let sessionToken: string;
  let doc1Id: string;
  let doc2Id: string;
  let initialPatientCount: number;

  beforeAll(async () => {
    OcrService.setProvider(OcrProviderFactory.getProvider('TESSERACT'));
    const countRes = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM patients`);
    initialPatientCount = countRes[0]?.count ?? 0;
  });

  it('Step 1: Live LocalLlmAdapter Direct Inference with Ollama llama3.2:1b', async () => {
    const adapter = new LocalLlmAdapter({
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3.2:1b',
      timeoutMs: 35000,
    });

    const systemPrompt = 'You are a clinical AI. Return a JSON object with keys: importantFindings (array of strings), clinicalObservations (array of strings). Do not invent information.';
    const userPayload = JSON.stringify({
      patientId: 'SYNTH-101',
      clinicalData: 'Patient diagnosed with Essential Hypertension. Prescribed Telmisartan 40mg once daily.',
    });

    const response = await adapter.generate(userPayload, systemPrompt);

    expect(response).toBeDefined();
    expect(response.modelId).toBe('llama3.2:1b');
    expect(response.rawOutput).toBeTruthy();
    expect(response.tokensUsed.totalTokens).toBeGreaterThan(0);
    expect(response.latencyMs).toBeGreaterThan(0);

    const parsed = JSON.parse(response.rawOutput);
    expect(Array.isArray(parsed.importantFindings)).toBe(true);
    expect(parsed.importantFindings.length).toBeGreaterThan(0);
  }, 45000);

  it('Step 2: Upload Synthetic Record #1 -> OCR Extraction -> Genuine AI Summarization -> PostgreSQL Persistence -> Doctor Portal Display', async () => {
    // 1. Create synthetic patient & visit session
    const regRes = await request(app)
      .post('/api/v1/kiosk/session/start')
      .send({
        fullName: 'Sundaramoorthy K',
        gender: 'MALE',
        age: 62,
        contactNumber: '9840223344',
        preferredLanguage: 'en',
        consentGranted: true,
      });

    expect([200, 201]).toContain(regRes.status);
    patientId = regRes.body.data.patient.id;
    visitId = regRes.body.data.session.visitId;
    sessionToken = regRes.body.data.session.sessionToken;
    expect(patientId).toBeTruthy();
    expect(visitId).toBeTruthy();

    // 2. Upload synthetic prescription PDF #1
    const upRes = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        fileBase64: syntheticPdf1,
        fileName: 'hypertension_prescription_sept.pdf',
        mimeType: 'application/pdf',
        documentType: 'PRESCRIPTION',
      });

    expect([200, 201]).toContain(upRes.status);
    doc1Id = upRes.body.data.document.id;
    expect(doc1Id).toBeTruthy();

    // 3. Configure live LocalLlmAdapter on SummaryService
    const liveAdapter = new LocalLlmAdapter({
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3.2:1b',
      timeoutMs: 40000,
    });
    SummaryService.setProvider(liveAdapter);

    // Clear cached summary on document in memory & DB to ensure live inference is executed
    await prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = NULL WHERE id = $1::uuid`, doc1Id);

    // 4. Request individual document summary via Doctor Review endpoint
    const sumRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(sumRes.status).toBe(200);
    expect(sumRes.body.success).toBe(true);
    const summary = sumRes.body.data;

    // VERIFY LIVE AI INFERENCE METRICS & HONEST LABELLING
    expect(summary.isMock).toBe(false);
    expect(summary.modelId).toBe('llama3.2:1b');
    expect(summary.importantFindings.length).toBeGreaterThan(0);
    expect(summary.medications.length).toBeGreaterThan(0);
    expect(summary.medications[0].name.toLowerCase()).toContain('amlodipine');

    // VERIFY POSTGRESQL PERSISTENCE
    const dbDoc = await DocumentsRepository.findDocumentById(doc1Id);
    expect(dbDoc).toBeTruthy();
    expect(dbDoc.summary).toBeDefined();
    expect((dbDoc.summary as any).modelId).toBe('llama3.2:1b');
    expect((dbDoc.summary as any).isMock).toBe(false);

    // VERIFY DOCTOR PORTAL DISPLAY FOR PATIENT
    const recsRes = await request(app)
      .get(`/api/v1/doctor/visits/${visitId}/medical-records`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(recsRes.status).toBe(200);
    expect(recsRes.body.success).toBe(true);
    expect(recsRes.body.data.length).toBe(1);
    expect(recsRes.body.data[0].id).toBe(doc1Id);
  }, 60000);

  it('Step 3: Upload Second Synthetic Record for Same Patient -> Live Combined Multi-Document Summary -> Discrepancy Detection -> Doctor Approval', async () => {
    // 1. Upload synthetic prescription/lab PDF #2 (Amlodipine escalated to 10mg)
    const upRes2 = await request(app)
      .post('/api/v1/kiosk/documents/upload')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        fileBase64: syntheticPdf2,
        fileName: 'hypertension_followup_oct.pdf',
        mimeType: 'application/pdf',
        documentType: 'PRESCRIPTION',
      });

    expect([200, 201]).toContain(upRes2.status);
    doc2Id = upRes2.body.data.document.id;
    expect(doc2Id).toBeTruthy();

    // 2. Generate live multi-document combined summary across both records
    const combRes = await request(app)
      .post(`/api/v1/doctor/visits/${visitId}/combined-summary/regenerate`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(combRes.status).toBe(200);
    expect(combRes.body.success).toBe(true);
    const combined = combRes.body.data;

    // VERIFY COMBINED SUMMARY REAL AI STATUS & CONSOLIDATION
    expect(combined.generationMode).toBe('LLM');
    expect(combined.totalDocumentsCount).toBe(2);
    expect(combined.includedDocuments.length).toBe(2);

    // VERIFY SOURCE-DOCUMENT REFERENCES PRESERVED
    expect(combined.activeMedications.length).toBeGreaterThan(0);
    combined.activeMedications.forEach((med: any) => {
      expect(med.sourceDocument).toBeDefined();
      expect(typeof med.sourceDocument).toBe('string');
      expect(med.sourceDocument.length).toBeGreaterThan(0);
    });

    // VERIFY CROSS-DOCUMENT DISCREPANCY DETECTION (5mg vs 10mg)
    expect(combined.potentialInconsistencies.length).toBeGreaterThan(0);
    const amlodipineDiscrepancy = combined.potentialInconsistencies.find((i: string) =>
      i.toLowerCase().includes('amlodipine')
    );
    expect(amlodipineDiscrepancy).toBeDefined();
    expect(amlodipineDiscrepancy).toContain('Dosage discrepancy detected');

    // VERIFY DOCTOR PORTAL COMBINED SUMMARY RETRIEVAL
    const getCombRes = await request(app)
      .get(`/api/v1/doctor/visits/${visitId}/combined-summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getCombRes.status).toBe(200);
    expect(getCombRes.body.data.totalDocumentsCount).toBe(2);

    // VERIFY DOCTOR APPROVAL
    const approveRes = await request(app)
      .post(`/api/v1/doctor/visits/${visitId}/combined-summary/approve`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        notes: 'Reviewed and confirmed escalation of Amlodipine from 5mg to 10mg.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.doctorReviewStatus).toBe('APPROVED');
    expect(approveRes.body.data.doctorNotes).toContain('Amlodipine from 5mg to 10mg');
  }, 60000);

  it('Step 4: Safety & Fallback Guarantees (Template Fallback, Mock Tagging, Grounding Safety & Isolation)', async () => {
    // 1. Verify Template Fallback when LLM server is offline / connection fails
    const offlineLlmProvider = {
      providerId: 'LOCAL_LLM',
      modelId: 'llama3.2:1b',
      modelVersion: '2026.01',
      isMock: false,
      generate: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
      },
    };
    SummaryService.setProvider(offlineLlmProvider);

    // Clear cached summary on doc1 to trigger offline fallback
    await prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = NULL WHERE id = $1::uuid`, doc1Id);

    const offlineRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(offlineRes.status).toBe(200);
    expect(offlineRes.body.data.isMock).toBe(false);
    expect(offlineRes.body.data.modelId).toBe('TEMPLATE_FALLBACK');
    expect(offlineRes.body.data.clinicalObservations.some((o: string) => o.includes('Local LLM service was unavailable'))).toBe(true);

    // 2. Verify Mock Provider transparently tags isMock=true
    SummaryService.setProvider(mockSummarizationProvider);
    await prisma.$executeRawUnsafe(`UPDATE uploaded_documents SET summary = NULL WHERE id = $1::uuid`, doc1Id);

    const mockRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(mockRes.status).toBe(200);
    expect(mockRes.body.data.isMock).toBe(true);
    expect(mockRes.body.data.modelId).toBe('medikiosk-constrained-summary-v1');

    // 3. Verify Unsupported Medical Claims Rejected by GroundingValidator
    const ungroundedOutput = {
      sections: [
        {
          sectionType: 'CHIEF_COMPLAINT' as const,
          statements: [
            {
              text: 'Patient definitely has Stage 4 Chronic Kidney Disease.', // Forbidden diagnostic conclusion
              source_item_ids: ['non-existent-source-item-999'], // Hallucinated reference
            },
          ],
        },
      ],
    };

    const mockInput = {
      visitId,
      items: [],
      conflicts: [],
      withheldItems: [],
      interviewSummary: '',
      validatedDocuments: [],
    };

    const groundingOutcome = GroundingValidator.validate(ungroundedOutput as any, mockInput as any);
    expect(groundingOutcome.valid).toBe(false);
    expect(groundingOutcome.unsupportedClaimsCount).toBeGreaterThan(0);
    expect(groundingOutcome.errors.some((e) => e.includes('does not exist in assembled input'))).toBe(true);

    // 4. Verify Patient Isolation (Kiosk token cannot access doctor summary)
    const unauthorizedRes = await request(app)
      .get(`/api/v1/doctor/documents/${doc1Id}/summary`)
      .set('Authorization', `Bearer ${sessionToken}`);

    expect([401, 403]).toContain(unauthorizedRes.status);

    // 5. Verify PostgreSQL database records remained intact
    const postCountRes = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM patients`);
    const finalPatientCount = postCountRes[0]?.count ?? 0;
    expect(finalPatientCount).toBeGreaterThanOrEqual(initialPatientCount);
  }, 45000);
});
