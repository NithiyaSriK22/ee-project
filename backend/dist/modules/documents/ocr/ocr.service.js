"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const ocr_provider_adapter_js_1 = require("./ocr-provider-adapter.js");
const prisma_js_1 = require("../../../database/prisma.js");
const logger_js_1 = require("../../../config/logger.js");
const documents_types_js_1 = require("../documents.types.js");
class OcrService {
    static provider = new ocr_provider_adapter_js_1.StandardClinicalOcrProvider();
    static setProvider(newProvider) {
        this.provider = newProvider;
    }
    /**
     * Processes a document through OCR extraction and creates raw extracted field records
     */
    static async processDocument(documentId, fileBuffer, mimeType) {
        logger_js_1.logger.info('Starting OCR extraction for document', { documentId });
        try {
            const result = await this.provider.extractText(fileBuffer, mimeType);
            if (!result.success || result.extractedFields.length === 0) {
                await prisma_js_1.prisma.uploadedDocument.update({
                    where: { id: documentId },
                    data: {
                        ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                        ocr_error_message: result.errorMessage || 'OCR extraction produced no usable text.',
                        overall_status: 'EXTRACTION_FAILED',
                    },
                });
                logger_js_1.logger.warn('OCR extraction failed for document', {
                    documentId,
                    reason: result.errorMessage,
                });
                return result;
            }
            // Save raw extracted fields into database
            await prisma_js_1.prisma.$transaction(result.extractedFields.map((f) => prisma_js_1.prisma.rawExtractedField.create({
                data: {
                    document_id: documentId,
                    field_type: f.fieldType,
                    raw_text: f.rawText,
                    ocr_confidence: f.confidence,
                    source_snippet_ref: f.sourceSnippetRef,
                    bounding_box: f.boundingBox || undefined,
                },
            })));
            await prisma_js_1.prisma.uploadedDocument.update({
                where: { id: documentId },
                data: {
                    ocr_status: documents_types_js_1.OcrStatuses.COMPLETED,
                    ocr_error_message: null,
                },
            });
            logger_js_1.logger.info('OCR extraction completed and raw fields saved', {
                documentId,
                fieldsCount: result.extractedFields.length,
            });
            return result;
        }
        catch (error) {
            await prisma_js_1.prisma.uploadedDocument.update({
                where: { id: documentId },
                data: {
                    ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                    ocr_error_message: error.message || 'Unexpected OCR service exception.',
                    overall_status: 'EXTRACTION_FAILED',
                },
            });
            logger_js_1.logger.error('OCR processing exception', {
                documentId,
                error: error.message,
            });
            return {
                success: false,
                extractedFields: [],
                fullText: '',
                pageCount: 0,
                errorMessage: error.message,
            };
        }
    }
}
exports.OcrService = OcrService;
