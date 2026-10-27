export interface InMemPatient {
  id: string;
  hospital_registration_number: string;
  full_name: string;
  date_of_birth?: Date | null;
  age?: number | null;
  gender: string;
  contact_number: string;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
  visit_profiles?: InMemVisitProfile[];
}

export interface InMemVisitProfile {
  id: string;
  patient_id: string;
  visit_id: string;
  is_companion_assisted: boolean;
  companion_name?: string | null;
  companion_relationship?: string | null;
  preferred_language: string;
  emergency_contact?: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  consents?: InMemConsent[];
}

export interface InMemKioskSession {
  id: string;
  visit_id: string;
  patient_id: string;
  visit_profile_id?: string | null;
  session_token_hash?: string;
  status: string;
  expires_at: Date;
  last_accessed_at: Date;
  created_at: Date;
  updated_at: Date;
  patient: InMemPatient;
  visit_profile?: InMemVisitProfile | null;
}

export interface InMemConsent {
  id: string;
  patient_id: string;
  visit_id: string;
  visit_profile_id?: string | null;
  consent_type: string;
  granted: boolean;
  granted_via: string;
  version: string;
  granted_at: Date;
  revoked_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class DevFallbackPatientStore {
  private static instance: DevFallbackPatientStore;

  public static getInstance(): DevFallbackPatientStore {
    if (!DevFallbackPatientStore.instance) {
      DevFallbackPatientStore.instance = new DevFallbackPatientStore();
    }
    return DevFallbackPatientStore.instance;
  }

  private patients = new Map<string, InMemPatient>(); // key: id AND key: hospital_registration_number
  private visitProfiles = new Map<string, InMemVisitProfile>(); // key: visitId
  private kioskSessions = new Map<string, InMemKioskSession>(); // key: visitId
  private consents = new Map<string, InMemConsent[]>(); // key: visitId

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultPatient: InMemPatient = {
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

  public createPatient(data: {
    hospitalRegistrationNumber: string;
    fullName: string;
    dateOfBirth?: Date | null;
    age?: number | null;
    gender: string;
    contactNumber: string;
    preferredLanguage: string;
  }): InMemPatient {
    const patient: InMemPatient = {
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

  public findPatientById(id: string): InMemPatient | null {
    const p = this.patients.get(id);
    if (!p) return null;
    return {
      ...p,
      visit_profiles: p.visit_profiles || [],
    };
  }

  public findPatientByRegistrationNumber(regNumber: string): InMemPatient | null {
    const p = this.patients.get(regNumber.trim());
    if (!p) return null;
    return {
      ...p,
      visit_profiles: p.visit_profiles || [],
    };
  }

  public listPatients(options?: { search?: string; limit?: number; offset?: number }) {
    const unique = new Map<string, InMemPatient>();
    for (const p of this.patients.values()) {
      unique.set(p.id, p);
    }
    let list = Array.from(unique.values());
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.hospital_registration_number.toLowerCase().includes(q) ||
          p.contact_number.includes(q)
      );
    }
    const total = list.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return { patients: list.slice(offset, offset + limit), total };
  }

  public updatePatientCore(
    id: string,
    data: {
      fullName?: string;
      dateOfBirth?: Date;
      age?: number;
      gender?: string;
      contactNumber?: string;
      preferredLanguage?: string;
    }
  ): InMemPatient | null {
    const patient = this.patients.get(id);
    if (!patient) return null;

    if (data.fullName !== undefined) patient.full_name = data.fullName;
    if (data.dateOfBirth !== undefined) patient.date_of_birth = data.dateOfBirth;
    if (data.age !== undefined) patient.age = data.age;
    if (data.gender !== undefined) patient.gender = data.gender;
    if (data.contactNumber !== undefined) patient.contact_number = data.contactNumber;
    if (data.preferredLanguage !== undefined) patient.preferred_language = data.preferredLanguage;
    patient.updated_at = new Date();

    this.patients.set(patient.id, patient);
    this.patients.set(patient.hospital_registration_number, patient);
    return patient;
  }

  // ============================================================================
  // VISIT PROFILES
  // ============================================================================

  public createVisitProfile(data: {
    patientId: string;
    visitId: string;
    isCompanionAssisted: boolean;
    companionName?: string | null;
    companionRelationship?: string | null;
    preferredLanguage: string;
    emergencyContact?: string | null;
  }): InMemVisitProfile {
    const profile: InMemVisitProfile = {
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
      if (!pat.visit_profiles) pat.visit_profiles = [];
      pat.visit_profiles.unshift(profile);
    }

    return profile;
  }

  public getVisitProfile(visitId: string): InMemVisitProfile | null {
    return this.visitProfiles.get(visitId) || null;
  }

  public findProfileByVisit(patientId: string, visitId: string) {
    const patient = this.patients.get(patientId);
    if (!patient) return null;

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

  public updateVisitProfile(
    visitId: string,
    data: {
      isCompanionAssisted?: boolean;
      companionName?: string | null;
      companionRelationship?: string | null;
      preferredLanguage?: string;
      emergencyContact?: string | null;
    }
  ): InMemVisitProfile | null {
    const profile = this.visitProfiles.get(visitId);
    if (!profile) return null;

    if (data.isCompanionAssisted !== undefined) profile.is_companion_assisted = data.isCompanionAssisted;
    if (data.companionName !== undefined) profile.companion_name = data.companionName;
    if (data.companionRelationship !== undefined) profile.companion_relationship = data.companionRelationship;
    if (data.preferredLanguage !== undefined) profile.preferred_language = data.preferredLanguage;
    if (data.emergencyContact !== undefined) profile.emergency_contact = data.emergencyContact;
    profile.updated_at = new Date();

    this.visitProfiles.set(visitId, profile);
    return profile;
  }

  // ============================================================================
  // KIOSK SESSIONS
  // ============================================================================

  public createKioskSession(data: {
    visitId: string;
    patientId: string;
    visitProfileId?: string;
    sessionTokenHash?: string;
    expiresAt: Date;
  }): InMemKioskSession {
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

    const session: InMemKioskSession = {
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

  public findSessionByVisitId(visitId: string): InMemKioskSession | null {
    let session = this.kioskSessions.get(visitId);
    if (!session) {
      if (process.env.NODE_ENV === 'test' || visitId.startsWith('visit-')) {
        const dummyPatient: InMemPatient = {
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
      } else {
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

  public endSession(visitId: string): InMemKioskSession | null {
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

  public recordConsent(data: {
    patientId: string;
    visitId: string;
    visitProfileId?: string;
    consentType: string;
    granted: boolean;
    grantedVia: string;
    version?: string;
  }): InMemConsent {
    const list = this.consents.get(data.visitId) || [];
    const existingIdx = list.findIndex((c) => c.consent_type === data.consentType);

    const consent: InMemConsent = {
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
    } else {
      list.push(consent);
    }
    this.consents.set(data.visitId, list);
    return consent;
  }

  public getConsentsForVisit(_patientId: string, visitId: string): InMemConsent[] {
    return this.consents.get(visitId) || [];
  }

  public updateConsent(
    patientId: string,
    visitId: string,
    consentType: string,
    data: {
      granted: boolean;
      grantedVia: string;
      version: string;
    }
  ): InMemConsent {
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

export const devFallbackPatientStore = DevFallbackPatientStore.getInstance();
