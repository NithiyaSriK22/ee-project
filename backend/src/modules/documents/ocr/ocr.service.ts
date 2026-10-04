import {
  IOcrProvider,
  StandardClinicalOcrProvider,
  OcrExtractionResult,
} from './ocr-provider-adapter.js';
import { prisma } from '../../../database/prisma.js';
import { logger } from '../../../config/logger.js';
import { OcrStatuses } from '../documents.types.js';

export class OcrService {
  private static provider: IOcrProvider = new StandardClinicalOcrProvider();

  public static setProvider(newProvider: IOcrProvider) {
    this.provider = newProvider;
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

      if (!result.success || result.extractedFields.length === 0) {
        await prisma.uploadedDocument.update({
          where: { id: documentId },
          data: {
            ocr_status: OcrStatuses.FAILED,
            ocr_error_message: result.errorMessage || 'OCR extraction produced no usable text.',
            overall_status: 'EXTRACTION_FAILED',
          },
        });

        logger.warn('OCR extraction failed for document', {
          documentId,
          reason: result.errorMessage,
        });

        return result;
      }

      // Save raw extracted fields into database
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
          ocr_status: OcrStatuses.COMPLETED,
          ocr_error_message: null,
        },
      });

      logger.info('OCR extraction completed and raw fields saved', {
        documentId,
        fieldsCount: result.extractedFields.length,
      });

      return result;
    } catch (error: any) {
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: {
          ocr_status: OcrStatuses.FAILED,
          ocr_error_message: error.message || 'Unexpected OCR service exception.',
          overall_status: 'EXTRACTION_FAILED',
        },
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
