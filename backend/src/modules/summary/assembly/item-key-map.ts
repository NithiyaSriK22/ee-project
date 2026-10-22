import { SummarySections, SummarySectionType } from '../summary.types.js';

export interface SectionMapping {
  defaultSection: SummarySectionType;
  labelPrefix: string;
}

/**
 * Maps Module 3 Question sections to standard clinical summary sections
 */
export const INTERVIEW_SECTION_TO_SUMMARY_SECTION: Record<string, SummarySectionType> = {
  CHIEF_COMPLAINT: SummarySections.CHIEF_COMPLAINT,
  PRESENT_ILLNESS_HISTORY: SummarySections.HISTORY_OF_PRESENT_ILLNESS,
  PAST_MEDICAL_HISTORY: SummarySections.PAST_MEDICAL_HISTORY,
  MEDICATIONS: SummarySections.MEDICATIONS_AND_ALLERGIES,
  ALLERGIES: SummarySections.MEDICATIONS_AND_ALLERGIES,
  LIFESTYLE: SummarySections.FAMILY_AND_PERSONAL_HISTORY,
  FAMILY_HISTORY: SummarySections.FAMILY_AND_PERSONAL_HISTORY,
  REVIEW_OF_SYSTEMS: SummarySections.REVIEW_OF_SYSTEMS,
  PRIOR_INVESTIGATIONS: SummarySections.PRIOR_INVESTIGATIONS,
};

/**
 * Maps Module 4 Document field types to standard clinical summary sections
 */
export const DOCUMENT_FIELD_TO_SUMMARY_SECTION: Record<string, SummarySectionType> = {
  drug_name: SummarySections.MEDICATIONS_AND_ALLERGIES,
  dosage: SummarySections.MEDICATIONS_AND_ALLERGIES,
  allergy: SummarySections.MEDICATIONS_AND_ALLERGIES,
  diagnosis: SummarySections.PAST_MEDICAL_HISTORY,
  lab_value: SummarySections.PRIOR_INVESTIGATIONS,
  lab_test_name: SummarySections.PRIOR_INVESTIGATIONS,
  date: SummarySections.PRIOR_INVESTIGATIONS,
  physician_name: SummarySections.PRIOR_INVESTIGATIONS,
  institution_name: SummarySections.PRIOR_INVESTIGATIONS,
};

/**
 * Standard semantic item keys used for deterministic conflict detection
 */
export function deriveSemanticItemKey(_sourceType: 'INTERVIEW' | 'DOCUMENT', fieldOrSection: string, text: string): string {
  const normalizedText = (text || '').toLowerCase().trim();

  // Allergy normalization
  if (fieldOrSection.toLowerCase().includes('allerg') || normalizedText.includes('allerg')) {
    if (normalizedText.includes('penicillin') || normalizedText.includes('amox')) return 'allergy_penicillin';
    if (normalizedText.includes('sulfa')) return 'allergy_sulfa';
    if (normalizedText.includes('aspirin') || normalizedText.includes('nsaid')) return 'allergy_nsaid';
    return 'allergy_general';
  }

  // Medication normalization
  if (fieldOrSection.toLowerCase().includes('med') || fieldOrSection === 'drug_name') {
    if (normalizedText.includes('amoxicillin') || normalizedText.includes('amox')) return 'med_amoxicillin';
    if (normalizedText.includes('metformin')) return 'med_metformin';
    if (normalizedText.includes('paracetamol') || normalizedText.includes('dolo')) return 'med_paracetamol';
    if (normalizedText.includes('atorvastatin')) return 'med_atorvastatin';
    return `med_${normalizedText.replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
  }

  // Chief complaint / symptom normalization
  if (fieldOrSection.toLowerCase().includes('chief') || fieldOrSection.toLowerCase().includes('present_illness')) {
    if (normalizedText.includes('chest pain')) return 'symptom_chest_pain';
    if (normalizedText.includes('fever')) return 'symptom_fever';
    if (normalizedText.includes('cough')) return 'symptom_cough';
    return 'symptom_general';
  }

  return `${fieldOrSection.toLowerCase()}_generic`;
}
