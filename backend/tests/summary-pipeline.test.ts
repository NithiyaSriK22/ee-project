import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { InputAssembler } from '../src/modules/summary/assembly/input-assembler.js';
import { ContextBuilder } from '../src/modules/summary/assembly/context-builder.js';
import { ConflictDetector } from '../src/modules/summary/assembly/conflict-detector.js';
import { OutputSchemaValidator } from '../src/modules/summary/validation/output-schema-validator.js';
import { GroundingValidator } from '../src/modules/summary/validation/grounding-validator.js';
import { TemplateSummaryBuilder } from '../src/modules/summary/fallback/template-summary-builder.js';
import {
  MockSummarizationProvider,
  mockSummarizationProvider,
} from '../src/modules/summary/generation/provider-adapters/mock-provider-adapter.js';
import { GenerationOrchestrator } from '../src/modules/summary/generation/generation-orchestrator.js';
import { SummaryEvaluationRunner } from '../src/modules/summary/evaluation/evaluation-runner.js';
import { devFallbackSummaryStore } from '../src/modules/summary/dev-fallback-summary-store.js';
import { SummaryService } from '../src/modules/summary/summary.service.js';
import { summaryRoutes, kioskSummaryRouter, adminSummaryPromptRouter } from '../src/modules/summary/summary.routes.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { AppRequest } from '../src/types/api.types.js';
import { SummarySections, SummaryPromptStatus } from '../src/modules/summary/summary.types.js';
import { PromptManager } from '../src/modules/summary/generation/prompt-manager.js';
import { prisma } from '../src/database/prisma.js';

describe('MODULE 5 — AI Clinical Summarization Engine', () => {
  beforeEach(async () => {
    devFallbackSummaryStore.clear();
    mockSummarizationProvider.setBehaviorMode('NORMAL');
    try {
      await prisma.summaryPromptTemplate.deleteMany({
        where: { version: 'v2.0.0-untested' },
      });
    } catch {}
  });

  describe('1. Deterministic Summary Input Assembly & Handling Uncertain Items', () => {
    it('Should assemble normalized items and withhold uncertain values from model context', () => {
      const assembled = InputAssembler.assemble({
        visitId: 'visit-test-01',
        patient: { age: 54, gender: 'Male' },
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'ans-1',
              questionId: 'q-cc',
              section: 'CHIEF_COMPLAINT',
              promptText: 'What brings you here today?',
              questionType: 'FREE_TEXT',
              answerValue: 'Severe persistent cough for 4 days',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: true,
              isSkipped: false,
              answeredAt: new Date(),
            },
            {
              id: 'ans-2',
              questionId: 'q-declined',
              section: 'FAMILY_HISTORY',
              promptText: 'Family medical history',
              questionType: 'FREE_TEXT',
              answerValue: 'Prefer not to answer',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
        documentsData: [
          {
            documentId: 'doc-1',
            documentType: 'PRESCRIPTION',
            fileName: 'rx_photo.jpg',
            overallStatus: 'PARTIALLY_VERIFIED',
            uploadedAt: new Date(),
            validatedFields: [
              {
                id: 'f-amox',
                fieldType: 'drug_name',
                isCritical: true,
                result: 'VERIFIED',
                evalState: 'MATCH',
                matchedReferenceValue: 'Amoxicillin 500mg',
                matchScore: 1.0,
                ocrConfidence: 0.98,
                explanation: 'Exact formulary match',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
              },
              {
                id: 'f-allergy-unread',
                fieldType: 'allergy',
                isCritical: true,
                result: 'UNREADABLE',
                evalState: 'UNKNOWN',
                matchedReferenceValue: null,
                matchScore: null,
                ocrConfidence: 0.2,
                explanation: 'Smudged handwriting',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: '~~~smudged~~~',
              },
              {
                id: 'f-mismatch',
                fieldType: 'drug_name',
                isCritical: false,
                result: 'MISMATCH_FLAGGED',
                evalState: 'MISMATCH',
                matchedReferenceValue: null,
                matchScore: 0.45,
                ocrConfidence: 0.85,
                explanation: 'Not in hospital formulary',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: 'Xyzolex 900',
              },
            ],
          },
        ],
      });

      expect(assembled.items.length).toBe(5);
      expect(assembled.inputHash).toBeDefined();
      expect(assembled.inputHash.length).toBe(64); // SHA-256

      // Build Context for model
      const context = ContextBuilder.buildContext(assembled);

      // VERIFIED and ANSWERED items are allowed
      expect(context.allowedItems.length).toBe(2);
      expect(context.allowedItems.some((i) => i.value.includes('Amoxicillin 500mg'))).toBe(true);
      expect(context.allowedItems.some((i) => i.value.includes('Persistent cough'))).toBe(false); // value retains raw text
      expect(context.allowedItems.some((i) => i.value.includes('cough'))).toBe(true);

      // UNREADABLE, MISMATCH_FLAGGED, DECLINED must be WITHHELD
      expect(context.withheldItems.length).toBe(3);
      expect(context.withheldItems.some((i) => i.status === 'UNREADABLE')).toBe(true);
      expect(context.withheldItems.some((i) => i.status === 'MISMATCH_FLAGGED')).toBe(true);
      expect(context.withheldItems.some((i) => i.status === 'DECLINED')).toBe(true);

      // Ensure withheld values do NOT appear in formatted LLM prompt payload
      expect(context.formattedPromptPayload).not.toContain('Xyzolex 900');
      expect(context.formattedPromptPayload).not.toContain('~~~smudged~~~');
    });

    it('Should produce identical input_hash for identical data (pure deterministic code)', () => {
      const data = {
        visitId: 'visit-hash-test',
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'a1',
              questionId: 'q1',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Complaint',
              questionType: 'FREE_TEXT',
              answerValue: 'Headache',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date('2026-04-01T10:00:00Z'),
            },
          ],
        },
      };

      const run1 = InputAssembler.assemble(data);
      const run2 = InputAssembler.assemble(data);
      expect(run1.inputHash).toBe(run2.inputHash);
    });
  });

  describe('2. Conflict Detection & Absence is NOT a Negative', () => {
    it('Should detect conflict when interview says "none" but document has active allergy/drug', () => {
      const items = [
        {
          itemId: 'itm_01',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Allergies reported',
          value: 'no medicine allergies',
          sourceType: 'INTERVIEW' as const,
          sourceRef: 'q_allergy',
          status: 'ANSWERED' as const,
          isCritical: true,
          itemKey: 'allergy_penicillin',
        },
        {
          itemId: 'itm_02',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Prescription allergy field',
          value: 'Penicillin allergy noted',
          sourceType: 'DOCUMENT' as const,
          sourceRef: 'doc_1_f_1',
          status: 'VERIFIED' as const,
          isCritical: true,
          itemKey: 'allergy_penicillin',
        },
      ];

      const conflicts = ConflictDetector.detectConflicts(items);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictMessage).toContain('Conflict: interview and document differ');
    });

    it('Grounding Validator should reject converting absence into a negative statement', () => {
      const input = {
        visitId: 'vis-absence-test',
        inputHash: 'hash-abc',
        items: [
          {
            itemId: 'itm_01',
            section: SummarySections.CHIEF_COMPLAINT,
            label: 'Chief Complaint',
            value: 'Mild fever',
            sourceType: 'INTERVIEW' as const,
            sourceRef: 'q1',
            status: 'ANSWERED' as const,
            isCritical: false,
          },
        ],
        conflicts: [],
        formularyVersionRefs: [],
        assembledAt: new Date().toISOString(),
      };

      // Model hallucinated "No known allergies" when allergy question was never asked/answered
      const modelOutput = {
        sections: [
          {
            section: SummarySections.MEDICATIONS_AND_ALLERGIES,
            statements: [
              {
                text: 'Patient has no known allergies.',
                source_item_ids: ['itm_01'],
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(modelOutput, input);
      expect(outcome.valid).toBe(false);
      expect(outcome.absenceAsNegativeCount).toBe(1);
    });
  });

  describe('3. Grounding Validator (Zero External Calls, Strict Determinism)', () => {
    const validAssembledInput = {
      visitId: 'vis-grounding-test',
      inputHash: 'hash-123',
      items: [
        {
          itemId: 'itm_01',
          section: SummarySections.CHIEF_COMPLAINT,
          label: 'Chief Complaint',
          value: 'Chest pain for 2 days',
          sourceType: 'INTERVIEW' as const,
          sourceRef: 'q1',
          status: 'ANSWERED' as const,
          isCritical: true,
          rawText: 'Chest pain for 2 days',
        },
        {
          itemId: 'itm_02',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Prescription: drug_name',
          value: 'Amoxicillin 500mg, dosage 1-0-1',
          sourceType: 'DOCUMENT' as const,
          sourceRef: 'doc_1_f_1',
          status: 'VERIFIED' as const,
          isCritical: true,
          rawText: 'Amoxicillin 500mg, dosage 1-0-1',
        },
        {
          itemId: 'itm_03_unreadable',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Prescription: allergy',
          value: '',
          sourceType: 'DOCUMENT' as const,
          sourceRef: 'doc_1_f_2',
          status: 'UNREADABLE' as const,
          isCritical: true,
          rawText: '~~smudged~~',
        },
      ],
      conflicts: [],
      formularyVersionRefs: [],
      assembledAt: new Date().toISOString(),
    };

    it('Should pass valid grounded output citing correct source item IDs', () => {
      const output = {
        sections: [
          {
            section: SummarySections.CHIEF_COMPLAINT,
            statements: [
              {
                text: 'Patient presents with chest pain for 2 days.',
                source_item_ids: ['itm_01'],
              },
            ],
          },
          {
            section: SummarySections.MEDICATIONS_AND_ALLERGIES,
            statements: [
              {
                text: 'Current medication includes Amoxicillin 500mg, dosage 1-0-1.',
                source_item_ids: ['itm_02'],
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(output, validAssembledInput);
      expect(outcome.valid).toBe(true);
      expect(outcome.unsupportedClaimsCount).toBe(0);
      expect(outcome.diagnosisClaimsCount).toBe(0);
    });

    it('Should reject unsupported dose or ungrounded number not present in source item', () => {
      const output = {
        sections: [
          {
            section: SummarySections.MEDICATIONS_AND_ALLERGIES,
            statements: [
              {
                text: 'Patient takes Amoxicillin 1200mg daily.', // 1200mg is NOT in itm_02!
                source_item_ids: ['itm_02'],
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(output, validAssembledInput);
      expect(outcome.valid).toBe(false);
      expect(outcome.unsupportedClaimsCount).toBeGreaterThan(0);
      expect(outcome.errors.some((e) => e.includes('1200mg'))).toBe(true);
    });

    it('Should reject diagnostic conclusions and treatment recommendations', () => {
      const output = {
        sections: [
          {
            section: SummarySections.CHIEF_COMPLAINT,
            statements: [
              {
                text: 'Presentation likely indicates acute myocardial infarction; recommend immediate ECG.',
                source_item_ids: ['itm_01'],
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(output, validAssembledInput);
      expect(outcome.valid).toBe(false);
      expect(outcome.diagnosisClaimsCount).toBeGreaterThan(0);
    });

    it('Should reject citations to withheld/uncertain items', () => {
      const output = {
        sections: [
          {
            section: SummarySections.MEDICATIONS_AND_ALLERGIES,
            statements: [
              {
                text: 'Patient has penicillin allergy noted.',
                source_item_ids: ['itm_03_unreadable'], // UNREADABLE item!
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(output, validAssembledInput);
      expect(outcome.valid).toBe(false);
      expect(outcome.uncertainAsFactCount).toBe(1);
    });
  });

  describe('4. Section 35 Required Test Journey: Synthetic Visit Full Lifecycle', () => {
    it('Should execute Section 35 required test journey end-to-end', async () => {
      // 1. Synthetic visit input
      const journeyInput = InputAssembler.assemble({
        visitId: 'visit-journey-35',
        patient: { age: 48, gender: 'Female' },
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'ans-cc',
              questionId: 'q-cc',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Chief Complaint',
              questionType: 'FREE_TEXT',
              answerValue: 'High fever and chills for 3 days',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
            {
              id: 'ans-all',
              questionId: 'q-all',
              section: 'ALLERGIES',
              promptText: 'Known Allergies',
              questionType: 'FREE_TEXT',
              answerValue: 'none',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: true,
              isSkipped: false,
              answeredAt: new Date(),
            },
            {
              id: 'ans-declined',
              questionId: 'q-lifestyle',
              section: 'LIFESTYLE',
              promptText: 'Personal habits',
              questionType: 'FREE_TEXT',
              answerValue: 'DECLINED',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
        documentsData: [
          {
            documentId: 'doc-rx',
            documentType: 'PRESCRIPTION',
            fileName: 'rx_photo.jpg',
            overallStatus: 'PARTIALLY_VERIFIED',
            uploadedAt: new Date(),
            validatedFields: [
              {
                id: 'f-drug',
                fieldType: 'drug_name',
                isCritical: true,
                result: 'VERIFIED',
                evalState: 'MATCH',
                matchedReferenceValue: 'Amoxicillin 500mg',
                matchScore: 1.0,
                ocrConfidence: 0.99,
                explanation: 'Match',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
              },
              {
                id: 'f-all-unread',
                fieldType: 'allergy',
                isCritical: true,
                result: 'UNREADABLE',
                evalState: 'UNKNOWN',
                matchedReferenceValue: null,
                matchScore: null,
                ocrConfidence: 0.1,
                explanation: 'Illegible',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: '~~~',
              },
              {
                id: 'f-mismatch',
                fieldType: 'drug_name',
                isCritical: false,
                result: 'MISMATCH_FLAGGED',
                evalState: 'MISMATCH',
                matchedReferenceValue: null,
                matchScore: 0.3,
                ocrConfidence: 0.8,
                explanation: 'Unknown drug',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: 'Xyzolex 900',
              },
            ],
          },
        ],
      });

      // 2. Generate summary with standard provider
      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: journeyInput,
        hasAiSummarizationConsent: true,
        version: 1,
        promptTemplate: PromptManager.getDefaultPrompt(),
        provider: mockSummarizationProvider,
      });

      expect(result.version).toBe(1);
      expect(result.generationMode).toBe('LLM');

      // Verify sections and code placeholders
      const medSection = result.sections.find(
        (s) => s.section === SummarySections.MEDICATIONS_AND_ALLERGIES
      );
      expect(medSection).toBeDefined();

      const allStatements = medSection!.statements;

      // Model phrased verified drug
      expect(
        allStatements.some(
          (s) => s.origin === 'MODEL' && s.text.toLowerCase().includes('amoxicillin 500mg')
        )
      ).toBe(true);

      // Code inserted placeholder for unreadable document allergy field
      expect(
        allStatements.some(
          (s) =>
            s.origin === 'CODE_TEMPLATE' &&
            s.text.includes('Illegible in original document — verify manually')
        )
      ).toBe(true);

      // Code inserted placeholder for mismatch drug
      expect(
        allStatements.some(
          (s) =>
            s.origin === 'CODE_TEMPLATE' &&
            s.text.includes("Document text read as 'Xyzolex 900'")
        )
      ).toBe(true);

      // Conflict warning code inserted for patient reporting "none" while doc field is unreadable/conflict
      expect(
        allStatements.some(
          (s) => s.origin === 'CODE_TEMPLATE' && s.text.includes('Conflict')
        )
      ).toBe(true);

      // 3. Test Failure path: When provider invents a dose, retry fails -> triggers TEMPLATE_FALLBACK
      const failingProvider = new MockSummarizationProvider();
      failingProvider.setBehaviorMode('INVENTED_DOSE');

      const fallbackResult = await GenerationOrchestrator.generateSummary({
        assembledInput: journeyInput,
        hasAiSummarizationConsent: true,
        version: 1,
        promptTemplate: PromptManager.getDefaultPrompt(),
        provider: failingProvider,
      });

      expect(fallbackResult.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(fallbackResult.sections.length).toBe(7);
      expect(fallbackResult.sections.every((s) => s.statements.length > 0)).toBe(true);

      // 4. Test Consent Gate: When AI_SUMMARIZATION consent is false -> direct template fallback without model
      const noConsentResult = await GenerationOrchestrator.generateSummary({
        assembledInput: journeyInput,
        hasAiSummarizationConsent: false,
        version: 1,
        promptTemplate: PromptManager.getDefaultPrompt(),
        provider: mockSummarizationProvider,
      });

      expect(noConsentResult.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(noConsentResult.modelId).toBeNull();
    });
  });

  describe('5. Adversarial Evaluation Harness Suite (Section 22 Mandate)', () => {
    it('Should run full adversarial suite and pass with 0 unsupported claims and 0 diagnostic claims', async () => {
      const defaultPrompt = PromptManager.getDefaultPrompt();
      const evalResult = await SummaryEvaluationRunner.runSuite(
        defaultPrompt.version,
        defaultPrompt.systemPrompt,
        mockSummarizationProvider
      );

      expect(evalResult.passed).toBe(true);
      expect(evalResult.totalCases).toBe(9);
      expect(evalResult.passedCases).toBe(9);
      expect(evalResult.failedCases).toBe(0);
      expect(evalResult.metrics.unsupportedClaimsCount).toBe(0);
      expect(evalResult.metrics.diagnosisClaimsCount).toBe(0);
      expect(evalResult.metrics.uncertainAsFactCount).toBe(0);
      expect(evalResult.metrics.absenceAsNegativeCount).toBe(0);
      expect(evalResult.metrics.conflictSilentResolutionCount).toBe(0);
    });

    it('Should block prompt activation if adversarial evaluation suite fails', async () => {
      // Create new draft prompt
      const draft = await SummaryService.createPromptTemplate({
        version: 'v2.0.0-untested',
        systemPrompt: 'You are an AI that summarizes patient records. Please be concise.',
      });

      // Attempting to activate immediately without passing eval must throw EVALUATION_FAILED
      await expect(SummaryService.activatePromptTemplate(draft.id)).rejects.toThrow(
        /Gated evaluation run has not passed/
      );
    });
  });

  describe('6. Security, Isolation & Role-Based Access Control', () => {
    const app = express();
    app.use(express.json());

    app.use('/api/v1/summary', summaryRoutes);
    app.use('/api/v1/kiosk/summary', kioskSummaryRouter);
    app.use('/api/v1/admin/summary-prompts', adminSummaryPromptRouter);
    app.use(globalErrorHandler);

    it('Should reject unauthenticated requests to /api/v1/summary', async () => {
      const res = await request(app).get('/api/v1/summary/visits/visit-123');
      expect(res.status).toBe(401);
    });

    it('Should forbid STAFF_ATTENDANT and DOCTOR from modifying summary prompt templates', async () => {
      const { TokenUtil } = await import('../src/utils/token.util.js');
      const doctorToken = TokenUtil.generateStaffAccessToken({
        sub: 'c0000000-0000-4000-a000-000000000002',
        email: 'dr.ananya@hospital.org',
        role: 'DOCTOR',
        fullName: 'Dr. Ananya Sharma',
      });

      const res = await request(app)
        .post('/api/v1/admin/summary-prompts')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          version: 'v-unauthorized',
          systemPrompt: 'Unauthorized prompt template modification',
        });

      expect(res.status).toBe(403);
    });

    it('Kiosk status endpoint must NEVER expose clinical statement content', async () => {
      const { TokenUtil } = await import('../src/utils/token.util.js');
      const kioskToken = TokenUtil.generateKioskSessionToken({
        sessionId: 'kiosk-session-1',
        visitId: 'visit-123',
        patientId: 'patient-123',
        hospitalRegistrationNumber: 'HRN-12345',
      }).token;

      const res = await request(app)
        .get('/api/v1/kiosk/summary/status?visitId=visit-123')
        .set('x-kiosk-session-token', kioskToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBeDefined();
      expect(res.body.data.sections).toBeUndefined();
      expect(res.body.data.statements).toBeUndefined();
    });
  });
});

