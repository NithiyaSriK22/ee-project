"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const documents_repository_js_1 = require("./documents.repository.js");
const validation_gate_service_js_1 = require("./validation/validation-gate.service.js");
const ocr_service_js_1 = require("./ocr/ocr.service.js");
const prisma_js_1 = require("../../database/prisma.js");
const app_error_js_1 = require("../../errors/app-error.js");
const logger_js_1 = require("../../config/logger.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const documents_types_js_1 = require("./documents.types.js");
const redflags_service_js_1 = require("../redflags/redflags.service.js");
class DocumentsService {
    /**
     * Uploads, executes OCR extraction, and immediately runs deterministic validation gate
     */
    static async uploadAndProcessDocument(visitId, patientId, file, documentType = documents_types_js_1.DocumentTypes.PRESCRIPTION) {
        // 1. Consent Gate Check (Module 2 Requirement 6)
        const consentRecord = await prisma_js_1.prisma.consent.findUnique({
            where: {
                patient_id_visit_id_consent_type: {
                    patient_id: patientId,
                    visit_id: visitId,
                    consent_type: auth_types_js_1.ConsentTypes.DOCUMENT_PROCESSING,
                },
            },
        });
        if (!consentRecord || !consentRecord.granted) {
            throw new app_error_js_1.ForbiddenError('Patient consent for document digitization & processing is required. Please complete consent step.');
        }
        // 2. File Validation (type & size)
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
        if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
            throw new app_error_js_1.ValidationError(`Unsupported file format: ${file.mimetype}. Permitted formats: JPEG, PNG, WEBP, PDF.`);
        }
        if (file.size > 15 * 1024 * 1024) {
            throw new app_error_js_1.ValidationError('File size exceeds maximum permitted limit of 15MB.');
        }
        // 3. Generate Object Storage Reference
        const storageRef = `storage/documents/${visitId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        // 4. Create Document Record
        const document = await documents_repository_js_1.DocumentsRepository.createDocument({
            visitId,
            patientId,
            documentType,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSizeBytes: file.size,
            storageReference: storageRef,
            consentVerified: true,
        });
        logger_js_1.logger.info('Document uploaded at kiosk', {
            documentId: document.id,
            visitId,
            documentType,
            fileSize: file.size,
        });
        // 5. OCR Extraction
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
        const refreshedDoc = await documents_repository_js_1.DocumentsRepository.findDocumentById(document.id);
        return {
            document: refreshedDoc,
            ocrResult: {
                success: ocrResult.success,
                fieldsExtracted: ocrResult.extractedFields.length,
                errorMessage: ocrResult.errorMessage,
            },
            validationSummary,
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
            rawFieldsCount: document.raw_fields.length,
            validatedFieldsCount: document.validated_fields.length,
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
            fields: document.validated_fields.map((f) => ({
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
            validatedFields: doc.validated_fields.map((f) => ({
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
