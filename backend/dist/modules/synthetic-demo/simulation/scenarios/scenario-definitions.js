"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioDefinitionService = exports.NAMED_SCENARIOS = void 0;
exports.NAMED_SCENARIOS = [
    {
        id: 'happy_path',
        name: 'Standard Happy Path Intake to Confirmation',
        category: 'CLINICAL',
        description: 'Routine adult intake with complete answers, prescription upload, AI draft review, and doctor confirmation.',
        persona: 'normal_adult',
        expectedOutcome: 'CONFIRMED_RECORD_V1',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'GENMED' }, expectedStatus: 200, expectedAssertion: 'Visit checked in and token slip issued' },
            { stepNumber: 2, action: 'COMPLETE_INTERVIEW', payload: { persona: 'normal_adult' }, expectedStatus: 200, expectedAssertion: 'All answers accepted with 100% completion' },
            { stepNumber: 3, action: 'UPLOAD_PRESCRIPTION', payload: { isDegraded: false }, expectedStatus: 200, expectedAssertion: 'Prescription OCR validated against formulary' },
            { stepNumber: 4, action: 'GENERATE_AI_SUMMARY', payload: {}, expectedStatus: 200, expectedAssertion: 'Summary generated with zero hallucinations' },
            { stepNumber: 5, action: 'DOCTOR_CLAIM_AND_CONFIRM', payload: {}, expectedStatus: 200, expectedAssertion: 'Doctor confirms record with version 1' },
        ],
    },
    {
        id: 'unreadable_allergy',
        name: 'Unreadable Allergy OCR Degradation Gate',
        category: 'SAFETY',
        description: 'Skewed handwritten prescription with illegible allergy item; validation gate marks field unreadable for manual doctor review.',
        persona: 'normal_adult',
        expectedOutcome: 'TO_CLARIFY_ALLERGY_FLAGGED',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'GENMED' }, expectedStatus: 200, expectedAssertion: 'Visit started' },
            { stepNumber: 2, action: 'UPLOAD_PRESCRIPTION', payload: { isDegraded: true, blurRadiusPx: 2.5 }, expectedStatus: 200, expectedAssertion: 'OCR confidence below threshold' },
            { stepNumber: 3, action: 'VALIDATE_DOC_FIELDS', payload: {}, expectedStatus: 200, expectedAssertion: 'Allergy item flagged UNREADABLE_MANUAL_REVIEW' },
            { stepNumber: 4, action: 'GENERATE_AI_SUMMARY', payload: {}, expectedStatus: 200, expectedAssertion: 'Summary creates TO_CLARIFY review item' },
        ],
    },
    {
        id: 'interview_document_conflict',
        name: 'Interview vs Document Contradiction Detection',
        category: 'SAFETY',
        description: 'Patient verbally denies chronic conditions, but uploaded prescription shows Atenolol; contradiction is highlighted.',
        persona: 'contradictory',
        expectedOutcome: 'CONTRADICTION_FLAGGED_TO_CLARIFY',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'CARDIOLOGY' }, expectedStatus: 200, expectedAssertion: 'Visit started' },
            { stepNumber: 2, action: 'COMPLETE_INTERVIEW', payload: { persona: 'contradictory' }, expectedStatus: 200, expectedAssertion: 'Interview records "no chronic diseases"' },
            { stepNumber: 3, action: 'UPLOAD_PRESCRIPTION', payload: { medications: ['Atenolol 50mg'] }, expectedStatus: 200, expectedAssertion: 'Prescription contains anti-hypertensive' },
            { stepNumber: 4, action: 'DETECT_CONTRADICTIONS', payload: {}, expectedStatus: 200, expectedAssertion: 'Cross-check flags conflict between statement and document' },
        ],
    },
    {
        id: 'red_flag_emergency',
        name: 'Red-Flag Emergency Triage Alert',
        category: 'SAFETY',
        description: 'Patient reports severe chest pain radiating to left arm; Module 6 triggers immediate stat triage alert and kiosk warning.',
        persona: 'normal_adult',
        expectedOutcome: 'EMERGENT_TRIAGE_ALERT_DISPATCHED',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'CARDIOLOGY' }, expectedStatus: 200, expectedAssertion: 'Visit started' },
            { stepNumber: 2, action: 'SUBMIT_CRITICAL_SYMPTOMS', payload: { chiefComplaint: 'Severe crushing chest pain radiating to left arm', severity: 9 }, expectedStatus: 200, expectedAssertion: 'Rule RF_CHEST_PAIN evaluates to TRUE' },
            { stepNumber: 3, action: 'CHECK_TRIAGE_ALERTS', payload: {}, expectedStatus: 200, expectedAssertion: 'Emergency STAT alert active with priority 1' },
        ],
    },
    {
        id: 'voice_failure_fallback',
        name: 'Voice STT Noise Failure & Touch Fallback',
        category: 'RESILIENCE',
        description: 'Severe ambient clinic noise causes speech recognition confidence to drop below threshold; kiosk automatically reverts to touch UI.',
        persona: 'normal_adult',
        expectedOutcome: 'VOICE_DEGRADED_TOUCH_FALLBACK_ACTIVE',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'GENMED' }, expectedStatus: 200, expectedAssertion: 'Visit started' },
            { stepNumber: 2, action: 'PROCESS_AUDIO_STREAM', payload: { noiseType: 'COUGH_BURST', snrDb: 5 }, expectedStatus: 200, expectedAssertion: 'Confidence 0.58 below 0.70 threshold' },
            { stepNumber: 3, action: 'TRIGGER_FALLBACK', payload: {}, expectedStatus: 200, expectedAssertion: 'Kiosk transitions gracefully to on-screen touch keyboard' },
        ],
    },
    {
        id: 'offline_and_sync',
        name: 'Kiosk Offline Resilience & Queue Sync',
        category: 'RESILIENCE',
        description: 'Network drops during intake session; answers are buffered locally in kiosk storage and synced on connection restoration.',
        persona: 'normal_adult',
        expectedOutcome: 'OFFLINE_BUFFERED_AND_SYNCED',
        steps: [
            { stepNumber: 1, action: 'SIMULATE_NETWORK_OFFLINE', payload: {}, expectedStatus: 200, expectedAssertion: 'Network state set to OFFLINE' },
            { stepNumber: 2, action: 'BUFFER_OFFLINE_ANSWERS', payload: { count: 3 }, expectedStatus: 200, expectedAssertion: 'Answers stored in offline queue' },
            { stepNumber: 3, action: 'SIMULATE_NETWORK_ONLINE', payload: {}, expectedStatus: 200, expectedAssertion: 'Network restored' },
            { stepNumber: 4, action: 'FLUSH_SYNC_QUEUE', payload: {}, expectedStatus: 200, expectedAssertion: 'Buffered intake synced to central store with zero data loss' },
        ],
    },
    {
        id: 'language_switch',
        name: 'Mid-Session Seamless Language Switch',
        category: 'CLINICAL',
        description: 'Patient starts intake in English, switches to Tamil mid-session; previously entered facts and remaining questions preserve state.',
        persona: 'companion_assisted',
        expectedOutcome: 'LANGUAGE_SWITCHED_STATE_PRESERVED',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { language: 'en' }, expectedStatus: 200, expectedAssertion: 'English intake initialized' },
            { stepNumber: 2, action: 'SUBMIT_ANSWER', payload: { questionId: 'q_cc', value: 'Headache' }, expectedStatus: 200, expectedAssertion: 'First answer recorded' },
            { stepNumber: 3, action: 'SWITCH_LANGUAGE', payload: { targetLanguage: 'ta' }, expectedStatus: 200, expectedAssertion: 'UI switches to Tamil; existing answers intact' },
        ],
    },
    {
        id: 'kiosk_reboot_recovery',
        name: 'Kiosk Terminal Crash & Session Recovery',
        category: 'RESILIENCE',
        description: 'Kiosk app restarts mid-intake; patient scans token barcode and resumes intake at exact last question without loss.',
        persona: 'normal_adult',
        expectedOutcome: 'SESSION_RECOVERED_EXACT_STEP',
        steps: [
            { stepNumber: 1, action: 'KIOSK_START_VISIT', payload: { departmentCode: 'GENMED' }, expectedStatus: 200, expectedAssertion: 'Session started with token' },
            { stepNumber: 2, action: 'SUBMIT_ANSWER', payload: { step: 2 }, expectedStatus: 200, expectedAssertion: 'Progress reached step 2' },
            { stepNumber: 3, action: 'SIMULATE_CRASH_REBOOT', payload: {}, expectedStatus: 200, expectedAssertion: 'Client state wiped' },
            { stepNumber: 4, action: 'RESUME_SESSION_WITH_TOKEN', payload: {}, expectedStatus: 200, expectedAssertion: 'Backend restores session at step 2' },
        ],
    },
    {
        id: 'summary_failure_fallback',
        name: 'AI Hallucination Breach & Deterministic Template Fallback',
        category: 'SAFETY',
        description: 'Cloud LLM returns ungrounded clinical statement; grounding check rejects draft and switches to deterministic template summary.',
        persona: 'normal_adult',
        expectedOutcome: 'TEMPLATE_FALLBACK_SUMMARY_GENERATED',
        steps: [
            { stepNumber: 1, action: 'INJECT_UNGROUNDED_LLM_DRAFT', payload: { ungroundedText: 'Patient has advanced tuberculosis' }, expectedStatus: 200, expectedAssertion: 'Draft received from LLM' },
            { stepNumber: 2, action: 'EXECUTE_GROUNDING_VALIDATOR', payload: {}, expectedStatus: 200, expectedAssertion: 'Grounding validator flags ungrounded claim' },
            { stepNumber: 3, action: 'ACTIVATE_TEMPLATE_FALLBACK', payload: {}, expectedStatus: 200, expectedAssertion: 'Pure deterministic template generated with provenance banner' },
        ],
    },
    {
        id: 'two_doctors_concurrency',
        name: 'Concurrent Doctor Review Claim Conflict',
        category: 'CONCURRENCY',
        description: 'Two physicians attempt to claim the same patient review simultaneously; second claim receives 409 conflict.',
        persona: 'normal_adult',
        expectedOutcome: 'CONCURRENT_CLAIM_REJECTED_409',
        steps: [
            { stepNumber: 1, action: 'DOCTOR_1_CLAIM_REVIEW', payload: { doctorId: 'doc_1' }, expectedStatus: 200, expectedAssertion: 'Doctor 1 locks review successfully' },
            { stepNumber: 2, action: 'DOCTOR_2_CLAIM_REVIEW', payload: { doctorId: 'doc_2' }, expectedStatus: 409, expectedAssertion: 'Doctor 2 receives REVIEW_CLAIMED_BY_OTHER' },
        ],
    },
    {
        id: 'amendment_versioning',
        name: 'Post-Confirmation Clinical Amendment (v1 -> v2)',
        category: 'CLINICAL',
        description: 'Doctor confirms record v1, later receives new lab result, creates amended record v2 with mandatory audit reason.',
        persona: 'normal_adult',
        expectedOutcome: 'RECORD_V2_SUPERSEDES_V1',
        steps: [
            { stepNumber: 1, action: 'CONFIRM_RECORD_V1', payload: {}, expectedStatus: 200, expectedAssertion: 'Record version 1 confirmed' },
            { stepNumber: 2, action: 'AMEND_RECORD', payload: { reason: 'Added late potassium lab report', edit: 'Serum Potassium 4.1 mEq/L' }, expectedStatus: 200, expectedAssertion: 'Record v2 created' },
            { stepNumber: 3, action: 'VERIFY_SUPERSEDED_AUDIT', payload: {}, expectedStatus: 200, expectedAssertion: 'Version 1 marked SUPERSEDED; immutable audit linked' },
        ],
    },
    {
        id: 'downtime_degradation',
        name: 'Hospital EHR Outage Hand-Off Graceful Degradation',
        category: 'RESILIENCE',
        description: 'External hospital EHR gateway drops offline; doctor confirmation completes uninterrupted and push is routed to failure queue.',
        persona: 'normal_adult',
        expectedOutcome: 'CONFIRMATION_UNAFFECTED_HANDOFF_QUEUED',
        steps: [
            { stepNumber: 1, action: 'SIMULATE_HOSPITAL_GATEWAY_DOWN', payload: {}, expectedStatus: 200, expectedAssertion: 'Gateway 503 simulated' },
            { stepNumber: 2, action: 'CONFIRM_DOCTOR_RECORD', payload: {}, expectedStatus: 200, expectedAssertion: 'Doctor confirmation returns 200 SUCCESS immediately' },
            { stepNumber: 3, action: 'CHECK_FAILURE_QUEUE', payload: {}, expectedStatus: 200, expectedAssertion: 'Hand-off safely enqueued in admin failure queue for retry' },
        ],
    },
];
class ScenarioDefinitionService {
    static getAllScenarios() {
        return exports.NAMED_SCENARIOS;
    }
    static getScenarioById(id) {
        return exports.NAMED_SCENARIOS.find((s) => s.id === id);
    }
}
exports.ScenarioDefinitionService = ScenarioDefinitionService;
