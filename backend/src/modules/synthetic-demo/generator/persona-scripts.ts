import { PersonaScript, PersonaType } from '../synthetic-demo.types.js';

export const PERSONA_SCRIPTS: Record<PersonaType, PersonaScript> = {
  normal_adult: {
    persona: 'normal_adult',
    description: 'Autonomous adult presenting with mild acute symptoms; answers all questions completely.',
    patientProfile: {
      age: 38,
      gender: 'MALE',
      preferredLanguage: 'en',
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Fever and dry cough for the past 3 days with mild fatigue',
      },
      {
        questionId: 'q_symptom_duration',
        questionText: 'How long have you had these symptoms?',
        category: 'CHIEF_COMPLAINT',
        value: '3 days',
      },
      {
        questionId: 'q_med_current',
        questionText: 'Are you currently taking any prescription medications?',
        category: 'MEDICATIONS',
        value: 'Paracetamol 650mg as needed for fever',
      },
      {
        questionId: 'q_allergy_known',
        questionText: 'Do you have any known drug or food allergies?',
        category: 'ALLERGIES',
        value: 'No known allergies',
      },
    ],
    expectedTriageCategory: 'ROUTINE',
    expectedSafetyFlags: [],
  },

  declines_intake: {
    persona: 'declines_intake',
    description: 'Patient declines to answer non-essential questions, asserting autonomy.',
    patientProfile: {
      age: 45,
      gender: 'FEMALE',
      preferredLanguage: 'hi',
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Knee joint pain after morning walk',
      },
      {
        questionId: 'q_hist_family',
        questionText: 'Does anyone in your family have heart disease or diabetes?',
        category: 'HISTORY',
        value: 'Declined by patient',
        declined: true,
      },
      {
        questionId: 'q_med_current',
        questionText: 'Are you currently taking any prescription medications?',
        category: 'MEDICATIONS',
        value: 'Declined by patient',
        declined: true,
      },
    ],
    expectedTriageCategory: 'ROUTINE',
    expectedSafetyFlags: ['INTAKE_ITEMS_DECLINED'],
  },

  skips_optional: {
    persona: 'skips_optional',
    description: 'Patient answers core symptoms and skips optional secondary questions.',
    patientProfile: {
      age: 29,
      gender: 'FEMALE',
      preferredLanguage: 'en',
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Sore throat and nasal congestion',
      },
      {
        questionId: 'q_symptom_severity',
        questionText: 'Please rate your pain or discomfort from 1 to 10.',
        category: 'CHIEF_COMPLAINT',
        value: '4',
      },
      {
        questionId: 'q_lifestyle_diet',
        questionText: 'Do you follow any specific dietary restrictions?',
        category: 'HISTORY',
        value: 'Skipped',
        skipped: true,
      },
    ],
    expectedTriageCategory: 'ROUTINE',
    expectedSafetyFlags: [],
  },

  contradictory: {
    persona: 'contradictory',
    description: 'Patient answers with clinical contradictions (e.g. denies chronic condition, then reports regular Metformin).',
    patientProfile: {
      age: 56,
      gender: 'MALE',
      preferredLanguage: 'te',
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'General weakness and increased thirst',
      },
      {
        questionId: 'q_hist_chronic',
        questionText: 'Have you been diagnosed with Diabetes, High Blood Pressure, or Kidney issues?',
        category: 'HISTORY',
        value: 'No chronic diseases at all',
        isContradictory: true,
      },
      {
        questionId: 'q_med_current',
        questionText: 'Are you currently taking any prescription medications?',
        category: 'MEDICATIONS',
        value: 'Metformin 500mg twice daily with meals',
        isContradictory: true,
      },
    ],
    expectedTriageCategory: 'ROUTINE',
    expectedSafetyFlags: ['CONTRADICTION_HISTORY_VS_MEDICATION'],
  },

  companion_assisted: {
    persona: 'companion_assisted',
    description: 'Elderly patient assisted at kiosk by their adult daughter.',
    patientProfile: {
      age: 74,
      gender: 'FEMALE',
      preferredLanguage: 'ta',
    },
    companion: {
      name: 'Kavitha Sundaram',
      relationship: 'Daughter',
      isSurrogate: false,
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Difficulty walking due to bilateral ankle swelling for 2 weeks',
      },
      {
        questionId: 'q_med_current',
        questionText: 'Are you currently taking any prescription medications?',
        category: 'MEDICATIONS',
        value: 'Amlodipine 5mg morning, Furosemide 20mg alternate days',
      },
      {
        questionId: 'q_allergy_known',
        questionText: 'Do you have any known drug or food allergies?',
        category: 'ALLERGIES',
        value: 'Rash with Sulfa antibiotics',
      },
    ],
    expectedTriageCategory: 'ROUTINE',
    expectedSafetyFlags: ['COMPANION_ASSISTED_INTAKE'],
  },

  pediatric_minor: {
    persona: 'pediatric_minor',
    description: '6-year-old pediatric patient accompanied by father; guardian consent and answers.',
    patientProfile: {
      age: 6,
      gender: 'MALE',
      preferredLanguage: 'en',
    },
    companion: {
      name: 'Rajesh Sharma',
      relationship: 'Father / Legal Guardian',
      isSurrogate: true,
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'High fever (102°F) since yesterday evening with ear pain and crying',
      },
      {
        questionId: 'q_med_current',
        questionText: 'Are you currently taking any prescription medications?',
        category: 'MEDICATIONS',
        value: 'Paracetamol pediatric suspension 5ml given 4 hours ago',
      },
      {
        questionId: 'q_allergy_known',
        questionText: 'Do you have any known drug or food allergies?',
        category: 'ALLERGIES',
        value: 'No known drug allergies',
      },
    ],
    expectedTriageCategory: 'URGENT',
    expectedSafetyFlags: ['PEDIATRIC_GUARDIAN_ASSISTED', 'SURROGATE_CONSENT_RECORDED'],
  },

  surrogate_incapacitated: {
    persona: 'surrogate_incapacitated',
    description: 'Incapacitated post-stroke patient; legal surrogate healthcare agent answers all intake questions.',
    patientProfile: {
      age: 82,
      gender: 'MALE',
      preferredLanguage: 'en',
    },
    companion: {
      name: 'Rohan Gupta',
      relationship: 'Son & Appointed Healthcare Power of Attorney',
      isSurrogate: true,
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Routine follow-up; increased lethargy and reduced oral intake over past 48 hours',
      },
      {
        questionId: 'q_hist_chronic',
        questionText: 'Past medical history:',
        category: 'HISTORY',
        value: 'Ischemic stroke (2023), Dysphagia, Hypertension',
      },
      {
        questionId: 'q_med_current',
        questionText: 'Current medications:',
        category: 'MEDICATIONS',
        value: 'Aspirin 75mg daily, Atorvastatin 20mg bedtime',
      },
    ],
    expectedTriageCategory: 'URGENT',
    expectedSafetyFlags: ['INCAPACITATED_PATIENT_SURROGATE_INTAKE', 'DOCUMENTS_REQUIRING_PHYSICIAN_VERIFICATION'],
  },

  sensitive_mental_health: {
    persona: 'sensitive_mental_health',
    description: 'Patient disclosing depression and suicidal ideation; Module 3B audio suppression and doctor-only scoping.',
    patientProfile: {
      age: 26,
      gender: 'FEMALE',
      preferredLanguage: 'en',
    },
    answers: [
      {
        questionId: 'q_cc_primary',
        questionText: 'What is the main reason for your hospital visit today?',
        category: 'CHIEF_COMPLAINT',
        value: 'Feeling overwhelmed, persistent sadness, and sleep disturbances for 3 months',
      },
      {
        questionId: 'q_sensitive_mood',
        questionText: 'Over the last 2 weeks, how often have you been bothered by feeling down or hopeless?',
        category: 'SENSITIVE',
        value: 'Nearly every day; feeling unable to cope',
        sensitivityLevel: 'SENSITIVE',
      },
      {
        questionId: 'q_sensitive_self_harm',
        questionText: 'Have you had thoughts of hurting yourself?',
        category: 'SENSITIVE',
        value: 'Passive thoughts of not wanting to wake up, no active plan',
        sensitivityLevel: 'HIGHLY_SENSITIVE',
      },
    ],
    expectedTriageCategory: 'URGENT',
    expectedSafetyFlags: [
      'MODULE_3B_SENSITIVE_TOPIC_FLAGGED',
      'AUDIO_OUTPUT_SUPPRESSED_IN_PUBLIC',
      'DOCTOR_ONLY_VISIBILITY_SCOPED',
    ],
  },
};

export class PersonaScriptService {
  public static getScript(persona: PersonaType): PersonaScript {
    return PERSONA_SCRIPTS[persona] || PERSONA_SCRIPTS.normal_adult;
  }

  public static getAllPersonas(): PersonaType[] {
    return Object.keys(PERSONA_SCRIPTS) as PersonaType[];
  }
}
