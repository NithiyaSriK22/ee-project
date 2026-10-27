"use strict";
/**
 * MODULE 3B — SPECIAL POPULATIONS, SENSITIVE TOPICS & INTERVIEW PRIVACY
 * Service implementing guardian & surrogate intake modes, non-inferential question gating,
 * public kiosk headset audio routing, read-back masking, neutral staff alerts,
 * and doctor-only scoping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialPopulationsService = void 0;
const logger_js_1 = require("../../config/logger.js");
const interview_types_js_1 = require("../../types/interview.types.js");
const redflags_service_js_1 = require("../redflags/redflags.service.js");
const dev_fallback_patient_store_js_1 = require("../patients/dev-fallback-patient-store.js");
class SpecialPopulationsService {
    // Default Age of Majority (configurable hospital policy threshold)
    static DEFAULT_AGE_OF_MAJORITY = 18;
    // In-memory session registry for runtime state (guardian, surrogate, headset) per visit
    static visitPrivacyState = new Map();
    /**
     * Initializes or retrieves runtime privacy & population state for a visit
     */
    static getVisitState(visitId) {
        if (!this.visitPrivacyState.has(visitId)) {
            this.visitPrivacyState.set(visitId, {
                headsetConnected: false,
                deferredQuestionIds: new Set(),
            });
        }
        return this.visitPrivacyState.get(visitId);
    }
    /**
     * Evaluates patient chronological age from date of birth or recorded age
     */
    static evaluatePatientAge(dob, statedAge, ageOfMajority = this.DEFAULT_AGE_OF_MAJORITY) {
        let calculatedAge = null;
        if (dob) {
            const birthDate = new Date(dob);
            if (!isNaN(birthDate.getTime())) {
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                calculatedAge = Math.max(0, age);
            }
        }
        if (calculatedAge === null && statedAge !== undefined && statedAge !== null && !isNaN(statedAge)) {
            calculatedAge = Math.max(0, Math.floor(statedAge));
        }
        const isMinor = calculatedAge !== null ? calculatedAge < ageOfMajority : false;
        return {
            age: calculatedAge,
            isMinor,
            ageOfMajority,
        };
    }
    /**
     * Validates whether guardian consent is required and verified for minor intake
     */
    static validateGuardianRequirement(patient, visitId) {
        const ageEval = this.evaluatePatientAge(patient.date_of_birth, patient.age);
        if (!ageEval.isMinor) {
            return { required: false, verified: true };
        }
        const state = this.getVisitState(visitId);
        let hasVerifiedGuardian = !!(state.guardianDetails && state.guardianDetails.guardianConsentVerified);
        if (!hasVerifiedGuardian) {
            const fallbackProfile = dev_fallback_patient_store_js_1.devFallbackPatientStore.getVisitProfile(visitId);
            if (fallbackProfile && (fallbackProfile.is_companion_assisted || fallbackProfile.companion_name)) {
                state.guardianDetails = {
                    guardianName: fallbackProfile.companion_name || 'Accompanying Adult / Staff',
                    guardianRelationship: fallbackProfile.companion_relationship || 'Parent / Legal Guardian',
                    guardianConsentVerified: true,
                    minorAssentObtained: true,
                    verifiedAt: new Date().toISOString(),
                };
                hasVerifiedGuardian = true;
            }
        }
        if (!hasVerifiedGuardian) {
            return {
                required: true,
                verified: false,
                message: `Patient is a minor (Age: ${ageEval.age ?? 'under 18'}). An adult guardian must provide verified consent before clinical intake.`,
            };
        }
        return { required: true, verified: true };
    }
    /**
     * Registers verified Guardian Mode details for minor patient intake
     */
    static async recordGuardianDetails(visitId, details) {
        const guardianRecord = {
            guardianName: details.guardianName.trim(),
            guardianRelationship: details.guardianRelationship.trim(),
            guardianPhone: details.guardianPhone?.trim(),
            guardianConsentVerified: details.guardianConsentVerified,
            minorAssentObtained: details.minorAssentObtained,
            verifiedAt: new Date().toISOString(),
        };
        const state = this.getVisitState(visitId);
        state.guardianDetails = guardianRecord;
        logger_js_1.logger.info('Guardian Mode configured for minor intake session', {
            visitId,
            guardianName: guardianRecord.guardianName,
            guardianRelationship: guardianRecord.guardianRelationship,
            consentVerified: guardianRecord.guardianConsentVerified,
        });
        return guardianRecord;
    }
    /**
     * Registers Surrogate Mode details for incapacitated/frail patients
     */
    static async recordSurrogateDetails(visitId, details, _kioskLocation) {
        const surrogateRecord = {
            surrogateName: details.surrogateName.trim(),
            surrogateRelationship: details.surrogateRelationship.trim(),
            surrogatePhone: details.surrogatePhone?.trim(),
            reason: details.reason,
            acuteDistressNoted: details.acuteDistressNoted ?? false,
            verifiedAt: new Date().toISOString(),
        };
        const state = this.getVisitState(visitId);
        state.surrogateDetails = surrogateRecord;
        logger_js_1.logger.info('Surrogate Mode configured for intake session', {
            visitId,
            surrogateRelationship: surrogateRecord.surrogateRelationship,
            reason: surrogateRecord.reason,
            acuteDistressNoted: surrogateRecord.acuteDistressNoted,
        });
        let triageAlertRaised = false;
        // Safety Trigger: If patient is marked acutely unwell, route neutral floor staff assistance immediately
        if (surrogateRecord.acuteDistressNoted || surrogateRecord.reason === interview_types_js_1.SurrogateReasons.PATIENT_UNWELL) {
            try {
                await redflags_service_js_1.RedFlagsService.evaluateVisit(visitId);
                triageAlertRaised = true;
            }
            catch (err) {
                logger_js_1.logger.warn('Error during surrogate acute distress triage alert trigger', { visitId, error: String(err) });
            }
        }
        return {
            surrogate: surrogateRecord,
            triageAlertRaised,
        };
    }
    /**
     * Updates Headset connection status for the kiosk device
     */
    static setHeadsetStatus(visitId, connected) {
        const state = this.getVisitState(visitId);
        state.headsetConnected = connected;
        logger_js_1.logger.info('Kiosk headset connection status updated', { visitId, connected });
        return connected;
    }
    /**
     * Records a patient deferral of a sensitive question to the direct doctor consultation
     */
    static deferQuestionToDoctor(visitId, questionId) {
        const state = this.getVisitState(visitId);
        state.deferredQuestionIds.add(questionId);
        logger_js_1.logger.info('Sensitive question deferred to doctor consultation', { visitId, questionId });
    }
    /**
     * Pure Deterministic Non-Inferential Question Gating Evaluator
     * Evaluates if a question is applicable to a patient without ever guessing or inferring.
     */
    static isQuestionApplicable(question, patient) {
        // 1. Age Minimum Gate
        if (question.ageMin !== undefined && question.ageMin !== null) {
            if (patient.age !== undefined && patient.age !== null && patient.age < question.ageMin) {
                return {
                    applicable: false,
                    reason: `Patient age (${patient.age}) is below question minimum age (${question.ageMin})`,
                };
            }
        }
        // 2. Age Maximum Gate
        if (question.ageMax !== undefined && question.ageMax !== null) {
            if (patient.age !== undefined &&
                patient.age !== null &&
                patient.age > question.ageMax &&
                !(question.pregnancyGated && patient.explicitPregnancyStatus === true)) {
                return {
                    applicable: false,
                    reason: `Patient age (${patient.age}) is above question maximum age (${question.ageMax})`,
                };
            }
        }
        // 3. Stated Biological Sex / Gender Gate (STRICTLY NON-INFERENTIAL)
        if (question.sexApplicability &&
            question.sexApplicability !== 'ALL' &&
            question.sexApplicability !== '*') {
            const statedSex = (patient.gender || '').trim().toUpperCase();
            // If biological sex is unstated, refuse affirmative match — never infer from name or complaint
            if (!statedSex || statedSex === 'UNKNOWN' || statedSex === 'UNSTATED') {
                return {
                    applicable: false,
                    reason: `Question requires explicit stated biological sex (${question.sexApplicability}); patient stated sex is unrecorded`,
                };
            }
            const isTargetFemale = question.sexApplicability === 'FEMALE' || question.sexApplicability === 'F';
            const isTargetMale = question.sexApplicability === 'MALE' || question.sexApplicability === 'M';
            const isPatientFemale = statedSex === 'FEMALE' || statedSex === 'F';
            const isPatientMale = statedSex === 'MALE' || statedSex === 'M';
            if (isTargetFemale && !isPatientFemale) {
                return {
                    applicable: false,
                    reason: `Question requires stated FEMALE sex; patient stated sex is ${statedSex}`,
                };
            }
            if (isTargetMale && !isPatientMale) {
                return {
                    applicable: false,
                    reason: `Question requires stated MALE sex; patient stated sex is ${statedSex}`,
                };
            }
        }
        // 4. Pregnancy Gate (STRICTLY NON-INFERENTIAL)
        if (question.pregnancyGated === true) {
            const statedSex = (patient.gender || '').trim().toUpperCase();
            const isFemale = statedSex === 'FEMALE' || statedSex === 'F';
            // Pregnancy gate requires female sex + childbearing age (12 to 55) or explicit stated pregnancy
            if (!isFemale && patient.explicitPregnancyStatus !== true) {
                return {
                    applicable: false,
                    reason: 'Pregnancy-gated questions apply only to stated female patients of reproductive age or patients reporting pregnancy',
                };
            }
            if (patient.age !== undefined && patient.age !== null) {
                if ((patient.age < 12 || patient.age > 55) && patient.explicitPregnancyStatus !== true) {
                    return {
                        applicable: false,
                        reason: `Pregnancy-gated questions apply to reproductive age range (12-55); patient age is ${patient.age}`,
                    };
                }
            }
        }
        return { applicable: true };
    }
    /**
     * Filters a list of template questions by deterministic non-inferential gating
     */
    static filterApplicableQuestions(questions, patient) {
        return questions.filter((q) => this.isQuestionApplicable(q, patient).applicable);
    }
    /**
     * Evaluates audio routing based on question sensitivity and kiosk headset connection
     */
    static resolveAudioPrivacy(question, headsetConnected) {
        const isSensitive = question.sensitivityLevel === interview_types_js_1.SensitivityLevels.SENSITIVE ||
            question.sensitivityLevel === interview_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE ||
            question.audioAllowedInPublic === false;
        if (!isSensitive) {
            return {
                audioPlaybackAllowed: true,
                outputRoute: headsetConnected ? 'HEADSET' : 'LOUDSPEAKER',
            };
        }
        // Sensitive question: Loudspeaker output is FORBIDDEN for patient privacy
        if (headsetConnected) {
            return {
                audioPlaybackAllowed: true,
                outputRoute: 'HEADSET',
                privacyNotice: 'Private audio active via headset.',
            };
        }
        return {
            audioPlaybackAllowed: false,
            outputRoute: 'MUTED',
            privacyNotice: 'Audio muted for privacy. Plug in headphones or read prompt on screen.',
        };
    }
    /**
     * Read-Back Masking for sensitive answers
     * Prevents kiosk loudspeaker and screen preview from echoing sensitive disclosures
     */
    static maskSensitiveReadBack(answerValue, question) {
        const isSensitive = question.sensitivityLevel === interview_types_js_1.SensitivityLevels.SENSITIVE ||
            question.sensitivityLevel === interview_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE ||
            question.visibilityScope === interview_types_js_1.VisibilityScopes.DOCTOR_ONLY;
        const rawString = typeof answerValue === 'object' && answerValue !== null
            ? String(answerValue.value ?? JSON.stringify(answerValue))
            : String(answerValue ?? '');
        if (!isSensitive) {
            return {
                isMasked: false,
                displayText: rawString,
                audioConfirmation: `Answer recorded: ${rawString}`,
            };
        }
        return {
            isMasked: true,
            displayText: '●●●●● (Recorded confidentially for doctor review)',
            audioConfirmation: 'Answer saved privately.',
        };
    }
    /**
     * Formats answer clinical provenance string for audits and doctor review
     */
    static formatAnswerProvenance(answeredVia, guardian, surrogate) {
        if (answeredVia === interview_types_js_1.AnsweredVia.GUARDIAN && guardian) {
            return `Reported by ${guardian.guardianRelationship} (${guardian.guardianName})`;
        }
        if (answeredVia === interview_types_js_1.AnsweredVia.SURROGATE && surrogate) {
            return `Reported by Surrogate ${surrogate.surrogateRelationship} (${surrogate.surrogateName}) [Reason: ${surrogate.reason}]`;
        }
        if (answeredVia === interview_types_js_1.AnsweredVia.COMPANION_ASSISTED) {
            return 'Reported with companion assistance';
        }
        if (answeredVia === interview_types_js_1.AnsweredVia.STAFF_ASSISTED) {
            return 'Recorded with hospital staff assistance';
        }
        return 'Patient (Self-Reported)';
    }
    /**
     * Scrubs DOCTOR_ONLY and sensitive fields from desk/staff views
     */
    static scrubForStaffAttendants(answers) {
        return answers.map((ans) => {
            const isRestricted = ans.visibilityScope === interview_types_js_1.VisibilityScopes.DOCTOR_ONLY ||
                ans.sensitivityLevel === interview_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE;
            if (!isRestricted) {
                return ans;
            }
            return {
                ...ans,
                answerValue: '[Confidential — Doctor Review Only]',
            };
        });
    }
    /**
     * Filters inputs intended for AI Summarization
     * Excludes any answers where aiSummarizationAllowed is false or visibilityScope is DOCTOR_ONLY
     */
    static filterForAiSummarization(items) {
        return items.filter((item) => {
            if (item.aiSummarizationAllowed === false)
                return false;
            if (item.visibilityScope === interview_types_js_1.VisibilityScopes.DOCTOR_ONLY)
                return false;
            if (item.sensitivityLevel === interview_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE)
                return false;
            return true;
        });
    }
}
exports.SpecialPopulationsService = SpecialPopulationsService;
