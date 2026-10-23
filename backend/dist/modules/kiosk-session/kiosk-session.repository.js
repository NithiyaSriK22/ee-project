"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskSessionRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_patient_store_js_1 = require("../patients/dev-fallback-patient-store.js");
class KioskSessionRepository {
    static async findPatientByRegistrationNumber(regNumber) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.findPatientByRegistrationNumber(regNumber);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const patient = await prisma_js_1.prisma.patient.findUnique({
                    where: { hospital_registration_number: regNumber },
                    include: {
                        visit_profiles: {
                            orderBy: { created_at: 'desc' },
                            take: 1,
                        },
                    },
                });
                if (patient)
                    return patient;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.findPatientByRegistrationNumber(regNumber);
    }
    static async findPatientById(id) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.findPatientById(id);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const patient = await prisma_js_1.prisma.patient.findUnique({
                    where: { id },
                });
                if (patient)
                    return patient;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.findPatientById(id);
    }
    static async createPatient(data) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.createPatient(data);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.patient.create({
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
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.createPatient(data);
    }
    static async createVisitProfile(data) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.createVisitProfile(data);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.patientVisitProfile.create({
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
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.createVisitProfile(data);
    }
    static async createKioskSession(data) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.createKioskSession(data);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.kioskSession.create({
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
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.createKioskSession(data);
    }
    static async findSessionByVisitId(visitId) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.findSessionByVisitId(visitId);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const session = await prisma_js_1.prisma.kioskSession.findUnique({
                    where: { visit_id: visitId },
                    include: {
                        patient: true,
                        visit_profile: true,
                    },
                });
                if (session)
                    return session;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.findSessionByVisitId(visitId);
    }
    static async endSession(visitId) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.endSession(visitId);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.kioskSession.update({
                    where: { visit_id: visitId },
                    data: { status: 'ENDED' },
                });
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.endSession(visitId);
    }
    static async recordConsent(data) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.recordConsent(data);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.consent.upsert({
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
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.recordConsent(data);
    }
    static async getConsentsForVisit(patientId, visitId) {
        if (process.env.NODE_ENV === 'test') {
            return dev_fallback_patient_store_js_1.devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
        }
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.consent.findMany({
                    where: {
                        patient_id: patientId,
                        visit_id: visitId,
                    },
                    orderBy: { created_at: 'asc' },
                });
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
    }
}
exports.KioskSessionRepository = KioskSessionRepository;
