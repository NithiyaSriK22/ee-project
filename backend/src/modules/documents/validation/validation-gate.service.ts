import { prisma } from '../../../database/prisma.js';
import { FormularyRepository } from '../formulary/formulary.repository.js';
import { FieldCheckEvaluator } from './field-check-evaluator.js';
import { DocumentValidationSummary } from './types.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../../errors/app-error.js';
import { logger } from '../../../config/logger.js';
import { OcrStatuses, FieldType } from '../documents.types.js';

export class ValidationGateService {
  /**
   * Deterministically validates an uploaded document and persists validated field records
   */
  public static async validateDocument(documentId: string): Promise<DocumentValidationSummary> {
    const document = await prisma.uploadedDocument.findUnique({
      where: { id: documentId },
      include: {
        raw_fields: true,
      },
    });

    if (!document) {
      throw new NotFoundError(`Uploaded document not found: ${documentId}`);
    }

    if (!document.consent_verified) {
      throw new ForbiddenError('Document processing consent is required to validate clinical documents.');
    }

    if (document.ocr_status === OcrStatuses.FAILED) {
      throw new ValidationError(`Cannot validate document: OCR extraction failed (${document.ocr_error_message || 'Unreadable'}).`);
    }

    if (document.ocr_status === OcrStatuses.PENDING) {
      throw new ValidationError('Document is still pending OCR extraction. Please wait.');
    }

    // 1. Retrieve Active Formulary & Reference Datasets
    const formularyDataset = await FormularyRepository.getActiveFormularyDataset();

    // 2. Prepare normalized raw field inputs
    const rawInputs = document.raw_fields.map((rf) => ({
      id: rf.id,
      fieldType: rf.field_type as FieldType,
      rawText: rf.raw_text,
      ocrConfidence: rf.ocr_confidence,
      sourceSnippetRef: rf.source_snippet_ref,
      boundingBox: rf.bounding_box,
    }));

    // 3. Run Pure Deterministic Evaluation
    const validationSummary = FieldCheckEvaluator.evaluateDocument(
      document.id,
      document.document_type,
      rawInputs,
      formularyDataset
    );

    // 4. Persist ValidatedField records and update document overall status
    await prisma.$transaction(async (tx) => {
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

    logger.info('Document validation completed deterministically', {
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
  public static async revalidateDocument(documentId: string): Promise<DocumentValidationSummary> {
    logger.info('Re-validating document against latest reference dataset', { documentId });
    return this.validateDocument(documentId);
  }
}
