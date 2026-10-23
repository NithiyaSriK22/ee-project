/**
 * MODULE 7A — RECORD OUTPUT, PRINT/EXPORT & HOSPITAL SYSTEM HAND-OFF
 * Domain Types, Enums & Interfaces
 *
 * Strict Boundaries:
 * - Never export unconfirmed content (Drafts are strictly refused).
 * - Never use AI to write patient copies.
 * - Never let an integration failure block a doctor's confirmation.
 * - Sensitive items follow Module 3B visibility rules.
 */

import { ConfirmedRecordDTO, ConfirmedStatementDTO } from '../doctor-review/doctor-review.types.js';

// ==========================================
// 1. PROVENANCE & ORIGIN HEADERS
// ==========================================

export interface StatementOriginSummary {
  aiConfirmedUnchanged: number;
  doctorEdited: number;
  doctorAdded: number;
  codePlaceholderResolved: number;
  toClarify: number;
  totalStatements: number;
}

export interface ProvenanceHeader {
  reviewConfirmationStatement: string; // "AI-assisted draft reviewed and confirmed by Dr X on date, version N"
  confirmedByDoctorName: string;
  confirmedByDoctorId: string;
  confirmedAt: string;
  version: number;
  reviewPolicyVersion: string;
  attestationVersion: string;
  attestationText?: string | null;

  // Identity safety
  isProvisionalIdentity: boolean;
  provisionalIdentityNotice?: string | null; // "PROVISIONAL IDENTITY - RECONCILIATION REQUIRED"
  hospitalRegistrationNumber?: string | null;
  patientToken: string;

  // Amendment & Supersession tracking
  amendmentStatus: 'ORIGINAL' | 'AMENDED' | 'SUPERSEDED';
  supersedesRecordId?: string | null;
  supersededAtVersion?: number | null;
  amendmentReason?: string | null;

  // Origin breakdown
  originSummary: StatementOriginSummary;
  toClarifyItems: string[];
}

// ==========================================
// 2. EXPORT FORMATS & COPY BLOCKS
// ==========================================

export interface CopyBlocksOutput {
  header: string;
  sections: Record<string, string>; // e.g. "CHIEF_COMPLAINT": "...", "MEDICATIONS": "..."
  fullText: string; // Formatted single block for quick copy-pasting
  generatedAt: string;
  recordId: string;
  version: number;
}

export interface StructuredRecordJsonV1 {
  schemaVersion: '1.0.0';
  exportId: string;
  exportedAt: string;
  visitId: string;
  patientId: string;
  patientToken: string;
  hospitalRegistrationNumber?: string | null;
  isProvisionalIdentity: boolean;
  provenance: ProvenanceHeader;
  statements: ConfirmedStatementDTO[];
  sensitiveItemsExcluded: boolean;
  auditSignature: string;
}

// ==========================================
// 3. FHIR R4 MAPPING (OPTIONAL)
// ==========================================

export interface FhirNarrative {
  status: 'generated' | 'extensions' | 'additional';
  div: string; // XHTML div
}

export interface FhirResourceHeader {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  text?: FhirNarrative;
}

export interface FhirCompositionSection {
  title: string;
  code?: {
    coding?: Array<{ system: string; code: string; display: string }>;
  };
  text: FhirNarrative;
  entry?: Array<{ reference: string; display?: string }>;
}

export interface FhirComposition extends FhirResourceHeader {
  resourceType: 'Composition';
  status: 'final' | 'amended';
  type: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  subject: {
    reference: string;
    identifier?: { system: string; value: string };
  };
  date: string;
  author: Array<{ reference: string; display: string }>;
  title: string;
  section: FhirCompositionSection[];
}

export interface FhirAllergyIntolerance extends FhirResourceHeader {
  resourceType: 'AllergyIntolerance';
  clinicalStatus: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  verificationStatus: {
    coding: Array<{ system: string; code: string; display: string }>;
  };
  code: {
    text: string;
  };
  patient: { reference: string };
}

export interface FhirMedicationStatement extends FhirResourceHeader {
  resourceType: 'MedicationStatement';
  status: 'active' | 'completed';
  medicationCodeableConcept: {
    text: string;
  };
  subject: { reference: string };
  effectiveDateTime?: string;
}

export interface FhirObservation extends FhirResourceHeader {
  resourceType: 'Observation';
  status: 'final';
  code: {
    text: string;
  };
  subject: { reference: string };
  valueString?: string;
}

export interface FhirR4Bundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FhirResourceHeader;
  }>;
}

// ==========================================
// 4. PATIENT COPY (OPTIONAL)
// ==========================================

export interface PatientCopyResult {
  recordId: string;
  version: number;
  plainLanguageText: string;
  generatedAt: string;
  sensitiveItemsExcluded: boolean;
  expiresAt?: string;
  signedDownloadUrl?: string;
}

export interface SignedPatientCopyClaims {
  recordId: string;
  version: number;
  visitId: string;
  patientId: string;
  expiresAtMs: number;
  consentVerified: boolean;
}

// ==========================================
// 5. HOSPITAL SYSTEM ADAPTER & PUSH QUEUE
// ==========================================

export interface HospitalPushContext {
  visitId: string;
  patientId: string;
  hospitalRegistrationNumber?: string | null;
  identityState: 'CONFIRMED' | 'PROVISIONAL';
  idempotencyKey: string; // `${recordId}-v${version}`
  isAmendment: boolean;
  actorId: string;
  actorRole: string;
}

export interface HospitalPushResult {
  success: boolean;
  adapterName: string;
  idempotencyKey: string;
  statusCode?: number;
  remoteTransactionId?: string;
  errorMessage?: string;
  needsManualReconciliation?: boolean;
  attemptCount: number;
  timestamp: string;
}

export interface HospitalSystemAdapter {
  name: string;
  pushRecord(record: ConfirmedRecordDTO, context: HospitalPushContext): Promise<HospitalPushResult>;
}

export interface HospitalFailureQueueItem {
  queueId: string;
  recordId: string;
  version: number;
  visitId: string;
  idempotencyKey: string;
  error: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING_RETRY' | 'PERMANENTLY_FAILED' | 'RESOLVED';
  identityState: 'CONFIRMED' | 'PROVISIONAL';
  needsManualHandling: boolean;
  lastAttemptAt: string;
}
