"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackPatientStore = exports.DevFallbackPatientStore = void 0;
class DevFallbackPatientStore {
    static instance;
    static getInstance() {
        if (!DevFallbackPatientStore.instance) {
            DevFallbackPatientStore.instance = new DevFallbackPatientStore();
        }
        return DevFallbackPatientStore.instance;
    }
    patients = new Map(); // key: id AND key: hospital_registration_number
    visitProfiles = new Map(); // key: visitId
    kioskSessions = new Map(); // key: visitId
    consents = new Map(); // key: visitId
    constructor() {
        this.seedDefaultData();
    }
    seedDefaultData() {
        const defaultPatient = {
            id: 'pat-default-001',
            hospital_registration_number: 'REG-20261023-0001',
            full_name: 'Dev Test Patient',
            date_of_birth: new Date('1990-01-01'),
            age: 36,
            gender: 'MALE',
            contact_number: '+91 98765 43210',
            preferred_language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
            visit_profiles: [],
        };
        this.patients.set(defaultPatient.id, defaultPatient);
        this.patients.set(defaultPatient.hospital_registration_number, defaultPatient);
    }
    // ============================================================================
    // PATIENTS
    // ============================================================================
    createPatient(data) {
        const patient = {
            id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            hospital_registration_number: data.hospitalRegistrationNumber,
            full_name: data.fullName,
            date_of_birth: data.dateOfBirth || null,
            age: data.age ?? null,
            gender: data.gender,
            contact_number: data.contactNumber,
            preferred_language: data.preferredLanguage,
            created_at: new Date(),
            updated_at: new Date(),
            visit_profiles: [],
        };
        this.patients.set(patient.id, patient);
        this.patients.set(patient.hospital_registration_number, patient);
        return patient;
    }
    findPatientById(id) {
        const p = this.patients.get(id);
        if (!p)
            return null;
        return {
            ...p,
            visit_profiles: p.visit_profiles || [],
        };
    }
    findPatientByRegistrationNumber(regNumber) {
        const p = this.patients.get(regNumber.trim());
        if (!p)
            return null;
        return {
            ...p,
            visit_profiles: p.visit_profiles || [],
        };
    }
    listPatients(options) {
        const unique = new Map();
        for (const p of this.patients.values()) {
            unique.set(p.id, p);
        }
        let list = Array.from(unique.values());
        if (options?.search) {
            const q = options.search.toLowerCase();
            list = list.filter((p) => p.full_name.toLowerCase().includes(q) ||
                p.hospital_registration_number.toLowerCase().includes(q) ||
                p.contact_number.includes(q));
        }
        const total = list.length;
        const offset = options?.offset || 0;
        const limit = options?.limit || 20;
        return { patients: list.slice(offset, offset + limit), total };
    }
    updatePatientCore(id, data) {
        const patient = this.patients.get(id);
        if (!patient)
            return null;
        if (data.fullName !== undefined)
            patient.full_name = data.fullName;
        if (data.dateOfBirth !== undefined)
            patient.date_of_birth = data.dateOfBirth;
        if (data.age !== undefined)
            patient.age = data.age;
        if (data.gender !== undefined)
            patient.gender = data.gender;
        if (data.contactNumber !== undefined)
            patient.contact_number = data.contactNumber;
        if (data.preferredLanguage !== undefined)
            patient.preferred_language = data.preferredLanguage;
        patient.updated_at = new Date();
        this.patients.set(patient.id, patient);
        this.patients.set(patient.hospital_registration_number, patient);
        return patient;
    }
    // ============================================================================
    // VISIT PROFILES
    // ============================================================================
    createVisitProfile(data) {
        const profile = {
            id: `vp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patient_id: data.patientId,
            visit_id: data.visitId,
            is_companion_assisted: data.isCompanionAssisted,
            companion_name: data.companionName || null,
            companion_relationship: data.companionRelationship || null,
            preferred_language: data.preferredLanguage,
            emergency_contact: data.emergencyContact || null,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
            consents: [],
        };
        this.visitProfiles.set(data.visitId, profile);
        // Also link to patient in memory
        const pat = this.patients.get(data.patientId);
        if (pat) {
            if (!pat.visit_profiles)
                pat.visit_profiles = [];
            pat.visit_profiles.unshift(profile);
        }
        return profile;
    }
    findProfileByVisit(patientId, visitId) {
        const patient = this.patients.get(patientId);
        if (!patient)
            return null;
        const vp = this.visitProfiles.get(visitId);
        const visitConsents = this.consents.get(visitId) || [];
        return {
            ...patient,
            visit_profiles: vp
                ? [
                    {
                        ...vp,
                        consents: visitConsents,
                    },
                ]
                : [],
        };
    }
    updateVisitProfile(visitId, data) {
        const profile = this.visitProfiles.get(visitId);
        if (!profile)
            return null;
        if (data.isCompanionAssisted !== undefined)
            profile.is_companion_assisted = data.isCompanionAssisted;
        if (data.companionName !== undefined)
            profile.companion_name = data.companionName;
        if (data.companionRelationship !== undefined)
            profile.companion_relationship = data.companionRelationship;
        if (data.preferredLanguage !== undefined)
            profile.preferred_language = data.preferredLanguage;
        if (data.emergencyContact !== undefined)
            profile.emergency_contact = data.emergencyContact;
        profile.updated_at = new Date();
        this.visitProfiles.set(visitId, profile);
        return profile;
    }
    // ============================================================================
    // KIOSK SESSIONS
    // ============================================================================
    createKioskSession(data) {
        const patient = this.patients.get(data.patientId) || {
            id: data.patientId,
            hospital_registration_number: 'MK-2026-DEFAULT',
            full_name: 'Patient',
            gender: 'OTHER',
            contact_number: '+91 00000 00000',
            preferred_language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const visitProfile = data.visitProfileId ? this.visitProfiles.get(data.visitId) : null;
        const session = {
            id: `ks_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            visit_id: data.visitId,
            patient_id: data.patientId,
            visit_profile_id: data.visitProfileId || null,
            session_token_hash: data.sessionTokenHash,
            status: 'ACTIVE',
            expires_at: data.expiresAt,
            last_accessed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            patient,
            visit_profile: visitProfile || null,
        };
        this.kioskSessions.set(data.visitId, session);
        return session;
    }
    findSessionByVisitId(visitId) {
        let session = this.kioskSessions.get(visitId);
        if (!session) {
            if (process.env.NODE_ENV === 'test' || visitId.startsWith('visit-')) {
                const dummyPatient = {
                    id: `pat_${visitId}`,
                    hospital_registration_number: 'MK-2026-DEFAULT',
                    full_name: 'Patient',
                    gender: 'OTHER',
                    contact_number: '+91 00000 00000',
                    preferred_language: 'en',
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                session = {
                    id: `ks_${visitId}`,
                    visit_id: visitId,
                    patient_id: `pat_${visitId}`,
                    status: 'ACTIVE',
                    expires_at: new Date(Date.now() + 3600000),
                    last_accessed_at: new Date(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    patient: dummyPatient,
                };
                this.kioskSessions.set(visitId, session);
            }
            else {
                return null;
            }
        }
        const patient = this.patients.get(session.patient_id) || session.patient || {
            id: session.patient_id,
            hospital_registration_number: 'MK-2026-DEFAULT',
            full_name: 'Patient',
            gender: 'OTHER',
            contact_number: '+91 00000 00000',
            preferred_language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const visitProfile = this.visitProfiles.get(visitId) || null;
        return {
            ...session,
            patient,
            visit_profile: visitProfile,
        };
    }
    endSession(visitId) {
        const session = this.kioskSessions.get(visitId);
        if (session) {
            session.status = 'ENDED';
            session.updated_at = new Date();
        }
        return session || null;
    }
    // ============================================================================
    // CONSENTS
    // ============================================================================
    recordConsent(data) {
        const list = this.consents.get(data.visitId) || [];
        const existingIdx = list.findIndex((c) => c.consent_type === data.consentType);
        const consent = {
            id: `cns_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patient_id: data.patientId,
            visit_id: data.visitId,
            visit_profile_id: data.visitProfileId || null,
            consent_type: data.consentType,
            granted: data.granted,
            granted_via: data.grantedVia,
            version: data.version || '1.0',
            granted_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        };
        if (existingIdx >= 0) {
            list[existingIdx] = consent;
        }
        else {
            list.push(consent);
        }
        this.consents.set(data.visitId, list);
        return consent;
    }
    getConsentsForVisit(_patientId, visitId) {
        return this.consents.get(visitId) || [];
    }
    updateConsent(patientId, visitId, consentType, data) {
        return this.recordConsent({
            patientId,
            visitId,
            consentType,
            granted: data.granted,
            grantedVia: data.grantedVia,
            version: data.version,
        });
    }
}
exports.DevFallbackPatientStore = DevFallbackPatientStore;
exports.devFallbackPatientStore = DevFallbackPatientStore.getInstance();
