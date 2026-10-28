"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const ocr_provider_adapter_js_1 = require("./ocr-provider-adapter.js");
const prisma_js_1 = require("../../../database/prisma.js");
const logger_js_1 = require("../../../config/logger.js");
const documents_types_js_1 = require("../documents.types.js");
const documents_repository_js_1 = require("../documents.repository.js");
const digital_document_extractor_service_js_1 = require("../digital/digital-document-extractor.service.js");
class OcrService {
    static provider = ocr_provider_adapter_js_1.OcrProviderFactory.getDefaultProvider();
    static setProvider(newProvider) {
        this.provider = newProvider;
    }
    static getProvider() {
        return this.provider;
    }
    /**
     * Processes a document through digital text extraction (native PDF parsing first) or OCR
     */
    static async processDocument(documentId, fileBuffer, mimeType) {
        logger_js_1.logger.info('Starting digital/OCR extraction for document', { documentId, mimeType });
        const isPdf = mimeType === 'application/pdf' ||
            (fileBuffer?.length >= 5 && fileBuffer.slice(0, 5).toString() === '%PDF-');
        // 1. Prioritize Native Digital PDF Text Extraction (Digital Documents Only)
        if (isPdf) {
            try {
                const digitalResult = await digital_document_extractor_service_js_1.DigitalDocumentExtractorService.extractFromPdf(fileBuffer);
                if (digitalResult.success && digitalResult.extractedFields.length > 0) {
                    const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
                    if (isDbUp) {
                        try {
                            await prisma_js_1.prisma.$transaction(digitalResult.extractedFields.map((f) => prisma_js_1.prisma.rawExtractedField.create({
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
                                    overall_status: 'PENDING_VALIDATION',
                                },
                            });
                        }
                        catch (dbErr) {
                            logger_js_1.logger.warn('Failed to persist digital PDF fields to DB', { error: String(dbErr) });
                        }
                    }
                    await documents_repository_js_1.DocumentsRepository.updateDocument(documentId, {
                        ocr_status: documents_types_js_1.OcrStatuses.COMPLETED,
                        ocr_error_message: null,
                        overall_status: 'PENDING_VALIDATION',
                    });
                    return {
                        success: true,
                        extractedFields: digitalResult.extractedFields,
                        fullText: digitalResult.fullText,
                        pageCount: digitalResult.pageCount,
                        extractionStatus: 'SUCCESSFUL',
                        engineUsed: 'NativePdfDigitalExtractor',
                    };
                }
            }
            catch (pdfErr) {
                logger_js_1.logger.warn('Native PDF extraction failed, proceeding to fallback provider', { error: String(pdfErr) });
            }
        }
        // 2. OCR Provider for Images or Scanned PDFs
        try {
            const result = await this.provider.extractText(fileBuffer, mimeType);
            const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
            if (!result.success || result.extractedFields.length === 0) {
                const failureMessage = result.errorMessage ||
                    'Digital text could not be extracted. Please upload a text-based PDF or another supported digital document.';
                if (isDbUp) {
                    try {
                        await prisma_js_1.prisma.uploadedDocument.update({
                            where: { id: documentId },
                            data: {
                                ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                                ocr_error_message: failureMessage,
                                overall_status: 'EXTRACTION_FAILED',
                            },
                        });
                    }
                    catch { }
                }
                await documents_repository_js_1.DocumentsRepository.updateDocument(documentId, {
                    ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                    ocr_error_message: failureMessage,
                    overall_status: 'EXTRACTION_FAILED',
                });
                logger_js_1.logger.warn('Document extraction failed', {
                    documentId,
                    reason: failureMessage,
                });
                return {
                    ...result,
                    errorMessage: failureMessage,
                };
            }
            const isPartial = result.extractionStatus === 'PARTIALLY_SUCCESSFUL';
            const determinedOcrStatus = isPartial ? documents_types_js_1.OcrStatuses.PARTIALLY_SUCCESSFUL : documents_types_js_1.OcrStatuses.COMPLETED;
            const determinedOverallStatus = isPartial ? 'PARTIALLY_VERIFIED' : 'PENDING_VALIDATION';
            // Save raw extracted fields into database if accessible
            if (isDbUp) {
                try {
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
                            ocr_status: determinedOcrStatus,
                            ocr_error_message: isPartial ? result.errorMessage : null,
                            overall_status: determinedOverallStatus,
                        },
                    });
                }
                catch (dbErr) {
                    logger_js_1.logger.warn('Error saving OCR raw fields to DB, falling back to repository', { error: String(dbErr) });
                }
            }
            // Update in-memory fallback
            await documents_repository_js_1.DocumentsRepository.updateDocument(documentId, {
                ocr_status: determinedOcrStatus,
                ocr_error_message: isPartial ? result.errorMessage : null,
                overall_status: determinedOverallStatus,
                raw_fields: result.extractedFields.map((f, idx) => ({
                    id: `raw-${documentId}-${idx}`,
                    document_id: documentId,
                    field_type: f.fieldType,
                    raw_text: f.rawText,
                    ocr_confidence: f.confidence,
                    source_snippet_ref: f.sourceSnippetRef,
                    bounding_box: f.boundingBox,
                })),
            });
            logger_js_1.logger.info('OCR extraction completed and raw fields saved', {
                documentId,
                fieldsCount: result.extractedFields.length,
                status: determinedOcrStatus,
            });
            return result;
        }
        catch (error) {
            const isDbUp = await (0, prisma_js_1.checkDatabaseHealth)();
            if (isDbUp) {
                try {
                    await prisma_js_1.prisma.uploadedDocument.update({
                        where: { id: documentId },
                        data: {
                            ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                            ocr_error_message: error.message || 'Unexpected OCR service exception.',
                            overall_status: 'EXTRACTION_FAILED',
                        },
                    });
                }
                catch { }
            }
            await documents_repository_js_1.DocumentsRepository.updateDocument(documentId, {
                ocr_status: documents_types_js_1.OcrStatuses.FAILED,
                ocr_error_message: error.message || 'Unexpected OCR service exception.',
                overall_status: 'EXTRACTION_FAILED',
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
