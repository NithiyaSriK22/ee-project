"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsRepository = void 0;
const prisma_js_1 = require("../../database/prisma.js");
class DocumentsRepository {
    static async createDocument(data) {
        return prisma_js_1.prisma.uploadedDocument.create({
            data: {
                visit_id: data.visitId,
                patient_id: data.patientId,
                document_type: data.documentType,
                file_name: data.fileName,
                mime_type: data.mimeType,
                file_size_bytes: data.fileSizeBytes,
                storage_reference: data.storageReference,
                consent_verified: data.consentVerified,
                ocr_status: 'PENDING',
                overall_status: 'PENDING_VALIDATION',
            },
        });
    }
    static async findDocumentById(id) {
        return prisma_js_1.prisma.uploadedDocument.findUnique({
            where: { id },
            include: {
                raw_fields: true,
                validated_fields: {
                    orderBy: { is_critical: 'desc' },
                },
            },
        });
    }
    static async findDocumentsByVisitId(visitId) {
        return prisma_js_1.prisma.uploadedDocument.findMany({
            where: { visit_id: visitId },
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: { raw_fields: true, validated_fields: true },
                },
                validated_fields: true,
            },
        });
    }
    static async findValidatedFieldsByVisitId(visitId) {
        return prisma_js_1.prisma.uploadedDocument.findMany({
            where: { visit_id: visitId },
            include: {
                validated_fields: {
                    orderBy: [{ is_critical: 'desc' }, { created_at: 'asc' }],
                },
            },
        });
    }
}
exports.DocumentsRepository = DocumentsRepository;
