"use strict";
// Module 5 — AI Clinical Summarization Engine Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryJobStatuses = exports.SummaryPromptStatuses = exports.SummaryStatuses = exports.GenerationModes = exports.StatementOrigins = exports.SummaryItemStatuses = exports.SummarySections = void 0;
exports.SummarySections = {
    CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
    HISTORY_OF_PRESENT_ILLNESS: 'HISTORY_OF_PRESENT_ILLNESS',
    PAST_MEDICAL_HISTORY: 'PAST_MEDICAL_HISTORY',
    MEDICATIONS_AND_ALLERGIES: 'MEDICATIONS_AND_ALLERGIES',
    FAMILY_AND_PERSONAL_HISTORY: 'FAMILY_AND_PERSONAL_HISTORY',
    REVIEW_OF_SYSTEMS: 'REVIEW_OF_SYSTEMS',
    PRIOR_INVESTIGATIONS: 'PRIOR_INVESTIGATIONS',
};
exports.SummaryItemStatuses = {
    ANSWERED: 'ANSWERED',
    SKIPPED: 'SKIPPED',
    DECLINED: 'DECLINED',
    NOT_ANSWERED: 'NOT_ANSWERED',
    VERIFIED: 'VERIFIED',
    UNVERIFIED: 'UNVERIFIED',
    UNREADABLE: 'UNREADABLE',
    MISMATCH_FLAGGED: 'MISMATCH_FLAGGED',
};
exports.StatementOrigins = {
    MODEL: 'MODEL',
    CODE_TEMPLATE: 'CODE_TEMPLATE',
    PATIENT_QUOTE: 'PATIENT_QUOTE',
};
exports.GenerationModes = {
    LLM: 'LLM',
    TEMPLATE_FALLBACK: 'TEMPLATE_FALLBACK',
};
exports.SummaryStatuses = {
    DRAFT_GENERATED: 'DRAFT_GENERATED',
    PENDING_DOCTOR_REVIEW: 'PENDING_DOCTOR_REVIEW',
    STALE: 'STALE',
    FAILED: 'FAILED',
};
exports.SummaryPromptStatuses = {
    DRAFT: 'DRAFT',
    IN_REVIEW: 'IN_REVIEW',
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
};
exports.SummaryJobStatuses = {
    PENDING: 'PENDING',
    GENERATING: 'GENERATING',
    READY: 'READY',
    FAILED: 'FAILED',
    STALE: 'STALE',
};
