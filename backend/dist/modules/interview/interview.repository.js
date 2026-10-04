"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const interview_types_js_1 = require("../../types/interview.types.js");
const seed_templates_js_1 = require("./seed-templates.js");
class InterviewRepository {
    static async findActiveTemplate(visitType = 'GENERAL_OPD') {
        const template = await prisma_js_1.prisma.interviewTemplate.findFirst({
            where: {
                applicable_visit_type: visitType,
                status: { in: [interview_types_js_1.TemplateStatus.ACTIVE, interview_types_js_1.TemplateStatus.PUBLISHED] },
            },
            orderBy: [{ status: 'asc' }, { version_number: 'desc' }, { created_at: 'desc' }],
            include: {
                questions: {
                    where: { is_archived: false },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!template) {
            return this.seedDefaultTemplate();
        }
        return template;
    }
    static async seedDefaultTemplate() {
        const template = await prisma_js_1.prisma.interviewTemplate.create({
            data: {
                name: 'General OPD Clinical Intake Template',
                description: 'Standard multi-system OPD triage and case-taking interview covering chief complaint, illness history, past history, medications, allergies, and lifestyle.',
                applicable_visit_type: 'GENERAL_OPD',
                status: interview_types_js_1.TemplateStatus.ACTIVE,
                version: '1.0.0',
                version_number: 1,
                change_summary: 'Initial production baseline General OPD question bank',
                language_variants_ready: true,
                published_at: new Date(),
                questions: {
                    create: seed_templates_js_1.DEFAULT_GENERAL_OPD_QUESTIONS.map((q) => ({
                        section: q.section,
                        prompt_text: q.promptText,
                        prompt_audio_hint: q.promptAudioHint,
                        question_type: q.questionType,
                        answer_options: q.answerOptions ? q.answerOptions : undefined,
                        is_critical: q.isCritical,
                        is_required: q.isRequired,
                        order: q.order,
                    })),
                },
            },
            include: {
                questions: {
                    where: { is_archived: false },
                    orderBy: { order: 'asc' },
                },
            },
        });
        return template;
    }
    static async findTemplateById(id) {
        return prisma_js_1.prisma.interviewTemplate.findUnique({
            where: { id },
            include: {
                questions: {
                    where: { is_archived: false },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }
    static async findAllTemplates() {
        return prisma_js_1.prisma.interviewTemplate.findMany({
            orderBy: [{ created_at: 'desc' }, { version_number: 'desc' }],
            include: {
                _count: {
                    select: { questions: true, sessions: true },
                },
            },
        });
    }
    static async createTemplate(data) {
        return prisma_js_1.prisma.interviewTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                applicable_visit_type: data.applicableVisitType,
                version: data.version || '1.0.0',
                change_summary: data.changeSummary,
                created_by: data.createdBy,
                status: interview_types_js_1.TemplateStatus.DRAFT,
            },
        });
    }
    static async updateTemplate(id, data) {
        return prisma_js_1.prisma.interviewTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                applicable_visit_type: data.applicableVisitType,
                status: data.status,
                change_summary: data.changeSummary,
                version: data.version,
                published_by: data.publishedBy,
                published_at: data.publishedAt,
            },
            include: {
                questions: {
                    where: { is_archived: false },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }
    static async createQuestion(data) {
        return prisma_js_1.prisma.interviewQuestion.create({
            data: {
                template_id: data.templateId,
                section: data.section,
                prompt_text: data.promptText,
                prompt_audio_hint: data.promptAudioHint,
                question_type: data.questionType,
                answer_options: data.answerOptions,
                is_critical: data.isCritical ?? false,
                is_required: data.isRequired ?? true,
                order: data.order ?? 0,
                branching_logic: data.branchingLogic,
            },
        });
    }
    static async updateQuestion(id, data) {
        return prisma_js_1.prisma.interviewQuestion.update({
            where: { id },
            data: {
                section: data.section,
                prompt_text: data.promptText,
                prompt_audio_hint: data.promptAudioHint,
                question_type: data.questionType,
                answer_options: data.answerOptions,
                is_critical: data.isCritical,
                is_required: data.isRequired,
                order: data.order,
                branching_logic: data.branchingLogic,
                is_archived: data.isArchived,
            },
        });
    }
    static async archiveQuestion(id) {
        return prisma_js_1.prisma.interviewQuestion.update({
            where: { id },
            data: { is_archived: true },
        });
    }
    static async hasQuestionBeenUsedInSession(questionId) {
        const answerCount = await prisma_js_1.prisma.interviewAnswer.count({
            where: { question_id: questionId },
        });
        return answerCount > 0;
    }
    static async findQuestionById(id) {
        return prisma_js_1.prisma.interviewQuestion.findUnique({
            where: { id },
            include: { template: true },
        });
    }
    static async findSessionByVisitId(visitId) {
        return prisma_js_1.prisma.interviewSession.findUnique({
            where: { visit_id: visitId },
            include: {
                template: {
                    include: {
                        questions: {
                            where: { is_archived: false },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                answers: {
                    include: {
                        question: true,
                    },
                    orderBy: { answered_at: 'asc' },
                },
            },
        });
    }
    static async createSession(data) {
        return prisma_js_1.prisma.interviewSession.create({
            data: {
                visit_id: data.visitId,
                patient_id: data.patientId,
                template_id: data.templateId,
                template_version: data.templateVersion,
                current_question_id: data.currentQuestionId,
                status: 'IN_PROGRESS',
            },
            include: {
                template: {
                    include: {
                        questions: {
                            where: { is_archived: false },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                answers: true,
            },
        });
    }
    static async updateSessionStatus(sessionId, status, completedAt) {
        return prisma_js_1.prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                status,
                completed_at: completedAt,
            },
        });
    }
    static async updateSessionCurrentQuestion(sessionId, questionId) {
        return prisma_js_1.prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                current_question_id: questionId,
            },
        });
    }
    static async upsertAnswer(data) {
        return prisma_js_1.prisma.interviewAnswer.upsert({
            where: {
                visit_id_question_id: {
                    visit_id: data.visitId,
                    question_id: data.questionId,
                },
            },
            update: {
                answer_value: data.answerValue,
                answered_via: data.answeredVia,
                language_used: data.languageUsed,
                is_critical: data.isCritical,
                is_skipped: data.isSkipped ?? false,
                answered_at: new Date(),
            },
            create: {
                session_id: data.sessionId,
                visit_id: data.visitId,
                question_id: data.questionId,
                answer_value: data.answerValue,
                answered_via: data.answeredVia,
                language_used: data.languageUsed,
                is_critical: data.isCritical,
                is_skipped: data.isSkipped ?? false,
                answered_at: new Date(),
            },
            include: {
                question: true,
            },
        });
    }
    static async findAnswersByVisitId(visitId) {
        return prisma_js_1.prisma.interviewAnswer.findMany({
            where: { visit_id: visitId },
            include: {
                question: true,
            },
            orderBy: { question: { order: 'asc' } },
        });
    }
}
exports.InterviewRepository = InterviewRepository;
