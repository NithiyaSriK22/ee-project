"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsService = void 0;
const patients_repository_js_1 = require("./patients.repository.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const auth_types_js_1 = require("../../types/auth.types.js");
class PatientsService {
    static async getKioskProfile(patientId, visitId) {
        const record = await patients_repository_js_1.PatientsRepository.findProfileByVisit(patientId, visitId);
        if (!record) {
            throw new app_error_js_1.NotFoundError('Patient profile not found for this visit');
        }
        const visitProfile = record.visit_profiles[0] || null;
        const consents = visitProfile?.consents || [];
        const completion = this.calculateCompletion(record, visitProfile, consents);
        return {
            patientId: record.id,
            hospitalRegistrationNumber: record.hospital_registration_number,
            fullName: record.full_name,
            age: record.age,
            dateOfBirth: record.date_of_birth,
            gender: record.gender,
            contactNumber: record.contact_number,
            preferredLanguage: visitProfile?.preferred_language || record.preferred_language,
            isCompanionAssisted: visitProfile?.is_companion_assisted ?? false,
            companionName: visitProfile?.companion_name || null,
            companionRelationship: visitProfile?.companion_relationship || null,
            emergencyContact: visitProfile?.emergency_contact || null,
            consents: consents.map((c) => ({
                consentType: c.consent_type,
                granted: c.granted,
                grantedVia: c.granted_via,
                version: c.version,
                grantedAt: c.granted_at,
                revokedAt: c.revoked_at,
            })),
            completion,
        };
    }
    static async updateKioskProfile(patientId, visitId, data) {
        let dobDate;
        if (data.dateOfBirth) {
            dobDate = new Date(data.dateOfBirth);
        }
        // 1. Update core demographic fields if provided
        await patients_repository_js_1.PatientsRepository.updatePatientCore(patientId, {
            fullName: data.fullName?.trim(),
            dateOfBirth: dobDate,
            age: data.age,
            gender: data.gender,
            contactNumber: data.contactNumber?.trim(),
            preferredLanguage: data.preferredLanguage,
        });
        // 2. Update visit profile fields
        await patients_repository_js_1.PatientsRepository.updateVisitProfile(visitId, {
            isCompanionAssisted: data.isCompanionAssisted,
            companionName: data.companionName?.trim() || null,
            companionRelationship: data.companionRelationship?.trim() || null,
            preferredLanguage: data.preferredLanguage,
            emergencyContact: data.emergencyContact?.trim() || null,
        });
        logger_js_1.logger.info('Patient profile updated via kiosk session', { visitId });
        return this.getKioskProfile(patientId, visitId);
    }
    static async getProfileCompletion(patientId, visitId) {
        const record = await patients_repository_js_1.PatientsRepository.findProfileByVisit(patientId, visitId);
        if (!record) {
            throw new app_error_js_1.NotFoundError('Patient profile not found');
        }
        const visitProfile = record.visit_profiles[0] || null;
        const consents = visitProfile?.consents || [];
        return this.calculateCompletion(record, visitProfile, consents);
    }
    static calculateCompletion(patient, visitProfile, consents) {
        const missingFields = [];
        if (!patient.full_name || patient.full_name.trim().length < 2) {
            missingFields.push('fullName');
        }
        if (patient.age === null && !patient.date_of_birth) {
            missingFields.push('ageOrDob');
        }
        if (!patient.gender) {
            missingFields.push('gender');
        }
        if (!patient.contact_number) {
            missingFields.push('contactNumber');
        }
        if (!visitProfile?.preferred_language) {
            missingFields.push('preferredLanguage');
        }
        const hasDataConsent = consents.some((c) => c.consent_type === auth_types_js_1.ConsentTypes.VISIT_DATA_COLLECTION && c.granted);
        if (!hasDataConsent) {
            missingFields.push('consent_VISIT_DATA_COLLECTION');
        }
        if (visitProfile?.is_companion_assisted && !visitProfile?.companion_name) {
            missingFields.push('companionName');
        }
        const totalCheckpoints = 6;
        const completedCheckpoints = totalCheckpoints - missingFields.length;
        const percentage = Math.max(0, Math.round((completedCheckpoints / totalCheckpoints) * 100));
        return {
            isComplete: missingFields.length === 0,
            completionPercentage: percentage,
            missingFields,
            readyForInterview: missingFields.length === 0,
        };
    }
    static async getConsents(patientId, visitId) {
        const consents = await patients_repository_js_1.PatientsRepository.getConsentsByVisit(patientId, visitId);
        return consents.map((c) => ({
            id: c.id,
            consentType: c.consent_type,
            granted: c.granted,
            grantedVia: c.granted_via,
            version: c.version,
            grantedAt: c.granted_at,
            revokedAt: c.revoked_at,
        }));
    }
    static async updateConsent(patientId, visitId, consentType, data) {
        const validTypes = Object.values(auth_types_js_1.ConsentTypes);
        if (!validTypes.includes(consentType)) {
            throw new app_error_js_1.ValidationError(`Invalid consent type '${consentType}'. Valid options: ${validTypes.join(', ')}`);
        }
        const consent = await patients_repository_js_1.PatientsRepository.updateConsent(patientId, visitId, consentType, {
            granted: data.granted,
            grantedVia: data.grantedVia,
            version: data.version || '1.0',
        });
        logger_js_1.logger.info(data.granted ? 'Consent granted' : 'Consent revoked', {
            consentType,
            grantedVia: data.grantedVia,
            visitId,
        });
        return {
            id: consent.id,
            consentType: consent.consent_type,
            granted: consent.granted,
            grantedVia: consent.granted_via,
            version: consent.version,
            grantedAt: consent.granted_at,
            revokedAt: consent.revoked_at,
        };
    }
    static async getPatientForStaff(patientId) {
        const patient = await patients_repository_js_1.PatientsRepository.findPatientById(patientId);
        if (!patient) {
            throw new app_error_js_1.NotFoundError('Patient record not found');
        }
        return {
            id: patient.id,
            hospitalRegistrationNumber: patient.hospital_registration_number,
            fullName: patient.full_name,
            age: patient.age,
            dateOfBirth: patient.date_of_birth,
            gender: patient.gender,
            contactNumber: patient.contact_number,
            preferredLanguage: patient.preferred_language,
            recentVisits: (patient.visit_profiles || []).map((v) => ({
                visitId: v.visit_id,
                isCompanionAssisted: v.is_companion_assisted,
                companionName: v.companion_name,
                preferredLanguage: v.preferred_language,
                createdAt: v.created_at,
            })),
        };
    }
    static async listPatients(options) {
        const result = await patients_repository_js_1.PatientsRepository.listPatients(options);
        return {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            patients: (result.items || []).map((patient) => ({
                id: patient.id,
                hospitalRegistrationNumber: patient.hospital_registration_number,
                fullName: patient.full_name,
                age: patient.age,
                dateOfBirth: patient.date_of_birth,
                gender: patient.gender,
                contactNumber: patient.contact_number,
                preferredLanguage: patient.preferred_language,
                createdAt: patient.created_at,
                recentVisits: (patient.visit_profiles || []).map((v) => ({
                    visitId: v.visit_id,
                    isCompanionAssisted: v.is_companion_assisted,
                    companionName: v.companion_name,
                    preferredLanguage: v.preferred_language,
                    createdAt: v.created_at,
                })),
            })),
        };
    }
}
exports.PatientsService = PatientsService;
