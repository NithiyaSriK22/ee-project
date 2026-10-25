"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_patient_store_js_1 = require("./dev-fallback-patient-store.js");
class PatientsRepository {
    static async findPatientById(id) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const patient = await prisma_js_1.prisma.patient.findUnique({
                    where: { id },
                    include: {
                        visit_profiles: {
                            orderBy: { created_at: 'desc' },
                            take: 5,
                        },
                    },
                });
                if (patient)
                    return patient;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.findPatientById(id);
    }
    static async findPatientByRegNumber(regNumber) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const patient = await prisma_js_1.prisma.patient.findUnique({
                    where: { hospital_registration_number: regNumber },
                    include: {
                        visit_profiles: {
                            orderBy: { created_at: 'desc' },
                            take: 5,
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
    static async findProfileByVisit(patientId, visitId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
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
                if (patient)
                    return patient;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.findProfileByVisit(patientId, visitId);
    }
    static async updatePatientCore(id, data) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const updated = await prisma_js_1.prisma.patient.update({
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
                try {
                    dev_fallback_patient_store_js_1.devFallbackPatientStore.updatePatientCore(id, data);
                }
                catch { }
                return updated;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.updatePatientCore(id, data);
    }
    static async updateVisitProfile(visitId, data) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const updated = await prisma_js_1.prisma.patientVisitProfile.update({
                    where: { visit_id: visitId },
                    data: {
                        is_companion_assisted: data.isCompanionAssisted,
                        companion_name: data.companionName,
                        companion_relationship: data.companionRelationship,
                        preferred_language: data.preferredLanguage,
                        emergency_contact: data.emergencyContact,
                    },
                });
                try {
                    dev_fallback_patient_store_js_1.devFallbackPatientStore.updateVisitProfile(visitId, data);
                }
                catch { }
                return updated;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.updateVisitProfile(visitId, data);
    }
    static async getConsentsByVisit(patientId, visitId) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                return await prisma_js_1.prisma.consent.findMany({
                    where: {
                        patient_id: patientId,
                        visit_id: visitId,
                    },
                });
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
    }
    static async updateConsent(patientId, visitId, consentType, data) {
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                const updated = await prisma_js_1.prisma.consent.upsert({
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
                try {
                    dev_fallback_patient_store_js_1.devFallbackPatientStore.updateConsent(patientId, visitId, consentType, data);
                }
                catch { }
                return updated;
            }
            catch { }
        }
        return dev_fallback_patient_store_js_1.devFallbackPatientStore.updateConsent(patientId, visitId, consentType, data);
    }
}
exports.PatientsRepository = PatientsRepository;
