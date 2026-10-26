import {
  IOcrProvider,
  OcrProviderFactory,
  OcrExtractionResult,
} from './ocr-provider-adapter.js';
import { prisma, checkDatabaseHealth } from '../../../database/prisma.js';
import { logger } from '../../../config/logger.js';
import { OcrStatuses } from '../documents.types.js';
import { DocumentsRepository } from '../documents.repository.js';

export class OcrService {
  private static provider: IOcrProvider = OcrProviderFactory.getDefaultProvider();

  public static setProvider(newProvider: IOcrProvider) {
    this.provider = newProvider;
  }

  public static getProvider(): IOcrProvider {
    return this.provider;
  }

  /**
   * Processes a document through OCR extraction and creates raw extracted field records
   */
  public static async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<OcrExtractionResult> {
    logger.info('Starting OCR extraction for document', { documentId });

    try {
      const result = await this.provider.extractText(fileBuffer, mimeType);
      const isDbUp = await checkDatabaseHealth();

      if (!result.success || result.extractedFields.length === 0) {
        const failureMessage =
          result.errorMessage ||
          'Handwritten text could not be reliably extracted. Please review the original document.';

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

        logger.warn('OCR extraction failed for document', {
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
