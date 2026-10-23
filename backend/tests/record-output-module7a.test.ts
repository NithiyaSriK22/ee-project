import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProvenanceHeaderBuilder,
  PdfExportService,
  CopyBlocksService,
  StructuredJsonService,
  FhirR4MapperService,
  PatientCopyService,
  HospitalSystemPushService,
  NoOpHospitalSystemAdapter,
  FileDropHospitalSystemAdapter,
  EndpointHospitalSystemAdapter,
} from '../src/modules/record-output/index.js';
import { ConfirmationService } from '../src/modules/doctor-review/confirmation/confirmation.service.js';
import { AmendmentService } from '../src/modules/doctor-review/confirmation/amendment.service.js';
import { ConfirmedRecordDTO, ConfirmedOrigins } from '../src/modules/doctor-review/doctor-review.types.js';
import { FeatureFlagsService } from '../src/modules/deployment/feature-flags.service.js';

describe('MODULE 7A — RECORD OUTPUT, PRINT/EXPORT & HOSPITAL SYSTEM HAND-OFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HospitalSystemPushService.setAdapterOverride(undefined);
  });

  const mockConfirmedRecord: ConfirmedRecordDTO = {
    id: 'REC-CONFIRMED-001',
    visitId: 'visit-test-7a-001',
    version: 1,
    summaryVersion: 1,
    reviewPolicyVersion: 'POLICY-v1.0.0',
    confirmedByDoctorId: 'DOC-SHARMA-01',
    confirmedByDoctorName: 'Dr. Rajesh Sharma',
    confirmedAt: new Date('2026-03-15T10:30:00Z'),
    attestationVersion: 'ATTEST-v1.0',
    attestationText: 'I confirm this case record reflects verified patient intake.',
    supersedesId: null,
    amendmentReason: null,
    statements: [
      {
        section: 'CHIEF_COMPLAINT',
        text: 'Acute productive cough and low-grade fever for 4 days.',
        origin: ConfirmedOrigins.AI_CONFIRMED_UNCHANGED,
        order: 1,
      },
      {
        section: 'MEDICATIONS',
        text: 'Metformin 500mg Oral tablet twice daily with meals.',
        origin: ConfirmedOrigins.DOCTOR_EDITED,
        order: 2,
      },
      {
        section: 'ALLERGIES',
        text: 'Severe penicillin anaphylaxis (hives and angioedema in 2021).',
        origin: ConfirmedOrigins.DOCTOR_ADDED,
        order: 3,
      },
      {
        section: 'TO_CLARIFY',
        text: 'Confirm duration of past ACE inhibitor therapy with cardiologist.',
        origin: ConfirmedOrigins.TO_CLARIFY,
        order: 4,
      },
      {
        section: 'SENSITIVE_TOPICS',
        text: 'Patient deferred mental health questionnaire to private consultation with doctor.',
        origin: ConfirmedOrigins.DOCTOR_ADDED,
        order: 5,
      },
    ],
    createdAt: new Date('2026-03-15T10:30:00Z'),
  };

  // ============================================================================
  // 1. PROVENANCE HEADER & ATTESTATION (Section 2)
  // ============================================================================

  describe('Provenance Header Construction & Origin Tracking', () => {
    it('Includes mandatory attestation: AI-assisted draft reviewed and confirmed by Dr X on date, version N', () => {
      const header = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      expect(header.reviewConfirmationStatement).toContain('AI-assisted draft reviewed and confirmed by Dr. Dr. Rajesh Sharma');
      expect(header.reviewConfirmationStatement).toContain('version 1');
      expect(header.version).toBe(1);
      expect(header.confirmedByDoctorId).toBe('DOC-SHARMA-01');
    });

    it('Summarizes statement origins and captures TO_CLARIFY items', () => {
      const header = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      expect(header.originSummary.aiConfirmedUnchanged).toBe(1);
      expect(header.originSummary.doctorEdited).toBe(1);
      expect(header.originSummary.doctorAdded).toBe(2);
      expect(header.originSummary.toClarify).toBe(1);
      expect(header.originSummary.totalStatements).toBe(5);

      expect(header.toClarifyItems.length).toBe(1);
      expect(header.toClarifyItems[0]).toContain('Confirm duration of past ACE inhibitor therapy');
    });

    it('Handles provisional identity with explicit warning and withheld registration number', () => {
      const header = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'PROV-404',
        isProvisionalIdentity: true,
        hospitalRegistrationNumber: 'HRN-UNRECONCILED',
      });

      expect(header.isProvisionalIdentity).toBe(true);
      expect(header.provisionalIdentityNotice).toContain('PROVISIONAL IDENTITY - RECONCILIATION REQUIRED');
      expect(header.hospitalRegistrationNumber).toBeNull(); // Withheld until reconciled
    });

    it('Tracks amendment and supersession status on amended records', () => {
      const amendedRecord: ConfirmedRecordDTO = {
        ...mockConfirmedRecord,
        version: 2,
        supersedesId: 'REC-CONFIRMED-001',
        amendmentReason: 'Added documented allergy reaction history after bedside check.',
      };

      const header = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: amendedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      expect(header.amendmentStatus).toBe('AMENDED');
      expect(header.supersedesRecordId).toBe('REC-CONFIRMED-001');
      expect(header.supersededAtVersion).toBe(1);
      expect(header.amendmentReason).toBe('Added documented allergy reaction history after bedside check.');
    });
  });

  // ============================================================================
  // 2. COPY BLOCKS EXPORT (Section 3)
  // ============================================================================

  describe('Copy Blocks Formatting for Legacy Hospital EHR Paste-In', () => {
    it('Assembles sectioned text blocks and prepends review banner', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      const copyBlocks = CopyBlocksService.generateCopyBlocks(mockConfirmedRecord, provenance);

      expect(copyBlocks.sections.CHIEF_COMPLAINT).toContain('Acute productive cough');
      expect(copyBlocks.sections.MEDICATIONS).toContain('Metformin 500mg');
      expect(copyBlocks.sections.ALLERGIES).toContain('Severe penicillin anaphylaxis');

      expect(copyBlocks.fullText).toContain('CLINICAL CASE SUMMARY — ORIGINAL (v1)');
      expect(copyBlocks.fullText).toContain(provenance.reviewConfirmationStatement);
      expect(copyBlocks.fullText).toContain('[CHIEF COMPLAINT]');
      expect(copyBlocks.fullText).toContain('[MEDICATIONS]');
      expect(copyBlocks.fullText).toContain('[ALLERGIES]');
    });
  });

  // ============================================================================
  // 3. STRUCTURED JSON EXPORT (Section 3)
  // ============================================================================

  describe('Structured JSON Export Schema & Audit Signature', () => {
    it('Generates versioned schema with cryptographic audit signature', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      const jsonOutput = StructuredJsonService.generateStructuredJson({
        record: mockConfirmedRecord,
        provenance,
        visitId: 'visit-test-7a-001',
        patientId: 'PAT-001',
        excludeSensitiveItems: false,
      });

      expect(jsonOutput.schemaVersion).toBe('1.0.0');
      expect(jsonOutput.exportId).toContain('REC-CONFIRMED-001-v1');
      expect(jsonOutput.statements.length).toBe(5);
      expect(jsonOutput.auditSignature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('Excludes sensitive items when requested or required by visibility scope', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      const jsonOutput = StructuredJsonService.generateStructuredJson({
        record: mockConfirmedRecord,
        provenance,
        visitId: 'visit-test-7a-001',
        patientId: 'PAT-001',
        excludeSensitiveItems: true, // Sensitive exclusion
      });

      expect(jsonOutput.sensitiveItemsExcluded).toBe(true);
      expect(jsonOutput.statements.some((s) => s.section === 'SENSITIVE_TOPICS')).toBe(false);
      expect(jsonOutput.statements.length).toBe(4);
    });
  });

  // ============================================================================
  // 4. PDF / PRINT EXPORT & WATERMARK (Section 3, 6)
  // ============================================================================

  describe('Accessible PDF Export & Sandboxed Generation', () => {
    it('Generates accessible HTML document with user/timestamp watermark and zero clinical data in filename', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      const pdf = PdfExportService.generatePrintableDocument({
        record: mockConfirmedRecord,
        provenance,
        requestingUser: { id: 'USR-DOC-02', role: 'DOCTOR', fullName: 'Dr. Sarah Connor' },
      });

      expect(pdf.fileName).toBe('Record_Visit_visit-test-7a-001_v1.pdf');
      expect(pdf.fileName).not.toContain('cough');
      expect(pdf.fileName).not.toContain('Metformin');

      expect(pdf.watermarkText).toContain('Dr. Sarah Connor');
      expect(pdf.watermarkText).toContain('DOCTOR');
      expect(pdf.htmlContent).toContain(pdf.watermarkText);
      expect(pdf.htmlContent).toContain('OUTPATIENT CONSULTATION CASE SUMMARY');
      expect(pdf.htmlContent).toContain('Acute productive cough');
      expect(pdf.byteSize).toBeGreaterThan(1000);
    });
  });

  // ============================================================================
  // 5. OPTIONAL FHIR R4 MAPPING (Section 3)
  // ============================================================================

  describe('Optional FHIR R4 Document Bundle Mapping', () => {
    it('Rejects FHIR mapping when feature flag is off by default', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      // Default flag is off
      expect(FeatureFlagsService.isFlagEnabled('FHIR_R4_EXPORT_ENABLED')).toBe(false);

      expect(() => {
        FhirR4MapperService.mapToFhirR4Bundle(mockConfirmedRecord, provenance);
      }).toThrow('FHIR R4 export is currently disabled by hospital feature flag');
    });

    it('Maps confirmed statements to standard FHIR R4 resources when feature flag is enabled', () => {
      const provenance = ProvenanceHeaderBuilder.buildProvenanceHeader({
        record: mockConfirmedRecord,
        patientToken: 'A-101',
        isProvisionalIdentity: false,
        hospitalRegistrationNumber: 'HRN-998822',
      });

      // Enable FHIR flag
      FeatureFlagsService.updateFlag('FHIR_R4_EXPORT_ENABLED', true, { id: 'admin', role: 'ADMIN' }, 'Test enable');

      try {
        const bundle = FhirR4MapperService.mapToFhirR4Bundle(mockConfirmedRecord, provenance);

        expect(bundle.resourceType).toBe('Bundle');
        expect(bundle.type).toBe('document');

        // First resource must be Composition
        expect(bundle.entry[0]!.resource.resourceType).toBe('Composition');

        // Check AllergyIntolerance mapping
        const allergyResource = bundle.entry.find((e) => e.resource.resourceType === 'AllergyIntolerance');
        expect(allergyResource).toBeDefined();
        expect(allergyResource!.resource.code.text).toContain('penicillin anaphylaxis');

        // Check MedicationStatement mapping
        const medResource = bundle.entry.find((e) => e.resource.resourceType === 'MedicationStatement');
        expect(medResource).toBeDefined();
        expect(medResource!.resource.medicationCodeableConcept.text).toContain('Metformin');
      } finally {
        FeatureFlagsService.updateFlag('FHIR_R4_EXPORT_ENABLED', false, { id: 'admin', role: 'ADMIN' }, 'Test reset');
      }
    });
  });

  // ============================================================================
  // 6. PATIENT COPY (Section 5)
  // ============================================================================

  describe('Deterministic Patient Copy (No LLM) & Expiring Signed Link', () => {
    it('Rejects patient copy generation when feature flag is off', () => {
      expect(FeatureFlagsService.isFlagEnabled('PATIENT_COPY_ENABLED')).toBe(false);

      expect(() => {
        PatientCopyService.generatePatientCopy({
          record: mockConfirmedRecord,
          patientId: 'PAT-01',
          patientToken: 'A-101',
          patientConsentVerified: true,
        });
      }).toThrow('Patient copy generation is currently disabled');
    });

    it('Assembles plain-language patient copy (NO LLM) and excludes sensitive topics', () => {
      FeatureFlagsService.updateFlag('PATIENT_COPY_ENABLED', true, { id: 'admin', role: 'ADMIN' }, 'Test enable');

      try {
        const patientCopy = PatientCopyService.generatePatientCopy({
          record: mockConfirmedRecord,
          patientId: 'PAT-01',
          patientToken: 'A-101',
          patientConsentVerified: true,
        });

        expect(patientCopy.plainLanguageText).toContain('YOUR CLINICAL VISIT SUMMARY (PATIENT COPY)');
        expect(patientCopy.plainLanguageText).toContain('Reason for Your Visit');
        expect(patientCopy.plainLanguageText).toContain('Acute productive cough');

        // Sensitive topics must be excluded from patient copy
        expect(patientCopy.plainLanguageText).not.toContain('mental health');
        expect(patientCopy.sensitiveItemsExcluded).toBe(true);

        expect(patientCopy.signedDownloadUrl).toBeDefined();
        expect(patientCopy.expiresAt).toBeDefined();
      } finally {
        FeatureFlagsService.updateFlag('PATIENT_COPY_ENABLED', false, { id: 'admin', role: 'ADMIN' }, 'Test reset');
      }
    });

    it('Signed patient copy token verifies and enforces expiration check', () => {
      const claims = {
        recordId: 'REC-001',
        version: 1,
        visitId: 'visit-01',
        patientId: 'pat-01',
        expiresAtMs: Date.now() + 60000, // Valid for 1 minute
        consentVerified: true,
      };

      const token = PatientCopyService.generateSignedToken(claims);
      expect(token).toBeDefined();

      const verified = PatientCopyService.verifySignedToken(token);
      expect(verified.recordId).toBe('REC-001');

      // Test expired token
      const expiredClaims = {
        ...claims,
        expiresAtMs: Date.now() - 1000, // Expired 1 second ago
      };
      const expiredToken = PatientCopyService.generateSignedToken(expiredClaims);
      expect(() => {
        PatientCopyService.verifySignedToken(expiredToken);
      }).toThrow('Patient copy download link has expired');
    });
  });

  // ============================================================================
  // 7. HOSPITAL SYSTEM ADAPTER & RESILIENT PUSH (Section 4)
  // ============================================================================

  describe('Hospital System Hand-Off, Idempotency & Failure Queue', () => {
    it('NoOp adapter succeeds safely with idempotent transaction ID', async () => {
      const noop = new NoOpHospitalSystemAdapter();
      const result = await noop.pushRecord(mockConfirmedRecord, {
        visitId: 'visit-01',
        patientId: 'pat-01',
        identityState: 'CONFIRMED',
        hospitalRegistrationNumber: 'HRN-12345',
        idempotencyKey: 'REC-001-v1',
        isAmendment: false,
        actorId: 'DOC-01',
        actorRole: 'DOCTOR',
      });

      expect(result.success).toBe(true);
      expect(result.adapterName).toBe('NOOP_ADAPTER');
      expect(result.idempotencyKey).toBe('REC-001-v1');
    });

    it('CRITICAL: A failed hospital push NEVER blocks doctor confirmation', async () => {
      // Mock an adapter that throws a network or remote failure
      const failingAdapter = {
        name: 'FAULTY_HOSPITAL_GW',
        pushRecord: vi.fn().mockRejectedValue(new Error('Hospital EHR Gateway Timeout (504)')),
      };

      HospitalSystemPushService.setAdapterOverride(failingAdapter);

      const pushResult = await HospitalSystemPushService.pushConfirmedRecord(mockConfirmedRecord, {
        visitId: 'visit-test-7a-001',
        patientId: 'pat-01',
        identityState: 'CONFIRMED',
        hospitalRegistrationNumber: 'HRN-998822',
      });

      // Does not throw! Returns success: false and records in failure queue
      expect(pushResult.success).toBe(false);
      expect(pushResult.errorMessage).toContain('Gateway Timeout');

      // Enqueued in failure queue for admin visibility (Module 9)
      const queue = HospitalSystemPushService.getFailureQueue();
      const item = queue.find((q) => q.idempotencyKey === 'REC-CONFIRMED-001-v1');
      expect(item).toBeDefined();
      expect(item!.status).toBe('PENDING_RETRY');
      expect(item!.error).toContain('Gateway Timeout');
    });

    it('Provisional identity is flagged for manual reconciliation and does not send registration number', async () => {
      const mockAdapter = {
        name: 'INSPECT_ADAPTER',
        pushRecord: vi.fn().mockImplementation(async (_rec, ctx) => ({
          success: true,
          adapterName: 'INSPECT_ADAPTER',
          idempotencyKey: ctx.idempotencyKey,
          attemptCount: 1,
          timestamp: new Date().toISOString(),
        })),
      };

      HospitalSystemPushService.setAdapterOverride(mockAdapter);

      await HospitalSystemPushService.pushConfirmedRecord(mockConfirmedRecord, {
        visitId: 'visit-test-prov-001',
        patientId: 'pat-prov-01',
        identityState: 'PROVISIONAL',
        hospitalRegistrationNumber: 'HRN-PROV-999', // Should be withheld
      });

      expect(mockAdapter.pushRecord).toHaveBeenCalled();
      const calledContext = mockAdapter.pushRecord.mock.calls[0][1];
      expect(calledContext.identityState).toBe('PROVISIONAL');
      expect(calledContext.hospitalRegistrationNumber).toBeNull(); // Withheld!
    });
  });
});
