export const UserRoles = {
  PATIENT: 'PATIENT',
  COMPANION: 'COMPANION',
  STAFF_ATTENDANT: 'STAFF_ATTENDANT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ANALYST: 'ANALYST',
  AUDITOR: 'AUDITOR',
} as const;

export type StaffRole = 'STAFF_ATTENDANT' | 'DOCTOR' | 'ADMIN' | 'SUPER_ADMIN' | 'ANALYST' | 'AUDITOR';

export const StaffUserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
} as const;

export type StaffUserStatusType = (typeof StaffUserStatus)[keyof typeof StaffUserStatus];

export const ConsentTypes = {
  VISIT_DATA_COLLECTION: 'VISIT_DATA_COLLECTION',
  DOCUMENT_PROCESSING: 'DOCUMENT_PROCESSING',
  AI_SUMMARIZATION: 'AI_SUMMARIZATION',
  SHARE_WITH_DOCTOR: 'SHARE_WITH_DOCTOR',
} as const;

export type ConsentType = (typeof ConsentTypes)[keyof typeof ConsentTypes];

export const ConsentGrantedVia = {
  PATIENT: 'patient',
  COMPANION: 'companion',
  STAFF_ASSISTED: 'staff_assisted',
} as const;

export type ConsentGrantedViaType = (typeof ConsentGrantedVia)[keyof typeof ConsentGrantedVia];

export const SupportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu'] as const;
export type SupportedLanguage = (typeof SupportedLanguages)[number];

export interface StaffUserPayload {
  id: string;
  email: string;
  role: StaffRole;
  fullName: string;
  hospitalDepartment?: string | null;
  status: StaffUserStatusType;
}

export interface KioskSessionPayload {
  sessionId: string;
  visitId: string;
  patientId: string;
  visitProfileId?: string;
  hospitalRegistrationNumber: string;
}

export interface StaffTokenClaims {
  sub: string;
  email: string;
  role: StaffRole;
  fullName: string;
  department?: string | null;
  type: 'STAFF_ACCESS';
}

export interface KioskTokenClaims {
  sessionId: string;
  visitId: string;
  patientId: string;
  type: 'KIOSK_SESSION';
}
