import { prisma } from '../../database/prisma.js';

export class PatientsRepository {
  public static async findPatientById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        visit_profiles: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  public static async findPatientByRegNumber(regNumber: string) {
    return prisma.patient.findUnique({
      where: { hospital_registration_number: regNumber },
      include: {
        visit_profiles: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  public static async findProfileByVisit(patientId: string, visitId: string) {
    const patient = await prisma.patient.findUnique({
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

  public static async updatePatientCore(
    id: string,
    data: {
      fullName?: string;
      dateOfBirth?: Date;
      age?: number;
      gender?: string;
      contactNumber?: string;
      preferredLanguage?: string;
    }
  ) {
    return prisma.patient.update({
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

  public static async updateVisitProfile(
    visitId: string,
    data: {
      isCompanionAssisted?: boolean;
      companionName?: string | null;
      companionRelationship?: string | null;
      preferredLanguage?: string;
      emergencyContact?: string | null;
    }
  ) {
    return prisma.patientVisitProfile.update({
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

  public static async getConsentsByVisit(patientId: string, visitId: string) {
    return prisma.consent.findMany({
      where: {
        patient_id: patientId,
        visit_id: visitId,
      },
    });
  }

  public static async updateConsent(
    patientId: string,
    visitId: string,
    consentType: string,
    data: {
      granted: boolean;
      grantedVia: string;
      version: string;
    }
  ) {
    return prisma.consent.upsert({
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
