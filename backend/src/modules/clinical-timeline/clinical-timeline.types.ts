/**
 * MODULE 4A — CLINICAL TIMELINE, LAB REFERENCE RANGES & LONGITUDINAL HISTORY
 * Types, enums, and data contracts for deterministic timeline, lab flagging,
 * carry-forward confirmation, and visit diffing.
 */

export const LabFlagStates = {
  WITHIN_RANGE: 'WITHIN_RANGE',
  ABOVE_RANGE: 'ABOVE_RANGE',
  BELOW_RANGE: 'BELOW_RANGE',
  NO_RANGE_AVAILABLE: 'NO_RANGE_AVAILABLE',
  VALUE_NOT_VERIFIED: 'VALUE_NOT_VERIFIED',
} as const;

export type LabFlagState = (typeof LabFlagStates)[keyof typeof LabFlagStates];

export const RangeSourceTypes = {
  REPORT_PRINTED: 'REPORT_PRINTED',             // Precedence 1: Printed on report and verified
  GOVERNED_DICTIONARY_TABLE: 'GOVERNED_DICTIONARY_TABLE', // Precedence 2: Governed hospital reference table
  NONE: 'NONE',
} as const;

export type RangeSourceType = (typeof RangeSourceTypes)[keyof typeof RangeSourceTypes];

export interface LabReferenceRangeDefinition {
  low: number;
  high: number;
  criticalLow?: number;
  criticalHigh?: number;
  textualRange?: string;
  clinicalSource: string;
}

export interface LabFlagResult {
  testCode: string;
  testName: string;
  rawValue: string;
  numericValue: number | null;
  isQualifier: boolean;
  qualifierText?: string;
  unit: string;
  flagState: LabFlagState;
  rangeSource: RangeSourceType;
  referenceRange?: LabReferenceRangeDefinition | null;
  isCriticalValue: boolean;
  criticalMarker?: string;
  flagExplanation: string;
}

export const TimelineItemTypes = {
  LAB_RESULT: 'LAB_RESULT',
  PRESCRIPTION: 'PRESCRIPTION',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  PRIOR_VISIT_RECORD: 'PRIOR_VISIT_RECORD',
  CLINICAL_INTAKE_ANSWER: 'CLINICAL_INTAKE_ANSWER',
} as const;

export type TimelineItemType = (typeof TimelineItemTypes)[keyof typeof TimelineItemTypes];

export interface TimelineItem {
  id: string;
  itemType: TimelineItemType;
  category: 'LAB' | 'MEDICATION' | 'CLINICAL_NOTE' | 'INTAKE' | 'ALLERGY' | 'CONDITION';
  documentId?: string;
  visitId?: string;
  documentType?: string;
  fileName?: string;
  title: string;
  clinicalDate: string | null; // ISO YYYY-MM-DD or null
  dateState: 'EXACT' | 'DATE_UNKNOWN';
  sourceType: 'DOCUMENT_FIELD' | 'CONFIRMED_RECORD' | 'INTERVIEW_ANSWER';
  sourceRef: string;
  isVerified: boolean;
  verificationState: string;
  displayValue: string; // "value not verified" if !isVerified
  details?: Record<string, any>;
  labFlag?: LabFlagResult | null;
}

export interface TimelineBucket {
  dateLabel: string; // "2026-08-15" or "Date unknown"
  dateState: 'EXACT' | 'DATE_UNKNOWN';
  items: TimelineItem[];
}

export interface PatientTimelineDTO {
  patientId: string;
  totalItems: number;
  chronologicalBuckets: TimelineBucket[]; // Sorted newest to oldest
  dateUnknownBucket: TimelineBucket;
}

export interface LabTrendDataPoint {
  date: string;
  dateState: 'EXACT' | 'DATE_UNKNOWN';
  value: number;
  rawText: string;
  unit: string;
  flagState: LabFlagState;
  sourceRef: string;
  documentId?: string;
  visitId?: string;
}

export interface LabTrendSeries {
  testCode: string;
  testName: string;
  unit: string;
  points: LabTrendDataPoint[];
  hasGaps: boolean;
  gapDescriptions: string[];
  latestFlagState: LabFlagState;
}

export interface CarryForwardCandidate {
  questionId: string;
  questionCode: string;
  section: string;
  promptText: string;
  priorAnswerId: string;
  priorVisitId: string;
  priorAnsweredAt: string;
  priorAnswerValue: any;
  priorDisplayValue: string;
  carryForwardAllowed: boolean;
  isVolatile: boolean;
  ageInDays: number;
  isTooOld: boolean; // default > 365 days
  eligibleForKioskPrompt: boolean;
}

export interface CarryForwardConfirmationPayload {
  questionId: string;
  priorAnswerId: string;
  priorVisitId: string;
  action: 'CONFIRM' | 'CHANGE';
  newAnswerValue?: any;
}

export interface ChangedItemDiff {
  key: string;
  category: 'MEDICATION' | 'CONDITION' | 'ALLERGY' | 'LAB' | 'INTAKE_ANSWER';
  label: string;
  diffType: 'ADDED' | 'REMOVED' | 'CHANGED';
  priorValue?: string | null;
  currentValue?: string | null;
  priorDate?: string | null;
  currentDate?: string | null;
  notes?: string;
}

export interface VisitDiffDTO {
  patientId: string;
  currentVisitId: string;
  priorVisitId: string | null;
  currentVisitDate: string;
  priorVisitDate: string | null;
  hasPriorVisit: boolean;
  added: ChangedItemDiff[];
  removed: ChangedItemDiff[];
  changed: ChangedItemDiff[];
  totalChanges: number;
}
