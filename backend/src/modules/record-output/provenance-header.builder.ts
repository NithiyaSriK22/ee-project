import { ConfirmedRecordDTO, ConfirmedOrigins } from '../doctor-review/doctor-review.types.js';
import { ProvenanceHeader, StatementOriginSummary } from './record-output.types.js';

export class ProvenanceHeaderBuilder {
  /**
   * Constructs the mandatory clinical provenance header for all Module 7A outputs.
   * Requirements:
   * - "AI-assisted draft reviewed and confirmed by Dr X on date, version N"
   * - Origin summaries (breakdown of AI vs doctor contributions)
   * - "to clarify" items
   * - Provisional identity warning if unreconciled
   * - Amendment/supersession tracking with clinical reason
   */
  public static buildProvenanceHeader(params: {
    record: ConfirmedRecordDTO;
    patientToken: string;
    isProvisionalIdentity: boolean;
    hospitalRegistrationNumber?: string | null;
  }): ProvenanceHeader {
    const { record, patientToken, isProvisionalIdentity, hospitalRegistrationNumber } = params;

    const doctorName = record.confirmedByDoctorName || 'Treating Physician';
    const confirmedDate = new Date(record.confirmedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const reviewConfirmationStatement =
      `AI-assisted draft reviewed and confirmed by Dr. ${doctorName} on ${confirmedDate}, version ${record.version}`;

    // Origin breakdown
    const summary: StatementOriginSummary = {
      aiConfirmedUnchanged: 0,
      doctorEdited: 0,
      doctorAdded: 0,
      codePlaceholderResolved: 0,
      toClarify: 0,
      totalStatements: record.statements.length,
    };

    const toClarifyItems: string[] = [];

    for (const stmt of record.statements) {
      if (stmt.origin === ConfirmedOrigins.AI_CONFIRMED_UNCHANGED) {
        summary.aiConfirmedUnchanged++;
      } else if (stmt.origin === ConfirmedOrigins.DOCTOR_EDITED) {
        summary.doctorEdited++;
      } else if (stmt.origin === ConfirmedOrigins.DOCTOR_ADDED) {
        summary.doctorAdded++;
      } else if (stmt.origin === ConfirmedOrigins.CODE_PLACEHOLDER_RESOLVED) {
        summary.codePlaceholderResolved++;
      } else if (stmt.origin === ConfirmedOrigins.TO_CLARIFY) {
        summary.toClarify++;
        toClarifyItems.push(`[${stmt.section}] ${stmt.text}`);
      }
    }

    // Amendment status
    const isAmended = Boolean(record.supersedesId || record.version > 1 || record.amendmentReason);
    const amendmentStatus = isAmended ? 'AMENDED' : 'ORIGINAL';

    return {
      reviewConfirmationStatement,
      confirmedByDoctorName: doctorName,
      confirmedByDoctorId: record.confirmedByDoctorId,
      confirmedAt: new Date(record.confirmedAt).toISOString(),
      version: record.version,
      reviewPolicyVersion: record.reviewPolicyVersion,
      attestationVersion: record.attestationVersion,
      attestationText: record.attestationText,

      isProvisionalIdentity,
      provisionalIdentityNotice: isProvisionalIdentity
        ? 'PROVISIONAL IDENTITY - RECONCILIATION REQUIRED BEFORE EHR MERGE'
        : null,
      hospitalRegistrationNumber: isProvisionalIdentity ? null : hospitalRegistrationNumber,
      patientToken,

      amendmentStatus,
      supersedesRecordId: record.supersedesId || null,
      supersededAtVersion: isAmended ? record.version - 1 : null,
      amendmentReason: record.amendmentReason || null,

      originSummary: summary,
      toClarifyItems,
    };
  }
}
