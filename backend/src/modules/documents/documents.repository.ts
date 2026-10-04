import { prisma } from '../../database/prisma.js';

export class DocumentsRepository {
  public static async createDocument(data: {
    visitId: string;
    patientId: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    storageReference: string;
    consentVerified: boolean;
  }) {
    return prisma.uploadedDocument.create({
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

  public static async findDocumentById(id: string) {
    return prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        raw_fields: true,
        validated_fields: {
          orderBy: { is_critical: 'desc' },
        },
      },
    });
  }

  public static async findDocumentsByVisitId(visitId: string) {
    return prisma.uploadedDocument.findMany({
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

  public static async findValidatedFieldsByVisitId(visitId: string) {
    return prisma.uploadedDocument.findMany({
      where: { visit_id: visitId },
      include: {
        validated_fields: {
          orderBy: [{ is_critical: 'desc' }, { created_at: 'asc' }],
        },
      },
    });
  }
}
