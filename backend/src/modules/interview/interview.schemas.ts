import { z } from 'zod';
import {
  InterviewSections,
  QuestionTypes,
  TemplateStatus,
  AnsweredVia,
} from '../../types/interview.types.js';

export const createInterviewTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Template name must be at least 2 characters').max(255),
  description: z.string().trim().max(2000).optional(),
  applicableVisitType: z.string().trim().default('GENERAL_OPD'),
  version: z.string().trim().default('1.0.0'),
  changeSummary: z.string().trim().max(1000).optional(),
});

export const updateInterviewTemplateSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  applicableVisitType: z.string().trim().optional(),
  status: z
    .enum([
      TemplateStatus.DRAFT,
      TemplateStatus.REVIEW,
      TemplateStatus.PUBLISHED,
      TemplateStatus.ACTIVE,
      TemplateStatus.RETIRED,
    ])
    .optional(),
  changeSummary: z.string().trim().max(1000).optional(),
  version: z.string().trim().optional(),
});

export const branchingRuleSchema = z.object({
  trigger_condition: z.object({
    answer: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
    operator: z.enum(['EQUALS', 'CONTAINS', 'NOT_EQUALS', 'GREATER_THAN']).default('EQUALS'),
  }),
  next_question_id: z.string().uuid('next_question_id must be a valid UUID'),
});

export const createInterviewQuestionSchema = z.object({
  section: z.enum([
    InterviewSections.CHIEF_COMPLAINT,
    InterviewSections.PRESENT_ILLNESS_HISTORY,
    InterviewSections.PAST_MEDICAL_HISTORY,
    InterviewSections.MEDICATIONS,
    InterviewSections.ALLERGIES,
    InterviewSections.LIFESTYLE,
    InterviewSections.FAMILY_HISTORY,
  ] as [string, ...string[]]),
  promptText: z.string().trim().min(2, 'Question prompt text is required').max(1000),
  promptAudioHint: z.string().trim().max(1000).optional(),
  questionType: z.enum([
    QuestionTypes.YES_NO,
    QuestionTypes.YES_NO_WITH_DETAIL,
    QuestionTypes.FREE_TEXT,
    QuestionTypes.SINGLE_CHOICE,
    QuestionTypes.MULTI_CHOICE,
    QuestionTypes.NUMERIC,
    QuestionTypes.DATE,
    QuestionTypes.DURATION,
  ] as [string, ...string[]]),
  answerOptions: z
    .union([
      z.array(z.string().trim().min(1)),
      z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          subPrompt: z.string().optional(),
        })
      ),
    ])
    .optional(),
  isCritical: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  order: z.number().int().default(0),
  branchingLogic: z.array(branchingRuleSchema).optional(),
});

export const updateInterviewQuestionSchema = createInterviewQuestionSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const startKioskInterviewSchema = z.object({
  templateId: z.string().uuid().optional(),
});

export const submitInterviewAnswerSchema = z.object({
  questionId: z.string().uuid('Question ID must be a valid UUID'),
  answerValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.object({
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
      detail: z.string().optional(),
      unit: z.string().optional(),
    }),
  ]),
  answeredVia: z
    .enum([
      AnsweredVia.VOICE,
      AnsweredVia.TOUCH,
      AnsweredVia.STAFF_ASSISTED,
      AnsweredVia.COMPANION_ASSISTED,
    ])
    .default(AnsweredVia.TOUCH),
  languageUsed: z.string().trim().max(10).default('en'),
  isSkipped: z.boolean().default(false),
});
