import crypto from 'crypto';
import {
  SummaryInputItem,
  AssembledSummaryInput,
  SummaryItemStatus,
  SummarySections,
} from '../summary.types.js';
import {
  INTERVIEW_SECTION_TO_SUMMARY_SECTION,
  DOCUMENT_FIELD_TO_SUMMARY_SECTION,
  deriveSemanticItemKey,
} from './item-key-map.js';
import { ConflictDetector } from './conflict-detector.js';

export interface InterviewRawAnswer {
  id: string;
  questionId: string;
  section: string;
  promptText: string;
  questionType: string;
  answerValue: any;
  answeredVia: string;
  languageUsed: string;
  isCritical: boolean;
  isSkipped: boolean;
  answeredAt: Date | string;
}

export interface DocumentValidatedFieldRaw {
  id: string;
  fieldType: string;
  isCritical: boolean;
  result: string; // VERIFIED, UNVERIFIED, UNREADABLE, MISMATCH_FLAGGED
  evalState: string;
  matchedReferenceValue: string | null;
  matchScore: number | null;
  ocrConfidence: number;
  explanation: string;
  formularyVersion: string;
  evaluatedAt: Date | string;
  rawText?: string;
}

export interface DocumentWithFieldsRaw {
  documentId: string;
  documentType: string;
  fileName: string;
  overallStatus: string;
  uploadedAt: Date | string;
  validatedFields: DocumentValidatedFieldRaw[];
}

export interface InputAssemblyOptions {
  visitId: string;
  patient?: {
    age?: number | null;
    gender?: string | null;
    preferredLanguage?: string | null;
  };
  interviewData?: {
    status: string;
    answers: InterviewRawAnswer[];
  } | null;
  documentsData?: DocumentWithFieldsRaw[];
}

export class InputAssembler {
  /**
   * Deterministically combines Module 3 and Module 4 data into normalized SummaryInputItems.
   * Same stored data in -> same input and input_hash out.
   */
  public static assemble(options: InputAssemblyOptions): AssembledSummaryInput {
    const items: SummaryInputItem[] = [];
    const formularyVersionRefsSet = new Set<string>();

    let itemSeq = 1;

    // 1. Process Module 3 Interview Answers
    if (options.interviewData && Array.isArray(options.interviewData.answers)) {
      // Sort deterministically by questionId / answeredAt
      const sortedAnswers = [...options.interviewData.answers].sort((a, b) =>
        a.questionId.localeCompare(b.questionId)
      );

      for (const ans of sortedAnswers) {
        const itemId = `itm_int_${String(itemSeq++).padStart(3, '0')}`;
        const section =
          INTERVIEW_SECTION_TO_SUMMARY_SECTION[ans.section] || SummarySections.CHIEF_COMPLAINT;

        const { status, formattedValue, rawStr } = this.normalizeInterviewAnswer(ans);
        const itemKey = deriveSemanticItemKey('INTERVIEW', ans.section, rawStr);

        items.push({
          itemId,
          section,
          label: ans.promptText || ans.section,
          value: formattedValue,
          sourceType: 'INTERVIEW',
          sourceRef: `interview_q_${ans.questionId}`,
          status,
          isCritical: Boolean(ans.isCritical),
          rawText: rawStr,
          itemKey,
          metadata: {
            questionId: ans.questionId,
            questionType: ans.questionType,
            answeredVia: ans.answeredVia,
            languageUsed: ans.languageUsed,
          },
        });
      }
    }

    // 2. Process Module 4 Validated Document Fields
    if (Array.isArray(options.documentsData)) {
      const sortedDocs = [...options.documentsData].sort((a, b) =>
        a.documentId.localeCompare(b.documentId)
      );

      for (const doc of sortedDocs) {
        const sortedFields = [...(doc.validatedFields || [])].sort((a, b) =>
          a.id.localeCompare(b.id)
        );

        for (const field of sortedFields) {
          const itemId = `itm_doc_${String(itemSeq++).padStart(3, '0')}`;
          const section =
            DOCUMENT_FIELD_TO_SUMMARY_SECTION[field.fieldType] ||
            SummarySections.PRIOR_INVESTIGATIONS;

          if (field.formularyVersion) {
            formularyVersionRefsSet.add(field.formularyVersion);
          }

          const status = this.normalizeDocumentFieldStatus(field.result);
          const rawStr = field.rawText || field.matchedReferenceValue || '';
          const value = field.matchedReferenceValue || field.rawText || '';
          const itemKey = deriveSemanticItemKey('DOCUMENT', field.fieldType, value || rawStr);

          items.push({
            itemId,
            section,
            label: `${doc.documentType}: ${field.fieldType}`,
            value,
            sourceType: 'DOCUMENT',
            sourceRef: `doc_${doc.documentId}_field_${field.id}`,
            status,
            isCritical: Boolean(field.isCritical),
            rawText: rawStr,
            itemKey,
            metadata: {
              documentId: doc.documentId,
              documentType: doc.documentType,
              fieldId: field.id,
              evalState: field.evalState,
              ocrConfidence: field.ocrConfidence,
              formularyVersion: field.formularyVersion,
            },
          });
        }
      }
    }

    // Sort items by itemId for consistent canonical ordering
    items.sort((a, b) => a.itemId.localeCompare(b.itemId));

    // Detect conflicts deterministically
    const conflicts = ConflictDetector.detectConflicts(items);

    // Compute deterministic SHA-256 hash of input items
    const inputHash = this.computeInputHash(items, conflicts);

    return {
      visitId: options.visitId,
      patientAge: options.patient?.age ?? undefined,
      patientGender: options.patient?.gender ?? undefined,
      preferredLanguage: options.patient?.preferredLanguage ?? 'en',
      inputHash,
      items,
      conflicts,
      formularyVersionRefs: Array.from(formularyVersionRefsSet),
      assembledAt: new Date().toISOString(),
    };
  }

  private static normalizeInterviewAnswer(ans: InterviewRawAnswer): {
    status: SummaryItemStatus;
    formattedValue: string;
    rawStr: string;
  } {
    if (ans.isSkipped) {
      return { status: 'SKIPPED', formattedValue: '', rawStr: '' };
    }

    const val = ans.answerValue;
    if (val === undefined || val === null || val === '') {
      return { status: 'NOT_ANSWERED', formattedValue: '', rawStr: '' };
    }

    let rawStr = '';
    if (typeof val === 'string') {
      rawStr = val.trim();
    } else if (typeof val === 'object') {
      rawStr = JSON.stringify(val);
    } else {
      rawStr = String(val);
    }

    const lower = rawStr.toLowerCase();
    if (
      lower === 'declined' ||
      lower === 'prefer not to answer' ||
      lower === 'prefernotsay' ||
      (typeof val === 'object' && val?.declined === true)
    ) {
      return { status: 'DECLINED', formattedValue: '', rawStr };
    }

    return {
      status: 'ANSWERED',
      formattedValue: rawStr,
      rawStr,
    };
  }

  private static normalizeDocumentFieldStatus(result: string): SummaryItemStatus {
    const upper = (result || '').toUpperCase();
    switch (upper) {
      case 'VERIFIED':
        return 'VERIFIED';
      case 'UNREADABLE':
        return 'UNREADABLE';
      case 'MISMATCH_FLAGGED':
        return 'MISMATCH_FLAGGED';
      case 'UNVERIFIED':
      default:
        return 'UNVERIFIED';
    }
  }

  private static computeInputHash(items: SummaryInputItem[], conflicts: unknown[]): string {
    const canonicalPayload = JSON.stringify({
      items: items.map((i) => ({
        id: i.itemId,
        sec: i.section,
        lbl: i.label,
        val: i.value,
        st: i.status,
        crit: i.isCritical,
        src: i.sourceRef,
      })),
      conflictsCount: conflicts.length,
    });

    return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  }
}
