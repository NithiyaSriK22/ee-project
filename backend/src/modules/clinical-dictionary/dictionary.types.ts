/**
 * MODULE 3A — CLINICAL DATA DICTIONARY & TERMINOLOGY GOVERNANCE
 * Type definitions, governance lifecycle, and safety-critical terminology structures
 */

export const TerminologyStatuses = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED',
} as const;

export type TerminologyStatus = (typeof TerminologyStatuses)[keyof typeof TerminologyStatuses];

export const DictionaryCategories = {
  SECTIONS: 'SECTIONS',
  QUESTIONS: 'QUESTIONS',
  OPTION_CODES: 'OPTION_CODES',
  FACT_KEYS: 'FACT_KEYS',
  SUMMARY_KEYS: 'SUMMARY_KEYS',
  DOCUMENT_FIELD_TYPES: 'DOCUMENT_FIELD_TYPES',
  UNITS_AND_CONVERSIONS: 'UNITS_AND_CONVERSIONS',
  DATE_DOSAGE_PATTERNS: 'DATE_DOSAGE_PATTERNS',
  PRESCRIPTION_ABBREVIATIONS: 'PRESCRIPTION_ABBREVIATIONS',
  DRUGS: 'DRUGS',
  LAB_TESTS: 'LAB_TESTS',
  REFERENCE_RANGES: 'REFERENCE_RANGES',
} as const;

export type DictionaryCategory = (typeof DictionaryCategories)[keyof typeof DictionaryCategories];

export interface BaseDictionaryEntry {
  code: string;
  category: DictionaryCategory;
  name: string;
  description: string;
  status: TerminologyStatus;
  version: string;
  meaningLockHash: string; // Hash of initial clinical definition to prevent semantic drift
  sourceDataset: string;   // e.g. 'National Essential Medicines List (NLEM 2022) / Hospital Formulary'
  license: string;         // e.g. 'Open Government Data (OGD) India / Hospital Internal Form'
  createdBy: string;
  reviewedBy?: string;
  activatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  retiredAt?: Date;
  retirementReason?: string;
}

export interface SectionEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.SECTIONS;
  displayOrder: number;
  applicableScopes: ('INTERVIEW' | 'SUMMARY' | 'BOTH')[];
}

export interface QuestionCodeEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.QUESTIONS;
  sectionCode: string;
  responseType: string;
  isCritical: boolean;
  linkedFactKey?: string;
  sensitivityLevel?: 'NORMAL' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';
  visibilityScope?: 'STAFF_VISIBLE' | 'CLINICAL_STAFF' | 'DOCTOR_ONLY';
  ageMin?: number;
  ageMax?: number;
  sexApplicability?: 'ALL' | 'MALE' | 'FEMALE' | 'INTERSEX' | 'OTHER';
  pregnancyGated?: boolean;
  audioAllowedInPublic?: boolean;
  aiSummarizationAllowed?: boolean;
  carryForwardAllowed?: boolean;
}


export interface OptionCodeEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.OPTION_CODES;
  questionCode: string;
  displayLabel: string;
}

export interface FactKeyEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.FACT_KEYS;
  dataType: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'THREE_STATE';
  clinicalDomain: 'CARDIOVASCULAR' | 'RESPIRATORY' | 'NEUROLOGY' | 'GENERAL' | 'TRAUMA';
  isRedFlagIndicator: boolean;
}

export interface SummaryKeyEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.SUMMARY_KEYS;
  sectionCode: string;
  statementTemplate: string;
  isConflictDetectable: boolean;
}

export interface DocumentFieldTypeEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.DOCUMENT_FIELD_TYPES;
  expectedFormat: 'STRING' | 'STRUCTURED_PATTERN' | 'DATE' | 'NUMBER';
  standardUnit?: string;
  isCriticalField: boolean;
}

export interface UnitConversionRule {
  fromUnit: string;
  toUnit: string;
  analyte: string; // analyte-specific! e.g., 'GLUCOSE' (factor 18.0182)
  conversionFactor: number;
  formulaDescription: string;
  clinicalApprovalRef: string;
}

export interface UnitEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.UNITS_AND_CONVERSIONS;
  symbol: string;
  unitFamily: 'CONCENTRATION' | 'MASS' | 'VOLUME' | 'PRESSURE' | 'RATE' | 'COUNT';
  conversions: UnitConversionRule[];
}

export interface DateDosagePatternEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.DATE_DOSAGE_PATTERNS;
  patternRegex: string;
  exampleValues: string[];
  canonicalRepresentation: string;
}

export interface PrescriptionAbbreviationEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.PRESCRIPTION_ABBREVIATIONS;
  abbreviation: string;
  expandedMeaning: string;
  isAmbiguous: boolean;
  ambiguityNotes?: string;
  allowedContexts?: string[]; // e.g. ['OPHTHALMIC', 'ORAL_FREQUENCY']
}

export interface LasaPair {
  partnerDrugCode: string;
  partnerDrugName: string;
  riskSeverity: 'HIGH' | 'MEDIUM';
  reportedConfusionContext: string;
}

export interface DrugDictionaryEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.DRUGS;
  genericName: string;
  brandNames: string[];
  strengths: string[];
  dosageForms: string[];
  commonMisspellings: string[];
  lasaPartners: LasaPair[];
  atcCode?: string;
  snomedCode?: string;
}

export interface LabTestEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.LAB_TESTS;
  testName: string;
  synonyms: string[];
  standardUnit: string;
  allowedUnits: string[];
  loincCode?: string;
  specimenType: 'SERUM' | 'PLASMA' | 'WHOLE_BLOOD' | 'URINE' | 'CSF';
}

export interface ReferenceRangeEntry extends BaseDictionaryEntry {
  category: typeof DictionaryCategories.REFERENCE_RANGES;
  labTestCode: string;
  unit: string;
  sex: 'ALL' | 'MALE' | 'FEMALE';
  ageMinYears: number;
  ageMaxYears: number;
  rangeLow?: number;
  rangeHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  clinicalSource: string;
}

export interface ImpactAnalysisResult {
  code: string;
  canRetire: boolean;
  activeReferences: {
    interviewTemplates: string[];
    redflagRules: string[];
    summaryPrompts: string[];
    translations: string[];
  };
  warnings: string[];
}

export interface BulkImportDryRunReport {
  timestamp: Date;
  sourceDataset: string;
  totalEntries: number;
  validCount: number;
  duplicateCodes: string[];
  meaningLockViolations: string[];
  unknownUnitReferences: string[];
  orphanedCodeReferences: string[];
  lasaPairConflicts: string[];
  canCommitAsDraft: boolean;
}
