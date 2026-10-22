"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_FIELD_TO_SUMMARY_SECTION = exports.INTERVIEW_SECTION_TO_SUMMARY_SECTION = void 0;
exports.deriveSemanticItemKey = deriveSemanticItemKey;
const summary_types_js_1 = require("../summary.types.js");
/**
 * Maps Module 3 Question sections to standard clinical summary sections
 */
exports.INTERVIEW_SECTION_TO_SUMMARY_SECTION = {
    CHIEF_COMPLAINT: summary_types_js_1.SummarySections.CHIEF_COMPLAINT,
    PRESENT_ILLNESS_HISTORY: summary_types_js_1.SummarySections.HISTORY_OF_PRESENT_ILLNESS,
    PAST_MEDICAL_HISTORY: summary_types_js_1.SummarySections.PAST_MEDICAL_HISTORY,
    MEDICATIONS: summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
    ALLERGIES: summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
    LIFESTYLE: summary_types_js_1.SummarySections.FAMILY_AND_PERSONAL_HISTORY,
    FAMILY_HISTORY: summary_types_js_1.SummarySections.FAMILY_AND_PERSONAL_HISTORY,
    REVIEW_OF_SYSTEMS: summary_types_js_1.SummarySections.REVIEW_OF_SYSTEMS,
    PRIOR_INVESTIGATIONS: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
};
/**
 * Maps Module 4 Document field types to standard clinical summary sections
 */
exports.DOCUMENT_FIELD_TO_SUMMARY_SECTION = {
    drug_name: summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
    dosage: summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
    allergy: summary_types_js_1.SummarySections.MEDICATIONS_AND_ALLERGIES,
    diagnosis: summary_types_js_1.SummarySections.PAST_MEDICAL_HISTORY,
    lab_value: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
    lab_test_name: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
    date: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
    physician_name: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
    institution_name: summary_types_js_1.SummarySections.PRIOR_INVESTIGATIONS,
};
/**
 * Standard semantic item keys used for deterministic conflict detection
 */
function deriveSemanticItemKey(_sourceType, fieldOrSection, text) {
    const normalizedText = (text || '').toLowerCase().trim();
    // Allergy normalization
    if (fieldOrSection.toLowerCase().includes('allerg') || normalizedText.includes('allerg')) {
        if (normalizedText.includes('penicillin') || normalizedText.includes('amox'))
            return 'allergy_penicillin';
        if (normalizedText.includes('sulfa'))
            return 'allergy_sulfa';
        if (normalizedText.includes('aspirin') || normalizedText.includes('nsaid'))
            return 'allergy_nsaid';
        return 'allergy_general';
    }
    // Medication normalization
    if (fieldOrSection.toLowerCase().includes('med') || fieldOrSection === 'drug_name') {
        if (normalizedText.includes('amoxicillin') || normalizedText.includes('amox'))
            return 'med_amoxicillin';
        if (normalizedText.includes('metformin'))
            return 'med_metformin';
        if (normalizedText.includes('paracetamol') || normalizedText.includes('dolo'))
            return 'med_paracetamol';
        if (normalizedText.includes('atorvastatin'))
            return 'med_atorvastatin';
        return `med_${normalizedText.replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
    }
    // Chief complaint / symptom normalization
    if (fieldOrSection.toLowerCase().includes('chief') || fieldOrSection.toLowerCase().includes('present_illness')) {
        if (normalizedText.includes('chest pain'))
            return 'symptom_chest_pain';
        if (normalizedText.includes('fever'))
            return 'symptom_fever';
        if (normalizedText.includes('cough'))
            return 'symptom_cough';
        return 'symptom_general';
    }
    return `${fieldOrSection.toLowerCase()}_generic`;
}
