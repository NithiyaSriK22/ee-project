import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { devFallbackPatientStore } from '../patients/dev-fallback-patient-store.js';

export class KioskSessionRepository {
  public static async findPatientByRegistrationNumber(regNumber: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { hospital_registration_number: regNumber },
          include: {
            visit_profiles: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        });
        if (patient) return patient;
      } catch {}
    }

    return devFallbackPatientStore.findPatientByRegistrationNumber(regNumber);
  }

  public static async findPatientById(id: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { id },
        });
        if (patient) return patient;
      } catch {}
    }

    return devFallbackPatientStore.findPatientById(id);
  }

  public static async createPatient(data: {
    hospitalRegistrationNumber: string;
    fullName: string;
    dateOfBirth?: Date;
    age?: number;
    gender: string;
    contactNumber: string;
    preferredLanguage: string;
  }) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const created = await prisma.patient.create({
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
        // Mirror to in-memory store
        try {
          devFallbackPatientStore.createPatient({
            ...data,
            hospitalRegistrationNumber: created.hospital_registration_number,
          });
        } catch {}
        return created;
      } catch {}
    }

    return devFallbackPatientStore.createPatient(data);
  }

  public static async createVisitProfile(data: {
    patientId: string;
    visitId: string;
    isCompanionAssisted: boolean;
    companionName?: string;
    companionRelationship?: string;
    preferredLanguage: string;
    emergencyContact?: string;
  }) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const profile = await prisma.patientVisitProfile.create({
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
        // Mirror to fallback store
        try {
          devFallbackPatientStore.createVisitProfile(data);
        } catch {}
        return profile;
      } catch {}
    }

    return devFallbackPatientStore.createVisitProfile(data);
  }

  public static async createKioskSession(data: {
    visitId: string;
    patientId: string;
    visitProfileId: string;
    sessionTokenHash: string;
    expiresAt: Date;
  }) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const session = await prisma.kioskSession.create({
          data: {
            visit_id: data.visitId,
            patient_id: data.patientId,
            visit_profile_id: data.visitProfileId,
            session_token_hash: data.sessionTokenHash,
            status: 'ACTIVE',
            expires_at: data.expiresAt,
          },
        });
        try {
          devFallbackPatientStore.createKioskSession(data);
        } catch {}
        return session;
      } catch {}
    }

    return devFallbackPatientStore.createKioskSession(data);
  }

  public static async findSessionByVisitId(visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const session = await prisma.kioskSession.findUnique({
          where: { visit_id: visitId },
          include: {
            patient: true,
            visit_profile: true,
          },
        });
        if (session) return session;
      } catch {}
    }

    return devFallbackPatientStore.findSessionByVisitId(visitId);
  }

  public static async endSession(visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const updated = await prisma.kioskSession.update({
          where: { visit_id: visitId },
          data: { status: 'ENDED' },
        });
        try {
          devFallbackPatientStore.endSession(visitId);
        } catch {}
        return updated;
      } catch {}
    }

    return devFallbackPatientStore.endSession(visitId);
  }

  public static async recordConsent(data: {
    patientId: string;
    visitId: string;
    visitProfileId?: string;
    consentType: string;
    granted: boolean;
    grantedVia: string;
    version?: string;
  }) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const consent = await prisma.consent.upsert({
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
        try {
          devFallbackPatientStore.recordConsent(data);
        } catch {}
        return consent;
      } catch {}
    }

    return devFallbackPatientStore.recordConsent(data);
  }

  public static async getConsentsForVisit(patientId: string, visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        return await prisma.consent.findMany({
          where: {
            patient_id: patientId,
            visit_id: visitId,
          },
          orderBy: { created_at: 'asc' },
        });
      } catch {}
    }

    return devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
  }
}
