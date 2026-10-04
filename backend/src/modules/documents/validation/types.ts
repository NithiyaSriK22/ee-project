import {
  FieldType,
  EvaluationState,
  FieldVerificationResult,
} from '../documents.types.js';

export interface RawFieldInput {
  id?: string;
  fieldType: FieldType;
  rawText: string;
  ocrConfidence: number;
  sourceSnippetRef?: string | null;
  boundingBox?: any;
}

export interface FormularyReferenceItem {
  id: string;
  genericName: string;
  canonicalName: string;
  brandNames: string[];
  dosageForms: string[];
  commonMisreadings: string[];
  scheduleType?: string | null;
}

export interface FormularyDataset {
  versionCode: string;
  versionId: string;
  drugs: FormularyReferenceItem[];
}

export interface SingleCheckResult {
  checkName: string;
  state: EvaluationState;
  matchedValue?: string | null;
  score?: number | null;
  detail?: string | null;
}

export interface EvaluatedFieldResult {
  rawFieldId?: string;
  fieldType: FieldType;
  rawText: string;
  ocrConfidence: number;
  isCritical: boolean;
  result: FieldVerificationResult;
  evalState: EvaluationState;
  matchedReferenceValue?: string | null;
  matchScore?: number | null;
  explanation: string;
  checksPerformed: SingleCheckResult[];
}

export interface DocumentValidationSummary {
  documentId: string;
  documentType: string;
  formularyVersion: string;
  evaluatedAt: Date;
  overallStatus: 'FULLY_VERIFIED' | 'NEEDS_PHYSICIAN_REVIEW' | 'PARTIALLY_VERIFIED' | 'EXTRACTION_FAILED';
  totalFieldsCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  unreadableCount: number;
  mismatchFlaggedCount: number;
  criticalFlaggedCount: number;
  structuredExplanation: {
    summaryText: string;
    verifiedSummary: string[];
    flaggedSummary: string[];
    unverifiedSummary: string[];
    unreadableSummary: string[];
  };
  fields: EvaluatedFieldResult[];
}
