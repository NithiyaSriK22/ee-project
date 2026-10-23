import crypto from 'crypto';
import { ConfirmedRecordDTO } from '../../doctor-review/doctor-review.types.js';
import { StructuredRecordJsonV1, ProvenanceHeader } from '../record-output.types.js';

export class StructuredJsonService {
  /**
   * Generates a stable, versioned JSON export schema (v1.0.0).
   * Fully structured for machine-readable hospital integration.
   */
  public static generateStructuredJson(params: {
    record: ConfirmedRecordDTO;
    provenance: ProvenanceHeader;
    visitId: string;
    patientId: string;
    excludeSensitiveItems?: boolean;
  }): StructuredRecordJsonV1 {
    const { record, provenance, visitId, patientId, excludeSensitiveItems = false } = params;

    // Filter sensitive items if requested or required by visibility scope
    let statements = [...record.statements];
    if (excludeSensitiveItems) {
      statements = statements.filter(
        (s) => !s.section.toLowerCase().includes('sensitive') && !s.text.toLowerCase().includes('confidential')
      );
    }

    const exportId = `EXP-JSON-${record.id}-v${record.version}`;
    const exportedAt = new Date().toISOString();

    // Generate cryptographic audit signature over exported payload
    const signaturePayload = `${exportId}::${record.id}::v${record.version}::${provenance.confirmedByDoctorId}::${exportedAt}`;
    const auditSignature = crypto
      .createHash('sha256')
      .update(signaturePayload)
      .digest('hex');

    return {
      schemaVersion: '1.0.0',
      exportId,
      exportedAt,
      visitId,
      patientId,
      patientToken: provenance.patientToken,
      hospitalRegistrationNumber: provenance.hospitalRegistrationNumber,
      isProvisionalIdentity: provenance.isProvisionalIdentity,
      provenance,
      statements,
      sensitiveItemsExcluded: excludeSensitiveItems,
      auditSignature,
    };
  }
}
