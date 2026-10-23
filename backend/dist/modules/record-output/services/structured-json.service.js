"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredJsonService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class StructuredJsonService {
    /**
     * Generates a stable, versioned JSON export schema (v1.0.0).
     * Fully structured for machine-readable hospital integration.
     */
    static generateStructuredJson(params) {
        const { record, provenance, visitId, patientId, excludeSensitiveItems = false } = params;
        // Filter sensitive items if requested or required by visibility scope
        let statements = [...record.statements];
        if (excludeSensitiveItems) {
            statements = statements.filter((s) => !s.section.toLowerCase().includes('sensitive') && !s.text.toLowerCase().includes('confidential'));
        }
        const exportId = `EXP-JSON-${record.id}-v${record.version}`;
        const exportedAt = new Date().toISOString();
        // Generate cryptographic audit signature over exported payload
        const signaturePayload = `${exportId}::${record.id}::v${record.version}::${provenance.confirmedByDoctorId}::${exportedAt}`;
        const auditSignature = crypto_1.default
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
exports.StructuredJsonService = StructuredJsonService;
