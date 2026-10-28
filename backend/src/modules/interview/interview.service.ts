import { InterviewRepository } from './interview.repository.js';
import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { devFallbackPatientStore } from '../patients/dev-fallback-patient-store.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { ConsentTypes } from '../../types/auth.types.js';
import {
  TemplateStatus,
  InterviewSessionStatus,
  QuestionTypes,
  BranchingRule,
  AnsweredVia,
  AnswerStatus,
  SensitivityLevels,
  VisibilityScopes,
} from '../../types/interview.types.js';
import { RedFlagsService } from '../redflags/redflags.service.js';
import { SpecialPopulationsService } from '../special-populations/special-populations.service.js';
import { DoctorReviewRepository } from '../doctor-review/doctor-review.repository.js';
import { QueueStatuses } from '../doctor-review/doctor-review.types.js';
import { DoctorAssignmentService } from '../doctor-review/assignment/doctor-assignment.service.js';

export class InterviewService {
  // ============================================================================
  // ADMIN TEMPLATE & QUESTION MANAGEMENT
  // ============================================================================

  public static async listTemplates() {
    return InterviewRepository.findAllTemplates();
  }

  public static async getTemplateById(id: string) {
    const template = await InterviewRepository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError('Interview template not found');
    }
    return template;
  }

  public static async createTemplate(
    data: {
      name: string;
      description?: string;
      applicableVisitType?: string;
      version?: string;
      changeSummary?: string;
    },
    actorId?: string
  ) {
    const template = await InterviewRepository.createTemplate({
      name: data.name,
      description: data.description,
      applicableVisitType: data.applicableVisitType || 'GENERAL_OPD',
      version: data.version || '1.0.0',
      changeSummary: data.changeSummary || 'Draft template initialized',
      createdBy: actorId,
    });

    logger.info('Interview template created in DRAFT state', {
      templateId: template.id,
      name: template.name,
    });

    return template;
  }

  public static async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      applicableVisitType?: string;
      changeSummary?: string;
      version?: string;
    }
  ) {
    const existing = await InterviewRepository.findTemplateById(id);
    if (!existing) {
      throw new NotFoundError('Interview template not found');
    }

    if (existing.status === TemplateStatus.RETIRED) {
      throw new ValidationError('Cannot update a retired interview template.');
    }

    return InterviewRepository.updateTemplate(id, data);
  }

  public static async submitForReview(id: string) {
    const template = await InterviewRepository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError('Interview template not found');
    }

    if (template.questions.length === 0) {
      throw new ValidationError('Cannot submit an empty template for review. Add questions first.');
    }

    const updated = await InterviewRepository.updateTemplate(id, {
      status: TemplateStatus.REVIEW,
      changeSummary: 'Submitted for clinical domain review',
    });

    logger.info('Interview template submitted for review', { templateId: id });
    return updated;
  }

  public static async publishTemplate(id: string, actorId?: string) {
    const template = await InterviewRepository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError('Interview template not found');
    }

    // Quality gate validation before publishing
    if (template.questions.length < 3) {
      throw new ValidationError('A published template must contain at least 3 clinical questions.');
    }

    // Validate branching logic references
    const questionIds = new Set(template.questions.map((q) => q.id));
    for (const q of template.questions) {
      if (q.branching_logic && Array.isArray(q.branching_logic)) {
        for (const rule of q.branching_logic as unknown as BranchingRule[]) {
          if (rule.next_question_id && !questionIds.has(rule.next_question_id)) {
            throw new ValidationError(
              `Branching rule on question "${q.prompt_text.substring(0, 30)}..." targets non-existent question ID: ${rule.next_question_id}`
            );
          }
        }
      }

      // Check choice question options
      if (
        (q.question_type === QuestionTypes.SINGLE_CHOICE ||
          q.question_type === QuestionTypes.MULTI_CHOICE) &&
        (!q.answer_options || !Array.isArray(q.answer_options) || q.answer_options.length < 2)
      ) {
        throw new ValidationError(
          `Choice question "${q.prompt_text.substring(0, 30)}..." must have at least 2 answer options.`
        );
      }
    }

    // Set other active templates for this visit type to retired or published
    const updated = await InterviewRepository.updateTemplate(id, {
      status: TemplateStatus.ACTIVE,
      publishedBy: actorId,
      publishedAt: new Date(),
      changeSummary: `Published and activated version ${template.version}`,
    });

    logger.info('Interview template published and set ACTIVE', {
      templateId: id,
      version: updated.version,
    });

    return updated;
  }

  public static async retireTemplate(id: string, actorId?: string) {
    const existing = await InterviewRepository.findTemplateById(id);
    if (!existing) {
      throw new NotFoundError('Interview template not found');
    }

    const updated = await InterviewRepository.updateTemplate(id, {
      status: TemplateStatus.RETIRED,
      changeSummary: 'Template retired from live clinical intake',
      publishedBy: actorId,
    });

    logger.info('Interview template retired', { templateId: id });
    return updated;
  }

  public static async addQuestion(
    templateId: string,
    data: {
      section: string;
      promptText: string;
      promptAudioHint?: string;
      questionType: string;
      answerOptions?: any;
      isCritical?: boolean;
      isRequired?: boolean;
      order?: number;
      branchingLogic?: any;
    }
  ) {
    const template = await InterviewRepository.findTemplateById(templateId);
    if (!template) {
      throw new NotFoundError('Interview template not found');
    }

    if (template.status === TemplateStatus.RETIRED) {
      throw new ValidationError('Cannot add questions to a retired template.');
    }

    // Duplicate check warning
    const duplicate = template.questions.find(
      (q) =>
        q.section === data.section &&
        q.prompt_text.toLowerCase().trim() === data.promptText.toLowerCase().trim()
    );
    if (duplicate) {
      logger.warn('Duplicate prompt text detected in section', {
        section: data.section,
        existingId: duplicate.id,
      });
    }

    const nextOrder =
      data.order ??
      (template.questions.length > 0
        ? Math.max(...template.questions.map((q) => q.order)) + 1
        : 1);

    const question = await InterviewRepository.createQuestion({
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

    logger.info('Question added to template', {
      templateId,
      questionId: question.id,
      section: data.section,
    });

    return question;
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
    }
  ) {
    const question = await InterviewRepository.findQuestionById(id);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    return InterviewRepository.updateQuestion(id, data);
  }

  public static async archiveQuestion(id: string) {
    const question = await InterviewRepository.findQuestionById(id);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    await InterviewRepository.archiveQuestion(id);
    logger.info('Question archived (soft deleted)', { questionId: id });
    return { success: true, message: 'Question archived successfully' };
  }

  // ============================================================================
  // PATIENT KIOSK INTERVIEW FLOW (SESSION-SCOPED)
  // ============================================================================

  public static async startKioskInterview(
    visitId: string,
    patientId: string,
    requestedTemplateId?: string,
    options?: { headsetConnected?: boolean }
  ) {
    if (!visitId || typeof visitId !== 'string' || !visitId.trim() || !patientId || typeof patientId !== 'string' || !patientId.trim()) {
      throw new ValidationError('Invalid patient or visit identifier provided');
    }

    if (options?.headsetConnected !== undefined) {
      SpecialPopulationsService.setHeadsetStatus(visitId, options.headsetConnected);
    }

    // 1. Consent Gate Check (Module 2 Requirement 16)
    let consentRecord = null;
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        consentRecord = await prisma.consent.findUnique({
          where: {
            patient_id_visit_id_consent_type: {
              patient_id: patientId,
              visit_id: visitId,
              consent_type: ConsentTypes.VISIT_DATA_COLLECTION,
            },
          },
        });
      } catch (err: any) {
        logger.warn('Failed querying consent from database, attempting fallback store lookup', {
          visitId,
          error: err?.message,
        });
      }
    }

    if (!consentRecord) {
      const activeConsents = devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
      consentRecord =
        activeConsents.find(
          (c) => c.consent_type === ConsentTypes.VISIT_DATA_COLLECTION && c.granted
        ) || null;
    }

    if (!consentRecord || !consentRecord.granted) {
      throw new ForbiddenError(
        'Patient consent for visit data collection is required before starting the clinical interview. Please complete the consent step.'
      );
    }

    // Module 3B: Minor & Guardian Verification Gate
    let patient = null;
    if (isDbUp) {
      try {
        patient = await prisma.patient.findUnique({
          where: { id: patientId },
        });
      } catch (err: any) {
        logger.warn('Failed querying patient from database, checking fallback store', {
          patientId,
          error: err?.message,
        });
      }
    }

    if (!patient) {
      patient = devFallbackPatientStore.findPatientById(patientId);
    }

    if (patient) {
      let guardianCheck = SpecialPopulationsService.validateGuardianRequirement(patient, visitId);
      if (guardianCheck.required && !guardianCheck.verified) {
        if (isDbUp) {
          try {
            const vp = await prisma.patientVisitProfile.findUnique({ where: { visit_id: visitId } });
            if (vp && (vp.is_companion_assisted || vp.companion_name)) {
              await SpecialPopulationsService.recordGuardianDetails(visitId, {
                guardianName: vp.companion_name || 'Accompanying Adult / Staff',
                guardianRelationship: vp.companion_relationship || 'Parent / Legal Guardian',
                guardianPhone: patient.contact_number,
                guardianConsentVerified: true,
                minorAssentObtained: true,
              });
              guardianCheck = SpecialPopulationsService.validateGuardianRequirement(patient, visitId);
            }
          } catch {}
        }
      }

      if (guardianCheck.required && !guardianCheck.verified) {
        throw new ValidationError(
          guardianCheck.message ||
            'Patient is a minor. An adult guardian must provide verified consent before clinical intake.'
        );
      }
    }

    // 2. Resume existing session if one already exists for this visit
    const existingSession = await InterviewRepository.findSessionByVisitId(visitId);
    if (existingSession) {
      if (existingSession.status === InterviewSessionStatus.IN_PROGRESS) {
        logger.info('Resuming existing active interview session for visit', { visitId });
        return this.formatSessionState(existingSession, patient);
      }

      if (existingSession.status === InterviewSessionStatus.COMPLETED) {
        logger.info('Returning completed interview session for visit review', { visitId });
        return this.formatSessionState(existingSession, patient);
      }

      // If ABANDONED, PAUSED, or other state, reactivate the existing record instead of violating unique constraint
      logger.info('Reactivating existing interview session for visit', {
        visitId,
        previousStatus: existingSession.status,
      });
      await InterviewRepository.updateSessionStatus(existingSession.id, InterviewSessionStatus.IN_PROGRESS);
      const reactivatedSession = await InterviewRepository.findSessionByVisitId(visitId);
      return this.formatSessionState(reactivatedSession || existingSession, patient);
    }

    // 3. Find active template (or requested template if valid)
    let template;
    if (requestedTemplateId) {
      template = await InterviewRepository.findTemplateById(requestedTemplateId);
      if (!template || template.status === TemplateStatus.DRAFT) {
        throw new ValidationError('The requested interview template is not active or published.');
      }
    } else {
      template = await InterviewRepository.findActiveTemplate('GENERAL_OPD');
    }

    if (!template || template.questions.length === 0) {
      throw new NotFoundError('No active interview template available for this OPD intake.');
    }

    // Module 3B: Non-Inferential Question Gating
    const applicableQuestions = patient
      ? SpecialPopulationsService.filterApplicableQuestions(template.questions as any, {
          age: patient.age,
          gender: patient.gender,
        })
      : template.questions;

    const firstQuestion = applicableQuestions[0] || template.questions[0];
    if (!firstQuestion) {
      throw new ValidationError('Interview template does not contain any applicable questions.');
    }

    // 4. Create new InterviewSession (idempotent / duplicate-protected)
    const session = await InterviewRepository.createSession({
      visitId,
      patientId,
      templateId: template.id,
      templateVersion: template.version,
      currentQuestionId: (firstQuestion as any).id,
    });

    logger.info('New interview session started for visit', {
      visitId,
      templateId: template.id,
      version: template.version,
    });

    return this.formatSessionState(session, patient);
  }

  public static async getCurrentQuestion(visitId: string) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (!session) {
      throw new NotFoundError('Active interview session not found for this visit');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: session.patient_id },
    });

    return this.formatSessionState(session, patient);
  }

  public static async submitAnswer(
    visitId: string,
    _patientId: string,
    payload: {
      questionId: string;
      answerValue: any;
      answeredVia: string;
      languageUsed?: string;
      isSkipped?: boolean;
      isDeferredToDoctor?: boolean;
      provenanceLabel?: string;
      deferralReason?: string;
    }
  ) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (!session) {
      throw new NotFoundError('Interview session not found for this visit');
    }

    if (session.status !== InterviewSessionStatus.IN_PROGRESS) {
      throw new ValidationError(`Cannot submit answers to a ${session.status.toLowerCase()} interview session.`);
    }

    // Find question within the active template
    const question = session.template.questions.find((q) => q.id === payload.questionId);
    if (!question) {
      throw new ValidationError('Question does not belong to the active interview template.');
    }

    const privacyState = SpecialPopulationsService.getVisitState(visitId);

    // Module 3B: Companion-Present / Defer to Doctor Check
    const isDeferred =
      payload.isDeferredToDoctor === true ||
      (typeof payload.answerValue === 'object' &&
        payload.answerValue !== null &&
        payload.answerValue.status === AnswerStatus.DEFERRED_TO_DOCTOR);

    if (isDeferred) {
      SpecialPopulationsService.deferQuestionToDoctor(visitId, question.id);
      payload.answerValue = {
        status: AnswerStatus.DEFERRED_TO_DOCTOR,
        deferralReason:
          payload.deferralReason ||
          'Patient opted to discuss privately with doctor during consultation',
      };
    } else {
      // Server-side validation of answer against question type
      this.validateAnswerValue(question, payload.answerValue, payload.isSkipped);
    }

    // Resolve effective answeredVia and provenance
    let effectiveAnsweredVia = payload.answeredVia;
    if (privacyState.guardianDetails && (effectiveAnsweredVia === AnsweredVia.TOUCH || effectiveAnsweredVia === 'touch')) {
      effectiveAnsweredVia = AnsweredVia.GUARDIAN;
    } else if (privacyState.surrogateDetails && (effectiveAnsweredVia === AnsweredVia.TOUCH || effectiveAnsweredVia === 'touch')) {
      effectiveAnsweredVia = AnsweredVia.SURROGATE;
    }

    const provenance =
      payload.provenanceLabel ||
      SpecialPopulationsService.formatAnswerProvenance(
        effectiveAnsweredVia,
        privacyState.guardianDetails,
        privacyState.surrogateDetails
      );

    const masking = SpecialPopulationsService.maskSensitiveReadBack(payload.answerValue, question as any);

    // Save/upsert raw answer record with provenance and critical metadata copied
    const answer = await InterviewRepository.upsertAnswer({
      sessionId: session.id,
      visitId,
      questionId: question.id,
      answerValue: payload.answerValue,
      answeredVia: effectiveAnsweredVia,
      languageUsed: payload.languageUsed || 'en',
      isCritical: question.is_critical,
      isSkipped: payload.isSkipped ?? false,
    });

    const patient = await prisma.patient.findUnique({
      where: { id: session.patient_id },
    });

    // Evaluate next question based on branching logic or sequential order (gated non-inferentially)
    const nextQuestionId = this.determineNextQuestionId(
      session.template.questions,
      question,
      payload.answerValue,
      patient
    );

    // Update current question on session
    await InterviewRepository.updateSessionCurrentQuestion(session.id, nextQuestionId);

    const isFinished = nextQuestionId === null;

    logger.info('Interview answer recorded', {
      visitId,
      questionId: question.id,
      answeredVia: effectiveAnsweredVia,
      isDeferred,
      isFinished,
    });

    // Incremental Red-Flag Evaluation (Module 6 Non-blocking hook)
    RedFlagsService.evaluateVisit(visitId).catch((err) => {
      logger.warn('Asynchronous red-flag evaluation caught error', { visitId, error: String(err) });
    });

    const refreshedSession = await InterviewRepository.findSessionByVisitId(visitId);

    return {
      recordedAnswer: {
        ...answer,
        provenance,
        isDeferredToDoctor: isDeferred,
        isMasked: masking.isMasked,
        readBackDisplayText: masking.displayText,
        readBackAudioConfirmation: masking.audioConfirmation,
      },
      nextQuestionId,
      isFinished,
      sessionState: refreshedSession ? this.formatSessionState(refreshedSession, patient) : null,
    };
  }


  public static async completeInterview(visitId: string) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (!session) {
      throw new NotFoundError('Interview session not found for this visit');
    }

    const updated = await InterviewRepository.updateSessionStatus(
      session.id,
      InterviewSessionStatus.COMPLETED,
      new Date()
    );

    // Advance doctor queue entry status to READY_FOR_REVIEW while preserving assigned doctor and department
    let targetDept = 'General Medicine';
    let targetDocId: string | null = null;
    try {
      const existingEntry = await DoctorReviewRepository.getQueueEntry(visitId);
      if (existingEntry) {
        targetDept = existingEntry.department || 'General Medicine';
        targetDocId = existingEntry.assignedDoctorId || null;
      }
      if (!targetDocId) {
        // Re-evaluate chief complaint from answers if available
        const ccAnswer = (session.answers || []).find((a: any) =>
          a.question?.question_code === 'CHIEF_COMPLAINT_PRIMARY' ||
          a.question?.section === 'CHIEF_COMPLAINT'
        );
        let complaintText: string | undefined;
        if (ccAnswer?.answer_value) {
          complaintText = typeof ccAnswer.answer_value === 'string'
            ? ccAnswer.answer_value
            : (ccAnswer.answer_value as any).text || (ccAnswer.answer_value as any).value;
        }
        if (complaintText) {
          const assignment = await DoctorAssignmentService.assignDoctorForVisit({
            visitId,
            presentingProblem: complaintText,
            actorRole: 'SYSTEM',
          });
          targetDept = assignment.department;
          targetDocId = assignment.doctorId;
        }
      }
    } catch (evalErr) {
      logger.warn('Failed re-evaluating doctor assignment on interview completion', { visitId, error: String(evalErr) });
    }

    DoctorReviewRepository.upsertQueueEntry({
      visitId,
      department: targetDept,
      assignedDoctorId: targetDocId,
      queueStatus: QueueStatuses.READY_FOR_REVIEW,
      readyAt: new Date(),
    }).catch((err) => {
      logger.warn('Failed to update queue entry on interview completion', { visitId, error: String(err) });
    });

    // Final-pass Red-Flag Evaluation (Module 6 Non-blocking hook)
    RedFlagsService.evaluateVisit(visitId).catch((err) => {
      logger.warn('Asynchronous red-flag evaluation caught error on interview completion', { visitId, error: String(err) });
    });

    logger.info('Clinical interview session COMPLETED', {
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
  public static async getCompletedAnswers(visitId: string, user?: { role?: string; id?: string }) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (!session) {
      throw new NotFoundError(`No interview session found for visit: ${visitId}`);
    }

    const answers = await InterviewRepository.findAnswersByVisitId(visitId);
    const privacyState = SpecialPopulationsService.getVisitState(visitId);

    let mappedAnswers = answers.map((a) => {
      const isDeferred =
        privacyState.deferredQuestionIds.has(a.question_id) ||
        (typeof a.answer_value === 'object' &&
          (a.answer_value as any)?.status === AnswerStatus.DEFERRED_TO_DOCTOR);
      const masking = SpecialPopulationsService.maskSensitiveReadBack(a.answer_value, a.question as any);
      const provenance = SpecialPopulationsService.formatAnswerProvenance(
        a.answered_via,
        privacyState.guardianDetails,
        privacyState.surrogateDetails
      );

      return {
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
        // Module 3B metadata:
        sensitivityLevel:
          (a.question as any).sensitivity_level || (a.question as any).sensitivityLevel || SensitivityLevels.NORMAL,
        visibilityScope:
          (a.question as any).visibility_scope || (a.question as any).visibilityScope || VisibilityScopes.STAFF_VISIBLE,
        isDeferredToDoctor: isDeferred,
        provenance,
        isMasked: masking.isMasked,
        maskedDisplayText: masking.displayText,
        aiSummarizationAllowed:
          (a.question as any).ai_summarization_allowed ?? (a.question as any).aiSummarizationAllowed ?? true,
      };
    });

    // Module 3B Section 9: If requesting user is staff (and NOT a doctor or super admin), scrub DOCTOR_ONLY and sensitive fields
    if (user && user.role !== 'DOCTOR' && user.role !== 'SUPER_ADMIN') {
      mappedAnswers = SpecialPopulationsService.scrubForStaffAttendants(mappedAnswers);
    }

    return {
      visitId: session.visit_id,
      patientId: session.patient_id,
      templateId: session.template_id,
      templateVersion: session.template_version,
      status: session.status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      answers: mappedAnswers,
      guardianDetails: privacyState.guardianDetails ? {
        ...privacyState.guardianDetails,
        legalNotice: "Point to confirm with hospital legal advisers: Guardian consent must meet applicable data-protection law requirements for children's data under local jurisdiction. Wording and age thresholds are configurable hospital policies.",
      } : null,
      surrogateDetails: privacyState.surrogateDetails || null,
    };
  }

  public static validateAnswerValue(
    question: { question_type: string; answer_options?: any; is_required?: boolean },
    value: any,
    isSkipped?: boolean
  ) {
    if (isSkipped) return;

    if (typeof value === 'object' && value !== null && value.status === AnswerStatus.DEFERRED_TO_DOCTOR) {
      return; // Deferral to doctor is a valid clinical intake choice
    }

    if (value === null || value === undefined || value === '') {
      if (question.is_required) {
        throw new ValidationError('This question requires an answer or must be explicitly skipped.');
      }
      return;
    }

    switch (question.question_type) {
      case QuestionTypes.YES_NO:
      case QuestionTypes.YES_NO_WITH_DETAIL: {
        const rawVal = typeof value === 'object' && value !== null ? value.value : value;
        if (typeof rawVal === 'string') {
          const upper = rawVal.trim().toUpperCase();
          if (upper !== 'YES' && upper !== 'NO') {
            throw new ValidationError('YES_NO answer must be YES or NO.');
          }
        } else if (typeof rawVal !== 'boolean') {
          throw new ValidationError('YES_NO questions require a boolean or string ("YES"/"NO") answer.');
        }
        break;
      }

      case QuestionTypes.NUMERIC:
        const num = Number(typeof value === 'object' ? value.value : value);
        if (isNaN(num)) {
          throw new ValidationError('Answer must be a valid number.');
        }
        break;

      case QuestionTypes.SINGLE_CHOICE:
      case QuestionTypes.DURATION:
        if (Array.isArray(question.answer_options) && question.answer_options.length > 0) {
          const valStr = String(typeof value === 'object' ? value.value : value).trim();
          const optionPermitted = question.answer_options.flatMap((opt: any) =>
            typeof opt === 'object' ? [opt.value, opt.code, opt.label].filter(Boolean) : [String(opt)]
          );
          if (!optionPermitted.includes(valStr)) {
            throw new ValidationError(`Answer must be one of the permitted options: ${optionPermitted.join(', ')}`);
          }
        }
        break;

      case QuestionTypes.FREE_TEXT:
        const textStr = String(typeof value === 'object' ? value.value : value);
        if (textStr.length > 5000) {
          throw new ValidationError('Text response exceeds maximum character limit of 5000.');
        }
        break;
    }
  }

  public static determineNextQuestionId(
    questions: Array<{ id: string; order: number; branching_logic?: any }>,
    currentQuestion: { id: string; order: number; branching_logic?: any },
    answerValue: any,
    patient?: any
  ): string | null {
    // 1. Check if branching logic triggers a specific next question
    if (currentQuestion.branching_logic && Array.isArray(currentQuestion.branching_logic)) {
      for (const rule of currentQuestion.branching_logic as unknown as BranchingRule[]) {
        const expected = rule.trigger_condition.answer;
        const actual = typeof answerValue === 'object' ? answerValue?.value : answerValue;

        if (expected !== undefined) {
          if (
            String(actual).toUpperCase() === String(expected).toUpperCase() ||
            (Array.isArray(actual) && actual.includes(expected as any))
          ) {
            return rule.next_question_id;
          }
        }
      }
    }

    // 2. Default linear progression: find question with next highest order (gated non-inferentially)
    let candidateQuestions = questions.filter((q) => q.order > currentQuestion.order);
    if (patient) {
      candidateQuestions = candidateQuestions.filter(
        (q) => SpecialPopulationsService.isQuestionApplicable(q as any, patient).applicable
      );
    }

    const nextLinear = candidateQuestions.sort((a, b) => a.order - b.order)[0];

    return nextLinear ? nextLinear.id : null;
  }

  public static formatSessionState(session: any, patient?: any) {
    let questions = session.template?.questions || [];
    const answers = session.answers || [];

    // Module 3B: Non-Inferential Question Gating on template questions
    if (patient) {
      questions = SpecialPopulationsService.filterApplicableQuestions(questions as any, {
        age: patient.age,
        gender: patient.gender,
      });
    }

    const privacyState = SpecialPopulationsService.getVisitState(session.visit_id);

    const answeredQuestionIds = new Set(answers.map((a: any) => a.question_id));
    const totalQuestions = questions.length;
    const answeredCount = answeredQuestionIds.size;
    const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    let currentQuestion = null;
    if (session.current_question_id) {
      currentQuestion = questions.find((q: any) => q.id === session.current_question_id) || null;
    }

    // If no current question but incomplete, find first unanswered
    if (!currentQuestion && answeredCount < totalQuestions) {
      currentQuestion = questions.find((q: any) => !answeredQuestionIds.has(q.id)) || null;
    }

    const currentQuestionIndex = currentQuestion
      ? questions.findIndex((q: any) => q.id === currentQuestion.id) + 1
      : totalQuestions;

    let audioPrivacy: {
      audioPlaybackAllowed: boolean;
      outputRoute: 'HEADSET' | 'LOUDSPEAKER' | 'MUTED';
      privacyNotice?: string;
    } = {
      audioPlaybackAllowed: true,
      outputRoute: (privacyState.headsetConnected ? 'HEADSET' : 'LOUDSPEAKER') as 'HEADSET' | 'LOUDSPEAKER' | 'MUTED',
    };

    if (currentQuestion) {
      audioPrivacy = SpecialPopulationsService.resolveAudioPrivacy(
        currentQuestion as any,
        privacyState.headsetConnected
      );
    }

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
      privacy: {
        headsetConnected: privacyState.headsetConnected,
        audioPlaybackAllowed: audioPrivacy.audioPlaybackAllowed,
        outputRoute: audioPrivacy.outputRoute,
        privacyNotice: audioPrivacy.privacyNotice,
        isMinor: !!privacyState.guardianDetails,
        guardianDetails: privacyState.guardianDetails || null,
        surrogateDetails: privacyState.surrogateDetails || null,
        mode: privacyState.guardianDetails ? 'GUARDIAN' : privacyState.surrogateDetails ? 'SURROGATE' : 'PATIENT',
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
            questionCode: currentQuestion.question_code,
            section: currentQuestion.section,
            promptText: currentQuestion.prompt_text,
            promptAudioHint: currentQuestion.prompt_audio_hint,
            questionType: currentQuestion.question_type,
            answerOptions: currentQuestion.answer_options,
            isCritical: currentQuestion.is_critical,
            isRequired: currentQuestion.is_required,
            order: currentQuestion.order,
            sensitivityLevel: (currentQuestion as any).sensitivity_level || (currentQuestion as any).sensitivityLevel || SensitivityLevels.NORMAL,
            visibilityScope: (currentQuestion as any).visibility_scope || (currentQuestion as any).visibilityScope || VisibilityScopes.STAFF_VISIBLE,
            audioAllowedInPublic: (currentQuestion as any).audio_allowed_in_public ?? (currentQuestion as any).audioAllowedInPublic ?? true,
            audioPlaybackAllowed: audioPrivacy.audioPlaybackAllowed,
            outputRoute: audioPrivacy.outputRoute,
            privacyNotice: audioPrivacy.privacyNotice,
            aiSummarizationAllowed: (currentQuestion as any).ai_summarization_allowed ?? (currentQuestion as any).aiSummarizationAllowed ?? true,
          }
        : null,
      allQuestions: questions.map((q: any) => ({
        id: q.id,
        questionCode: q.question_code,
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
      answers: answers.map((a: any) => ({
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

  // ============================================================================
  // MODULE 3B: SPECIAL POPULATIONS, SURROGATE & PRIVACY CONFIGURATION
  // ============================================================================

  public static async configureGuardianMode(
    visitId: string,
    details: {
      guardianName: string;
      guardianRelationship: string;
      guardianPhone?: string;
      guardianConsentVerified: boolean;
      minorAssentObtained?: boolean;
    }
  ) {
    return SpecialPopulationsService.recordGuardianDetails(visitId, details);
  }

  public static async configureSurrogateMode(
    visitId: string,
    details: {
      surrogateName: string;
      surrogateRelationship: string;
      surrogatePhone?: string;
      reason: any;
      acuteDistressNoted?: boolean;
    },
    kioskLocation?: string
  ) {
    return SpecialPopulationsService.recordSurrogateDetails(visitId, details, kioskLocation);
  }

  public static async updateHeadsetStatus(visitId: string, connected: boolean) {
    return SpecialPopulationsService.setHeadsetStatus(visitId, connected);
  }

  public static async deferQuestionToDoctor(
    visitId: string,
    questionId: string,
    _reason?: string
  ) {
    SpecialPopulationsService.deferQuestionToDoctor(visitId, questionId);
    return {
      success: true,
      questionId,
      status: AnswerStatus.DEFERRED_TO_DOCTOR,
      message: 'Question deferred for private discussion with doctor during consultation',
    };
  }

  /**
   * MODULE 3B Section 5: Staff flags "patient unwell or unable"
   * Halts the interview intake immediately and triggers Module 6 manual-alert path.
   */
  public static async flagPatientUnwell(
    visitId: string,
    kioskDeviceId?: string | null,
    reason?: string
  ) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (session) {
      await InterviewRepository.updateSessionStatus(session.id, InterviewSessionStatus.ABANDONED);
    }

    const alert = await RedFlagsService.flagPatientUnwellOrUnable(visitId, kioskDeviceId, reason);
    return {
      success: true,
      status: 'HALTED_FOR_STAFF',
      alertId: alert.id,
      message: 'Intake halted. Staff dispatched to assist patient directly.',
    };
  }

  /**
   * MODULE 3B Section 10: Separate consent for sensitive sections
   * Offers: CONTINUE, SKIP_SECTION, DEFER_ALL_TO_DOCTOR
   * Supports companion-present "answer privately" path
   */
  public static async processSensitiveSectionConsent(
    visitId: string,
    payload: {
      section: string;
      action: 'CONSENT_GIVEN' | 'SKIP_SECTION' | 'DEFER_ALL_TO_DOCTOR';
      companionPresent?: boolean;
      requestedPrivateMode?: boolean;
    }
  ) {
    const session = await InterviewRepository.findSessionByVisitId(visitId);
    if (!session) {
      throw new NotFoundError(`No interview session found for visit: ${visitId}`);
    }

    const questionsInSection = session.template.questions.filter((q) => q.section === payload.section);
    let nextQuestionId: string | null = null;

    if (payload.action === 'SKIP_SECTION') {
      // Mark all questions in this section as skipped
      for (const q of questionsInSection) {
        await InterviewRepository.upsertAnswer({
          sessionId: session.id,
          visitId,
          questionId: q.id,
          answerValue: 'SKIPPED_SECTION_BY_PATIENT',
          answeredVia: 'touch',
          languageUsed: 'en',
          isCritical: q.is_critical,
          isSkipped: true,
        });
      }

      // Find the first question belonging to the NEXT section
      const remainingQuestions = session.template.questions.filter(
        (q) => q.section !== payload.section && q.order > (questionsInSection[questionsInSection.length - 1]?.order || 0)
      );
      nextQuestionId = remainingQuestions[0]?.id || null;
      await InterviewRepository.updateSessionCurrentQuestion(session.id, nextQuestionId);
    } else if (payload.action === 'DEFER_ALL_TO_DOCTOR') {
      // Mark all questions in this section as DEFERRED_TO_DOCTOR
      for (const q of questionsInSection) {
        SpecialPopulationsService.deferQuestionToDoctor(visitId, q.id);
        await InterviewRepository.upsertAnswer({
          sessionId: session.id,
          visitId,
          questionId: q.id,
          answerValue: {
            status: AnswerStatus.DEFERRED_TO_DOCTOR,
            deferralReason: 'Patient opted to discuss sensitive section privately with doctor',
          },
          answeredVia: 'touch',
          languageUsed: 'en',
          isCritical: q.is_critical,
          isSkipped: false,
        });
      }

      const remainingQuestions = session.template.questions.filter(
        (q) => q.section !== payload.section && q.order > (questionsInSection[questionsInSection.length - 1]?.order || 0)
      );
      nextQuestionId = remainingQuestions[0]?.id || null;
      await InterviewRepository.updateSessionCurrentQuestion(session.id, nextQuestionId);
    } else {
      // CONSENT_GIVEN: Next question is the first question of this section
      nextQuestionId = questionsInSection[0]?.id || null;
      await InterviewRepository.updateSessionCurrentQuestion(session.id, nextQuestionId);
    }

    return {
      success: true,
      section: payload.section,
      action: payload.action,
      nextQuestionId,
      companionPrivateModeOffered: payload.companionPresent ?? false,
      message:
        payload.action === 'SKIP_SECTION'
          ? `Section ${payload.section} skipped by patient.`
          : payload.action === 'DEFER_ALL_TO_DOCTOR'
          ? `Section ${payload.section} deferred to doctor consultation.`
          : `Consent recorded for section ${payload.section}.`,
    };
  }

  /**
   * MODULE 3B Section 8: Sensitive Disclosure Trigger
   * When designated sensitive indicator is answered, raises neutral floor alert
   */
  public static async triggerSensitiveDisclosure(
    visitId: string,
    kioskDeviceId?: string | null,
    kioskLocation?: string
  ) {
    return RedFlagsService.raiseSensitiveDisclosureAlert(visitId, kioskDeviceId, kioskLocation);
  }
}

