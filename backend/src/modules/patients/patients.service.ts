import { PatientsRepository } from './patients.repository.js';
import { NotFoundError, ValidationError } from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { ConsentTypes } from '../../types/auth.types.js';

export class PatientsService {
  public static async getKioskProfile(patientId: string, visitId: string) {
    const record = await PatientsRepository.findProfileByVisit(patientId, visitId);
    if (!record) {
      throw new NotFoundError('Patient profile not found for this visit');
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

  public static async updateKioskProfile(
    patientId: string,
    visitId: string,
    data: {
      fullName?: string;
      dateOfBirth?: string;
      age?: number;
      gender?: string;
      contactNumber?: string;
      preferredLanguage?: string;
      isCompanionAssisted?: boolean;
      companionName?: string;
      companionRelationship?: string;
      emergencyContact?: string;
    }
  ) {
    let dobDate: Date | undefined;
    if (data.dateOfBirth) {
      dobDate = new Date(data.dateOfBirth);
    }

    // 1. Update core demographic fields if provided
    await PatientsRepository.updatePatientCore(patientId, {
      fullName: data.fullName?.trim(),
      dateOfBirth: dobDate,
      age: data.age,
      gender: data.gender,
      contactNumber: data.contactNumber?.trim(),
      preferredLanguage: data.preferredLanguage,
    });

    // 2. Update visit profile fields
    await PatientsRepository.updateVisitProfile(visitId, {
      isCompanionAssisted: data.isCompanionAssisted,
      companionName: data.companionName?.trim() || null,
      companionRelationship: data.companionRelationship?.trim() || null,
      preferredLanguage: data.preferredLanguage,
      emergencyContact: data.emergencyContact?.trim() || null,
    });

    logger.info('Patient profile updated via kiosk session', { visitId });

    return this.getKioskProfile(patientId, visitId);
  }

  public static async getProfileCompletion(patientId: string, visitId: string) {
    const record = await PatientsRepository.findProfileByVisit(patientId, visitId);
    if (!record) {
      throw new NotFoundError('Patient profile not found');
    }

    const visitProfile = record.visit_profiles[0] || null;
    const consents = visitProfile?.consents || [];

    return this.calculateCompletion(record, visitProfile, consents);
  }

  public static calculateCompletion(
    patient: { full_name: string; age?: number | null; date_of_birth?: Date | null; gender: string; contact_number: string },
    visitProfile: { preferred_language?: string; is_companion_assisted?: boolean; companion_name?: string | null } | null,
    consents: Array<{ consent_type: string; granted: boolean }>
  ) {
    const missingFields: string[] = [];

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

    const hasDataConsent = consents.some(
      (c) => c.consent_type === ConsentTypes.VISIT_DATA_COLLECTION && c.granted
    );
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

  public static async getConsents(patientId: string, visitId: string) {
    const consents = await PatientsRepository.getConsentsByVisit(patientId, visitId);
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

  public static async updateConsent(
    patientId: string,
    visitId: string,
    consentType: string,
    data: { granted: boolean; grantedVia: string; version?: string }
  ) {
    const validTypes = Object.values(ConsentTypes);
    if (!validTypes.includes(consentType as any)) {
      throw new ValidationError(`Invalid consent type '${consentType}'. Valid options: ${validTypes.join(', ')}`);
    }

    const consent = await PatientsRepository.updateConsent(patientId, visitId, consentType, {
      granted: data.granted,
      grantedVia: data.grantedVia,
      version: data.version || '1.0',
    });

    logger.info(data.granted ? 'Consent granted' : 'Consent revoked', {
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

  public static async getPatientForStaff(patientId: string) {
    const patient = await PatientsRepository.findPatientById(patientId);
    if (!patient) {
      throw new NotFoundError('Patient record not found');
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
      recentVisits: patient.visit_profiles.map((v) => ({
        visitId: v.visit_id,
        isCompanionAssisted: v.is_companion_assisted,
        companionName: v.companion_name,
        preferredLanguage: v.preferred_language,
        createdAt: v.created_at,
      })),
    };
  }
}
