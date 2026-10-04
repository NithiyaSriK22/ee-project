import { prisma } from '../../database/prisma.js';

export class KioskSessionRepository {
  public static async findPatientByRegistrationNumber(regNumber: string) {
    return prisma.patient.findUnique({
      where: { hospital_registration_number: regNumber },
      include: {
        visit_profiles: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  public static async findPatientById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
    });
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
    return prisma.patient.create({
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

  public static async createVisitProfile(data: {
    patientId: string;
    visitId: string;
    isCompanionAssisted: boolean;
    companionName?: string;
    companionRelationship?: string;
    preferredLanguage: string;
    emergencyContact?: string;
  }) {
    return prisma.patientVisitProfile.create({
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

  public static async createKioskSession(data: {
    visitId: string;
    patientId: string;
    visitProfileId: string;
    sessionTokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.kioskSession.create({
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

  public static async findSessionByVisitId(visitId: string) {
    return prisma.kioskSession.findUnique({
      where: { visit_id: visitId },
      include: {
        patient: true,
        visit_profile: true,
      },
    });
  }

  public static async endSession(visitId: string) {
    return prisma.kioskSession.update({
      where: { visit_id: visitId },
      data: { status: 'ENDED' },
    });
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
    return prisma.consent.upsert({
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

  public static async getConsentsForVisit(patientId: string, visitId: string) {
    return prisma.consent.findMany({
      where: {
        patient_id: patientId,
        visit_id: visitId,
      },
      orderBy: { created_at: 'asc' },
    });
  }
}
