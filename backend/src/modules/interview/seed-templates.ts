import {
  InterviewSections,
  QuestionTypes,
} from '../../types/interview.types.js';

export interface SeedQuestionOption {
  code: string;
  label: string;
  value: string;
}

export interface SeedQuestion {
  questionCode: string;
  section: string;
  promptText: string;
  promptAudioHint?: string;
  questionType: string;
  answerOptions?: (string | SeedQuestionOption)[];
  isCritical: boolean;
  isRequired: boolean;
  order: number;
}

export const DEFAULT_GENERAL_OPD_QUESTIONS: SeedQuestion[] = [
  // 1. CHIEF COMPLAINT
  {
    questionCode: 'CHIEF_COMPLAINT_PRIMARY',
    section: InterviewSections.CHIEF_COMPLAINT,
    promptText: 'What is your primary reason or main health problem for visiting the doctor today?',
    promptAudioHint: 'Please describe the main symptom or illness you are experiencing.',
    questionType: QuestionTypes.FREE_TEXT,
    isCritical: true,
    isRequired: true,
    order: 1,
  },
  {
    questionCode: 'CHIEF_COMPLAINT_DURATION',
    section: InterviewSections.CHIEF_COMPLAINT,
    promptText: 'How long have you been experiencing these main symptoms?',
    promptAudioHint: 'How many days, weeks, or months ago did this problem start?',
    questionType: QuestionTypes.DURATION,
    answerOptions: [
      { code: 'DURATION_LT_24H', label: 'Less than 24 hours', value: 'DURATION_LT_24H' },
      { code: 'DURATION_1_3D', label: '1 to 3 days', value: 'DURATION_1_3D' },
      { code: 'DURATION_4_7D', label: '4 to 7 days', value: 'DURATION_4_7D' },
      { code: 'DURATION_1_4W', label: '1 to 4 weeks', value: 'DURATION_1_4W' },
      { code: 'DURATION_GT_1M', label: 'More than 1 month', value: 'DURATION_GT_1M' },
    ],
    isCritical: false,
    isRequired: true,
    order: 2,
  },

  // 2. PRESENT ILLNESS HISTORY
  {
    questionCode: 'CHEST_PAIN_DYSPNEA',
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'Do you currently have chest pain, chest heaviness, or difficulty breathing?',
    promptAudioHint: 'Have you felt pain in your chest or shortness of breath today?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: true,
    isRequired: true,
    order: 3,
  },
  {
    questionCode: 'FEVER_CHILLS',
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'Do you currently have high fever, chills, or body shivering?',
    promptAudioHint: 'Do you have hot fever or cold shivers?',
    questionType: QuestionTypes.YES_NO,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: true,
    isRequired: true,
    order: 4,
  },
  {
    questionCode: 'PAIN_SEVERITY',
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'How would you rate the severity of your pain or discomfort right now?',
    promptAudioHint: 'On a scale from 0 to 10, how severe is your pain?',
    questionType: QuestionTypes.SINGLE_CHOICE,
    answerOptions: [
      { code: 'SEV_NONE', label: 'None (0)', value: 'SEV_NONE' },
      { code: 'SEV_MILD', label: 'Mild (1-3)', value: 'SEV_MILD' },
      { code: 'SEV_MODERATE', label: 'Moderate (4-6)', value: 'SEV_MODERATE' },
      { code: 'SEV_SEVERE', label: 'Severe (7-8)', value: 'SEV_SEVERE' },
      { code: 'SEV_UNBEARABLE', label: 'Very Severe / Unbearable (9-10)', value: 'SEV_UNBEARABLE' },
    ],
    isCritical: false,
    isRequired: true,
    order: 5,
  },

  // 3. PAST MEDICAL HISTORY
  {
    questionCode: 'PAST_CONDITIONS',
    section: InterviewSections.PAST_MEDICAL_HISTORY,
    promptText: 'Have you been previously diagnosed with any ongoing medical conditions?',
    promptAudioHint: 'Please select all past conditions diagnosed by a doctor.',
    questionType: QuestionTypes.MULTI_CHOICE,
    answerOptions: [
      { code: 'COND_DIABETES', label: 'Diabetes (சர்க்கரை நோய்)', value: 'COND_DIABETES' },
      { code: 'COND_HYPERTENSION', label: 'Hypertension / High BP (உயர் ரத்த அழுத்தம்)', value: 'COND_HYPERTENSION' },
      { code: 'COND_HEART', label: 'Heart Disease / Cardiac condition (இதய நோய்)', value: 'COND_HEART' },
      { code: 'COND_ASTHMA', label: 'Asthma / Chronic Breathing issue (ஆஸ்துமா)', value: 'COND_ASTHMA' },
      { code: 'COND_KIDNEY', label: 'Kidney Disease (சிறுநீரக நோய்)', value: 'COND_KIDNEY' },
      { code: 'COND_THYROID', label: 'Thyroid condition (தைராய்டு)', value: 'COND_THYROID' },
      { code: 'COND_NONE', label: 'None of the above (எதுவுமில்லை)', value: 'COND_NONE' },
    ],
    isCritical: true,
    isRequired: true,
    order: 6,
  },
  {
    questionCode: 'PAST_SURGERIES',
    section: InterviewSections.PAST_MEDICAL_HISTORY,
    promptText: 'Have you undergone any surgeries or major hospital admissions in the past?',
    promptAudioHint: 'Have you had any operations or stayed in hospital previously?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: false,
    isRequired: false,
    order: 7,
  },

  // 4. MEDICATIONS
  {
    questionCode: 'CURRENT_MEDICATIONS',
    section: InterviewSections.MEDICATIONS,
    promptText: 'Are you currently taking any daily prescription medicines or regular tablets?',
    promptAudioHint: 'Do you take any regular medicines for BP, sugar, or other illnesses?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: true,
    isRequired: true,
    order: 8,
  },

  // 5. ALLERGIES
  {
    questionCode: 'ALLERGIES',
    section: InterviewSections.ALLERGIES,
    promptText: 'Do you have any known allergies to medicines, penicillin, foods, or injections?',
    promptAudioHint: 'Have you had a bad reaction or allergy to any tablet, injection, or food?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: true,
    isRequired: true,
    order: 9,
  },

  // 6. LIFESTYLE FACTORS
  {
    questionCode: 'LIFESTYLE_HABITS',
    section: InterviewSections.LIFESTYLE,
    promptText: 'Do you use tobacco, beedi, cigarettes, or consume alcohol?',
    promptAudioHint: 'Do you smoke, chew tobacco, or drink alcohol regularly?',
    questionType: QuestionTypes.SINGLE_CHOICE,
    answerOptions: [
      { code: 'HABIT_NEVER', label: 'No / Never', value: 'HABIT_NEVER' },
      { code: 'HABIT_QUIT', label: 'Former user (Quit)', value: 'HABIT_QUIT' },
      { code: 'HABIT_OCCASIONAL', label: 'Occasional user', value: 'HABIT_OCCASIONAL' },
      { code: 'HABIT_REGULAR', label: 'Daily / Regular user', value: 'HABIT_REGULAR' },
    ],
    isCritical: false,
    isRequired: false,
    order: 10,
  },

  // 7. FAMILY HISTORY
  {
    questionCode: 'FAMILY_HISTORY',
    section: InterviewSections.FAMILY_HISTORY,
    promptText: 'Is there a family history of early heart disease, stroke, or diabetes in your parents or siblings?',
    promptAudioHint: 'Did your parents or siblings have heart attacks, diabetes, or stroke at an early age?',
    questionType: QuestionTypes.YES_NO,
    answerOptions: [
      { code: 'YES', label: 'Yes', value: 'YES' },
      { code: 'NO', label: 'No', value: 'NO' },
    ],
    isCritical: false,
    isRequired: false,
    order: 11,
  },
];
