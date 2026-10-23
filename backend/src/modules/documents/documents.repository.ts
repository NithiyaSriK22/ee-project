import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { DocumentStorageService } from './storage/document-storage.service.js';
import { logger } from '../../config/logger.js';
import { toUuid, isUuid } from '../../utils/uuid.util.js';

// In-memory cache for fast access & resilient fallback
const memoryDocuments = new Map<string, any>();
const memoryVisitDocuments = new Map<string, any[]>();

export class DocumentsRepository {
  /**
   * Searches disk for document metadata JSON if not present in memory cache.
   */
  private static async searchDiskForDocument(docId: string): Promise<any | null> {
    try {
      const base = DocumentStorageService.getStorageBaseDir();
      if (!fs.existsSync(base)) return null;
      const dirs = await fs.promises.readdir(base);
      for (const d of dirs) {
        const metaFile = path.join(base, d, `${docId}.meta.json`);
        if (fs.existsSync(metaFile)) {
          const content = await fs.promises.readFile(metaFile, 'utf8');
          const parsed = JSON.parse(content);
          memoryDocuments.set(docId, parsed);
          return parsed;
        }
      }
    } catch {}
    return null;
  }

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
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const created = await prisma.uploadedDocument.create({
          data: {
            visit_id: data.visitId,
            patient_id: toUuid(data.patientId),
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
        memoryDocuments.set(created.id, created);
        const list = memoryVisitDocuments.get(data.visitId) || [];
        list.unshift(created);
        memoryVisitDocuments.set(data.visitId, list);
        // Also persist metadata manifest to disk for offline resilience
        await DocumentStorageService.saveDocumentMetadata(data.visitId, created);
        return created;
      } catch (dbErr: any) {
        logger.error('Failed to create uploadedDocument in database', { error: dbErr?.message, visitId: data.visitId });
        throw dbErr;
      }
    }

    const doc = {
      id: crypto.randomUUID(),
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
      ocr_error_message: null,
      uploaded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      raw_fields: [],
      validated_fields: [],
    };
    memoryDocuments.set(doc.id, doc);

    const list = memoryVisitDocuments.get(data.visitId) || [];
    list.unshift(doc);
    memoryVisitDocuments.set(data.visitId, list);

    // Save durable local metadata file to disk
    await DocumentStorageService.saveDocumentMetadata(data.visitId, doc);

    return doc;
  }

  public static async findDocumentById(id: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp && isUuid(id)) {
      try {
        const doc = await prisma.uploadedDocument.findUnique({
          where: { id },
          include: {
            raw_fields: true,
            validated_fields: {
              orderBy: { is_critical: 'desc' },
            },
          },
        });
        if (doc) return doc;
      } catch {}
    }

    const cached = memoryDocuments.get(id);
    if (cached) return cached;

    // Search disk for persisted metadata
    return this.searchDiskForDocument(id);
  }

  public static async findDocumentsByVisitId(visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const dbDocs = await prisma.uploadedDocument.findMany({
          where: { visit_id: visitId },
          orderBy: { created_at: 'desc' },
          include: {
            _count: {
              select: { raw_fields: true, validated_fields: true },
            },
            validated_fields: true,
          },
        });
        if (dbDocs && dbDocs.length > 0) {
          return dbDocs;
        }
      } catch {}
    }

    const memoryList = memoryVisitDocuments.get(visitId);
    if (memoryList && memoryList.length > 0) {
      return memoryList;
    }

    // Load from durable disk metadata
    const diskList = await DocumentStorageService.listVisitDocumentMetadata(visitId);
    if (diskList.length > 0) {
      memoryVisitDocuments.set(visitId, diskList);
      for (const d of diskList) {
        memoryDocuments.set(d.id, d);
      }
      return diskList;
    }

    return [];
  }

  public static async findValidatedFieldsByVisitId(visitId: string) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        return await prisma.uploadedDocument.findMany({
          where: { visit_id: visitId },
          include: {
            validated_fields: {
              orderBy: [{ is_critical: 'desc' }, { created_at: 'asc' }],
            },
          },
        });
      } catch {}
    }

    const docs = await this.findDocumentsByVisitId(visitId);
    return docs.map((d: any) => ({
      ...d,
      validated_fields: d.validated_fields || [],
    }));
  }

  public static async updateDocument(
    id: string,
    data: Partial<{
      ocr_status: string;
      ocr_error_message: string | null;
      overall_status: string;
      raw_fields: any[];
      validated_fields: any[];
    }>
  ) {
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        const updateData: any = {};
        if (data.ocr_status !== undefined) updateData.ocr_status = data.ocr_status;
        if (data.ocr_error_message !== undefined) updateData.ocr_error_message = data.ocr_error_message;
        if (data.overall_status !== undefined) updateData.overall_status = data.overall_status;

        const updated = await prisma.uploadedDocument.update({
          where: { id },
          data: updateData,
          include: { raw_fields: true, validated_fields: true },
        });
        memoryDocuments.set(id, updated);
        await DocumentStorageService.saveDocumentMetadata(updated.visit_id, updated);
        return updated;
      } catch {}
    }

    let doc = memoryDocuments.get(id);
    if (!doc) {
      doc = await this.searchDiskForDocument(id);
    }

    if (doc) {
      Object.assign(doc, data);
      doc.updated_at = new Date();
      memoryDocuments.set(id, doc);
      await DocumentStorageService.saveDocumentMetadata(doc.visit_id, doc);
      return doc;
    }
    return null;
  }
}
