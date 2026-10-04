"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GENERAL_OPD_QUESTIONS = void 0;
const interview_types_js_1 = require("../../types/interview.types.js");
exports.DEFAULT_GENERAL_OPD_QUESTIONS = [
    // 1. CHIEF COMPLAINT
    {
        section: interview_types_js_1.InterviewSections.CHIEF_COMPLAINT,
        promptText: 'What is your primary reason or main health problem for visiting the doctor today?',
        promptAudioHint: 'Please describe the main symptom or illness you are experiencing.',
        questionType: interview_types_js_1.QuestionTypes.FREE_TEXT,
        isCritical: true,
        isRequired: true,
        order: 1,
    },
    {
        section: interview_types_js_1.InterviewSections.CHIEF_COMPLAINT,
        promptText: 'How long have you been experiencing these main symptoms?',
        promptAudioHint: 'How many days, weeks, or months ago did this problem start?',
        questionType: interview_types_js_1.QuestionTypes.DURATION,
        answerOptions: ['Less than 24 hours', '1 to 3 days', '4 to 7 days', '1 to 4 weeks', 'More than 1 month'],
        isCritical: false,
        isRequired: true,
        order: 2,
    },
    // 2. PRESENT ILLNESS HISTORY
    {
        section: interview_types_js_1.InterviewSections.PRESENT_ILLNESS_HISTORY,
        promptText: 'Do you currently have chest pain, chest heaviness, or difficulty breathing?',
        promptAudioHint: 'Have you felt pain in your chest or shortness of breath today?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL,
        isCritical: true,
        isRequired: true,
        order: 3,
    },
    {
        section: interview_types_js_1.InterviewSections.PRESENT_ILLNESS_HISTORY,
        promptText: 'Do you currently have high fever, chills, or body shivering?',
        promptAudioHint: 'Do you have hot fever or cold shivers?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO,
        isCritical: true,
        isRequired: true,
        order: 4,
    },
    {
        section: interview_types_js_1.InterviewSections.PRESENT_ILLNESS_HISTORY,
        promptText: 'How would you rate the severity of your pain or discomfort right now?',
        promptAudioHint: 'On a scale from 0 to 10, how severe is your pain?',
        questionType: interview_types_js_1.QuestionTypes.SINGLE_CHOICE,
        answerOptions: ['None (0)', 'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-8)', 'Very Severe / Unbearable (9-10)'],
        isCritical: false,
        isRequired: true,
        order: 5,
    },
    // 3. PAST MEDICAL HISTORY
    {
        section: interview_types_js_1.InterviewSections.PAST_MEDICAL_HISTORY,
        promptText: 'Have you been previously diagnosed with any ongoing medical conditions?',
        promptAudioHint: 'Please select all past conditions diagnosed by a doctor.',
        questionType: interview_types_js_1.QuestionTypes.MULTI_CHOICE,
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
        section: interview_types_js_1.InterviewSections.PAST_MEDICAL_HISTORY,
        promptText: 'Have you undergone any surgeries or major hospital admissions in the past?',
        promptAudioHint: 'Have you had any operations or stayed in hospital previously?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL,
        isCritical: false,
        isRequired: false,
        order: 7,
    },
    // 4. MEDICATIONS
    {
        section: interview_types_js_1.InterviewSections.MEDICATIONS,
        promptText: 'Are you currently taking any daily prescription medicines or regular tablets?',
        promptAudioHint: 'Do you take any regular medicines for BP, sugar, or other illnesses?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL,
        isCritical: true,
        isRequired: true,
        order: 8,
    },
    // 5. ALLERGIES
    {
        section: interview_types_js_1.InterviewSections.ALLERGIES,
        promptText: 'Do you have any known allergies to medicines, penicillin, foods, or injections?',
        promptAudioHint: 'Have you had a bad reaction or allergy to any tablet, injection, or food?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL,
        isCritical: true,
        isRequired: true,
        order: 9,
    },
    // 6. LIFESTYLE FACTORS
    {
        section: interview_types_js_1.InterviewSections.LIFESTYLE,
        promptText: 'Do you use tobacco, beedi, cigarettes, or consume alcohol?',
        promptAudioHint: 'Do you smoke, chew tobacco, or drink alcohol regularly?',
        questionType: interview_types_js_1.QuestionTypes.SINGLE_CHOICE,
        answerOptions: ['No / Never', 'Former user (Quit)', 'Occasional user', 'Daily / Regular user'],
        isCritical: false,
        isRequired: false,
        order: 10,
    },
    // 7. FAMILY HISTORY
    {
        section: interview_types_js_1.InterviewSections.FAMILY_HISTORY,
        promptText: 'Is there a family history of early heart disease, stroke, or diabetes in your parents or siblings?',
        promptAudioHint: 'Did your parents or siblings have heart attacks, diabetes, or stroke at an early age?',
        questionType: interview_types_js_1.QuestionTypes.YES_NO,
        isCritical: false,
        isRequired: false,
        order: 11,
    },
];
