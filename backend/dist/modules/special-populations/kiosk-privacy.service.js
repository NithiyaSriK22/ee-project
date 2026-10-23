"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskPrivacyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const special_populations_types_js_1 = require("./special-populations.types.js");
const guardian_minor_service_js_1 = require("./guardian-minor.service.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
class KioskPrivacyService {
    // Headset status tracked per visit session or kiosk device
    static headsetSessions = new Map();
    // Deferred questions registry per visit
    static deferredRegistry = new Map();
    /**
     * Set or toggle headset connection state for a kiosk visit
     */
    static setHeadsetStatus(visitId, isConnected) {
        this.headsetSessions.set(visitId, isConnected);
        logger_js_1.logger.info('[KIOSK_HEADSET_STATUS_CHANGED]', { visitId, isConnected });
    }
    static isHeadsetConnected(visitId) {
        return this.headsetSessions.get(visitId) ?? false;
    }
    /**
     * Evaluates non-inferential demographic question gating
     * - Age gating (ageMin, ageMax)
     * - Stated biological sex / gender gating (NEVER infer from names or assumptions)
     * - Explicit pregnancy confirmation gating (NEVER assume pregnancy)
     */
    static evaluateQuestionGating(patient, question) {
        // 1. Age Gating
        let ageYears = patient.ageYears;
        if (ageYears === undefined || ageYears === null) {
            if (patient.dob) {
                ageYears = guardian_minor_service_js_1.GuardianMinorService.calculateAgeYears(patient.dob);
            }
        }
        if (ageYears !== undefined && ageYears !== null) {
            const ageEvaluation = guardian_minor_service_js_1.GuardianMinorService.evaluateAgeGating(ageYears, question);
            if (!ageEvaluation.shouldAsk) {
                return ageEvaluation;
            }
        }
        // 2. Stated Sex Gating (Strictly non-inferential)
        if (question.sexApplicability && question.sexApplicability !== special_populations_types_js_1.SexApplicability.ALL) {
            const patientStatedSex = (patient.statedSex || '').trim().toUpperCase();
            if (!patientStatedSex || patientStatedSex !== question.sexApplicability) {
                return {
                    shouldAsk: false,
                    exclusionReason: 'SEX_INAPPLICABLE',
                    details: `Question requires stated sex '${question.sexApplicability}', but patient registered stated sex is '${patientStatedSex || 'UNSTATED'}'`,
                };
            }
        }
        // 3. Pregnancy Gating (Strictly non-inferential)
        if (question.pregnancyGated) {
            if (!patient.isPregnancyConfirmed) {
                return {
                    shouldAsk: false,
                    exclusionReason: 'PREGNANCY_NOT_CONFIRMED',
                    details: 'Question is gated for confirmed pregnancy only; patient has not confirmed active pregnancy',
                };
            }
        }
        return { shouldAsk: true };
    }
    /**
     * Evaluates public loudspeaker suppression, headset routing, and read-back masking
     */
    static evaluateAudioRouting(question, headsetConnected, userRequestedSilence = false) {
        // 1. Explicit user mute request
        if (userRequestedSilence) {
            return {
                allowPublicSpeaker: false,
                audioSuppressed: true,
                suppressionReason: 'PATIENT_REQUESTED_SILENCE',
                screenGuidanceText: 'Audio output muted per patient request.',
                readBackMasking: {
                    useMaskedReadBack: true,
                    maskedText: 'Response recorded.',
                },
            };
        }
        const isSensitive = question.sensitivityLevel !== 'NORMAL';
        const isPublicAudioRestricted = !question.audioAllowedInPublic || isSensitive;
        // 2. Sensitive question handling
        if (isPublicAudioRestricted) {
            if (headsetConnected) {
                // Safe to play private audio through connected headphones
                return {
                    allowPublicSpeaker: false,
                    audioSuppressed: false,
                    screenGuidanceText: 'Audio playing privately via connected headset.',
                    readBackMasking: {
                        useMaskedReadBack: true,
                        maskedText: 'Your answer has been recorded securely.',
                    },
                };
            }
            else {
                // Public speaker MUST be silenced to prevent public disclosure
                return {
                    allowPublicSpeaker: false,
                    audioSuppressed: true,
                    suppressionReason: 'PUBLIC_SPEAKER_SENSITIVE_CONTENT',
                    screenGuidanceText: 'For your privacy, this question is displayed on screen only. Plug in headphones for private audio guidance.',
                    readBackMasking: {
                        useMaskedReadBack: true,
                        maskedText: 'Your response has been recorded securely.',
                    },
                };
            }
        }
        // 3. Normal questions with public audio allowed
        return {
            allowPublicSpeaker: true,
            audioSuppressed: false,
            screenGuidanceText: 'Audio playing via kiosk speaker.',
            readBackMasking: {
                useMaskedReadBack: false,
                maskedText: '',
            },
        };
    }
    /**
     * Records a patient deferral ("I prefer to discuss this privately with the doctor")
     */
    static deferQuestionToDoctor(payload, promptText) {
        if (!payload.visitId || !payload.questionId) {
            throw new app_error_js_1.ValidationError('visitId and questionId are required to defer a question');
        }
        const record = {
            id: crypto_1.default.randomUUID(),
            visitId: payload.visitId,
            questionId: payload.questionId,
            questionCode: payload.questionCode,
            promptText,
            deferredAt: new Date(),
            status: 'DEFERRED_TO_DOCTOR',
        };
        const existing = this.deferredRegistry.get(payload.visitId) || [];
        existing.push(record);
        this.deferredRegistry.set(payload.visitId, existing);
        logger_js_1.logger.info('[QUESTION_DEFERRED_TO_DOCTOR]', {
            visitId: payload.visitId,
            questionId: payload.questionId,
            questionCode: payload.questionCode,
        });
        return { ...record };
    }
    /**
     * Retrieves all deferred questions for a visit (used in Doctor Consultation Review)
     */
    static getDeferredQuestionsForVisit(visitId) {
        const list = this.deferredRegistry.get(visitId) || [];
        return list.map((item) => ({ ...item }));
    }
    /**
     * Test/admin helper: clear store
     */
    static clearStore() {
        this.headsetSessions.clear();
        this.deferredRegistry.clear();
    }
}
exports.KioskPrivacyService = KioskPrivacyService;
