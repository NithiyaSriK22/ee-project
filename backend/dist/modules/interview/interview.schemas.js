"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveSectionConsentSchema = exports.flagPatientUnwellSchema = exports.deferToDoctorSchema = exports.updateHeadsetSchema = exports.configureSurrogateModeSchema = exports.configureGuardianModeSchema = exports.submitInterviewAnswerSchema = exports.startKioskInterviewSchema = exports.updateInterviewQuestionSchema = exports.createInterviewQuestionSchema = exports.branchingRuleSchema = exports.updateInterviewTemplateSchema = exports.createInterviewTemplateSchema = void 0;
const zod_1 = require("zod");
const interview_types_js_1 = require("../../types/interview.types.js");
exports.createInterviewTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Template name must be at least 2 characters').max(255),
    description: zod_1.z.string().trim().max(2000).optional(),
    applicableVisitType: zod_1.z.string().trim().default('GENERAL_OPD'),
    version: zod_1.z.string().trim().default('1.0.0'),
    changeSummary: zod_1.z.string().trim().max(1000).optional(),
});
exports.updateInterviewTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(255).optional(),
    description: zod_1.z.string().trim().max(2000).optional(),
    applicableVisitType: zod_1.z.string().trim().optional(),
    status: zod_1.z
        .enum([
        interview_types_js_1.TemplateStatus.DRAFT,
        interview_types_js_1.TemplateStatus.REVIEW,
        interview_types_js_1.TemplateStatus.PUBLISHED,
        interview_types_js_1.TemplateStatus.ACTIVE,
        interview_types_js_1.TemplateStatus.RETIRED,
    ])
        .optional(),
    changeSummary: zod_1.z.string().trim().max(1000).optional(),
    version: zod_1.z.string().trim().optional(),
});
exports.branchingRuleSchema = zod_1.z.object({
    trigger_condition: zod_1.z.object({
        answer: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]).optional(),
        operator: zod_1.z.enum(['EQUALS', 'CONTAINS', 'NOT_EQUALS', 'GREATER_THAN']).default('EQUALS'),
    }),
    next_question_id: zod_1.z.string().uuid('next_question_id must be a valid UUID'),
});
exports.createInterviewQuestionSchema = zod_1.z.object({
    section: zod_1.z.enum([
        interview_types_js_1.InterviewSections.CHIEF_COMPLAINT,
        interview_types_js_1.InterviewSections.PRESENT_ILLNESS_HISTORY,
        interview_types_js_1.InterviewSections.PAST_MEDICAL_HISTORY,
        interview_types_js_1.InterviewSections.MEDICATIONS,
        interview_types_js_1.InterviewSections.ALLERGIES,
        interview_types_js_1.InterviewSections.LIFESTYLE,
        interview_types_js_1.InterviewSections.FAMILY_HISTORY,
    ]),
    promptText: zod_1.z.string().trim().min(2, 'Question prompt text is required').max(1000),
    promptAudioHint: zod_1.z.string().trim().max(1000).optional(),
    questionType: zod_1.z.enum([
        interview_types_js_1.QuestionTypes.YES_NO,
        interview_types_js_1.QuestionTypes.YES_NO_WITH_DETAIL,
        interview_types_js_1.QuestionTypes.FREE_TEXT,
        interview_types_js_1.QuestionTypes.SINGLE_CHOICE,
        interview_types_js_1.QuestionTypes.MULTI_CHOICE,
        interview_types_js_1.QuestionTypes.NUMERIC,
        interview_types_js_1.QuestionTypes.DATE,
        interview_types_js_1.QuestionTypes.DURATION,
    ]),
    answerOptions: zod_1.z
        .union([
        zod_1.z.array(zod_1.z.string().trim().min(1)),
        zod_1.z.array(zod_1.z.object({
            label: zod_1.z.string(),
            value: zod_1.z.string(),
            subPrompt: zod_1.z.string().optional(),
        })),
    ])
        .optional(),
    isCritical: zod_1.z.boolean().default(false),
    isRequired: zod_1.z.boolean().default(true),
    order: zod_1.z.number().int().default(0),
    branchingLogic: zod_1.z.array(exports.branchingRuleSchema).optional(),
    sensitivityLevel: zod_1.z.enum(['NORMAL', 'SENSITIVE', 'HIGHLY_SENSITIVE']).default('NORMAL'),
    visibilityScope: zod_1.z.enum(['STAFF_VISIBLE', 'CLINICAL_STAFF', 'DOCTOR_ONLY']).default('STAFF_VISIBLE'),
    ageMin: zod_1.z.number().int().min(0).max(120).optional(),
    ageMax: zod_1.z.number().int().min(0).max(120).optional(),
    sexApplicability: zod_1.z.enum(['ALL', 'MALE', 'FEMALE', 'INTERSEX', 'OTHER']).default('ALL'),
    pregnancyGated: zod_1.z.boolean().default(false),
    audioAllowedInPublic: zod_1.z.boolean().default(true),
    aiSummarizationAllowed: zod_1.z.boolean().default(true),
    carryForwardAllowed: zod_1.z.boolean().default(true),
});
exports.updateInterviewQuestionSchema = exports.createInterviewQuestionSchema.partial().extend({
    isArchived: zod_1.z.boolean().optional(),
});
exports.startKioskInterviewSchema = zod_1.z.object({
    templateId: zod_1.z.string().uuid().optional(),
    headsetConnected: zod_1.z.boolean().default(false),
});
exports.submitInterviewAnswerSchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid('Question ID must be a valid UUID'),
    answerValue: zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.number(),
        zod_1.z.boolean(),
        zod_1.z.array(zod_1.z.string()),
        zod_1.z.object({
            value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]).optional(),
            detail: zod_1.z.string().optional(),
            unit: zod_1.z.string().optional(),
            status: zod_1.z.string().optional(),
            deferralReason: zod_1.z.string().optional(),
        }),
    ]),
    answeredVia: zod_1.z
        .preprocess((val) => (typeof val === 'string' ? val.toLowerCase() : val), zod_1.z.enum([
        interview_types_js_1.AnsweredVia.VOICE,
        interview_types_js_1.AnsweredVia.TOUCH,
        interview_types_js_1.AnsweredVia.STAFF_ASSISTED,
        interview_types_js_1.AnsweredVia.COMPANION_ASSISTED,
        interview_types_js_1.AnsweredVia.GUARDIAN,
        interview_types_js_1.AnsweredVia.SURROGATE,
        interview_types_js_1.AnsweredVia.PATIENT,
    ]))
        .default(interview_types_js_1.AnsweredVia.TOUCH),
    languageUsed: zod_1.z.string().trim().max(10).default('en'),
    isSkipped: zod_1.z.boolean().default(false),
    isDeferredToDoctor: zod_1.z.boolean().default(false),
    provenanceLabel: zod_1.z.string().trim().max(255).optional(),
    deferralReason: zod_1.z.string().trim().max(500).optional(),
});
exports.configureGuardianModeSchema = zod_1.z.object({
    guardianName: zod_1.z.string().trim().min(2, 'Guardian name must be at least 2 characters').max(255),
    guardianRelationship: zod_1.z.string().trim().min(2, 'Relationship is required').max(100),
    guardianPhone: zod_1.z.string().trim().max(20).optional(),
    guardianConsentVerified: zod_1.z.boolean().refine((v) => v === true, {
        message: 'Guardian consent verification is required to proceed with minor intake',
    }),
    minorAssentObtained: zod_1.z.boolean().optional(),
});
exports.configureSurrogateModeSchema = zod_1.z.object({
    surrogateName: zod_1.z.string().trim().min(2, 'Surrogate name must be at least 2 characters').max(255),
    surrogateRelationship: zod_1.z.string().trim().min(2, 'Relationship is required').max(100),
    surrogatePhone: zod_1.z.string().trim().max(20).optional(),
    reason: zod_1.z.enum([
        'PATIENT_UNWELL',
        'COGNITIVE_IMPAIRMENT',
        'PHYSICAL_DISABILITY',
        'LANGUAGE_BARRIER',
        'REFUSED_DEVICE',
        'OTHER',
    ]),
    acuteDistressNoted: zod_1.z.boolean().default(false),
});
exports.updateHeadsetSchema = zod_1.z.object({
    connected: zod_1.z.boolean(),
});
exports.deferToDoctorSchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid('Question ID must be a valid UUID'),
    reason: zod_1.z.string().trim().max(500).optional(),
});
exports.flagPatientUnwellSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().max(500).optional(),
    flaggedByStaff: zod_1.z.boolean().default(true),
});
exports.sensitiveSectionConsentSchema = zod_1.z.object({
    section: zod_1.z.string().trim().min(1, 'Section name is required'),
    action: zod_1.z.enum(['CONSENT_GIVEN', 'SKIP_SECTION', 'DEFER_ALL_TO_DOCTOR']),
    companionPresent: zod_1.z.boolean().default(false),
    requestedPrivateMode: zod_1.z.boolean().default(false),
});
