"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertFilterSchema = exports.DismissAlertSchema = exports.EscalateAlertSchema = exports.ResolveAlertSchema = exports.StartAssessmentSchema = exports.AcknowledgeAlertSchema = exports.HelpRequestSchema = exports.UpdateRuleSchema = exports.CreateRuleSchema = exports.RuleTestCaseSchema = exports.ConditionTreeSchema = void 0;
const zod_1 = require("zod");
const redflags_types_js_1 = require("./redflags.types.js");
// Recursive Condition Tree Zod Schema
const LeafConditionSchema = zod_1.z.object({
    fact: zod_1.z.string().min(1, 'Fact key is required'),
    operator: zod_1.z.nativeEnum(redflags_types_js_1.ConditionOperators),
    value: zod_1.z.any().optional(),
    secondaryValue: zod_1.z.any().optional(),
});
exports.ConditionTreeSchema = zod_1.z.lazy(() => zod_1.z.union([
    LeafConditionSchema,
    zod_1.z.object({
        operator: zod_1.z.enum(['AND', 'OR', 'NOT']),
        conditions: zod_1.z.array(exports.ConditionTreeSchema).min(1, 'At least one condition is required in group'),
    }),
]));
exports.RuleTestCaseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Test case name is required'),
    facts: zod_1.z.record(zod_1.z.object({
        state: zod_1.z.nativeEnum(redflags_types_js_1.FactStates),
        value: zod_1.z.any().optional(),
    })),
    expectedOutcome: zod_1.z.nativeEnum(redflags_types_js_1.RuleEvaluationOutcomes),
});
exports.CreateRuleSchema = zod_1.z.object({
    ruleCode: zod_1.z.string().min(2).max(100).regex(/^[A-Z0-9_-]+$/, 'Rule code must be alphanumeric with dashes/underscores'),
    name: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().min(5),
    severityTier: zod_1.z.nativeEnum(redflags_types_js_1.SeverityTiers),
    conditionTree: exports.ConditionTreeSchema,
    testCases: zod_1.z.array(exports.RuleTestCaseSchema).optional(),
    raiseOnIndeterminate: zod_1.z.boolean().default(true),
    recommendedStaffAction: zod_1.z.string().min(5),
    isIllustrative: zod_1.z.boolean().default(false),
});
exports.UpdateRuleSchema = exports.CreateRuleSchema.partial();
exports.HelpRequestSchema = zod_1.z.object({
    kioskDeviceId: zod_1.z.string().uuid().optional(),
    kioskLocation: zod_1.z.string().max(255).optional(),
    reason: zod_1.z.string().max(255).optional(),
});
exports.AcknowledgeAlertSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.StartAssessmentSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.ResolveAlertSchema = zod_1.z.object({
    resolutionType: zod_1.z.nativeEnum(redflags_types_js_1.ControlledResolutionTypes),
    resolutionNote: zod_1.z.string().max(1000).optional(),
});
exports.EscalateAlertSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
exports.DismissAlertSchema = zod_1.z.object({
    dismissalReason: zod_1.z.nativeEnum(redflags_types_js_1.ControlledDismissalReasons),
    note: zod_1.z.string().max(1000).optional(),
});
exports.AlertFilterSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    severityTier: zod_1.z.string().optional(),
    visitId: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
});
