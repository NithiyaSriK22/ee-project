import { prisma } from '../../database/prisma.js';
import { TemplateStatus } from '../../types/interview.types.js';
import { DEFAULT_GENERAL_OPD_QUESTIONS } from './seed-templates.js';

export class InterviewRepository {
  public static async findActiveTemplate(visitType: string = 'GENERAL_OPD') {
    const template = await prisma.interviewTemplate.findFirst({
      where: {
        applicable_visit_type: visitType,
        status: { in: [TemplateStatus.ACTIVE, TemplateStatus.PUBLISHED] },
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

  public static async seedDefaultTemplate() {
    const template = await prisma.interviewTemplate.create({
      data: {
        name: 'General OPD Clinical Intake Template',
        description: 'Standard multi-system OPD triage and case-taking interview covering chief complaint, illness history, past history, medications, allergies, and lifestyle.',
        applicable_visit_type: 'GENERAL_OPD',
        status: TemplateStatus.ACTIVE,
        version: '1.0.0',
        version_number: 1,
        change_summary: 'Initial production baseline General OPD question bank',
        language_variants_ready: true,
        published_at: new Date(),
        questions: {
          create: DEFAULT_GENERAL_OPD_QUESTIONS.map((q) => ({
            section: q.section,
            prompt_text: q.promptText,
            prompt_audio_hint: q.promptAudioHint,
            question_type: q.questionType,
            answer_options: q.answerOptions ? (q.answerOptions as any) : undefined,
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

  public static async findTemplateById(id: string) {
    return prisma.interviewTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          where: { is_archived: false },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  public static async findAllTemplates() {
    return prisma.interviewTemplate.findMany({
      orderBy: [{ created_at: 'desc' }, { version_number: 'desc' }],
      include: {
        _count: {
          select: { questions: true, sessions: true },
        },
      },
    });
  }

  public static async createTemplate(data: {
    name: string;
    description?: string;
    applicableVisitType: string;
    version?: string;
    changeSummary?: string;
    createdBy?: string;
  }) {
    return prisma.interviewTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        applicable_visit_type: data.applicableVisitType,
        version: data.version || '1.0.0',
        change_summary: data.changeSummary,
        created_by: data.createdBy,
        status: TemplateStatus.DRAFT,
      },
    });
  }

  public static async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      applicableVisitType?: string;
      status?: string;
      changeSummary?: string;
      version?: string;
      publishedBy?: string;
      publishedAt?: Date;
    }
  ) {
    return prisma.interviewTemplate.update({
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

  public static async createQuestion(data: {
    templateId: string;
    section: string;
    promptText: string;
    promptAudioHint?: string;
    questionType: string;
    answerOptions?: any;
    isCritical?: boolean;
    isRequired?: boolean;
    order?: number;
    branchingLogic?: any;
  }) {
    return prisma.interviewQuestion.create({
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

  public static async updateQuestion(
    id: string,
    data: {
      section?: string;
      promptText?: string;
      promptAudioHint?: string;
      questionType?: string;
      answerOptions?: any;
      isCritical?: boolean;
      isRequired?: boolean;
      order?: number;
      branchingLogic?: any;
      isArchived?: boolean;
    }
  ) {
    return prisma.interviewQuestion.update({
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

  public static async archiveQuestion(id: string) {
    return prisma.interviewQuestion.update({
      where: { id },
      data: { is_archived: true },
    });
  }

  public static async hasQuestionBeenUsedInSession(questionId: string) {
    const answerCount = await prisma.interviewAnswer.count({
      where: { question_id: questionId },
    });
    return answerCount > 0;
  }

  public static async findQuestionById(id: string) {
    return prisma.interviewQuestion.findUnique({
      where: { id },
      include: { template: true },
    });
  }

  public static async findSessionByVisitId(visitId: string) {
    return prisma.interviewSession.findUnique({
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

  public static async createSession(data: {
    visitId: string;
    patientId: string;
    templateId: string;
    templateVersion: string;
    currentQuestionId?: string;
  }) {
    return prisma.interviewSession.create({
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

  public static async updateSessionStatus(sessionId: string, status: string, completedAt?: Date) {
    return prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status,
        completed_at: completedAt,
      },
    });
  }

  public static async updateSessionCurrentQuestion(sessionId: string, questionId: string | null) {
    return prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        current_question_id: questionId,
      },
    });
  }

  public static async upsertAnswer(data: {
    sessionId: string;
    visitId: string;
    questionId: string;
    answerValue: any;
    answeredVia: string;
    languageUsed: string;
    isCritical: boolean;
    isSkipped?: boolean;
  }) {
    return prisma.interviewAnswer.upsert({
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

  public static async findAnswersByVisitId(visitId: string) {
    return prisma.interviewAnswer.findMany({
      where: { visit_id: visitId },
      include: {
        question: true,
      },
      orderBy: { question: { order: 'asc' } },
    });
  }
}
