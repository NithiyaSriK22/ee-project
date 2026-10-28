import {
  IOcrProvider,
  OcrProviderFactory,
  OcrExtractionResult,
} from './ocr-provider-adapter.js';
import { prisma, checkDatabaseHealth } from '../../../database/prisma.js';
import { logger } from '../../../config/logger.js';
import { OcrStatuses } from '../documents.types.js';
import { DocumentsRepository } from '../documents.repository.js';
import { DigitalDocumentExtractorService } from '../digital/digital-document-extractor.service.js';

export class OcrService {
  private static provider: IOcrProvider = OcrProviderFactory.getDefaultProvider();

  public static setProvider(newProvider: IOcrProvider) {
    this.provider = newProvider;
  }

  public static getProvider(): IOcrProvider {
    return this.provider;
  }

  /**
   * Processes a document through digital text extraction (native PDF parsing first) or OCR
   */
  public static async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<OcrExtractionResult> {
    logger.info('Starting digital/OCR extraction for document', { documentId, mimeType });

    const isPdf =
      mimeType === 'application/pdf' ||
      (fileBuffer?.length >= 5 && fileBuffer.slice(0, 5).toString() === '%PDF-');

    // 1. Prioritize Native Digital PDF Text Extraction (Digital Documents Only)
    if (isPdf) {
      try {
        const digitalResult = await DigitalDocumentExtractorService.extractFromPdf(fileBuffer);
        if (digitalResult.success && digitalResult.extractedFields.length > 0) {
          const isDbUp = await checkDatabaseHealth();
          if (isDbUp) {
            try {
              await prisma.$transaction(
                digitalResult.extractedFields.map((f) =>
                  prisma.rawExtractedField.create({
                    data: {
                      document_id: documentId,
                      field_type: f.fieldType,
                      raw_text: f.rawText,
                      ocr_confidence: f.confidence,
                      source_snippet_ref: f.sourceSnippetRef,
                      bounding_box: f.boundingBox || undefined,
                    },
                  })
                )
              );

              await prisma.uploadedDocument.update({
                where: { id: documentId },
                data: {
                  ocr_status: OcrStatuses.COMPLETED,
                  ocr_error_message: null,
                  overall_status: 'PENDING_VALIDATION',
                },
              });
            } catch (dbErr) {
              logger.warn('Failed to persist digital PDF fields to DB', { error: String(dbErr) });
            }
          }

          await DocumentsRepository.updateDocument(documentId, {
            ocr_status: OcrStatuses.COMPLETED,
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
      } catch (pdfErr) {
        logger.warn('Native PDF extraction failed, proceeding to fallback provider', { error: String(pdfErr) });
      }
    }

    // 2. OCR Provider for Images or Scanned PDFs
    try {
      const result = await this.provider.extractText(fileBuffer, mimeType);
      const isDbUp = await checkDatabaseHealth();

      if (!result.success || result.extractedFields.length === 0) {
        const failureMessage =
          result.errorMessage ||
          'Digital text could not be extracted. Please upload a text-based PDF or another supported digital document.';

        if (isDbUp) {
          try {
            await prisma.uploadedDocument.update({
              where: { id: documentId },
              data: {
                ocr_status: OcrStatuses.FAILED,
                ocr_error_message: failureMessage,
                overall_status: 'EXTRACTION_FAILED',
              },
            });
          } catch {}
        }
        await DocumentsRepository.updateDocument(documentId, {
          ocr_status: OcrStatuses.FAILED,
          ocr_error_message: failureMessage,
          overall_status: 'EXTRACTION_FAILED',
        });

        logger.warn('Document extraction failed', {
          documentId,
          reason: failureMessage,
        });

        return {
          ...result,
          errorMessage: failureMessage,
        };
      }

      const isPartial = result.extractionStatus === 'PARTIALLY_SUCCESSFUL';
      const determinedOcrStatus = isPartial ? OcrStatuses.PARTIALLY_SUCCESSFUL : OcrStatuses.COMPLETED;
      const determinedOverallStatus = isPartial ? 'PARTIALLY_VERIFIED' : 'PENDING_VALIDATION';

      // Save raw extracted fields into database if accessible
      if (isDbUp) {
        try {
          await prisma.$transaction(
            result.extractedFields.map((f) =>
              prisma.rawExtractedField.create({
                data: {
                  document_id: documentId,
                  field_type: f.fieldType,
                  raw_text: f.rawText,
                  ocr_confidence: f.confidence,
                  source_snippet_ref: f.sourceSnippetRef,
                  bounding_box: f.boundingBox || undefined,
                },
              })
            )
          );

          await prisma.uploadedDocument.update({
            where: { id: documentId },
            data: {
              ocr_status: determinedOcrStatus,
              ocr_error_message: isPartial ? result.errorMessage : null,
              overall_status: determinedOverallStatus,
            },
          });
        } catch (dbErr) {
          logger.warn('Error saving OCR raw fields to DB, falling back to repository', { error: String(dbErr) });
        }
      }

      // Update in-memory fallback
      await DocumentsRepository.updateDocument(documentId, {
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

      logger.info('OCR extraction completed and raw fields saved', {
        documentId,
        fieldsCount: result.extractedFields.length,
        status: determinedOcrStatus,
      });

      return result;
    } catch (error: any) {
      const isDbUp = await checkDatabaseHealth();
      if (isDbUp) {
        try {
          await prisma.uploadedDocument.update({
            where: { id: documentId },
            data: {
              ocr_status: OcrStatuses.FAILED,
              ocr_error_message: error.message || 'Unexpected OCR service exception.',
              overall_status: 'EXTRACTION_FAILED',
            },
          });
        } catch {}
      }

      await DocumentsRepository.updateDocument(documentId, {
        ocr_status: OcrStatuses.FAILED,
        ocr_error_message: error.message || 'Unexpected OCR service exception.',
        overall_status: 'EXTRACTION_FAILED',
      });

      logger.error('OCR processing exception', {
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
