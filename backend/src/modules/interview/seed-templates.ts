import {
  InterviewSections,
  QuestionTypes,
} from '../../types/interview.types.js';

export interface SeedQuestion {
  section: string;
  promptText: string;
  promptAudioHint?: string;
  questionType: string;
  answerOptions?: string[];
  isCritical: boolean;
  isRequired: boolean;
  order: number;
}

export const DEFAULT_GENERAL_OPD_QUESTIONS: SeedQuestion[] = [
  // 1. CHIEF COMPLAINT
  {
    section: InterviewSections.CHIEF_COMPLAINT,
    promptText: 'What is your primary reason or main health problem for visiting the doctor today?',
    promptAudioHint: 'Please describe the main symptom or illness you are experiencing.',
    questionType: QuestionTypes.FREE_TEXT,
    isCritical: true,
    isRequired: true,
    order: 1,
  },
  {
    section: InterviewSections.CHIEF_COMPLAINT,
    promptText: 'How long have you been experiencing these main symptoms?',
    promptAudioHint: 'How many days, weeks, or months ago did this problem start?',
    questionType: QuestionTypes.DURATION,
    answerOptions: ['Less than 24 hours', '1 to 3 days', '4 to 7 days', '1 to 4 weeks', 'More than 1 month'],
    isCritical: false,
    isRequired: true,
    order: 2,
  },

  // 2. PRESENT ILLNESS HISTORY
  {
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'Do you currently have chest pain, chest heaviness, or difficulty breathing?',
    promptAudioHint: 'Have you felt pain in your chest or shortness of breath today?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    isCritical: true,
    isRequired: true,
    order: 3,
  },
  {
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'Do you currently have high fever, chills, or body shivering?',
    promptAudioHint: 'Do you have hot fever or cold shivers?',
    questionType: QuestionTypes.YES_NO,
    isCritical: true,
    isRequired: true,
    order: 4,
  },
  {
    section: InterviewSections.PRESENT_ILLNESS_HISTORY,
    promptText: 'How would you rate the severity of your pain or discomfort right now?',
    promptAudioHint: 'On a scale from 0 to 10, how severe is your pain?',
    questionType: QuestionTypes.SINGLE_CHOICE,
    answerOptions: ['None (0)', 'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-8)', 'Very Severe / Unbearable (9-10)'],
    isCritical: false,
    isRequired: true,
    order: 5,
  },

  // 3. PAST MEDICAL HISTORY
  {
    section: InterviewSections.PAST_MEDICAL_HISTORY,
    promptText: 'Have you been previously diagnosed with any ongoing medical conditions?',
    promptAudioHint: 'Please select all past conditions diagnosed by a doctor.',
    questionType: QuestionTypes.MULTI_CHOICE,
    answerOptions: [
      'Diabetes (சர்க்கரை நோய்)',
      'Hypertension / High BP (உயர் ரத்த அழுத்தம்)',
      'Heart Disease / Cardiac condition (இதய நோய்)',
      'Asthma / Chronic Breathing issue (ஆஸ்துமா)',
      'Kidney Disease (சிறுநீரக நோய்)',
      'Thyroid condition (தைராய்டு)',
      'None of the above (எதுவுமில்லை)',
    ],
    isCritical: true,
    isRequired: true,
    order: 6,
  },
  {
    section: InterviewSections.PAST_MEDICAL_HISTORY,
    promptText: 'Have you undergone any surgeries or major hospital admissions in the past?',
    promptAudioHint: 'Have you had any operations or stayed in hospital previously?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    isCritical: false,
    isRequired: false,
    order: 7,
  },

  // 4. MEDICATIONS
  {
    section: InterviewSections.MEDICATIONS,
    promptText: 'Are you currently taking any daily prescription medicines or regular tablets?',
    promptAudioHint: 'Do you take any regular medicines for BP, sugar, or other illnesses?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    isCritical: true,
    isRequired: true,
    order: 8,
  },

  // 5. ALLERGIES
  {
    section: InterviewSections.ALLERGIES,
    promptText: 'Do you have any known allergies to medicines, penicillin, foods, or injections?',
    promptAudioHint: 'Have you had a bad reaction or allergy to any tablet, injection, or food?',
    questionType: QuestionTypes.YES_NO_WITH_DETAIL,
    isCritical: true,
    isRequired: true,
    order: 9,
  },

  // 6. LIFESTYLE FACTORS
  {
    section: InterviewSections.LIFESTYLE,
    promptText: 'Do you use tobacco, beedi, cigarettes, or consume alcohol?',
    promptAudioHint: 'Do you smoke, chew tobacco, or drink alcohol regularly?',
    questionType: QuestionTypes.SINGLE_CHOICE,
    answerOptions: ['No / Never', 'Former user (Quit)', 'Occasional user', 'Daily / Regular user'],
    isCritical: false,
    isRequired: false,
    order: 10,
  },

  // 7. FAMILY HISTORY
  {
    section: InterviewSections.FAMILY_HISTORY,
    promptText: 'Is there a family history of early heart disease, stroke, or diabetes in your parents or siblings?',
    promptAudioHint: 'Did your parents or siblings have heart attacks, diabetes, or stroke at an early age?',
    questionType: QuestionTypes.YES_NO,
    isCritical: false,
    isRequired: false,
    order: 11,
  },
];
