import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { devFallbackPatientStore } from './dev-fallback-patient-store.js';

export class PatientsRepository {
  public static async findPatientById(id: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { id },
          include: {
            visit_profiles: {
              orderBy: { created_at: 'desc' },
              take: 5,
            },
          },
        });
        if (patient) return patient;
      } catch {}
    }

    return devFallbackPatientStore.findPatientById(id);
  }

  public static async findPatientByRegNumber(regNumber: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { hospital_registration_number: regNumber },
          include: {
            visit_profiles: {
              orderBy: { created_at: 'desc' },
              take: 5,
            },
          },
        });
        if (patient) return patient;
      } catch {}
    }

    return devFallbackPatientStore.findPatientByRegistrationNumber(regNumber);
  }

  public static async listPatients(options: { search?: string; limit?: number; offset?: number } = {}) {
    const isDbUp = await checkDatabaseHealth();
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    if (isDbUp) {
      try {
        const where: any = {};
        if (options.search && options.search.trim()) {
          const s = options.search.trim();
          where.OR = [
            { full_name: { contains: s, mode: 'insensitive' } },
            { hospital_registration_number: { contains: s, mode: 'insensitive' } },
            { contact_number: { contains: s } },
          ];
        }

        const [total, patients] = await Promise.all([
          prisma.patient.count({ where }),
          prisma.patient.findMany({
            where,
            include: {
              visit_profiles: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
          }),
        ]);

        return {
          total,
          limit,
          offset,
          items: patients,
        };
      } catch {}
    }

    const fallback = devFallbackPatientStore.listPatients(options);
    return {
      total: fallback.total,
      limit,
      offset,
      items: fallback.patients,
    };
  }

  public static async findProfileByVisit(patientId: string, visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
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
        if (patient) return patient;
      } catch {}
    }

    return devFallbackPatientStore.findProfileByVisit(patientId, visitId);
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
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const updated = await prisma.patient.update({
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
          devFallbackPatientStore.updatePatientCore(id, data);
        } catch {}
        return updated;
      } catch {}
    }

    return devFallbackPatientStore.updatePatientCore(id, data);
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
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const updated = await prisma.patientVisitProfile.update({
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
          devFallbackPatientStore.updateVisitProfile(visitId, data);
        } catch {}
        return updated;
      } catch {}
    }

    return devFallbackPatientStore.updateVisitProfile(visitId, data);
  }

  public static async getConsentsByVisit(patientId: string, visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        return await prisma.consent.findMany({
          where: {
            patient_id: patientId,
            visit_id: visitId,
          },
        });
      } catch {}
    }

    return devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
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
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const updated = await prisma.consent.upsert({
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
          devFallbackPatientStore.updateConsent(patientId, visitId, consentType, data);
        } catch {}
        return updated;
      } catch {}
    }

    return devFallbackPatientStore.updateConsent(patientId, visitId, consentType, data);
  }
}
