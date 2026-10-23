// ==============================================================================
// MODULE 2A: VISIT LIFECYCLE, PATIENT IDENTITY SAFETY, MASTER DATA & EVENTS
// Canonical Data Types and Contracts
// ==============================================================================

export type VisitStatus =
  | 'CREATED'
  | 'CHECKED_IN'
  | 'INTAKE_IN_PROGRESS'
  | 'INTAKE_COMPLETE'
  | 'READY_FOR_REVIEW'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'PAUSED'
  | 'INTAKE_ABANDONED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW';

export type VisitIdentityState = 'CONFIRMED' | 'PROVISIONAL';

export type VisitSource = 'KIOSK' | 'STAFF_DESK';

export interface VisitRecord {
  id: string;
  patient_id: string;
  department_id: string;
  assigned_doctor_id?: string | null;
  token_number: string;
  kiosk_device_id?: string | null;
  source: VisitSource;
  status: VisitStatus;
  identity_state: VisitIdentityState;
  opened_at: Date;
  closed_at?: Date | null;
  expires_at: Date;
  is_quarantined?: boolean;
  quarantine_reason?: string | null;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpdLocation {
  id: string;
  department_id: string;
  building: string;
  floor: string;
  room_number: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorProfile {
  id: string;
  staff_user_id: string;
  department_id: string;
  license_number: string;
  specialization: string;
  consultation_room: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KioskDevice {
  id: string;
  device_code: string;
  location_id?: string | null;
  default_department_id?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  last_seen_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpdSchedule {
  id: string;
  department_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // e.g. "08:00"
  end_time: string; // e.g. "14:00"
  intake_cutoff_time: string; // e.g. "13:30"
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TokenSlip {
  tokenNumber: string;
  departmentCode: string;
  departmentName: string;
  locationName: string;
  issuedAt: string;
  patientNameMinimal: string;
  notice: string;
}

// Canonical Event Names
export type CanonicalEventName =
  | 'VISIT_CREATED'
  | 'VISIT_CHECKED_IN'
  | 'INTERVIEW_ANSWER_RECORDED'
  | 'INTERVIEW_COMPLETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VALIDATED'
  | 'SUMMARY_REQUESTED'
  | 'SUMMARY_GENERATED'
  | 'SUMMARY_FAILED'
  | 'ALERT_RAISED'
  | 'ALERT_ACKNOWLEDGED'
  | 'REVIEW_STARTED'
  | 'RECORD_CONFIRMED'
  | 'VISIT_COMPLETED'
  | 'VISIT_EXPIRED';

export interface CanonicalEvent<T = Record<string, any>> {
  eventId: string;
  eventName: CanonicalEventName;
  version: string;
  visitId: string;
  patientId: string;
  occurredAt: string;
  producer: string;
  payload: T;
}

export interface OutboxMessage {
  id: string;
  eventId: string;
  eventName: CanonicalEventName;
  visitId: string;
  payload: any;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';
  retryCount: number;
  lastAttemptAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface MergeHistoryRecord {
  id: string;
  sourcePatientId: string;
  targetPatientId: string;
  mergedBy: string;
  reason: string;
  mergedAt: Date;
  reversedAt?: Date | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
  status: 'ACTIVE' | 'REVERSED';
  snapshot: {
    sourcePatient: any;
    transferredVisitIds: string[];
  };
}
