"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryService = void 0;
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
const error_codes_js_1 = require("../../errors/error-codes.js");
const interview_service_js_1 = require("../interview/interview.service.js");
const documents_service_js_1 = require("../documents/documents.service.js");
const patients_repository_js_1 = require("../patients/patients.repository.js");
const input_assembler_js_1 = require("./assembly/input-assembler.js");
const summary_repository_js_1 = require("./summary.repository.js");
const generation_orchestrator_js_1 = require("./generation/generation-orchestrator.js");
const evaluation_runner_js_1 = require("./evaluation/evaluation-runner.js");
const mock_provider_adapter_js_1 = require("./generation/provider-adapters/mock-provider-adapter.js");
const local_llm_adapter_js_1 = require("./generation/provider-adapters/local-llm-adapter.js");
const template_summary_builder_js_1 = require("./fallback/template-summary-builder.js");
class SummaryService {
    static activeProvider = null;
    static setProvider(provider) {
        this.activeProvider = provider;
    }
    static getProvider() {
        if (this.activeProvider) {
            return this.activeProvider;
        }
        const envProvider = (process.env.SUMMARY_PROVIDER || process.env.SUMMARY_LLM_PROVIDER || 'mock').toLowerCase();
        if (envProvider === 'local' || envProvider === 'local_llm') {
            return (0, local_llm_adapter_js_1.createDefaultLocalLlmAdapter)();
        }
        return mock_provider_adapter_js_1.mockSummarizationProvider;
    }
    /**
     * Retrieves the latest clinical summary draft for a visit.
     * Gated by RBAC: Doctors, Staff, Admins. Kiosks are blocked from reading content.
     */
    static async getLatestSummaryForVisit(visitId, user) {
        if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            throw new app_error_js_1.ForbiddenError(`Role '${user.role}' is not authorized to read clinical summaries`);
        }
        let summary = await summary_repository_js_1.SummaryRepository.findLatestSummaryByVisitId(visitId);
        if (!summary) {
            // Attempt generation on-demand if interview has been completed
            try {
                summary = await this.generateSummaryForVisit(visitId);
            }
            catch (err) {
                throw new app_error_js_1.AppError(`No clinical summary available for visit '${visitId}'. Intake or validation may still be pending.`, 404, error_codes_js_1.ErrorCode.SUMMARY_NOT_FOUND);
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
    static async getSummaryVersionsForVisit(visitId, user) {
        if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            throw new app_error_js_1.ForbiddenError(`Role '${user.role}' is not authorized to read summary versions`);
        }
        return summary_repository_js_1.SummaryRepository.findSummaryVersionsByVisitId(visitId);
    }
    /**
     * Retrieves a specific summary by its immutable ID
     */
    static async getSummaryById(summaryId, user) {
        if (user && !['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            throw new app_error_js_1.ForbiddenError(`Role '${user.role}' is not authorized to read clinical summaries`);
        }
        const summary = await summary_repository_js_1.SummaryRepository.findSummaryById(summaryId);
        if (!summary) {
            throw new app_error_js_1.NotFoundError(`Clinical summary '${summaryId}'`);
        }
        return summary;
    }
    /**
     * Generates or regenerates a summary draft for a visit.
     * Immutable: Creates a new version (e.g. v2) and marks previous version superseded.
     */
    static async generateSummaryForVisit(visitId, options) {
        // 1. Fetch Module 3 Interview data
        let interviewData = null;
        try {
            interviewData = await interview_service_js_1.InterviewService.getCompletedAnswers(visitId);
        }
        catch {
            // Interview not completed yet or no answers
        }
        // 2. Fetch Module 4 Validated Document Fields
        let documentsData = [];
        try {
            documentsData = await documents_service_js_1.DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
        }
        catch {
            documentsData = [];
        }
        if (!interviewData && (!documentsData || documentsData.length === 0)) {
            if (options?.allowIncompleteDraft) {
                const emptyInput = input_assembler_js_1.InputAssembler.assemble({
                    visitId,
                    interviewData: null,
                    documentsData: [],
                });
                const fallbackSections = template_summary_builder_js_1.TemplateSummaryBuilder.buildFallbackSummary(emptyInput);
                const incompleteSummary = {
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
                return summary_repository_js_1.SummaryRepository.createSummary(incompleteSummary);
            }
            throw new app_error_js_1.AppError(`Cannot assemble summary for visit '${visitId}': No completed interview answers or documents found.`, 400, error_codes_js_1.ErrorCode.SUMMARY_INPUT_INCOMPLETE);
        }
        // 3. Fetch Patient info & Consent
        const patientId = interviewData?.patientId || '';
        let hasAiConsent = true; // default true for dev unless revoked
        let hasShareWithDoctorConsent = true;
        if (patientId) {
            try {
                const consents = await patients_repository_js_1.PatientsRepository.getConsentsByVisit(patientId, visitId);
                const aiConsent = consents.find((c) => c.consent_type === 'AI_SUMMARIZATION');
                if (aiConsent && !aiConsent.granted) {
                    hasAiConsent = false;
                }
                const shareConsent = consents.find((c) => c.consent_type === 'SHARE_WITH_DOCTOR');
                if (shareConsent && !shareConsent.granted) {
                    hasShareWithDoctorConsent = false;
                }
            }
            catch {
                // Dev fallback if DB consents table not populated
            }
        }
        if (!hasShareWithDoctorConsent) {
            throw new app_error_js_1.AppError(`Patient has not granted SHARE_WITH_DOCTOR consent for visit '${visitId}'. Access restricted.`, 403, error_codes_js_1.ErrorCode.CONSENT_REQUIRED);
        }
        // 4. Assemble normalized input deterministically
        const assembledInput = input_assembler_js_1.InputAssembler.assemble({
            visitId,
            interviewData,
            documentsData,
        });
        // 5. Check if latest version already has identical input_hash
        const existingLatest = await summary_repository_js_1.SummaryRepository.findLatestSummaryByVisitId(visitId);
        if (existingLatest &&
            existingLatest.inputHash === assembledInput.inputHash &&
            !options?.forceRegenerate) {
            return existingLatest;
        }
        const nextVersion = existingLatest ? existingLatest.version + 1 : 1;
        // 6. Fetch ACTIVE Prompt Template
        const activePrompt = await summary_repository_js_1.SummaryRepository.findActivePromptTemplate();
        const providerToUse = options?.provider || this.getProvider();
        // 7. Orchestrate generation (LLM with grounding validation + retry + template fallback)
        const generationResult = await generation_orchestrator_js_1.GenerationOrchestrator.generateSummary({
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
        const newSummary = {
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
        const savedSummary = await summary_repository_js_1.SummaryRepository.createSummary(newSummary);
        // 9. Mark prior version as superseded/stale if it existed
        if (existingLatest) {
            await summary_repository_js_1.SummaryRepository.markSuperseded(existingLatest.id, savedSummary.id);
        }
        return savedSummary;
    }
    /**
     * Kiosk session status endpoint.
     * STRICT PRIVACY: NEVER returns summary content or statements to kiosk sessions.
     */
    static async getKioskSummaryStatus(visitId) {
        const summary = await summary_repository_js_1.SummaryRepository.findLatestSummaryByVisitId(visitId);
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
    static async checkStaleness(summary) {
        try {
            const interviewData = await interview_service_js_1.InterviewService.getCompletedAnswers(summary.visitId).catch(() => null);
            const documentsData = await documents_service_js_1.DocumentsService.getValidatedDocumentFieldsForVisit(summary.visitId).catch(() => []);
            const currentInput = input_assembler_js_1.InputAssembler.assemble({
                visitId: summary.visitId,
                interviewData,
                documentsData,
            });
            return currentInput.inputHash !== summary.inputHash;
        }
        catch {
            return false;
        }
    }
    // ============================================================================
    // ADMIN PROMPT MANAGEMENT & EVALUATION GATING
    // ============================================================================
    static async listPromptTemplates() {
        return summary_repository_js_1.SummaryRepository.listPromptTemplates();
    }
    static async createPromptTemplate(data, user) {
        const existing = await summary_repository_js_1.SummaryRepository.findPromptTemplateByVersion(data.version);
        if (existing) {
            throw new app_error_js_1.AppError(`Prompt version '${data.version}' already exists`, 409, error_codes_js_1.ErrorCode.CONFLICT);
        }
        return summary_repository_js_1.SummaryRepository.createPromptTemplate({
            version: data.version,
            systemPrompt: data.systemPrompt,
            outputSchemaVersion: data.outputSchemaVersion || '1.0',
            createdBy: user?.id,
        });
    }
    static async submitPromptForReview(id, user) {
        const template = await summary_repository_js_1.SummaryRepository.findPromptTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError(`Prompt template '${id}'`);
        }
        const updated = await summary_repository_js_1.SummaryRepository.updatePromptTemplateStatus(id, 'IN_REVIEW', {
            reviewedBy: user?.id,
        });
        return updated;
    }
    static async runEvaluationForPrompt(id, user) {
        const template = await summary_repository_js_1.SummaryRepository.findPromptTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError(`Prompt template '${id}'`);
        }
        const runResult = await evaluation_runner_js_1.SummaryEvaluationRunner.runSuite(template.version, template.systemPrompt, undefined, template.id, user?.id);
        await summary_repository_js_1.SummaryRepository.saveEvaluationRun(runResult);
        return runResult;
    }
    /**
     * Activates a prompt template.
     * GATED: An evaluation run MUST exist for this prompt version and MUST have passed with 0 violations!
     */
    static async activatePromptTemplate(id, user) {
        const template = await summary_repository_js_1.SummaryRepository.findPromptTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError(`Prompt template '${id}'`);
        }
        // Check latest evaluation run
        const latestRun = await summary_repository_js_1.SummaryRepository.findLatestEvaluationRunForPrompt(template.version);
        if (!latestRun || !latestRun.passed) {
            throw new app_error_js_1.AppError(`Cannot activate prompt template '${template.version}': Gated evaluation run has not passed. Run adversarial evaluation suite before activation.`, 400, error_codes_js_1.ErrorCode.EVALUATION_FAILED);
        }
        const updated = await summary_repository_js_1.SummaryRepository.updatePromptTemplateStatus(id, 'ACTIVE', {
            reviewedBy: user?.id,
            activatedAt: new Date(),
        });
        logger_js_1.logger.info('Prompt template activated after passing adversarial evaluation suite', {
            promptVersion: template.version,
            activatedBy: user?.email,
        });
        return updated;
    }
}
exports.SummaryService = SummaryService;
