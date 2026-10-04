"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationGateService = void 0;
const prisma_js_1 = require("../../../database/prisma.js");
const formulary_repository_js_1 = require("../formulary/formulary.repository.js");
const field_check_evaluator_js_1 = require("./field-check-evaluator.js");
const app_error_js_1 = require("../../../errors/app-error.js");
const logger_js_1 = require("../../../config/logger.js");
const documents_types_js_1 = require("../documents.types.js");
class ValidationGateService {
    /**
     * Deterministically validates an uploaded document and persists validated field records
     */
    static async validateDocument(documentId) {
        const document = await prisma_js_1.prisma.uploadedDocument.findUnique({
            where: { id: documentId },
            include: {
                raw_fields: true,
            },
        });
        if (!document) {
            throw new app_error_js_1.NotFoundError(`Uploaded document not found: ${documentId}`);
        }
        if (!document.consent_verified) {
            throw new app_error_js_1.ForbiddenError('Document processing consent is required to validate clinical documents.');
        }
        if (document.ocr_status === documents_types_js_1.OcrStatuses.FAILED) {
            throw new app_error_js_1.ValidationError(`Cannot validate document: OCR extraction failed (${document.ocr_error_message || 'Unreadable'}).`);
        }
        if (document.ocr_status === documents_types_js_1.OcrStatuses.PENDING) {
            throw new app_error_js_1.ValidationError('Document is still pending OCR extraction. Please wait.');
        }
        // 1. Retrieve Active Formulary & Reference Datasets
        const formularyDataset = await formulary_repository_js_1.FormularyRepository.getActiveFormularyDataset();
        // 2. Prepare normalized raw field inputs
        const rawInputs = document.raw_fields.map((rf) => ({
            id: rf.id,
            fieldType: rf.field_type,
            rawText: rf.raw_text,
            ocrConfidence: rf.ocr_confidence,
            sourceSnippetRef: rf.source_snippet_ref,
            boundingBox: rf.bounding_box,
        }));
        // 3. Run Pure Deterministic Evaluation
        const validationSummary = field_check_evaluator_js_1.FieldCheckEvaluator.evaluateDocument(document.id, document.document_type, rawInputs, formularyDataset);
        // 4. Persist ValidatedField records and update document overall status
        await prisma_js_1.prisma.$transaction(async (tx) => {
            // Clear existing validation results for this document if any (point-in-time update)
            await tx.validatedField.deleteMany({
                where: { document_id: document.id },
            });
            // Insert new evaluated fields
            for (const field of validationSummary.fields) {
                await tx.validatedField.create({
                    data: {
                        document_id: document.id,
                        raw_field_id: field.rawFieldId || undefined,
                        formulary_version_id: formularyDataset.versionId,
                        field_type: field.fieldType,
                        is_critical: field.isCritical,
                        result: field.result,
                        eval_state: field.evalState,
                        matched_reference_value: field.matchedReferenceValue || null,
                        match_score: field.matchScore || null,
                        ocr_confidence: field.ocrConfidence,
                        explanation: field.explanation,
                        formulary_version: formularyDataset.versionCode,
                        evaluated_at: validationSummary.evaluatedAt,
                    },
                });
            }
            // Update document rollup status
            await tx.uploadedDocument.update({
                where: { id: document.id },
                data: {
                    overall_status: validationSummary.overallStatus,
                },
            });
        });
        logger_js_1.logger.info('Document validation completed deterministically', {
            documentId: document.id,
            overallStatus: validationSummary.overallStatus,
            formularyVersion: formularyDataset.versionCode,
            verifiedCount: validationSummary.verifiedCount,
            flaggedCount: validationSummary.mismatchFlaggedCount + validationSummary.unverifiedCount,
        });
        return validationSummary;
    }
    /**
     * Re-validates a document with current reference datasets (for audit / updated formulary)
     */
    static async revalidateDocument(documentId) {
        logger_js_1.logger.info('Re-validating document against latest reference dataset', { documentId });
        return this.validateDocument(documentId);
    }
}
exports.ValidationGateService = ValidationGateService;
