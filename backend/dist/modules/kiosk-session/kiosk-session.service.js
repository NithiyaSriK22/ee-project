"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskSessionService = void 0;
const kiosk_session_repository_js_1 = require("./kiosk-session.repository.js");
const token_util_js_1 = require("../../utils/token.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const auth_types_js_1 = require("../../types/auth.types.js");
class KioskSessionService {
    static async startSession(data) {
        const visitId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const preferredLang = data.preferredLanguage || 'en';
        const grantedVia = data.consentGrantedVia || (data.isCompanionAssisted ? 'companion' : 'patient');
        let patientRecord;
        if (data.hospitalRegistrationNumber) {
            // Returning patient flow
            patientRecord = await kiosk_session_repository_js_1.KioskSessionRepository.findPatientByRegistrationNumber(data.hospitalRegistrationNumber.trim());
            if (!patientRecord) {
                throw new app_error_js_1.NotFoundError('Patient with this hospital registration number was not found. Please register as a new patient.');
            }
        }
        else {
            // New patient registration flow
            if (!data.fullName || !data.gender || !data.contactNumber) {
                throw new app_error_js_1.ValidationError('Full name, gender, and contact number are required for new registration');
            }
            // Generate hospital registration ID e.g. MK-2026-894123
            const currentYear = new Date().getFullYear();
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            const generatedRegNum = `MK-${currentYear}-${randomSuffix}`;
            let dobDate;
            if (data.dateOfBirth) {
                dobDate = new Date(data.dateOfBirth);
            }
            patientRecord = await kiosk_session_repository_js_1.KioskSessionRepository.createPatient({
                hospitalRegistrationNumber: generatedRegNum,
                fullName: data.fullName.trim(),
                dateOfBirth: dobDate,
                age: data.age,
                gender: data.gender,
                contactNumber: data.contactNumber.trim(),
                preferredLanguage: preferredLang,
            });
        }
        // Create visit profile for this visit
        const visitProfile = await kiosk_session_repository_js_1.KioskSessionRepository.createVisitProfile({
            patientId: patientRecord.id,
            visitId,
            isCompanionAssisted: data.isCompanionAssisted ?? false,
            companionName: data.companionName?.trim(),
            companionRelationship: data.companionRelationship?.trim(),
            preferredLanguage: preferredLang,
            emergencyContact: data.emergencyContact?.trim(),
        });
        // Record baseline visit consents
        const consentTypesToGrant = [
            auth_types_js_1.ConsentTypes.VISIT_DATA_COLLECTION,
            auth_types_js_1.ConsentTypes.DOCUMENT_PROCESSING,
            auth_types_js_1.ConsentTypes.AI_SUMMARIZATION,
            auth_types_js_1.ConsentTypes.SHARE_WITH_DOCTOR,
        ];
        for (const cType of consentTypesToGrant) {
            await kiosk_session_repository_js_1.KioskSessionRepository.recordConsent({
                patientId: patientRecord.id,
                visitId,
                visitProfileId: visitProfile.id,
                consentType: cType,
                granted: data.consentGranted ?? true,
                grantedVia,
                version: '1.0',
            });
        }
        // Generate Kiosk Session JWT and DB session record
        const dummySessionId = `ksess_${Date.now()}`;
        const sessionTokenResult = token_util_js_1.TokenUtil.generateKioskSessionToken({
            sessionId: dummySessionId,
            visitId,
            patientId: patientRecord.id,
        });
        const kioskSession = await kiosk_session_repository_js_1.KioskSessionRepository.createKioskSession({
            visitId,
            patientId: patientRecord.id,
            visitProfileId: visitProfile.id,
            sessionTokenHash: sessionTokenResult.hash,
            expiresAt: sessionTokenResult.expiresAt,
        });
        const activeConsents = await kiosk_session_repository_js_1.KioskSessionRepository.getConsentsForVisit(patientRecord.id, visitId);
        logger_js_1.logger.info('Kiosk session started', {
            visitId,
            isCompanionAssisted: visitProfile.is_companion_assisted,
            language: visitProfile.preferred_language,
        });
        return {
            session: {
                sessionId: kioskSession.id,
                visitId: kioskSession.visit_id,
                sessionToken: sessionTokenResult.token,
                tokenType: 'Bearer',
                expiresAt: sessionTokenResult.expiresAt,
            },
            patient: {
                id: patientRecord.id,
                hospitalRegistrationNumber: patientRecord.hospital_registration_number,
                fullName: patientRecord.full_name,
                age: patientRecord.age,
                dateOfBirth: patientRecord.date_of_birth,
                gender: patientRecord.gender,
                contactNumber: patientRecord.contact_number,
                preferredLanguage: patientRecord.preferred_language,
            },
            visitProfile: {
                id: visitProfile.id,
                visitId: visitProfile.visit_id,
                isCompanionAssisted: visitProfile.is_companion_assisted,
                companionName: visitProfile.companion_name,
                companionRelationship: visitProfile.companion_relationship,
                preferredLanguage: visitProfile.preferred_language,
                emergencyContact: visitProfile.emergency_contact,
                status: visitProfile.status,
            },
            consents: activeConsents.map((c) => ({
                consentType: c.consent_type,
                granted: c.granted,
                grantedVia: c.granted_via,
                version: c.version,
                grantedAt: c.granted_at,
            })),
        };
    }
    static async getSessionMe(visitId) {
        const session = await kiosk_session_repository_js_1.KioskSessionRepository.findSessionByVisitId(visitId);
        if (!session) {
            throw new app_error_js_1.NotFoundError('Kiosk session not found');
        }
        const consents = await kiosk_session_repository_js_1.KioskSessionRepository.getConsentsForVisit(session.patient_id, session.visit_id);
        return {
            session: {
                sessionId: session.id,
                visitId: session.visit_id,
                status: session.status,
                expiresAt: session.expires_at,
                lastAccessedAt: session.last_accessed_at,
            },
            patient: {
                id: session.patient.id,
                hospitalRegistrationNumber: session.patient.hospital_registration_number,
                fullName: session.patient.full_name,
                age: session.patient.age,
                dateOfBirth: session.patient.date_of_birth,
                gender: session.patient.gender,
                contactNumber: session.patient.contact_number,
                preferredLanguage: session.patient.preferred_language,
            },
            visitProfile: session.visit_profile
                ? {
                    id: session.visit_profile.id,
                    visitId: session.visit_profile.visit_id,
                    isCompanionAssisted: session.visit_profile.is_companion_assisted,
                    companionName: session.visit_profile.companion_name,
                    companionRelationship: session.visit_profile.companion_relationship,
                    preferredLanguage: session.visit_profile.preferred_language,
                    emergencyContact: session.visit_profile.emergency_contact,
                    status: session.visit_profile.status,
                }
                : null,
            consents: consents.map((c) => ({
                consentType: c.consent_type,
                granted: c.granted,
                grantedVia: c.granted_via,
                version: c.version,
                grantedAt: c.granted_at,
            })),
        };
    }
    static async endSession(visitId) {
        await kiosk_session_repository_js_1.KioskSessionRepository.endSession(visitId);
        logger_js_1.logger.info('Kiosk session ended', { visitId });
        return {
            success: true,
            message: 'Kiosk session ended successfully. Session data finalized for this visit.',
        };
    }
}
exports.KioskSessionService = KioskSessionService;
