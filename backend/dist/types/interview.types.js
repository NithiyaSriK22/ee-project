"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerStatus = exports.GuardianRelationships = exports.SurrogateReasons = exports.VisibilityScopes = exports.SensitivityLevels = exports.AnsweredVia = exports.InterviewSessionStatus = exports.TemplateStatus = exports.QuestionTypes = exports.InterviewSections = void 0;
exports.InterviewSections = {
    CHIEF_COMPLAINT: 'CHIEF_COMPLAINT',
    PRESENT_ILLNESS_HISTORY: 'PRESENT_ILLNESS_HISTORY',
    PAST_MEDICAL_HISTORY: 'PAST_MEDICAL_HISTORY',
    MEDICATIONS: 'MEDICATIONS',
    ALLERGIES: 'ALLERGIES',
    LIFESTYLE: 'LIFESTYLE',
    FAMILY_HISTORY: 'FAMILY_HISTORY',
};
exports.QuestionTypes = {
    YES_NO: 'YES_NO',
    YES_NO_WITH_DETAIL: 'YES_NO_WITH_DETAIL',
    FREE_TEXT: 'FREE_TEXT',
    SINGLE_CHOICE: 'SINGLE_CHOICE',
    MULTI_CHOICE: 'MULTI_CHOICE',
    NUMERIC: 'NUMERIC',
    DATE: 'DATE',
    DURATION: 'DURATION',
};
exports.TemplateStatus = {
    DRAFT: 'DRAFT',
    REVIEW: 'REVIEW',
    PUBLISHED: 'PUBLISHED',
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
};
exports.InterviewSessionStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    ABANDONED: 'ABANDONED',
};
exports.AnsweredVia = {
    VOICE: 'voice',
    TOUCH: 'touch',
    STAFF_ASSISTED: 'staff_assisted',
    COMPANION_ASSISTED: 'companion_assisted',
    GUARDIAN: 'guardian',
    SURROGATE: 'surrogate',
    PATIENT: 'patient',
};
exports.SensitivityLevels = {
    NORMAL: 'NORMAL',
    SENSITIVE: 'SENSITIVE',
    HIGHLY_SENSITIVE: 'HIGHLY_SENSITIVE',
};
exports.VisibilityScopes = {
    STAFF_VISIBLE: 'STAFF_VISIBLE',
    CLINICAL_STAFF: 'CLINICAL_STAFF',
    DOCTOR_ONLY: 'DOCTOR_ONLY',
};
exports.SurrogateReasons = {
    PATIENT_UNWELL: 'PATIENT_UNWELL',
    COGNITIVE_IMPAIRMENT: 'COGNITIVE_IMPAIRMENT',
    PHYSICAL_DISABILITY: 'PHYSICAL_DISABILITY',
    LANGUAGE_BARRIER: 'LANGUAGE_BARRIER',
    REFUSED_DEVICE: 'REFUSED_DEVICE',
    OTHER: 'OTHER',
};
exports.GuardianRelationships = {
    PARENT: 'PARENT',
    LEGAL_GUARDIAN: 'LEGAL_GUARDIAN',
    SIBLING: 'SIBLING',
    SPOUSE: 'SPOUSE',
    OTHER: 'OTHER',
};
exports.AnswerStatus = {
    ANSWERED: 'ANSWERED',
    SKIPPED: 'SKIPPED',
    DEFERRED_TO_DOCTOR: 'DEFERRED_TO_DOCTOR',
};
