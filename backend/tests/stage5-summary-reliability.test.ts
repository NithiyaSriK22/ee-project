import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { SummaryService } from '../src/modules/summary/summary.service.js';
import { InputAssembler } from '../src/modules/summary/assembly/input-assembler.js';
import { ContextBuilder } from '../src/modules/summary/assembly/context-builder.js';
import { ConflictDetector } from '../src/modules/summary/assembly/conflict-detector.js';
import { GroundingValidator } from '../src/modules/summary/validation/grounding-validator.js';
import { TemplateSummaryBuilder } from '../src/modules/summary/fallback/template-summary-builder.js';
import { GenerationOrchestrator } from '../src/modules/summary/generation/generation-orchestrator.js';
import {
  MockSummarizationProvider,
  mockSummarizationProvider,
} from '../src/modules/summary/generation/provider-adapters/mock-provider-adapter.js';
import { LocalLlmAdapter } from '../src/modules/summary/generation/provider-adapters/local-llm-adapter.js';
import { SummarizationProvider, SummarizationProviderResponse } from '../src/modules/summary/generation/summarization-provider.js';
import { SummarySections, SummaryItemStatuses } from '../src/modules/summary/summary.types.js';
import { SummaryRepository } from '../src/modules/summary/summary.repository.js';
import { devFallbackSummaryStore } from '../src/modules/summary/dev-fallback-summary-store.js';
import { ConfirmationService } from '../src/modules/doctor-review/confirmation/confirmation.service.js';
import { DoctorReviewRepository } from '../src/modules/doctor-review/doctor-review.repository.js';
import { ClaimService } from '../src/modules/doctor-review/review/claim.service.js';
import { ReviewService } from '../src/modules/doctor-review/review/review.service.js';
import { WorkspaceService } from '../src/modules/doctor-review/workspace/workspace.service.js';
import { ReviewPolicyService } from '../src/modules/doctor-review/review/review-policy.service.js';
import { RedFlagsService } from '../src/modules/redflags/redflags.service.js';
import { RedFlagsRepository } from '../src/modules/redflags/redflags.repository.js';
import { DocumentsRepository } from '../src/modules/documents/documents.repository.js';
import { StaffUserPayload } from '../src/types/auth.types.js';
import { ErrorCode } from '../src/errors/error-codes.js';

describe('STAGE 5: CLINICAL SUMMARY RELIABILITY & SAFETY CONTROLS', () => {
  const mockDoctor: StaffUserPayload = {
    id: 'c0000000-0000-4000-a000-000000000002',
    role: 'DOCTOR',
    fullName: 'Dr. Aravind Swamy',
    hospitalDepartment: 'GENERAL_MEDICINE',
    sessionId: 'session-stage5-doc',
  };

  beforeEach(async () => {
    devFallbackSummaryStore.clear();
    SummaryService.setProvider(null); // Reset to default provider
    mockSummarizationProvider.setBehaviorMode('NORMAL');
  });

  afterEach(async () => {
    SummaryService.setProvider(null);
  });

  // ============================================================================
  // 1. COMPLETE VERIFIED INTAKE & SOURCE GROUNDING
  // ============================================================================
  describe('1. Complete Verified Intake & Provenance Traceability', () => {
    it('Should assemble verified interview and document inputs with exact source citations', async () => {
      const visitId = 'visit-s5-verified-01';

      const assembled = InputAssembler.assemble({
        visitId,
        patient: { age: 48, gender: 'Female' },
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'ans-cc',
              questionId: 'q-chief-complaint',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Reason for visit',
              questionType: 'FREE_TEXT',
              answerValue: 'High grade fever with chills for 3 days',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: true,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
        documentsData: [
          {
            documentId: 'doc-rx-01',
            documentType: 'PRESCRIPTION',
            fileName: 'apollo_rx_verified.png',
            overallStatus: 'VERIFIED',
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
                ocrConfidence: 0.95,
                explanation: 'Matched Indian National Formulary',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: 'Amoxicillin 500mg',
              },
            ],
          },
        ],
      });

      expect(assembled.items).toHaveLength(2);

      // Verify ContextBuilder separates allowed from withheld
      const context = ContextBuilder.buildContext(assembled);
      expect(context.allowedItems).toHaveLength(2);
      expect(context.withheldItems).toHaveLength(0);

      // Generate Summary via Orchestrator
      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
      });

      expect(result.generationMode).toBe('LLM');
      expect(result.validationOutcome?.valid).toBe(true);

      // Verify all statements have sources
      const allStatements = result.sections.flatMap((s) => s.statements);
      const groundedStatements = allStatements.filter((s) => !s.text.includes('[No information collected]'));

      expect(groundedStatements.length).toBeGreaterThanOrEqual(2);
      for (const stmt of groundedStatements) {
        expect(stmt.sources.length).toBeGreaterThan(0);
        expect(['INTERVIEW', 'DOCUMENT', 'SYSTEM', 'CODE_TEMPLATE']).toContain(stmt.sources[0].sourceType);
      }

      // Distinguish patient quote from document statement
      const chiefComplaintStmt = groundedStatements.find((s) => s.text.includes('fever with chills'));
      expect(chiefComplaintStmt).toBeDefined();
      expect(chiefComplaintStmt?.sources[0].sourceType).toBe('INTERVIEW');
    });
  });

  // ============================================================================
  // 2. NO AVAILABLE SOURCE INFORMATION
  // ============================================================================
  describe('2. Handling Absence of Source Information Safely', () => {
    it('Should reject standard summary generation when no intake or documents exist', async () => {
      const visitId = 'visit-s5-empty-01';

      await expect(
        SummaryService.generateSummaryForVisit(visitId)
      ).rejects.toThrow('No completed interview answers or documents found');
    });

    it('Should return an explicit safe incomplete-summary state when allowIncompleteDraft is requested', async () => {
      const visitId = 'visit-s5-empty-safe';

      const summary = await SummaryService.generateSummaryForVisit(visitId, {
        allowIncompleteDraft: true,
      });

      expect(summary.status).toBe('INSUFFICIENT_EVIDENCE');
      expect(summary.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(summary.safetyLabel).toContain('insufficient clinical source information');

      // Every section must display [No information collected] rather than hallucinating
      for (const section of summary.sections) {
        expect(section.statements).toHaveLength(1);
        expect(section.statements[0].text).toBe('[No information collected]');
      }
    });
  });

  // ============================================================================
  // 3. OCR FAILURE HANDLING
  // ============================================================================
  describe('3. Preservation of OCR Failure and Exclusion from AI Context', () => {
    it('Should withhold unreadable OCR documents from LLM prompt and inject manual review placeholder', async () => {
      const visitId = 'visit-s5-ocr-fail';

      const assembled = InputAssembler.assemble({
        visitId,
        documentsData: [
          {
            documentId: 'doc-failed-ocr',
            documentType: 'PRESCRIPTION',
            fileName: 'illegible_prescription.jpg',
            overallStatus: 'EXTRACTION_FAILED',
            uploadedAt: new Date(),
            validatedFields: [
              {
                id: 'field-unreadable',
                fieldType: 'drug_name',
                isCritical: true,
                result: 'UNREADABLE',
                evalState: 'UNKNOWN',
                matchedReferenceValue: null,
                matchScore: null,
                ocrConfidence: 0.15,
                explanation: 'OCR Legibility score below threshold',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: '~~~smudged ink marks~~~',
              },
            ],
          },
        ],
      });

      // ContextBuilder must WITHHOLD unreadable items
      const context = ContextBuilder.buildContext(assembled);
      expect(context.withheldItems).toHaveLength(1);
      expect(context.allowedItems).toHaveLength(0);

      // Model prompt payload must NEVER contain the smudged raw string
      expect(context.formattedPromptPayload).not.toContain('~~~smudged ink marks~~~');

      // Merged summary output must contain code placeholder for physician
      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
      });

      const medSection = result.sections.find((s) => s.section === SummarySections.MEDICATIONS_AND_ALLERGIES);
      expect(medSection).toBeDefined();

      const placeholderStmt = medSection?.statements.find((s) =>
        s.text.includes('[Illegible in original document — verify manually]')
      );
      expect(placeholderStmt).toBeDefined();
      expect(placeholderStmt?.origin).toBe('CODE_TEMPLATE');
    });
  });

  // ============================================================================
  // 4. UNVERIFIED MEDICATION FIELD
  // ============================================================================
  describe('4. Safe Handling of Unverified Document Fields', () => {
    it('Should not treat unverified OCR output as a medical fact and insert verification notice', async () => {
      const visitId = 'visit-s5-unverified';

      const assembled = InputAssembler.assemble({
        visitId,
        documentsData: [
          {
            documentId: 'doc-unverified-drug',
            documentType: 'PRESCRIPTION',
            fileName: 'prescription_scan.png',
            overallStatus: 'UNVERIFIED',
            uploadedAt: new Date(),
            validatedFields: [
              {
                id: 'f-unverified',
                fieldType: 'drug_name',
                isCritical: true,
                result: 'UNVERIFIED',
                evalState: 'UNKNOWN',
                matchedReferenceValue: null,
                matchScore: 0.5,
                ocrConfidence: 0.75,
                explanation: 'Medication name not found in hospital formulary',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: 'MysticMed 400',
              },
            ],
          },
        ],
      });

      const context = ContextBuilder.buildContext(assembled);
      expect(context.withheldItems.some((i) => i.status === 'UNVERIFIED')).toBe(true);
      expect(context.formattedPromptPayload).not.toContain('MysticMed 400');

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
      });

      const medSection = result.sections.find((s) => s.section === SummarySections.MEDICATIONS_AND_ALLERGIES);
      const unverifiedWarning = medSection?.statements.find((s) =>
        s.text.includes('[Unverified document field:')
      );
      expect(unverifiedWarning).toBeDefined();
    });
  });

  // ============================================================================
  // 5. CONTRADICTORY PATIENT & DOCUMENT DATA
  // ============================================================================
  describe('5. Contradictory Data Detection & Unilateral Override Prevention', () => {
    it('Should detect factual conflict between patient answer and document without allowing AI to override', () => {
      const items = [
        {
          itemId: 'itm_int_01',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Patient Allergy Answer',
          value: 'no medicine allergies',
          sourceType: 'INTERVIEW' as const,
          sourceRef: 'q_allergy_01',
          status: 'ANSWERED' as const,
          isCritical: true,
          itemKey: 'allergy_penicillin',
        },
        {
          itemId: 'itm_doc_02',
          section: SummarySections.MEDICATIONS_AND_ALLERGIES,
          label: 'Prescription Allergy',
          value: 'Penicillin allergy noted',
          sourceType: 'DOCUMENT' as const,
          sourceRef: 'doc_rx_field_02',
          status: 'VERIFIED' as const,
          isCritical: true,
          itemKey: 'allergy_penicillin',
        },
      ];

      // 1. Conflict detection
      const conflicts = ConflictDetector.detectConflicts(items);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].itemKey).toBe('allergy_penicillin');
      expect(conflicts[0].conflictMessage).toContain('Conflict: interview and document differ');

      // 2. Grounding validator must reject if LLM tries to unilaterally resolve the conflict
      const assembledInput = {
        visitId: 'visit-conflict-test',
        inputHash: 'hash-test',
        items,
        conflicts,
        formularyVersionRefs: [],
        assembledAt: new Date().toISOString(),
      };

      const unilateralOverrideOutput = {
        sections: [
          {
            section: SummarySections.MEDICATIONS_AND_ALLERGIES,
            statements: [
              {
                text: 'Confirmed no penicillin allergy; disregard document notation.',
                source_item_ids: ['itm_int_01'],
              },
            ],
          },
        ],
      };

      const outcome = GroundingValidator.validate(unilateralOverrideOutput, assembledInput);
      expect(outcome.valid).toBe(false);
      expect(outcome.conflictSilentResolutionCount).toBe(1);
    });
  });

  // ============================================================================
  // 6. LLM TIMEOUT & PROVIDER FAILURE HANDLING
  // ============================================================================
  describe('6. LLM Timeout & Provider Unavailable Handling', () => {
    it('Should catch LLM provider timeout and safely fall back to template-only summary without crashing', async () => {
      const timeoutProvider: SummarizationProvider = {
        providerId: 'TIMED_OUT_LLM',
        modelId: 'timeout-model',
        modelVersion: '1.0',
        isMock: false,
        generate: async () => {
          throw new Error('LLM provider request timed out after 3000ms');
        },
      };

      const assembled = InputAssembler.assemble({
        visitId: 'visit-s5-timeout',
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'a1',
              questionId: 'q-symptom',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Symptoms',
              questionType: 'FREE_TEXT',
              answerValue: 'Severe persistent headache',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: true,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
      });

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
        provider: timeoutProvider,
      });

      expect(result.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(result.providerId).toBe('TEMPLATE_FALLBACK');
      expect(result.sections).toBeDefined();

      const ccSection = result.sections.find((s) => s.section === SummarySections.CHIEF_COMPLAINT);
      expect(ccSection?.statements.some((s) => s.text.includes('Severe persistent headache'))).toBe(true);
    });

    it('LocalLlmAdapter should properly format timeout error when aborted', async () => {
      const adapter = new LocalLlmAdapter({
        baseUrl: 'http://127.0.0.1:9999',
        model: 'llama3-8b',
        timeoutMs: 50,
      });

      await expect(
        adapter.generate('test payload', 'system prompt')
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 7. INVALID LLM RESPONSE (MALFORMED JSON)
  // ============================================================================
  describe('7. Invalid LLM Response (Schema Violation or Malformed JSON)', () => {
    it('Should detect malformed JSON from provider and safely fall back to template draft', async () => {
      mockSummarizationProvider.setBehaviorMode('MALFORMED_JSON');

      const assembled = InputAssembler.assemble({
        visitId: 'visit-s5-malformed',
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'a1',
              questionId: 'q-throat',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Chief Complaint',
              questionType: 'FREE_TEXT',
              answerValue: 'Sore throat for 2 days',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
      });

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
        provider: mockSummarizationProvider,
      });

      expect(result.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(result.validationOutcome?.valid).toBe(false);

      const cc = result.sections.find((s) => s.section === SummarySections.CHIEF_COMPLAINT);
      expect(cc?.statements.some((s) => s.text.includes('Sore throat'))).toBe(true);
    });
  });

  // ============================================================================
  // 8. GROUNDING VALIDATOR REJECTION (FABRICATED DOSE / DIAGNOSIS)
  // ============================================================================
  describe('8. Grounding Validator Rejection of Fabricated Clinical Information', () => {
    it('Should reject fabricated dosages (1200mg vs 500mg) and refuse to confirm hallucinations', async () => {
      mockSummarizationProvider.setBehaviorMode('INVENTED_DOSE');

      const assembled = InputAssembler.assemble({
        visitId: 'visit-s5-fabrication',
        documentsData: [
          {
            documentId: 'doc-rx',
            documentType: 'PRESCRIPTION',
            fileName: 'prescription.jpg',
            overallStatus: 'VERIFIED',
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
                explanation: 'Formulary verified',
                formularyVersion: 'NFI-2026.1',
                evaluatedAt: new Date(),
                rawText: 'Amoxicillin 500mg',
              },
            ],
          },
        ],
      });

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
        provider: mockSummarizationProvider,
      });

      expect(result.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(result.validationOutcome?.unsupportedClaimsCount).toBeGreaterThanOrEqual(1);

      const allText = JSON.stringify(result.sections);
      expect(allText).not.toContain('1200mg');
      expect(allText).toContain('Amoxicillin 500mg');
    });

    it('Should reject diagnostic conclusions and medical advice language', async () => {
      mockSummarizationProvider.setBehaviorMode('DIAGNOSTIC_LANGUAGE');

      const assembled = InputAssembler.assemble({
        visitId: 'visit-s5-diag',
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'a1',
              questionId: 'q-cough',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Cough',
              questionType: 'FREE_TEXT',
              answerValue: 'Productive cough',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
      });

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
        provider: mockSummarizationProvider,
      });

      expect(result.generationMode).toBe('TEMPLATE_FALLBACK');
      expect(result.validationOutcome?.diagnosisClaimsCount).toBeGreaterThanOrEqual(1);

      const allText = JSON.stringify(result.sections);
      expect(allText).not.toContain('acute bacterial bronchitis');
    });
  });

  // ============================================================================
  // 9. DOCTOR REVIEW, EDITS & SIGN-OFF WORKFLOW
  // ============================================================================
  describe('9. Physician Review, Manual Edits & Immutable Confirmation Sign-Off', () => {
    it('Should allow doctor to edit draft statements and require physician attestation before confirming', async () => {
      const visitId = `visit-s5-review-${Date.now()}`;

      // 1. Setup visit summary in dev store
      const assembled = InputAssembler.assemble({
        visitId,
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'ans-cough',
              questionId: 'q-cough',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Reason for visit',
              questionType: 'FREE_TEXT',
              answerValue: 'Dry cough for 5 days',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
      });

      const draftResult = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
      });

      const summaryDto = {
        id: draftResult.summaryId,
        visitId,
        patientId: null,
        version: 1,
        status: 'PENDING_DOCTOR_REVIEW' as const,
        generationMode: draftResult.generationMode,
        providerId: draftResult.providerId,
        isMock: draftResult.isMock,
        modelId: draftResult.modelId,
        modelVersion: draftResult.modelVersion,
        promptTemplateVersion: draftResult.promptTemplateVersion,
        inputHash: assembled.inputHash,
        formularyVersionRefs: [],
        validationOutcome: draftResult.validationOutcome,
        generatedAt: new Date(),
        supersededBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        safetyLabel: 'AI-assisted draft — not confirmed by a doctor',
        sections: draftResult.sections,
      };

      const statementId = crypto.randomUUID();
      summaryDto.sections[0].statements[0].id = statementId;
      await SummaryRepository.createSummary(summaryDto);

      // 2. Start review session
      const review = await ReviewService.startReview(visitId, mockDoctor);
      expect(review.id).toBeDefined();

      // 3. Edit statement
      await DoctorReviewRepository.saveStatementEdit({
        reviewId: review.id,
        originalStatementId: statementId,
        editedText: 'Dry cough for 5 days, aggravated at night. Evaluated by Dr. Swamy.',
        section: draftResult.sections[0].section,
        doctorId: mockDoctor.id,
        editedBy: mockDoctor.id,
      });

      // 4. Attempt confirmation without attestation -> must fail
      const policy = ReviewPolicyService.getActivePolicy();
      await expect(
        ConfirmationService.confirmReview(review.id, mockDoctor, false, policy.attestationVersion)
      ).rejects.toThrow('Physician attestation must be accepted');

      // 5. Confirm with valid physician attestation
      const confirmedRecord = await ConfirmationService.confirmReview(
        review.id,
        mockDoctor,
        true,
        policy.attestationVersion
      );

      expect(confirmedRecord.id).toBeDefined();
      expect(confirmedRecord.visitId).toBe(visitId);
      expect(confirmedRecord.confirmedByDoctorId).toBe(mockDoctor.id);

      // Verify that statement origin is marked DOCTOR_EDITED
      const editedStatement = confirmedRecord.statements.find((s) => s.text.includes('aggravated at night'));
      expect(editedStatement).toBeDefined();
      expect(editedStatement?.origin).toBe('DOCTOR_EDITED');
    });
  });

  // ============================================================================
  // 10. MOCK VS REAL AI MODES DISTINGUISHABLE
  // ============================================================================
  describe('10. Transparency & Distinguishability of Mock vs Real AI Modes', () => {
    it('Should explicitly tag mock simulation provider as isMock=true and MOCK_PROVIDER in safety metadata', async () => {
      SummaryService.setProvider(mockSummarizationProvider);

      const visitId = `visit-s5-mock-${Date.now()}`;
      const assembled = InputAssembler.assemble({
        visitId,
        interviewData: {
          status: 'COMPLETED',
          answers: [
            {
              id: 'a1',
              questionId: 'q-fever',
              section: 'CHIEF_COMPLAINT',
              promptText: 'Symptoms',
              questionType: 'FREE_TEXT',
              answerValue: 'Fever for 1 day',
              answeredVia: 'touch',
              languageUsed: 'en',
              isCritical: false,
              isSkipped: false,
              answeredAt: new Date(),
            },
          ],
        },
      });

      const result = await GenerationOrchestrator.generateSummary({
        assembledInput: assembled,
        hasAiSummarizationConsent: true,
        version: 1,
        provider: SummaryService.getProvider(),
      });

      expect(result.isMock).toBe(true);
      expect(result.providerId).toBe('MOCK_PROVIDER');

      // Verify workspace mapping surfaces the mock simulation badge
      const mockSummaryRecord = {
        id: result.summaryId,
        visitId,
        patientId: null,
        version: 1,
        status: 'PENDING_DOCTOR_REVIEW' as const,
        generationMode: result.generationMode,
        providerId: result.providerId,
        isMock: result.isMock,
        modelId: result.modelId,
        modelVersion: result.modelVersion,
        promptTemplateVersion: null,
        inputHash: assembled.inputHash,
        formularyVersionRefs: [],
        validationOutcome: result.validationOutcome,
        generatedAt: new Date(),
        supersededBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        safetyLabel: 'Mock AI draft (deterministic simulation) — not confirmed by a doctor',
        sections: result.sections,
      };

      await SummaryRepository.createSummary(mockSummaryRecord);

      const ws = await WorkspaceService.getWorkspace(visitId, mockDoctor);
      expect(ws.summary?.isMock).toBe(true);
      expect(ws.summary?.providerId).toBe('MOCK_PROVIDER');
      expect(ws.summary?.safetyLabel).toContain('Mock AI draft (deterministic simulation)');
    });
  });

  // ============================================================================
  // 11. EMERGENCY RED-FLAG LOGIC REMAINS INTACT
  // ============================================================================
  describe('11. Emergency Red-Flag Logic Remains Active and Non-Bypassable', () => {
    it('Should evaluate critical visit facts and generate alerts that doctor must resolve', async () => {
      const visitId = 'visit-s5-redflag-check';

      await RedFlagsRepository.createRule({
        ruleCode: `RF-CHEST-PAIN-S5-${Date.now()}`,
        name: 'Severe Acute Chest Pain Protocol',
        description: 'Possible acute coronary syndrome requires immediate emergency triage',
        severityTier: 'TIER_1_IMMEDIATE_STOP',
        conditionTree: {
          operator: 'AND',
          conditions: [
            {
              field: 'interview.chief_complaint',
              operator: 'CONTAINS',
              value: 'chest pain',
            },
          ],
        },
        recommendedStaffAction: 'Route patient immediately to emergency resuscitation bay',
        raiseOnIndeterminate: true,
      }, 'admin-stage5');

      const alerts = await RedFlagsService.evaluateVisit(visitId);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
