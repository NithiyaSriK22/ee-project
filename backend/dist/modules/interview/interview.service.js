"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const interview_repository_js_1 = require("./interview.repository.js");
const prisma_js_1 = require("../../database/prisma.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const interview_types_js_1 = require("../../types/interview.types.js");
const redflags_service_js_1 = require("../redflags/redflags.service.js");
class InterviewService {
    // ============================================================================
    // ADMIN TEMPLATE & QUESTION MANAGEMENT
    // ============================================================================
    static async listTemplates() {
        return interview_repository_js_1.InterviewRepository.findAllTemplates();
    }
    static async getTemplateById(id) {
        const template = await interview_repository_js_1.InterviewRepository.findTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        return template;
    }
    static async createTemplate(data, actorId) {
        const template = await interview_repository_js_1.InterviewRepository.createTemplate({
            name: data.name,
            description: data.description,
            applicableVisitType: data.applicableVisitType || 'GENERAL_OPD',
            version: data.version || '1.0.0',
            changeSummary: data.changeSummary || 'Draft template initialized',
            createdBy: actorId,
        });
        logger_js_1.logger.info('Interview template created in DRAFT state', {
            templateId: template.id,
            name: template.name,
        });
        return template;
    }
    static async updateTemplate(id, data) {
        const existing = await interview_repository_js_1.InterviewRepository.findTemplateById(id);
        if (!existing) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        if (existing.status === interview_types_js_1.TemplateStatus.RETIRED) {
            throw new app_error_js_1.ValidationError('Cannot update a retired interview template.');
        }
        return interview_repository_js_1.InterviewRepository.updateTemplate(id, data);
    }
    static async submitForReview(id) {
        const template = await interview_repository_js_1.InterviewRepository.findTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        if (template.questions.length === 0) {
            throw new app_error_js_1.ValidationError('Cannot submit an empty template for review. Add questions first.');
        }
        const updated = await interview_repository_js_1.InterviewRepository.updateTemplate(id, {
            status: interview_types_js_1.TemplateStatus.REVIEW,
            changeSummary: 'Submitted for clinical domain review',
        });
        logger_js_1.logger.info('Interview template submitted for review', { templateId: id });
        return updated;
    }
    static async publishTemplate(id, actorId) {
        const template = await interview_repository_js_1.InterviewRepository.findTemplateById(id);
        if (!template) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        // Quality gate validation before publishing
        if (template.questions.length < 3) {
            throw new app_error_js_1.ValidationError('A published template must contain at least 3 clinical questions.');
        }
        // Validate branching logic references
        const questionIds = new Set(template.questions.map((q) => q.id));
        for (const q of template.questions) {
            if (q.branching_logic && Array.isArray(q.branching_logic)) {
                for (const rule of q.branching_logic) {
                    if (rule.next_question_id && !questionIds.has(rule.next_question_id)) {
                        throw new app_error_js_1.ValidationError(`Branching rule on question "${q.prompt_text.substring(0, 30)}..." targets non-existent question ID: ${rule.next_question_id}`);
                    }
                }
            }
            // Check choice question options
            if ((q.question_type === interview_types_js_1.QuestionTypes.SINGLE_CHOICE ||
                q.question_type === interview_types_js_1.QuestionTypes.MULTI_CHOICE) &&
                (!q.answer_options || !Array.isArray(q.answer_options) || q.answer_options.length < 2)) {
                throw new app_error_js_1.ValidationError(`Choice question "${q.prompt_text.substring(0, 30)}..." must have at least 2 answer options.`);
            }
        }
        // Set other active templates for this visit type to retired or published
        const updated = await interview_repository_js_1.InterviewRepository.updateTemplate(id, {
            status: interview_types_js_1.TemplateStatus.ACTIVE,
            publishedBy: actorId,
            publishedAt: new Date(),
            changeSummary: `Published and activated version ${template.version}`,
        });
        logger_js_1.logger.info('Interview template published and set ACTIVE', {
            templateId: id,
            version: updated.version,
        });
        return updated;
    }
    static async retireTemplate(id, actorId) {
        const existing = await interview_repository_js_1.InterviewRepository.findTemplateById(id);
        if (!existing) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        const updated = await interview_repository_js_1.InterviewRepository.updateTemplate(id, {
            status: interview_types_js_1.TemplateStatus.RETIRED,
            changeSummary: 'Template retired from live clinical intake',
            publishedBy: actorId,
        });
        logger_js_1.logger.info('Interview template retired', { templateId: id });
        return updated;
    }
    static async addQuestion(templateId, data) {
        const template = await interview_repository_js_1.InterviewRepository.findTemplateById(templateId);
        if (!template) {
            throw new app_error_js_1.NotFoundError('Interview template not found');
        }
        if (template.status === interview_types_js_1.TemplateStatus.RETIRED) {
            throw new app_error_js_1.ValidationError('Cannot add questions to a retired template.');
        }
        // Duplicate check warning
        const duplicate = template.questions.find((q) => q.section === data.section &&
            q.prompt_text.toLowerCase().trim() === data.promptText.toLowerCase().trim());
        if (duplicate) {
            logger_js_1.logger.warn('Duplicate prompt text detected in section', {
                section: data.section,
                existingId: duplicate.id,
            });
        }
        const nextOrder = data.order ??
            (template.questions.length > 0
                ? Math.max(...template.questions.map((q) => q.order)) + 1
                : 1);
        const question = await interview_repository_js_1.InterviewRepository.createQuestion({
            templateId,
            section: data.section,
            promptText: data.promptText,
            promptAudioHint: data.promptAudioHint,
            questionType: data.questionType,
            answerOptions: data.answerOptions,
            isCritical: data.isCritical,
            isRequired: data.isRequired,
            order: nextOrder,
            branchingLogic: data.branchingLogic,
        });
        logger_js_1.logger.info('Question added to template', {
            templateId,
            questionId: question.id,
            section: data.section,
        });
        return question;
    }
    static async updateQuestion(id, data) {
        const question = await interview_repository_js_1.InterviewRepository.findQuestionById(id);
        if (!question) {
            throw new app_error_js_1.NotFoundError('Question not found');
        }
        return interview_repository_js_1.InterviewRepository.updateQuestion(id, data);
    }
    static async archiveQuestion(id) {
        const question = await interview_repository_js_1.InterviewRepository.findQuestionById(id);
        if (!question) {
            throw new app_error_js_1.NotFoundError('Question not found');
        }
        await interview_repository_js_1.InterviewRepository.archiveQuestion(id);
        logger_js_1.logger.info('Question archived (soft deleted)', { questionId: id });
        return { success: true, message: 'Question archived successfully' };
    }
    // ============================================================================
    // PATIENT KIOSK INTERVIEW FLOW (SESSION-SCOPED)
    // ============================================================================
    static async startKioskInterview(visitId, patientId, requestedTemplateId) {
        // 1. Consent Gate Check (Module 2 Requirement 16)
        const consentRecord = await prisma_js_1.prisma.consent.findUnique({
            where: {
                patient_id_visit_id_consent_type: {
                    patient_id: patientId,
                    visit_id: visitId,
                    consent_type: auth_types_js_1.ConsentTypes.VISIT_DATA_COLLECTION,
                },
            },
        });
        if (!consentRecord || !consentRecord.granted) {
            throw new app_error_js_1.ForbiddenError('Patient consent for visit data collection is required before starting the clinical interview. Please complete the consent step.');
        }
        // 2. Resume existing session if one is already active for this visit
        const existingSession = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        if (existingSession && existingSession.status === interview_types_js_1.InterviewSessionStatus.IN_PROGRESS) {
            logger_js_1.logger.info('Resuming existing interview session for visit', { visitId });
            return this.formatSessionState(existingSession);
        }
        // 3. Find active template (or requested template if valid)
        let template;
        if (requestedTemplateId) {
            template = await interview_repository_js_1.InterviewRepository.findTemplateById(requestedTemplateId);
            if (!template || template.status === interview_types_js_1.TemplateStatus.DRAFT) {
                throw new app_error_js_1.ValidationError('The requested interview template is not active or published.');
            }
        }
        else {
            template = await interview_repository_js_1.InterviewRepository.findActiveTemplate('GENERAL_OPD');
        }
        if (!template || template.questions.length === 0) {
            throw new app_error_js_1.NotFoundError('No active interview template available for this OPD intake.');
        }
        const firstQuestion = template.questions[0];
        if (!firstQuestion) {
            throw new app_error_js_1.ValidationError('Interview template does not contain any questions.');
        }
        // 4. Create new InterviewSession
        const session = await interview_repository_js_1.InterviewRepository.createSession({
            visitId,
            patientId,
            templateId: template.id,
            templateVersion: template.version,
            currentQuestionId: firstQuestion.id,
        });
        logger_js_1.logger.info('New interview session started for visit', {
            visitId,
            templateId: template.id,
            version: template.version,
        });
        return this.formatSessionState(session);
    }
    static async getCurrentQuestion(visitId) {
        const session = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError('Active interview session not found for this visit');
        }
        return this.formatSessionState(session);
    }
    static async submitAnswer(visitId, _patientId, payload) {
        const session = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError('Interview session not found for this visit');
        }
        if (session.status !== interview_types_js_1.InterviewSessionStatus.IN_PROGRESS) {
            throw new app_error_js_1.ValidationError(`Cannot submit answers to a ${session.status.toLowerCase()} interview session.`);
        }
        // Find question within the active template
        const question = session.template.questions.find((q) => q.id === payload.questionId);
        if (!question) {
            throw new app_error_js_1.ValidationError('Question does not belong to the active interview template.');
        }
        // Server-side validation of answer against question type
        this.validateAnswerValue(question, payload.answerValue, payload.isSkipped);
        // Save/upsert raw answer record with provenance and critical metadata copied
        const answer = await interview_repository_js_1.InterviewRepository.upsertAnswer({
            sessionId: session.id,
            visitId,
            questionId: question.id,
            answerValue: payload.answerValue,
            answeredVia: payload.answeredVia,
            languageUsed: payload.languageUsed || 'en',
            isCritical: question.is_critical,
            isSkipped: payload.isSkipped ?? false,
        });
        // Evaluate next question based on branching logic or sequential order
        const nextQuestionId = this.determineNextQuestionId(session.template.questions, question, payload.answerValue);
        // Update current question on session
        await interview_repository_js_1.InterviewRepository.updateSessionCurrentQuestion(session.id, nextQuestionId);
        const isFinished = nextQuestionId === null;
        logger_js_1.logger.info('Interview answer recorded', {
            visitId,
            questionId: question.id,
            answeredVia: payload.answeredVia,
            isFinished,
        });
        // Incremental Red-Flag Evaluation (Module 6 Non-blocking hook)
        redflags_service_js_1.RedFlagsService.evaluateVisit(visitId).catch((err) => {
            logger_js_1.logger.warn('Asynchronous red-flag evaluation caught error', { visitId, error: String(err) });
        });
        const refreshedSession = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        return {
            recordedAnswer: answer,
            nextQuestionId,
            isFinished,
            sessionState: refreshedSession ? this.formatSessionState(refreshedSession) : null,
        };
    }
    static async completeInterview(visitId) {
        const session = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError('Interview session not found for this visit');
        }
        const updated = await interview_repository_js_1.InterviewRepository.updateSessionStatus(session.id, interview_types_js_1.InterviewSessionStatus.COMPLETED, new Date());
        // Final-pass Red-Flag Evaluation (Module 6 Non-blocking hook)
        redflags_service_js_1.RedFlagsService.evaluateVisit(visitId).catch((err) => {
            logger_js_1.logger.warn('Asynchronous red-flag evaluation caught error on interview completion', { visitId, error: String(err) });
        });
        logger_js_1.logger.info('Clinical interview session COMPLETED', {
            visitId,
            totalAnswers: session.answers.length,
        });
        return {
            success: true,
            message: 'Interview intake successfully completed and structured.',
            completedAt: updated.completed_at,
        };
    }
    // ============================================================================
    // INTEGRATION CONTRACT FOR DOWNSTREAM MODULES 4, 5, 6
    // ============================================================================
    /**
     * Module 4/5/6 Clean Interface:
     * Retrieves completed interview answers with clinical provenance metadata
     */
    static async getCompletedAnswers(visitId) {
        const session = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(visitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError(`No interview session found for visit: ${visitId}`);
        }
        const answers = await interview_repository_js_1.InterviewRepository.findAnswersByVisitId(visitId);
        return {
            visitId: session.visit_id,
            patientId: session.patient_id,
            templateId: session.template_id,
            templateVersion: session.template_version,
            status: session.status,
            startedAt: session.started_at,
            completedAt: session.completed_at,
            answers: answers.map((a) => ({
                id: a.id,
                questionId: a.question_id,
                section: a.question.section,
                promptText: a.question.prompt_text,
                questionType: a.question.question_type,
                answerValue: a.answer_value,
                answeredVia: a.answered_via,
                languageUsed: a.language_used,
                isCritical: a.is_critical,
                isSkipped: a.is_skipped,
                answeredAt: a.answered_at,
            })),
        };
    }
    static validateAnswerValue(question, value, isSkipped) {
        if (isSkipped)
            return;
        if (value === null || value === undefined || value === '') {
            if (question.is_required) {
                throw new app_error_js_1.ValidationError('This question requires an answer or must be explicitly skipped.');
            }
            return;
        }
        switch (question.question_type) {
            case interview_types_js_1.QuestionTypes.YES_NO:
                if (typeof value === 'string') {
                    const upper = value.trim().toUpperCase();
                    if (upper !== 'YES' && upper !== 'NO') {
                        throw new app_error_js_1.ValidationError('YES_NO answer must be YES or NO.');
                    }
                }
                else if (typeof value !== 'boolean') {
                    throw new app_error_js_1.ValidationError('YES_NO questions require a boolean or string ("YES"/"NO") answer.');
                }
                break;
            case interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL:
                // May be string/boolean or object { value: "YES", detail: "..." }
                break;
            case interview_types_js_1.QuestionTypes.NUMERIC:
                const num = Number(typeof value === 'object' ? value.value : value);
                if (isNaN(num)) {
                    throw new app_error_js_1.ValidationError('Answer must be a valid number.');
                }
                break;
            case interview_types_js_1.QuestionTypes.SINGLE_CHOICE:
                if (Array.isArray(question.answer_options) && question.answer_options.length > 0) {
                    const valStr = String(typeof value === 'object' ? value.value : value).trim();
                    const optionValues = question.answer_options.map((opt) => typeof opt === 'object' ? opt.value : String(opt));
                    if (!optionValues.includes(valStr)) {
                        throw new app_error_js_1.ValidationError(`Answer must be one of the permitted options: ${optionValues.join(', ')}`);
                    }
                }
                break;
            case interview_types_js_1.QuestionTypes.FREE_TEXT:
                const textStr = String(typeof value === 'object' ? value.value : value);
                if (textStr.length > 5000) {
                    throw new app_error_js_1.ValidationError('Text response exceeds maximum character limit of 5000.');
                }
                break;
        }
    }
    static determineNextQuestionId(questions, currentQuestion, answerValue) {
        // 1. Check if branching logic triggers a specific next question
        if (currentQuestion.branching_logic && Array.isArray(currentQuestion.branching_logic)) {
            for (const rule of currentQuestion.branching_logic) {
                const expected = rule.trigger_condition.answer;
                const actual = typeof answerValue === 'object' ? answerValue.value : answerValue;
                if (expected !== undefined) {
                    if (String(actual).toUpperCase() === String(expected).toUpperCase() ||
                        (Array.isArray(actual) && actual.includes(expected))) {
                        return rule.next_question_id;
                    }
                }
            }
        }
        // 2. Default linear progression: find question with next highest order
        const nextLinear = questions
            .filter((q) => q.order > currentQuestion.order)
            .sort((a, b) => a.order - b.order)[0];
        return nextLinear ? nextLinear.id : null;
    }
    static formatSessionState(session) {
        const questions = session.template?.questions || [];
        const answers = session.answers || [];
        const answeredQuestionIds = new Set(answers.map((a) => a.question_id));
        const totalQuestions = questions.length;
        const answeredCount = answeredQuestionIds.size;
        const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
        let currentQuestion = null;
        if (session.current_question_id) {
            currentQuestion = questions.find((q) => q.id === session.current_question_id) || null;
        }
        // If no current question but incomplete, find first unanswered
        if (!currentQuestion && answeredCount < totalQuestions) {
            currentQuestion = questions.find((q) => !answeredQuestionIds.has(q.id)) || null;
        }
        const currentQuestionIndex = currentQuestion
            ? questions.findIndex((q) => q.id === currentQuestion.id) + 1
            : totalQuestions;
        return {
            session: {
                id: session.id,
                visitId: session.visit_id,
                patientId: session.patient_id,
                templateId: session.template_id,
                templateVersion: session.template_version,
                status: session.status,
                startedAt: session.started_at,
                completedAt: session.completed_at,
            },
            template: {
                id: session.template?.id,
                name: session.template?.name,
                description: session.template?.description,
                version: session.template?.version,
                totalQuestions,
            },
            currentQuestion: currentQuestion
                ? {
                    id: currentQuestion.id,
                    section: currentQuestion.section,
                    promptText: currentQuestion.prompt_text,
                    promptAudioHint: currentQuestion.prompt_audio_hint,
                    questionType: currentQuestion.question_type,
                    answerOptions: currentQuestion.answer_options,
                    isCritical: currentQuestion.is_critical,
                    isRequired: currentQuestion.is_required,
                    order: currentQuestion.order,
                }
                : null,
            allQuestions: questions.map((q) => ({
                id: q.id,
                section: q.section,
                promptText: q.prompt_text,
                promptAudioHint: q.prompt_audio_hint,
                questionType: q.question_type,
                answerOptions: q.answer_options,
                isCritical: q.is_critical,
                isRequired: q.is_required,
                order: q.order,
                isAnswered: answeredQuestionIds.has(q.id),
            })),
            answers: answers.map((a) => ({
                id: a.id,
                questionId: a.question_id,
                section: a.question?.section,
                promptText: a.question?.prompt_text,
                answerValue: a.answer_value,
                answeredVia: a.answered_via,
                languageUsed: a.language_used,
                isCritical: a.is_critical,
                isSkipped: a.is_skipped,
                answeredAt: a.answered_at,
            })),
            progress: {
                totalQuestions,
                answeredCount,
                currentQuestionIndex,
                percentage: progressPercent,
                completionPercentage: progressPercent,
                isComplete: answeredCount >= totalQuestions || session.status === 'COMPLETED',
            },
        };
    }
}
exports.InterviewService = InterviewService;
