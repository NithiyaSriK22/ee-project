"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const documents_repository_js_1 = require("./documents.repository.js");
const validation_gate_service_js_1 = require("./validation/validation-gate.service.js");
const ocr_service_js_1 = require("./ocr/ocr.service.js");
const prisma_js_1 = require("../../database/prisma.js");
const dev_fallback_patient_store_js_1 = require("../patients/dev-fallback-patient-store.js");
const app_error_js_1 = require("../../errors/app-error.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const logger_js_1 = require("../../config/logger.js");
const documents_types_js_1 = require("./documents.types.js");
const redflags_service_js_1 = require("../redflags/redflags.service.js");
const document_storage_service_js_1 = require("./storage/document-storage.service.js");
const doctor_review_repository_js_1 = require("../doctor-review/doctor-review.repository.js");
const doctor_review_types_js_1 = require("../doctor-review/doctor-review.types.js");
const document_summary_service_js_1 = require("../summary/document-summary.service.js");
class DocumentsService {
    /**
     * Resolves the storage base directory relative to the backend project root.
     */
    static getStorageBaseDir() {
        return document_storage_service_js_1.DocumentStorageService.getStorageBaseDir();
    }
    /**
     * Uploads, persists physically to local disk with atomic creation and collision-resistant naming,
     * executes OCR extraction, and immediately runs deterministic validation gate.
     */
    static async uploadAndProcessDocument(visitId, patientId, file, documentType = documents_types_js_1.DocumentTypes.PRESCRIPTION, options) {
        // 0. Validate identifiers against path traversal
        document_storage_service_js_1.DocumentStorageService.validateIdentifier(visitId, 'visitId');
        document_storage_service_js_1.DocumentStorageService.validateIdentifier(patientId, 'patientId');
        // Normalize and validate document type against permitted enum values
        const upperType = (documentType || documents_types_js_1.DocumentTypes.PRESCRIPTION).toUpperCase().trim();
        const validatedType = Object.values(documents_types_js_1.DocumentTypes).includes(upperType)
            ? upperType
            : upperType.includes('ULTRASOUND')
                ? documents_types_js_1.DocumentTypes.ULTRASOUND
                : upperType.includes('XRAY') || upperType.includes('MRI') || upperType.includes('CT')
                    ? documents_types_js_1.DocumentTypes.XRAY_CT_MRI
                    : upperType.includes('NOTE') || upperType.includes('CLINICAL')
                        ? documents_types_js_1.DocumentTypes.CLINICAL_NOTES
                        : documents_types_js_1.DocumentTypes.OTHER;
        // 1. Consent Gate Check (Module 2 Requirement 6)
        let consentRecord = null;
        const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
        if (isDbUp) {
            try {
                consentRecord = await prisma_js_1.prisma.consent.findUnique({
                    where: {
                        patient_id_visit_id_consent_type: {
                            patient_id: patientId,
                            visit_id: visitId,
                            consent_type: auth_types_js_1.ConsentTypes.DOCUMENT_PROCESSING,
                        },
                    },
                });
            }
            catch { }
        }
        if (!consentRecord) {
            const activeConsents = dev_fallback_patient_store_js_1.devFallbackPatientStore.getConsentsForVisit(patientId, visitId);
            consentRecord = activeConsents.find((c) => c.consent_type === auth_types_js_1.ConsentTypes.DOCUMENT_PROCESSING && c.granted) || null;
        }
        if (!consentRecord || !consentRecord.granted) {
            throw new app_error_js_1.ForbiddenError('Patient consent for document digitization & processing is required. Please complete consent step.');
        }
        // 2. File Validation (type, empty check, size & magic bytes signature)
        if (!file.buffer || file.size === 0 || file.buffer.length === 0) {
            throw new app_error_js_1.ValidationError('Uploaded file is empty (0 bytes). Please upload a valid document.');
        }
        if (file.size > 15 * 1024 * 1024 || file.buffer.length > 15 * 1024 * 1024) {
            throw new app_error_js_1.ValidationError('File size exceeds maximum permitted limit of 15MB.');
        }
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
        const normMime = file.mimetype.toLowerCase();
        if (!allowedMimes.includes(normMime)) {
            throw new app_error_js_1.ValidationError(`Unsupported file format: ${file.mimetype}. Permitted formats: JPEG, PNG, WEBP, PDF.`);
        }
        // Magic bytes verification to detect corrupted or spoofed file payloads
        if (normMime === 'application/pdf') {
            const isPdf = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length)).includes('%PDF');
            if (!isPdf) {
                throw new app_error_js_1.ValidationError('Malformed file payload: Content signature does not match PDF format.');
            }
        }
        else if (normMime === 'image/png') {
            const isPng = file.buffer.length >= 4 && file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && file.buffer[2] === 0x4e && file.buffer[3] === 0x47;
            if (!isPng) {
                throw new app_error_js_1.ValidationError('Malformed file payload: Content signature does not match PNG format.');
            }
        }
        else if (normMime === 'image/jpeg' || normMime === 'image/jpg') {
            const isJpeg = file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
            if (!isJpeg) {
                throw new app_error_js_1.ValidationError('Malformed file payload: Content signature does not match JPEG format.');
            }
        }
        else if (normMime === 'image/webp') {
            const isWebp = file.buffer.length >= 12 && file.buffer.toString('utf8', 0, 4) === 'RIFF' && file.buffer.toString('utf8', 8, 12) === 'WEBP';
            if (!isWebp) {
                throw new app_error_js_1.ValidationError('Malformed file payload: Content signature does not match WEBP format.');
            }
        }
        // 3. Physical Storage Persistence with collision-resistant naming & atomic writes
        const stored = await document_storage_service_js_1.DocumentStorageService.saveDocumentBuffer(visitId, file);
        const isImaging = (0, documents_types_js_1.isMedicalImagingDocument)(validatedType);
        let parsedScanDate = null;
        if (options?.scanDate) {
            const d = new Date(options.scanDate);
            if (!isNaN(d.getTime()))
                parsedScanDate = d;
        }
        try {
            if (isImaging) {
                // Document-Specific Processing: Ultrasound Scans & Medical Imaging Files
                // - Stored securely in dedicated storage architecture
                // - Associated with correct patient and visit
                // - Marked for physician review without running ordinary text OCR
                // - AI text summarization bypassed; no clinical interpretation fabricated
                const document = await documents_repository_js_1.DocumentsRepository.createDocument({
                    visitId,
                    patientId,
                    documentType: validatedType,
                    fileName: file.originalname,
                    mimeType: file.mimetype,
                    fileSizeBytes: file.size,
                    storageReference: stored.storageReference,
                    consentVerified: true,
                    ocrStatus: documents_types_js_1.OcrStatuses.NOT_APPLICABLE,
                    overallStatus: documents_types_js_1.DocumentOverallStatuses.NEEDS_PHYSICIAN_REVIEW,
                    ocrErrorMessage: 'Medical imaging scan archived for direct physician visual inspection. Ordinary text OCR bypassed.',
                    scanDate: parsedScanDate,
                    scanType: options?.scanType || null,
                    doctorNotes: options?.doctorNotes || null,
                    metadata: options?.metadata || null,
                });
                logger_js_1.logger.info('Medical imaging document preserved for physician review (ordinary OCR bypassed)', {
                    documentId: document.id,
                    visitId,
                    documentType: validatedType,
                    scanType: options?.scanType,
                    scanDate: parsedScanDate,
                });
                // Ensure visit enters doctor review queue
                doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
                    visitId,
                    department: 'General Medicine',
                    queueStatus: doctor_review_types_js_1.QueueStatuses.READY_FOR_REVIEW,
                    readyAt: new Date(),
                }).catch((err) => {
                    logger_js_1.logger.warn('Failed to update queue entry on imaging upload', { visitId, error: String(err) });
                });
                // Generate safe non-hallucinated imaging summary record
                let individualSummary = null;
                try {
                    individualSummary = await document_summary_service_js_1.DocumentSummaryService.summarizeDocument(document.id);
                    await document_summary_service_js_1.DocumentSummaryService.markCombinedSummaryStale(visitId);
                }
                catch { }
                const refreshedDoc = await documents_repository_js_1.DocumentsRepository.findDocumentById(document.id);
                return {
                    document: refreshedDoc,
                    ocrResult: {
                        success: true,
                        isImaging: true,
                        fieldsExtracted: 0,
                        errorMessage: null,
                        message: 'Medical imaging scan archived for physician visual review. Ordinary text OCR bypassed.',
                    },
                    validationSummary: null,
                    individualSummary,
                };
            }
            // 4. Standard Workflow: Prescriptions, Clinical Notes, Lab Reports, Written Radiology Reports
            const document = await documents_repository_js_1.DocumentsRepository.createDocument({
                visitId,
                patientId,
                documentType: validatedType,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSizeBytes: file.size,
                storageReference: stored.storageReference,
                consentVerified: true,
                ocrStatus: 'PENDING',
                overallStatus: 'PENDING_VALIDATION',
                scanDate: parsedScanDate,
                scanType: options?.scanType || null,
                doctorNotes: options?.doctorNotes || null,
                metadata: options?.metadata || null,
            });
            logger_js_1.logger.info('Document record created for clinical text extraction', {
                documentId: document.id,
                visitId,
                documentType: validatedType,
                fileSize: file.size,
                storageReference: stored.storageReference,
            });
            // 5. OCR Extraction on textual medical documents
            const ocrResult = await ocr_service_js_1.OcrService.processDocument(document.id, file.buffer, file.mimetype);
            // 6. Deterministic Validation Gate Evaluation (if OCR succeeded)
            let validationSummary = null;
            if (ocrResult.success && ocrResult.extractedFields.length > 0) {
                validationSummary = await validation_gate_service_js_1.ValidationGateService.validateDocument(document.id);
                // Incremental Red-Flag Evaluation after document validation (Module 6 Non-blocking hook)
                redflags_service_js_1.RedFlagsService.evaluateVisit(visitId).catch((err) => {
                    logger_js_1.logger.warn('Asynchronous red-flag evaluation caught error on document validation', { visitId, error: String(err) });
                });
            }
            // Ensure visit enters doctor queue as READY_FOR_REVIEW
            doctor_review_repository_js_1.DoctorReviewRepository.upsertQueueEntry({
                visitId,
                department: 'General Medicine',
                queueStatus: doctor_review_types_js_1.QueueStatuses.READY_FOR_REVIEW,
                readyAt: new Date(),
            }).catch((err) => {
                logger_js_1.logger.warn('Failed to update queue entry on document upload', { visitId, error: String(err) });
            });
            // 7. Individual Document Summary Generation & Invalidation of Previous Combined Summary
            let individualSummary = null;
            try {
                individualSummary = await document_summary_service_js_1.DocumentSummaryService.summarizeDocument(document.id);
                await document_summary_service_js_1.DocumentSummaryService.markCombinedSummaryStale(visitId);
            }
            catch (sumErr) {
                logger_js_1.logger.warn('Non-blocking individual document summary generation notice', {
                    documentId: document.id,
                    error: String(sumErr),
                });
            }
            const refreshedDoc = await documents_repository_js_1.DocumentsRepository.findDocumentById(document.id);
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
        }
        catch (unhandledError) {
            // Clean up orphaned file on unhandled failure to maintain storage consistency
            await document_storage_service_js_1.DocumentStorageService.removeFileSafe(stored.absoluteFilePath);
            throw unhandledError;
        }
    }
    /**
     * Retrieves the physical file path and metadata for binary streaming (P1.2 / P1.3)
     */
    static async getDocumentFile(documentId, visitId) {
        document_storage_service_js_1.DocumentStorageService.validateIdentifier(documentId, 'documentId');
        if (visitId) {
            document_storage_service_js_1.DocumentStorageService.validateIdentifier(visitId, 'visitId');
        }
        const document = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
        if (!document) {
            throw new app_error_js_1.NotFoundError(`Document not found: ${documentId}`);
        }
        // Per-visit isolation ownership enforcement (if visitId provided)
        if (visitId && document.visit_id !== visitId) {
            throw new app_error_js_1.ForbiddenError('Access denied: You cannot view documents from another visit session.');
        }
        // Resolve file path strictly within storage boundary
        const resolvedPath = document_storage_service_js_1.DocumentStorageService.resolveDocumentFile(document.storage_reference);
        if (!resolvedPath) {
            throw new app_error_js_1.NotFoundError(`Physical document file not found on disk at storage reference: ${document.storage_reference}`);
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
    static async getDocumentStatus(documentId, visitId) {
        const document = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
        if (!document) {
            throw new app_error_js_1.NotFoundError(`Document not found: ${documentId}`);
        }
        // Per-visit isolation ownership enforcement
        if (document.visit_id !== visitId) {
            throw new app_error_js_1.ForbiddenError('Access denied: You cannot view documents from another visit session.');
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
    static async getValidatedFields(documentId, visitId) {
        const document = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
        if (!document) {
            throw new app_error_js_1.NotFoundError(`Document not found: ${documentId}`);
        }
        // Per-visit isolation ownership enforcement
        if (document.visit_id !== visitId) {
            throw new app_error_js_1.ForbiddenError('Access denied: You cannot view documents from another visit session.');
        }
        return {
            documentId: document.id,
            documentType: document.document_type,
            overallStatus: document.overall_status,
            ocrStatus: document.ocr_status,
            uploadedAt: document.uploaded_at,
            fields: (document.validated_fields || []).map((f) => ({
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
    static async revalidate(documentId, visitId) {
        const document = await documents_repository_js_1.DocumentsRepository.findDocumentById(documentId);
        if (!document) {
            throw new app_error_js_1.NotFoundError(`Document not found: ${documentId}`);
        }
        if (document.visit_id !== visitId) {
            throw new app_error_js_1.ForbiddenError('Access denied: You cannot modify documents from another visit session.');
        }
        return validation_gate_service_js_1.ValidationGateService.revalidateDocument(documentId);
    }
    static async listVisitDocuments(visitId) {
        return documents_repository_js_1.DocumentsRepository.findDocumentsByVisitId(visitId);
    }
    // ============================================================================
    // DOWNSTREAM MODULE 5 INTEGRATION CONTRACT
    // ============================================================================
    /**
     * Retrieves all verified & validated document fields for a visit,
     * ready to be consumed safely by Module 5 (AI Summarization).
     */
    static async getValidatedDocumentFieldsForVisit(visitId) {
        const documents = await documents_repository_js_1.DocumentsRepository.findValidatedFieldsByVisitId(visitId);
        return documents.map((doc) => ({
            documentId: doc.id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            overallStatus: doc.overall_status,
            uploadedAt: doc.uploaded_at,
            validatedFields: (doc.validated_fields || []).map((f) => ({
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
exports.DocumentsService = DocumentsService;
