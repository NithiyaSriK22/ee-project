"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskSessionRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
class KioskSessionRepository {
    static async findPatientByRegistrationNumber(regNumber) {
        return prisma_js_1.prisma.patient.findUnique({
            where: { hospital_registration_number: regNumber },
            include: {
                visit_profiles: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        });
    }
    static async findPatientById(id) {
        return prisma_js_1.prisma.patient.findUnique({
            where: { id },
        });
    }
    static async createPatient(data) {
        return prisma_js_1.prisma.patient.create({
            data: {
                hospital_registration_number: data.hospitalRegistrationNumber,
                full_name: data.fullName,
                date_of_birth: data.dateOfBirth,
                age: data.age,
                gender: data.gender,
                contact_number: data.contactNumber,
                preferred_language: data.preferredLanguage,
            },
        });
    }
    static async createVisitProfile(data) {
        return prisma_js_1.prisma.patientVisitProfile.create({
            data: {
                patient_id: data.patientId,
                visit_id: data.visitId,
                is_companion_assisted: data.isCompanionAssisted,
                companion_name: data.companionName,
                companion_relationship: data.companionRelationship,
                preferred_language: data.preferredLanguage,
                emergency_contact: data.emergencyContact,
                status: 'ACTIVE',
            },
        });
    }
    static async createKioskSession(data) {
        return prisma_js_1.prisma.kioskSession.create({
            data: {
                visit_id: data.visitId,
                patient_id: data.patientId,
                visit_profile_id: data.visitProfileId,
                session_token_hash: data.sessionTokenHash,
                status: 'ACTIVE',
                expires_at: data.expiresAt,
            },
        });
    }
    static async findSessionByVisitId(visitId) {
        return prisma_js_1.prisma.kioskSession.findUnique({
            where: { visit_id: visitId },
            include: {
                patient: true,
                visit_profile: true,
            },
        });
    }
    static async endSession(visitId) {
        return prisma_js_1.prisma.kioskSession.update({
            where: { visit_id: visitId },
            data: { status: 'ENDED' },
        });
    }
    static async recordConsent(data) {
        return prisma_js_1.prisma.consent.upsert({
            where: {
                patient_id_visit_id_consent_type: {
                    patient_id: data.patientId,
                    visit_id: data.visitId,
                    consent_type: data.consentType,
                },
            },
            update: {
                granted: data.granted,
                granted_via: data.grantedVia,
                version: data.version || '1.0',
                revoked_at: data.granted ? null : new Date(),
                updated_at: new Date(),
            },
            create: {
                patient_id: data.patientId,
                visit_id: data.visitId,
                visit_profile_id: data.visitProfileId,
                consent_type: data.consentType,
                granted: data.granted,
                granted_via: data.grantedVia,
                version: data.version || '1.0',
                granted_at: new Date(),
            },
        });
    }
    static async getConsentsForVisit(patientId, visitId) {
        return prisma_js_1.prisma.consent.findMany({
            where: {
                patient_id: patientId,
                visit_id: visitId,
            },
            orderBy: { created_at: 'asc' },
        });
    }
}
exports.KioskSessionRepository = KioskSessionRepository;
