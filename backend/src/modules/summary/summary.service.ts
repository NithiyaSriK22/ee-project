import { logger } from '../../config/logger.js';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
} from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { StaffUserPayload } from '../../types/auth.types.js';
import { InterviewService } from '../interview/interview.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { PatientsRepository } from '../patients/patients.repository.js';
import {
  ClinicalSummaryDto,
  SummaryPromptTemplateDto,
  EvaluationRunDto,
} from './summary.types.js';
import { InputAssembler } from './assembly/input-assembler.js';
import { SummaryRepository } from './summary.repository.js';
import { GenerationOrchestrator } from './generation/generation-orchestrator.js';
import { SummaryEvaluationRunner } from './evaluation/evaluation-runner.js';
import { SummarizationProvider } from './generation/summarization-provider.js';
import { mockSummarizationProvider } from './generation/provider-adapters/mock-provider-adapter.js';
import { createDefaultLocalLlmAdapter } from './generation/provider-adapters/local-llm-adapter.js';
import { TemplateSummaryBuilder } from './fallback/template-summary-builder.js';

export class SummaryService {
  private static activeProvider: SummarizationProvider | null = null;

  public static setProvider(provider: SummarizationProvider | null): void {
    this.activeProvider = provider;
  }

  public static getProvider(): SummarizationProvider {
    if (this.activeProvider) {
      return this.activeProvider;
    }
    const envProvider = (process.env.SUMMARY_PROVIDER || process.env.SUMMARY_LLM_PROVIDER || 'mock').toLowerCase();
    if (envProvider === 'local' || envProvider === 'local_llm') {
      return createDefaultLocalLlmAdapter();
    }
    return mockSummarizationProvider;
  }
  /**
   * Retrieves the latest clinical summary draft for a visit.
   * Gated by RBAC: Doctors, Staff, Admins. Kiosks are blocked from reading content.
   */
  public static async getLatestSummaryForVisit(
    visitId: string,
    user?: StaffUserPayload
  ): Promise<ClinicalSummaryDto> {
    if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to read clinical summaries`);
    }

    let summary = await SummaryRepository.findLatestSummaryByVisitId(visitId);

    if (!summary) {
      // Attempt generation on-demand if interview has been completed
      try {
        summary = await this.generateSummaryForVisit(visitId);
      } catch (err) {
        throw new AppError(
          `No clinical summary available for visit '${visitId}'. Intake or validation may still be pending.`,
          404,
          ErrorCode.SUMMARY_NOT_FOUND
        );
      }
    }

    // Check staleness against live input state
    const isStale = await this.checkStaleness(summary);
    if (isStale && summary.status !== 'STALE') {
      summary.status = 'STALE';
    }

    return summary;
  }

  /**
   * Retrieves all historical versions of a clinical summary for a visit (immutable audit trail)
   */
  public static async getSummaryVersionsForVisit(
    visitId: string,
    user?: StaffUserPayload
  ): Promise<ClinicalSummaryDto[]> {
    if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to read summary versions`);
    }

    return SummaryRepository.findSummaryVersionsByVisitId(visitId);
  }

  /**
   * Retrieves a specific summary by its immutable ID
   */
  public static async getSummaryById(
    summaryId: string,
    user?: StaffUserPayload
  ): Promise<ClinicalSummaryDto> {
    if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to read clinical summaries`);
    }

    const summary = await SummaryRepository.findSummaryById(summaryId);
    if (!summary) {
      throw new NotFoundError(`Clinical summary '${summaryId}'`);
    }
    return summary;
  }

  /**
   * Generates or regenerates a summary draft for a visit.
   * Immutable: Creates a new version (e.g. v2) and marks previous version superseded.
   */
  public static async generateSummaryForVisit(
    visitId: string,
    options?: {
      forceRegenerate?: boolean;
      provider?: SummarizationProvider;
      triggeredBy?: string;
      allowIncompleteDraft?: boolean;
    }
  ): Promise<ClinicalSummaryDto> {
    // 1. Fetch Module 3 Interview data
    let interviewData: any = null;
    try {
      interviewData = await InterviewService.getCompletedAnswers(visitId);
    } catch {
      // Interview not completed yet or no answers
    }

    // 2. Fetch Module 4 Validated Document Fields
    let documentsData: any = [];
    try {
      documentsData = await DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
    } catch {
      documentsData = [];
    }

    if (!interviewData && (!documentsData || documentsData.length === 0)) {
      if (options?.allowIncompleteDraft) {
        const emptyInput = InputAssembler.assemble({
          visitId,
          interviewData: null,
          documentsData: [],
        });
        const fallbackSections = TemplateSummaryBuilder.buildFallbackSummary(emptyInput);
        const incompleteSummary: ClinicalSummaryDto = {
          id: crypto.randomUUID(),
          visitId,
          patientId: null,
          version: 1,
          status: 'INSUFFICIENT_EVIDENCE',
          generationMode: 'TEMPLATE_FALLBACK',
          providerId: 'TEMPLATE_FALLBACK',
          isMock: false,
          modelId: null,
          modelVersion: null,
          promptTemplateVersion: null,
          inputHash: emptyInput.inputHash,
          formularyVersionRefs: [],
          validationOutcome: null,
          generatedAt: new Date(),
          supersededBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          safetyLabel: 'Incomplete draft — insufficient clinical source information',
          sections: fallbackSections,
        };
        return SummaryRepository.createSummary(incompleteSummary);
      }

      throw new AppError(
        `Cannot assemble summary for visit '${visitId}': No completed interview answers or documents found.`,
        400,
        ErrorCode.SUMMARY_INPUT_INCOMPLETE
      );
    }

    // 3. Fetch Patient info & Consent
    const patientId = interviewData?.patientId || '';
    let hasAiConsent = true; // default true for dev unless revoked
    let hasShareWithDoctorConsent = true;

    if (patientId) {
      try {
        const consents = await PatientsRepository.getConsentsByVisit(patientId, visitId);
        const aiConsent = consents.find((c) => c.consent_type === 'AI_SUMMARIZATION');
        if (aiConsent && !aiConsent.granted) {
          hasAiConsent = false;
        }

        const shareConsent = consents.find((c) => c.consent_type === 'SHARE_WITH_DOCTOR');
        if (shareConsent && !shareConsent.granted) {
          hasShareWithDoctorConsent = false;
        }
      } catch {
        // Dev fallback if DB consents table not populated
      }
    }

    if (!hasShareWithDoctorConsent) {
      throw new AppError(
        `Patient has not granted SHARE_WITH_DOCTOR consent for visit '${visitId}'. Access restricted.`,
        403,
        ErrorCode.CONSENT_REQUIRED
      );
    }

    // 4. Assemble normalized input deterministically
    const assembledInput = InputAssembler.assemble({
      visitId,
      interviewData,
      documentsData,
    });

    // 5. Check if latest version already has identical input_hash
    const existingLatest = await SummaryRepository.findLatestSummaryByVisitId(visitId);
    if (
      existingLatest &&
      existingLatest.inputHash === assembledInput.inputHash &&
      !options?.forceRegenerate
    ) {
      return existingLatest;
    }

    const nextVersion = existingLatest ? existingLatest.version + 1 : 1;

    // 6. Fetch ACTIVE Prompt Template
    const activePrompt = await SummaryRepository.findActivePromptTemplate();

    const providerToUse = options?.provider || this.getProvider();

    // 7. Orchestrate generation (LLM with grounding validation + retry + template fallback)
    const generationResult = await GenerationOrchestrator.generateSummary({
      assembledInput,
      hasAiSummarizationConsent: hasAiConsent,
      patientId,
      version: nextVersion,
      promptTemplate: activePrompt || undefined,
      provider: providerToUse,
    });

    const safetyLabel = generationResult.generationMode === 'TEMPLATE_FALLBACK'
      ? 'Template-only fallback draft — not confirmed by a doctor'
      : generationResult.isMock
      ? 'Mock AI draft (deterministic simulation) — not confirmed by a doctor'
      : 'AI-assisted draft (Local LLM) — not confirmed by a doctor';

    // 8. Save new immutable version
    const newSummary: ClinicalSummaryDto = {
      id: generationResult.summaryId,
      visitId,
      patientId: patientId || null,
      version: nextVersion,
      status: 'PENDING_DOCTOR_REVIEW',
      generationMode: generationResult.generationMode,
      providerId: generationResult.providerId,
      isMock: generationResult.isMock,
      modelId: generationResult.modelId,
      modelVersion: generationResult.modelVersion,
      promptTemplateVersion: generationResult.promptTemplateVersion,
      inputHash: assembledInput.inputHash,
      formularyVersionRefs: assembledInput.formularyVersionRefs,
      validationOutcome: generationResult.validationOutcome,
      generatedAt: new Date(),
      supersededBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      safetyLabel,
      sections: generationResult.sections,
    };

    const savedSummary = await SummaryRepository.createSummary(newSummary);

    // 9. Mark prior version as superseded/stale if it existed
    if (existingLatest) {
      await SummaryRepository.markSuperseded(existingLatest.id, savedSummary.id);
    }

    return savedSummary;
  }

  /**
   * Kiosk session status endpoint.
   * STRICT PRIVACY: NEVER returns summary content or statements to kiosk sessions.
   */
  public static async getKioskSummaryStatus(visitId: string): Promise<{ status: string }> {
    const summary = await SummaryRepository.findLatestSummaryByVisitId(visitId);
    if (!summary) {
      return { status: 'NOT_STARTED' };
    }
    if (summary.status === 'FAILED') {
      return { status: 'FAILED' };
    }
    return { status: 'READY' };
  }

  /**
   * Staleness check: compares stored summary's inputHash against current state
   */
  public static async checkStaleness(summary: ClinicalSummaryDto): Promise<boolean> {
    try {
      const interviewData = await InterviewService.getCompletedAnswers(summary.visitId).catch(
        () => null
      );
      const documentsData = await DocumentsService.getValidatedDocumentFieldsForVisit(
        summary.visitId
      ).catch(() => []);

      const currentInput = InputAssembler.assemble({
        visitId: summary.visitId,
        interviewData,
        documentsData,
      });

      return currentInput.inputHash !== summary.inputHash;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // ADMIN PROMPT MANAGEMENT & EVALUATION GATING
  // ============================================================================

  public static async listPromptTemplates(): Promise<SummaryPromptTemplateDto[]> {
    return SummaryRepository.listPromptTemplates();
  }

  public static async createPromptTemplate(
    data: {
      version: string;
      systemPrompt: string;
      outputSchemaVersion?: string;
    },
    user?: StaffUserPayload
  ): Promise<SummaryPromptTemplateDto> {
    const existing = await SummaryRepository.findPromptTemplateByVersion(data.version);
    if (existing) {
      throw new AppError(`Prompt version '${data.version}' already exists`, 409, ErrorCode.CONFLICT);
    }

    return SummaryRepository.createPromptTemplate({
      version: data.version,
      systemPrompt: data.systemPrompt,
      outputSchemaVersion: data.outputSchemaVersion || '1.0',
      createdBy: user?.id,
    });
  }

  public static async submitPromptForReview(
    id: string,
    user?: StaffUserPayload
  ): Promise<SummaryPromptTemplateDto> {
    const template = await SummaryRepository.findPromptTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Prompt template '${id}'`);
    }

    const updated = await SummaryRepository.updatePromptTemplateStatus(id, 'IN_REVIEW', {
      reviewedBy: user?.id,
    });
    return updated!;
  }

  public static async runEvaluationForPrompt(
    id: string,
    user?: StaffUserPayload
  ): Promise<EvaluationRunDto> {
    const template = await SummaryRepository.findPromptTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Prompt template '${id}'`);
    }

    const runResult = await SummaryEvaluationRunner.runSuite(
      template.version,
      template.systemPrompt,
      undefined,
      template.id,
      user?.id
    );

    await SummaryRepository.saveEvaluationRun(runResult);
    return runResult;
  }

  /**
   * Activates a prompt template.
   * GATED: An evaluation run MUST exist for this prompt version and MUST have passed with 0 violations!
   */
  public static async activatePromptTemplate(
    id: string,
    user?: StaffUserPayload
  ): Promise<SummaryPromptTemplateDto> {
    const template = await SummaryRepository.findPromptTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Prompt template '${id}'`);
    }

    // Check latest evaluation run
    const latestRun = await SummaryRepository.findLatestEvaluationRunForPrompt(template.version);
    if (!latestRun || !latestRun.passed) {
      throw new AppError(
        `Cannot activate prompt template '${template.version}': Gated evaluation run has not passed. Run adversarial evaluation suite before activation.`,
        400,
        ErrorCode.EVALUATION_FAILED
      );
    }

    const updated = await SummaryRepository.updatePromptTemplateStatus(id, 'ACTIVE', {
      reviewedBy: user?.id,
      activatedAt: new Date(),
    });

    logger.info('Prompt template activated after passing adversarial evaluation suite', {
      promptVersion: template.version,
      activatedBy: user?.email,
    });

    return updated!;
  }
}
