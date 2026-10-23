"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialPopulationsController = void 0;
const guardian_minor_service_js_1 = require("./guardian-minor.service.js");
const surrogate_mode_service_js_1 = require("./surrogate-mode.service.js");
const kiosk_privacy_service_js_1 = require("./kiosk-privacy.service.js");
const neutral_alert_service_js_1 = require("./neutral-alert.service.js");
const interview_privacy_filter_js_1 = require("./interview-privacy-filter.js");
const interview_service_js_1 = require("../interview/interview.service.js");
const app_error_js_1 = require("../../errors/app-error.js");
class SpecialPopulationsController {
    // ============================================================================
    // GUARDIAN & MINOR FLOW
    // ============================================================================
    static async registerGuardian(req, res, next) {
        try {
            const { visitId, patientId, guardianName, guardianRelationship, guardianPhone, guardianConsentRecorded, patientDob } = req.body;
            const record = guardian_minor_service_js_1.GuardianMinorService.registerGuardian({
                visitId,
                patientId,
                guardianName,
                guardianRelationship,
                guardianPhone,
                guardianConsentRecorded: Boolean(guardianConsentRecorded),
            }, patientDob);
            res.status(201).json({
                success: true,
                data: record,
                message: 'Guardian registration completed successfully for minor patient intake.',
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getGuardian(req, res, next) {
        try {
            const visitId = req.params.visitId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required');
            }
            const record = guardian_minor_service_js_1.GuardianMinorService.getGuardianForVisit(visitId);
            res.status(200).json({
                success: true,
                data: record,
            });
        }
        catch (err) {
            next(err);
        }
    }
    // ============================================================================
    // SURROGATE MODE FLOW
    // ============================================================================
    static async registerSurrogate(req, res, next) {
        try {
            const { visitId, patientId, surrogateName, surrogateRelationship, reasonPatientUnable, patientConsentGivenOrAssumed, isAcuteDistressReported, kioskDeviceId, } = req.body;
            const result = surrogate_mode_service_js_1.SurrogateModeService.registerSurrogate({
                visitId,
                patientId,
                surrogateName,
                surrogateRelationship,
                reasonPatientUnable,
                patientConsentGivenOrAssumed: Boolean(patientConsentGivenOrAssumed),
                isAcuteDistressReported: Boolean(isAcuteDistressReported),
            }, kioskDeviceId);
            res.status(201).json({
                success: true,
                data: result,
                message: result.emergencyRouting
                    ? 'Surrogate registered: Patient flagged in acute distress, emergency routing initiated.'
                    : 'Surrogate registered successfully for assisted intake.',
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getSurrogate(req, res, next) {
        try {
            const visitId = req.params.visitId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required');
            }
            const record = surrogate_mode_service_js_1.SurrogateModeService.getSurrogateForVisit(visitId);
            res.status(200).json({
                success: true,
                data: record,
            });
        }
        catch (err) {
            next(err);
        }
    }
    // ============================================================================
    // KIOSK PRIVACY, GATING & AUDIO ROUTING
    // ============================================================================
    static async checkQuestionGating(req, res, next) {
        try {
            const { patient, question } = req.body;
            if (!patient || !question) {
                throw new app_error_js_1.ValidationError('Both patient and question objects are required for gating check');
            }
            const evaluation = kiosk_privacy_service_js_1.KioskPrivacyService.evaluateQuestionGating(patient, question);
            res.status(200).json({
                success: true,
                data: evaluation,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async evaluateAudioRouting(req, res, next) {
        try {
            const { question, headsetConnected, userRequestedSilence } = req.body;
            if (!question) {
                throw new app_error_js_1.ValidationError('Question metadata is required to evaluate audio routing');
            }
            const decision = kiosk_privacy_service_js_1.KioskPrivacyService.evaluateAudioRouting(question, Boolean(headsetConnected), Boolean(userRequestedSilence));
            res.status(200).json({
                success: true,
                data: decision,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async setHeadsetStatus(req, res, next) {
        try {
            const { visitId, isConnected } = req.body;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required to set headset status');
            }
            kiosk_privacy_service_js_1.KioskPrivacyService.setHeadsetStatus(visitId, Boolean(isConnected));
            res.status(200).json({
                success: true,
                data: { visitId, isConnected: Boolean(isConnected) },
                message: 'Kiosk headset connection status updated',
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async deferQuestion(req, res, next) {
        try {
            const { visitId, questionId, questionCode, promptText } = req.body;
            if (!visitId || !questionId) {
                throw new app_error_js_1.ValidationError('visitId and questionId are required to defer a question');
            }
            const record = kiosk_privacy_service_js_1.KioskPrivacyService.deferQuestionToDoctor({ visitId, questionId, questionCode }, promptText || 'Sensitive Consultation Topic');
            res.status(201).json({
                success: true,
                data: record,
                message: 'Question deferred to private doctor consultation.',
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDeferredQuestions(req, res, next) {
        try {
            const visitId = req.params.visitId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required');
            }
            const records = kiosk_privacy_service_js_1.KioskPrivacyService.getDeferredQuestionsForVisit(visitId);
            res.status(200).json({
                success: true,
                data: records,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async requestNeutralAssistance(req, res, next) {
        try {
            const { visitId, kioskDeviceId, kioskBayLocation, alertType } = req.body;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required to dispatch assistance alert');
            }
            const alert = neutral_alert_service_js_1.NeutralAlertService.dispatchNeutralAlert({
                visitId,
                kioskDeviceId,
                kioskBayLocation,
                alertType: alertType || 'SENSITIVE_ASSISTANCE_REQUESTED',
            });
            res.status(201).json({
                success: true,
                data: alert,
                message: 'Neutral assistance notification dispatched to floor staff.',
            });
        }
        catch (err) {
            next(err);
        }
    }
    // ============================================================================
    // DOCTOR-ONLY SCOPING & FILTERED ANSWERS
    // ============================================================================
    static async getFilteredAnswers(req, res, next) {
        try {
            const visitId = req.params.visitId;
            if (!visitId) {
                throw new app_error_js_1.ValidationError('visitId is required');
            }
            const userRole = req.user?.role || 'STAFF_ATTENDANT';
            // 1. Fetch raw answers from Module 3
            const rawInterview = await interview_service_js_1.InterviewService.getCompletedAnswers(visitId);
            const answers = rawInterview.answers || [];
            // 2. Fetch guardian / surrogate provenance if active
            const guardian = guardian_minor_service_js_1.GuardianMinorService.getGuardianForVisit(visitId);
            const surrogate = surrogate_mode_service_js_1.SurrogateModeService.getSurrogateForVisit(visitId);
            let provenanceLabel = undefined;
            if (guardian) {
                provenanceLabel = guardian_minor_service_js_1.GuardianMinorService.formatProvenanceLabel(guardian);
            }
            else if (surrogate) {
                provenanceLabel = surrogate.provenanceLabel;
            }
            const scopedAnswers = answers.map((ans) => ({
                id: ans.id,
                questionId: ans.questionId,
                section: ans.section,
                promptText: ans.promptText,
                answerValue: ans.answerValue,
                answeredVia: ans.answeredVia,
                provenanceLabel,
                visibilityScope: ans.visibilityScope || 'STAFF_VISIBLE',
                sensitivityLevel: ans.sensitivityLevel || 'NORMAL',
                isRedacted: false,
                answeredAt: ans.answeredAt,
            }));
            // 3. Filter based on requesting role
            const filtered = interview_privacy_filter_js_1.InterviewPrivacyFilter.filterAnswersForRole(scopedAnswers, userRole);
            const deferred = kiosk_privacy_service_js_1.KioskPrivacyService.getDeferredQuestionsForVisit(visitId);
            res.status(200).json({
                success: true,
                data: {
                    visitId,
                    userRole,
                    answers: filtered,
                    deferredQuestions: deferred,
                    specialPopulationMode: guardian ? 'MINOR_GUARDIAN' : surrogate ? 'SURROGATE' : 'STANDARD',
                    provenance: provenanceLabel,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SpecialPopulationsController = SpecialPopulationsController;
