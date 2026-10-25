import { DocumentsRepository } from './documents.repository.js';
import { ValidationGateService } from './validation/validation-gate.service.js';
import { OcrService } from './ocr/ocr.service.js';
import { prisma, checkDatabaseHealth } from '../../database/prisma.js';
import { devFallbackPatientStore } from '../patients/dev-fallback-patient-store.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { ConsentTypes } from '../../types/auth.types.js';
import { DocumentTypes } from './documents.types.js';
import { RedFlagsService } from '../redflags/redflags.service.js';
import { DocumentStorageService } from './storage/document-storage.service.js';
import { DoctorReviewRepository } from '../doctor-review/doctor-review.repository.js';
import { QueueStatuses } from '../doctor-review/doctor-review.types.js';
import { DocumentSummaryService } from '../summary/document-summary.service.js';

export class DocumentsService {
  /**
   * Resolves the storage base directory relative to the backend project root.
   */
  public static getStorageBaseDir(): string {
    return DocumentStorageService.getStorageBaseDir();
  }

  /**
   * Uploads, persists physically to local disk with atomic creation and collision-resistant naming,
   * executes OCR extraction, and immediately runs deterministic validation gate.
   */
  public static async uploadAndProcessDocument(
    visitId: string,
    patientId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    documentType: string = DocumentTypes.PRESCRIPTION
  ) {
    // 0. Validate identifiers against path traversal
    DocumentStorageService.validateIdentifier(visitId, 'visitId');
    DocumentStorageService.validateIdentifier(patientId, 'patientId');

    // 1. Consent Gate Check (Module 2 Requirement 6)
    let consentRecord = null;
    const isDbUp = await checkDatabaseHealth();
    if (isDbUp) {
      try {
        consentRecord = await prisma.consent.findUnique({
          where: {
            patient_id_visit_id_consent_type: {
              patient_id: patientId,
              visit_id: visitId,
              consent_type: ConsentTypes.DOCUMENT_PROCESSING,
            },
          },
        });
      } catch {}
    }

    if (!consentRecord) {
      const activeConsents = devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
      consentRecord = activeConsents.find(
        (c) => c.consent_type === ConsentTypes.DOCUMENT_PROCESSING && c.granted
      ) || null;
    }

    if (!consentRecord || !consentRecord.granted) {
      throw new ForbiddenError(
        'Patient consent for document digitization & processing is required. Please complete consent step.'
      );
    }

    // 2. File Validation (type, empty check, size & magic bytes signature)
    if (!file.buffer || file.size === 0 || file.buffer.length === 0) {
      throw new ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
    }

    if (file.size > 15 * 1024 * 1024 || file.buffer.length > 15 * 1024 * 1024) {
      throw new ValidationError('File size exceeds maximum permitted limit of 15MB.');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    const normMime = file.mimetype.toLowerCase();
    if (!allowedMimes.includes(normMime)) {
      throw new ValidationError(
        `Unsupported file format: ${file.mimetype}. Permitted formats: JPEG, PNG, WEBP, PDF.`
      );
    }

    // Magic bytes verification to detect corrupted or spoofed file payloads
    if (normMime === 'application/pdf') {
      const isPdf = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length)).includes('%PDF');
      if (!isPdf) {
        throw new ValidationError('Malformed file payload: Content signature does not match PDF format.');
      }
    } else if (normMime === 'image/png') {
      const isPng = file.buffer.length >= 4 && file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && file.buffer[2] === 0x4e && file.buffer[3] === 0x47;
      if (!isPng) {
        throw new ValidationError('Malformed file payload: Content signature does not match PNG format.');
      }
    } else if (normMime === 'image/jpeg' || normMime === 'image/jpg') {
      const isJpeg = file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
      if (!isJpeg) {
        throw new ValidationError('Malformed file payload: Content signature does not match JPEG format.');
      }
    } else if (normMime === 'image/webp') {
      const isWebp = file.buffer.length >= 12 && file.buffer.toString('utf8', 0, 4) === 'RIFF' && file.buffer.toString('utf8', 8, 12) === 'WEBP';
      if (!isWebp) {
        throw new ValidationError('Malformed file payload: Content signature does not match WEBP format.');
      }
    }

    // 3. Physical Storage Persistence with collision-resistant naming & atomic writes
    const stored = await DocumentStorageService.saveDocumentBuffer(visitId, file);

    try {
      // 4. Create Document Record
      const document = await DocumentsRepository.createDocument({
        visitId,
        patientId,
        documentType,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        storageReference: stored.storageReference,
        consentVerified: true,
      });

      logger.info('Document record created', {
        documentId: document.id,
        visitId,
        documentType,
        fileSize: file.size,
        storageReference: stored.storageReference,
      });

      // 5. OCR Extraction
      const ocrResult = await OcrService.processDocument(document.id, file.buffer, file.mimetype);

      // 6. Deterministic Validation Gate Evaluation (if OCR succeeded)
      let validationSummary = null;
      if (ocrResult.success && ocrResult.extractedFields.length > 0) {
        validationSummary = await ValidationGateService.validateDocument(document.id);

        // Incremental Red-Flag Evaluation after document validation (Module 6 Non-blocking hook)
        RedFlagsService.evaluateVisit(visitId).catch((err) => {
          logger.warn('Asynchronous red-flag evaluation caught error on document validation', { visitId, error: String(err) });
        });
      }

      // Ensure visit enters doctor queue as READY_FOR_REVIEW
      DoctorReviewRepository.upsertQueueEntry({
        visitId,
        department: 'General Medicine',
        queueStatus: QueueStatuses.READY_FOR_REVIEW,
        readyAt: new Date(),
      }).catch((err) => {
        logger.warn('Failed to update queue entry on document upload', { visitId, error: String(err) });
      });

      // 7. Individual Document Summary Generation & Invalidation of Previous Combined Summary
      let individualSummary = null;
      try {
        individualSummary = await DocumentSummaryService.summarizeDocument(document.id);
        await DocumentSummaryService.markCombinedSummaryStale(visitId);
      } catch (sumErr) {
        logger.warn('Non-blocking individual document summary generation notice', {
          documentId: document.id,
          error: String(sumErr),
        });
      }

      const refreshedDoc = await DocumentsRepository.findDocumentById(document.id);

      return {
        document: refreshedDoc,
        ocrResult: {
          success: ocrResult.success,
          fieldsExtracted: ocrResult.extractedFields.length,
          errorMessage: ocrResult.errorMessage,
        },
        validationSummary,
        individualSummary,
      };
    } catch (unhandledError) {
      // Clean up orphaned file on unhandled failure to maintain storage consistency
      await DocumentStorageService.removeFileSafe(stored.absoluteFilePath);
      throw unhandledError;
    }
  }

  /**
   * Retrieves the physical file path and metadata for binary streaming (P1.2 / P1.3)
   */
  public static async getDocumentFile(documentId: string, visitId?: string) {
    DocumentStorageService.validateIdentifier(documentId, 'documentId');
    if (visitId) {
      DocumentStorageService.validateIdentifier(visitId, 'visitId');
    }

    const document = await DocumentsRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Per-visit isolation ownership enforcement (if visitId provided)
    if (visitId && document.visit_id !== visitId) {
      throw new ForbiddenError('Access denied: You cannot view documents from another visit session.');
    }

    // Resolve file path strictly within storage boundary
    const resolvedPath = DocumentStorageService.resolveDocumentFile(document.storage_reference);
    if (!resolvedPath) {
      throw new NotFoundError(
        `Physical document file not found on disk at storage reference: ${document.storage_reference}`
      );
    }

    return {
      filePath: resolvedPath,
      fileName: document.file_name,
      mimeType: document.mime_type,
      fileSizeBytes: document.file_size_bytes,
      documentId: document.id,
      visitId: document.visit_id,
    };
  }

  public static async getDocumentStatus(documentId: string, visitId: string) {
    const document = await DocumentsRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Per-visit isolation ownership enforcement
    if (document.visit_id !== visitId) {
      throw new ForbiddenError('Access denied: You cannot view documents from another visit session.');
    }

    return {
      documentId: document.id,
      visitId: document.visit_id,
      documentType: document.document_type,
      fileName: document.file_name,
      ocrStatus: document.ocr_status,
      overallStatus: document.overall_status,
      uploadedAt: document.uploaded_at,
      rawFieldsCount: document.raw_fields?.length || 0,
      validatedFieldsCount: document.validated_fields?.length || 0,
    };
  }

  public static async getValidatedFields(documentId: string, visitId: string) {
    const document = await DocumentsRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Per-visit isolation ownership enforcement
    if (document.visit_id !== visitId) {
      throw new ForbiddenError('Access denied: You cannot view documents from another visit session.');
    }

    return {
      documentId: document.id,
      documentType: document.document_type,
      overallStatus: document.overall_status,
      ocrStatus: document.ocr_status,
      uploadedAt: document.uploaded_at,
      fields: (document.validated_fields || []).map((f: any) => ({
        id: f.id,
        fieldType: f.field_type,
        result: f.result,
        evalState: f.eval_state,
        isCritical: f.is_critical,
        matchedReferenceValue: f.matched_reference_value,
        matchScore: f.match_score,
        ocrConfidence: f.ocr_confidence,
        explanation: f.explanation,
        formularyVersion: f.formulary_version,
        evaluatedAt: f.evaluated_at,
      })),
    };
  }

  public static async revalidate(documentId: string, visitId: string) {
    const document = await DocumentsRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    if (document.visit_id !== visitId) {
      throw new ForbiddenError('Access denied: You cannot modify documents from another visit session.');
    }

    return ValidationGateService.revalidateDocument(documentId);
  }

  public static async listVisitDocuments(visitId: string) {
    return DocumentsRepository.findDocumentsByVisitId(visitId);
  }

  // ============================================================================
  // DOWNSTREAM MODULE 5 INTEGRATION CONTRACT
  // ============================================================================

  /**
   * Retrieves all verified & validated document fields for a visit,
   * ready to be consumed safely by Module 5 (AI Summarization).
   */
  public static async getValidatedDocumentFieldsForVisit(visitId: string) {
    const documents = await DocumentsRepository.findValidatedFieldsByVisitId(visitId);

    return documents.map((doc: any) => ({
      documentId: doc.id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      overallStatus: doc.overall_status,
      uploadedAt: doc.uploaded_at,
      validatedFields: (doc.validated_fields || []).map((f: any) => ({
        id: f.id,
        fieldType: f.field_type,
        isCritical: f.is_critical,
        result: f.result,
        evalState: f.eval_state,
        matchedReferenceValue: f.matched_reference_value,
        matchScore: f.match_score,
        ocrConfidence: f.ocr_confidence,
        explanation: f.explanation,
        formularyVersion: f.formulary_version,
        evaluatedAt: f.evaluated_at,
      })),
    }));
  }
}
