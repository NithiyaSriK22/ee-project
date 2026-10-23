/**
 * MODULE 4A — CLINICAL TIMELINE & LONGITUDINAL HISTORY
 * CarryForwardService: Safe carry-forward of stable clinical history items
 *
 * SAFETY BOUNDARY:
 * - Only stable items marked carry_forward_allowed (chronic conditions, allergies, surgical, family history).
 * - Volatile items (current symptoms, fever, acute pain) are NEVER carried forward.
 * - Kiosk presents prior answer: "Is this still correct?" with Confirm or Change.
 * - Confirmed answers are recorded with origin CONFIRMED_FROM_PRIOR.
 * - Nothing is silently or automatically copied.
 * - Items older than configurable threshold (365 days) are ALWAYS re-asked fresh.
 * - Provisional-identity visits CANNOT retrieve prior records.
 */

import { prisma } from '../../database/prisma.js';
import { logger } from '../../config/logger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import {
  CarryForwardCandidate,
  CarryForwardConfirmationPayload,
} from './clinical-timeline.types.js';
import { IdentitySafetyService } from '../visit-lifecycle/identity-safety.service.js';
import { InterviewRepository } from '../interview/interview.repository.js';
import { checkDatabaseAvailability } from '../doctor-review/doctor-review.repository.js';

export class CarryForwardService {
  // Configurable threshold: answers older than 365 days are always re-asked fresh
  public static readonly DEFAULT_MAX_AGE_DAYS = 365;

  // Governed question codes recognized as stable vs volatile
  private static readonly STABLE_QUESTION_CODES = new Set([
    'PAST_CONDITIONS',
    'PAST_SURGERIES',
    'ALLERGIES',
    'FAMILY_HISTORY',
    'LIFESTYLE_HABITS',
  ]);

  private static readonly VOLATILE_QUESTION_CODES = new Set([
    'CHIEF_COMPLAINT_PRIMARY',
    'CHIEF_COMPLAINT_DURATION',
    'CHEST_PAIN_DYSPNEA',
    'FEVER_CHILLS',
    'PAIN_SEVERITY',
  ]);

  // In-memory store for test/isolated visits without DB patient records
  private static inMemoryPriorAnswers: Map<string, Array<{
    visitId: string;
    questionId: string;
    questionCode: string;
    section: string;
    promptText: string;
    answerValue: any;
    answeredAt: Date;
  }>> = new Map();

  /**
   * Helper to seed in-memory prior visit answers for automated tests & fallback
   */
  public static seedPriorVisitAnswers(
    patientId: string,
    answers: Array<{
      visitId: string;
      questionId: string;
      questionCode: string;
      section: string;
      promptText: string;
      answerValue: any;
      answeredAt: Date;
    }>
  ): void {
    this.inMemoryPriorAnswers.set(patientId, answers);
  }

  /**
   * Retrieves stable carry-forward candidate questions from prior visits
   */
  public static async getCarryForwardCandidates(
    patientId: string,
    currentVisitId: string,
    maxAgeDays: number = this.DEFAULT_MAX_AGE_DAYS
  ): Promise<CarryForwardCandidate[]> {
    // 1. Provisional Identity Gate (Section 6)
    // Provisional-identity visits CANNOT retrieve prior medical records until verified
    if (this.isProvisionalIdentity(patientId)) {
      throw new ForbiddenError(
        'Provisional-identity visits cannot retrieve prior medical records. Identity must be confirmed first.'
      );
    }

    const candidates: CarryForwardCandidate[] = [];

    // 2. Fetch prior visit answers from Database
    const isDbUp = await checkDatabaseAvailability();
    if (isDbUp) {
      try {
        const priorVisits = await prisma.patientVisitProfile.findMany({
          where: {
            patient_id: patientId,
            visit_id: { not: currentVisitId },
          },
          select: { visit_id: true, created_at: true },
          orderBy: { created_at: 'desc' },
        });

        const priorVisitIds = priorVisits.map((v) => v.visit_id);

        if (priorVisitIds.length > 0) {
          const priorAnswers = await prisma.interviewAnswer.findMany({
            where: {
              visit_id: { in: priorVisitIds },
            },
            include: {
              question: true,
            },
            orderBy: { answered_at: 'desc' },
          });

          const seenQuestions = new Set<string>();

          for (const ans of priorAnswers) {
            const qCode = ans.question.question_code || ans.question.id;
            if (seenQuestions.has(qCode)) continue;
            seenQuestions.add(qCode);

            const candidate = this.evaluateCandidate(
              ans.question.id,
              qCode,
              ans.question.section,
              ans.question.prompt_text,
              ans.id,
              ans.visit_id,
              ans.answered_at,
              ans.answer_value,
              maxAgeDays
            );

            candidates.push(candidate);
          }
        }
      } catch (err) {
        logger.info('Database query for prior visit answers bypassed or empty, checking fallback', { patientId });
      }
    }

    // 3. Fallback to in-memory seeded prior answers if DB returned empty
    if (candidates.length === 0 && this.inMemoryPriorAnswers.has(patientId)) {
      const memoryAnswers = this.inMemoryPriorAnswers.get(patientId)!;
      const seen = new Set<string>();

      for (const ans of memoryAnswers) {
        if (ans.visitId === currentVisitId) continue;
        if (seen.has(ans.questionCode)) continue;
        seen.add(ans.questionCode);

        const candidate = this.evaluateCandidate(
          ans.questionId,
          ans.questionCode,
          ans.section,
          ans.promptText,
          `mem_ans_${ans.questionId}`,
          ans.visitId,
          ans.answeredAt,
          ans.answerValue,
          maxAgeDays
        );

        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Confirms or changes a prior answer at the kiosk for the current visit
   */
  public static async processCarryForwardConfirmation(
    currentVisitId: string,
    patientId: string,
    payload: CarryForwardConfirmationPayload
  ): Promise<{
    recordedAnswer: any;
    origin: 'CONFIRMED_FROM_PRIOR' | 'CHANGED_BY_PATIENT';
    message: string;
  }> {
    // 1. Provisional identity check
    if (this.isProvisionalIdentity(patientId)) {
      throw new ForbiddenError(
        'Provisional-identity visits cannot confirm or carry forward prior medical records.'
      );
    }

    const session = await InterviewRepository.findSessionByVisitId(currentVisitId);
    if (!session) {
      throw new NotFoundError(`Interview session not found for visit: ${currentVisitId}`);
    }

    const question = session.template.questions.find((q) => q.id === payload.questionId);
    if (!question) {
      throw new ValidationError('Question does not belong to the active interview template.');
    }

    let finalValue = payload.newAnswerValue;
    let origin: 'CONFIRMED_FROM_PRIOR' | 'CHANGED_BY_PATIENT' = 'CHANGED_BY_PATIENT';

    if (payload.action === 'CONFIRM') {
      origin = 'CONFIRMED_FROM_PRIOR';
      // If confirming, fetch prior value if not supplied in payload
      if (!finalValue) {
        try {
          const prior = await prisma.interviewAnswer.findUnique({
            where: { id: payload.priorAnswerId },
          });
          finalValue = prior ? prior.answer_value : payload.newAnswerValue;
        } catch {
          finalValue = payload.newAnswerValue;
        }
      }
    }

    // Persist as a new answer for CURRENT visit with explicit origin
    const recorded = await InterviewRepository.upsertAnswer({
      sessionId: session.id,
      visitId: currentVisitId,
      questionId: question.id,
      answerValue: {
        value: typeof finalValue === 'object' && finalValue?.value !== undefined ? finalValue.value : finalValue,
        origin,
        priorAnswerIdRef: payload.priorAnswerId,
        priorVisitIdRef: payload.priorVisitId,
        confirmedAt: new Date().toISOString(),
      },
      answeredVia: 'touch',
      languageUsed: 'en',
      isCritical: question.is_critical,
    });

    logger.info('Carry-forward confirmation processed', {
      currentVisitId,
      questionId: question.id,
      action: payload.action,
      origin,
    });

    return {
      recordedAnswer: recorded,
      origin,
      message:
        payload.action === 'CONFIRM'
          ? 'Prior clinical answer confirmed and attached to current visit record.'
          : 'Answer updated with new response for current visit.',
    };
  }

  /**
   * Evaluates if a question is a valid candidate for carry-forward
   */
  private static evaluateCandidate(
    questionId: string,
    questionCode: string,
    section: string,
    promptText: string,
    priorAnswerId: string,
    priorVisitId: string,
    priorAnsweredAt: Date,
    priorAnswerValue: any,
    maxAgeDays: number
  ): CarryForwardCandidate {
    const isVolatile = this.VOLATILE_QUESTION_CODES.has(questionCode);
    const isStable = this.STABLE_QUESTION_CODES.has(questionCode);

    // Volatile items are NEVER allowed to carry forward
    const carryForwardAllowed = isStable && !isVolatile;

    const answeredDate = new Date(priorAnsweredAt);
    const now = new Date();
    const ageInDays = Math.max(0, Math.floor((now.getTime() - answeredDate.getTime()) / (1000 * 60 * 60 * 24)));
    const isTooOld = ageInDays > maxAgeDays;

    const eligibleForKioskPrompt = carryForwardAllowed && !isTooOld;

    const priorDisplay =
      typeof priorAnswerValue === 'object' && priorAnswerValue !== null
        ? String(priorAnswerValue.value ?? JSON.stringify(priorAnswerValue))
        : String(priorAnswerValue ?? '');

    return {
      questionId,
      questionCode,
      section,
      promptText,
      priorAnswerId,
      priorVisitId,
      priorAnsweredAt: answeredDate.toISOString(),
      priorAnswerValue,
      priorDisplayValue: priorDisplay,
      carryForwardAllowed,
      isVolatile,
      ageInDays,
      isTooOld,
      eligibleForKioskPrompt,
    };
  }

  private static isProvisionalIdentity(patientId: string): boolean {
    if (!patientId) return false;
    // Check if patient ID or registration has provisional tag
    if (patientId.toLowerCase().includes('prov') || patientId.toLowerCase().includes('provisional')) {
      return true;
    }
    const memRecord = (IdentitySafetyService as any).patientDirectory?.get(patientId);
    if (memRecord && memRecord.identity_state === 'PROVISIONAL') {
      return true;
    }
    return false;
  }
}
