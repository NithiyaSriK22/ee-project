"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarryForwardService = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
const identity_safety_service_js_1 = require("../visit-lifecycle/identity-safety.service.js");
const interview_repository_js_1 = require("../interview/interview.repository.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
class CarryForwardService {
    // Configurable threshold: answers older than 365 days are always re-asked fresh
    static DEFAULT_MAX_AGE_DAYS = 365;
    // Governed question codes recognized as stable vs volatile
    static STABLE_QUESTION_CODES = new Set([
        'PAST_CONDITIONS',
        'PAST_SURGERIES',
        'ALLERGIES',
        'FAMILY_HISTORY',
        'LIFESTYLE_HABITS',
    ]);
    static VOLATILE_QUESTION_CODES = new Set([
        'CHIEF_COMPLAINT_PRIMARY',
        'CHIEF_COMPLAINT_DURATION',
        'CHEST_PAIN_DYSPNEA',
        'FEVER_CHILLS',
        'PAIN_SEVERITY',
    ]);
    // In-memory store for test/isolated visits without DB patient records
    static inMemoryPriorAnswers = new Map();
    /**
     * Helper to seed in-memory prior visit answers for automated tests & fallback
     */
    static seedPriorVisitAnswers(patientId, answers) {
        this.inMemoryPriorAnswers.set(patientId, answers);
    }
    /**
     * Retrieves stable carry-forward candidate questions from prior visits
     */
    static async getCarryForwardCandidates(patientId, currentVisitId, maxAgeDays = this.DEFAULT_MAX_AGE_DAYS) {
        // 1. Provisional Identity Gate (Section 6)
        // Provisional-identity visits CANNOT retrieve prior medical records until verified
        if (this.isProvisionalIdentity(patientId)) {
            throw new app_error_js_1.ForbiddenError('Provisional-identity visits cannot retrieve prior medical records. Identity must be confirmed first.');
        }
        const candidates = [];
        // 2. Fetch prior visit answers from Database
        const isDbUp = await (0, doctor_review_repository_js_1.checkDatabaseAvailability)();
        if (isDbUp) {
            try {
                const priorVisits = await prisma_js_1.prisma.patientVisitProfile.findMany({
                    where: {
                        patient_id: patientId,
                        visit_id: { not: currentVisitId },
                    },
                    select: { visit_id: true, created_at: true },
                    orderBy: { created_at: 'desc' },
                });
                const priorVisitIds = priorVisits.map((v) => v.visit_id);
                if (priorVisitIds.length > 0) {
                    const priorAnswers = await prisma_js_1.prisma.interviewAnswer.findMany({
                        where: {
                            visit_id: { in: priorVisitIds },
                        },
                        include: {
                            question: true,
                        },
                        orderBy: { answered_at: 'desc' },
                    });
                    const seenQuestions = new Set();
                    for (const ans of priorAnswers) {
                        const qCode = ans.question.question_code || ans.question.id;
                        if (seenQuestions.has(qCode))
                            continue;
                        seenQuestions.add(qCode);
                        const candidate = this.evaluateCandidate(ans.question.id, qCode, ans.question.section, ans.question.prompt_text, ans.id, ans.visit_id, ans.answered_at, ans.answer_value, maxAgeDays);
                        candidates.push(candidate);
                    }
                }
            }
            catch (err) {
                logger_js_1.logger.info('Database query for prior visit answers bypassed or empty, checking fallback', { patientId });
            }
        }
        // 3. Fallback to in-memory seeded prior answers if DB returned empty
        if (candidates.length === 0 && this.inMemoryPriorAnswers.has(patientId)) {
            const memoryAnswers = this.inMemoryPriorAnswers.get(patientId);
            const seen = new Set();
            for (const ans of memoryAnswers) {
                if (ans.visitId === currentVisitId)
                    continue;
                if (seen.has(ans.questionCode))
                    continue;
                seen.add(ans.questionCode);
                const candidate = this.evaluateCandidate(ans.questionId, ans.questionCode, ans.section, ans.promptText, `mem_ans_${ans.questionId}`, ans.visitId, ans.answeredAt, ans.answerValue, maxAgeDays);
                candidates.push(candidate);
            }
        }
        return candidates;
    }
    /**
     * Confirms or changes a prior answer at the kiosk for the current visit
     */
    static async processCarryForwardConfirmation(currentVisitId, patientId, payload) {
        // 1. Provisional identity check
        if (this.isProvisionalIdentity(patientId)) {
            throw new app_error_js_1.ForbiddenError('Provisional-identity visits cannot confirm or carry forward prior medical records.');
        }
        const session = await interview_repository_js_1.InterviewRepository.findSessionByVisitId(currentVisitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError(`Interview session not found for visit: ${currentVisitId}`);
        }
        const question = session.template.questions.find((q) => q.id === payload.questionId);
        if (!question) {
            throw new app_error_js_1.ValidationError('Question does not belong to the active interview template.');
        }
        let finalValue = payload.newAnswerValue;
        let origin = 'CHANGED_BY_PATIENT';
        if (payload.action === 'CONFIRM') {
            origin = 'CONFIRMED_FROM_PRIOR';
            // If confirming, fetch prior value if not supplied in payload
            if (!finalValue) {
                try {
                    const prior = await prisma_js_1.prisma.interviewAnswer.findUnique({
                        where: { id: payload.priorAnswerId },
                    });
                    finalValue = prior ? prior.answer_value : payload.newAnswerValue;
                }
                catch {
                    finalValue = payload.newAnswerValue;
                }
            }
        }
        // Persist as a new answer for CURRENT visit with explicit origin
        const recorded = await interview_repository_js_1.InterviewRepository.upsertAnswer({
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
        logger_js_1.logger.info('Carry-forward confirmation processed', {
            currentVisitId,
            questionId: question.id,
            action: payload.action,
            origin,
        });
        return {
            recordedAnswer: recorded,
            origin,
            message: payload.action === 'CONFIRM'
                ? 'Prior clinical answer confirmed and attached to current visit record.'
                : 'Answer updated with new response for current visit.',
        };
    }
    /**
     * Evaluates if a question is a valid candidate for carry-forward
     */
    static evaluateCandidate(questionId, questionCode, section, promptText, priorAnswerId, priorVisitId, priorAnsweredAt, priorAnswerValue, maxAgeDays) {
        const isVolatile = this.VOLATILE_QUESTION_CODES.has(questionCode);
        const isStable = this.STABLE_QUESTION_CODES.has(questionCode);
        // Volatile items are NEVER allowed to carry forward
        const carryForwardAllowed = isStable && !isVolatile;
        const answeredDate = new Date(priorAnsweredAt);
        const now = new Date();
        const ageInDays = Math.max(0, Math.floor((now.getTime() - answeredDate.getTime()) / (1000 * 60 * 60 * 24)));
        const isTooOld = ageInDays > maxAgeDays;
        const eligibleForKioskPrompt = carryForwardAllowed && !isTooOld;
        const priorDisplay = typeof priorAnswerValue === 'object' && priorAnswerValue !== null
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
    static isProvisionalIdentity(patientId) {
        if (!patientId)
            return false;
        // Check if patient ID or registration has provisional tag
        if (patientId.toLowerCase().includes('prov') || patientId.toLowerCase().includes('provisional')) {
            return true;
        }
        const memRecord = identity_safety_service_js_1.IdentitySafetyService.patientDirectory?.get(patientId);
        if (memRecord && memRecord.identity_state === 'PROVISIONAL') {
            return true;
        }
        return false;
    }
}
exports.CarryForwardService = CarryForwardService;
