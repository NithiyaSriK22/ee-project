"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
class PatientsRepository {
    static async findPatientById(id) {
        return prisma_js_1.prisma.patient.findUnique({
            where: { id },
            include: {
                visit_profiles: {
                    orderBy: { created_at: 'desc' },
                    take: 5,
                },
            },
        });
    }
    static async findPatientByRegNumber(regNumber) {
        return prisma_js_1.prisma.patient.findUnique({
            where: { hospital_registration_number: regNumber },
            include: {
                visit_profiles: {
                    orderBy: { created_at: 'desc' },
                    take: 5,
                },
            },
        });
    }
    static async findProfileByVisit(patientId, visitId) {
        const patient = await prisma_js_1.prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                visit_profiles: {
                    where: { visit_id: visitId },
                    include: {
                        consents: true,
                    },
                },
            },
        });
        return patient;
    }
    static async updatePatientCore(id, data) {
        return prisma_js_1.prisma.patient.update({
            where: { id },
            data: {
                full_name: data.fullName,
                date_of_birth: data.dateOfBirth,
                age: data.age,
                gender: data.gender,
                contact_number: data.contactNumber,
                preferred_language: data.preferredLanguage,
            },
        });
    }
    static async updateVisitProfile(visitId, data) {
        return prisma_js_1.prisma.patientVisitProfile.update({
            where: { visit_id: visitId },
            data: {
                is_companion_assisted: data.isCompanionAssisted,
                companion_name: data.companionName,
                companion_relationship: data.companionRelationship,
                preferred_language: data.preferredLanguage,
                emergency_contact: data.emergencyContact,
            },
        });
    }
    static async getConsentsByVisit(patientId, visitId) {
        return prisma_js_1.prisma.consent.findMany({
            where: {
                patient_id: patientId,
                visit_id: visitId,
            },
        });
    }
    static async updateConsent(patientId, visitId, consentType, data) {
        return prisma_js_1.prisma.consent.upsert({
            where: {
                patient_id_visit_id_consent_type: {
                    patient_id: patientId,
                    visit_id: visitId,
                    consent_type: consentType,
                },
            },
            update: {
                granted: data.granted,
                granted_via: data.grantedVia,
                version: data.version,
                revoked_at: data.granted ? null : new Date(),
                updated_at: new Date(),
            },
            create: {
                patient_id: patientId,
                visit_id: visitId,
                consent_type: consentType,
                granted: data.granted,
                granted_via: data.grantedVia,
                version: data.version,
                granted_at: new Date(),
            },
        });
    }
}
exports.PatientsRepository = PatientsRepository;
