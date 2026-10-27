import { z } from 'zod';
import {
  SeverityTiers,
  ConditionOperators,
  ControlledDismissalReasons,
  ControlledResolutionTypes,
  FactStates,
  RuleEvaluationOutcomes,
} from './redflags.types.js';

// Recursive Condition Tree Zod Schema
const LeafConditionSchema = z.object({
  fact: z.string().min(1, 'Fact key is required'),
  operator: z.nativeEnum(ConditionOperators),
  value: z.any().optional(),
  secondaryValue: z.any().optional(),
});

export type LeafConditionInput = z.infer<typeof LeafConditionSchema>;

export const ConditionTreeSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    LeafConditionSchema,
    z.object({
      operator: z.enum(['AND', 'OR', 'NOT']),
      conditions: z.array(ConditionTreeSchema).min(1, 'At least one condition is required in group'),
    }),
  ])
);

export const RuleTestCaseSchema = z.object({
  name: z.string().min(1, 'Test case name is required'),
  facts: z.record(
    z.object({
      state: z.nativeEnum(FactStates),
      value: z.any().optional(),
    })
  ),
  expectedOutcome: z.nativeEnum(RuleEvaluationOutcomes),
});

export const CreateRuleSchema = z.object({
  ruleCode: z.string().min(2).max(100).regex(/^[A-Z0-9_-]+$/, 'Rule code must be alphanumeric with dashes/underscores'),
  name: z.string().min(3).max(255),
  description: z.string().min(5),
  severityTier: z.nativeEnum(SeverityTiers),
  conditionTree: ConditionTreeSchema,
  testCases: z.array(RuleTestCaseSchema).optional(),
  raiseOnIndeterminate: z.boolean().default(true),
  recommendedStaffAction: z.string().min(5),
  isIllustrative: z.boolean().default(false),
});

export const UpdateRuleSchema = CreateRuleSchema.partial();

export const HelpRequestSchema = z.object({
  kioskDeviceId: z.string().uuid().nullable().optional(),
  kioskLocation: z.string().max(255).optional(),
  reason: z.string().max(255).optional(),
});

export const AcknowledgeAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

export const StartAssessmentSchema = z.object({
  note: z.string().max(500).optional(),
});

export const ResolveAlertSchema = z.object({
  resolutionType: z.nativeEnum(ControlledResolutionTypes),
  resolutionNote: z.string().max(1000).optional(),
});

export const EscalateAlertSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const DismissAlertSchema = z.object({
  dismissalReason: z.nativeEnum(ControlledDismissalReasons),
  note: z.string().max(1000).optional(),
});

export const AlertFilterSchema = z.object({
  status: z.string().optional(),
  severityTier: z.string().optional(),
  visitId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});
