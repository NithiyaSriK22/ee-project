export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flagHint: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flagHint: 'ENG' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flagHint: 'HIN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flagHint: 'TAM' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flagHint: 'TEL' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flagHint: 'KAN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flagHint: 'MAL' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flagHint: 'MAR' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flagHint: 'BEN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flagHint: 'GUJ' },
];

export interface Patient {
  id: string;
  hospitalRegistrationNumber: string;
  fullName: string;
  age?: number | null;
  dateOfBirth?: string | null;
  gender: string;
  contactNumber: string;
  preferredLanguage: SupportedLanguage;
}

export interface PatientVisitProfile {
  id: string;
  visitId: string;
  isCompanionAssisted: boolean;
  companionName?: string | null;
  companionRelationship?: string | null;
  preferredLanguage: SupportedLanguage;
  emergencyContact?: string | null;
  status: string;
}

export interface ConsentItem {
  consentType: string;
  granted: boolean;
  grantedVia: 'patient' | 'companion' | 'staff_assisted';
  version: string;
  grantedAt?: string;
  revokedAt?: string | null;
}

export interface KioskSessionInfo {
  sessionId: string;
  visitId: string;
  sessionToken?: string;
  tokenType?: string;
  expiresAt: string;
  status?: string;
}

export interface StartKioskSessionPayload {
  hospitalRegistrationNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  contactNumber?: string;
  preferredLanguage?: SupportedLanguage;
  isCompanionAssisted?: boolean;
  companionName?: string;
  companionRelationship?: string;
  emergencyContact?: string;
  consentGranted?: boolean;
  consentGrantedVia?: 'patient' | 'companion' | 'staff_assisted';
}

export interface StartSessionResponseData {
  session: KioskSessionInfo;
  patient: Patient;
  visitProfile: PatientVisitProfile;
  consents: ConsentItem[];
}

export interface ProfileCompletion {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  readyForInterview: boolean;
}

export interface PatientProfileResponseData extends Patient {
  isCompanionAssisted: boolean;
  companionName?: string | null;
  companionRelationship?: string | null;
  emergencyContact?: string | null;
  consents: ConsentItem[];
  completion: ProfileCompletion;
}
