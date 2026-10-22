"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSummaryPromptRouter = exports.kioskSummaryRouter = exports.summaryRoutes = void 0;
const express_1 = require("express");
const summary_controller_js_1 = require("./summary.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const zod_1 = require("zod");
const summaryRoutes = (0, express_1.Router)();
exports.summaryRoutes = summaryRoutes;
// ============================================================================
// STAFF & DOCTOR SUMMARY ROUTES (/api/v1/summary)
// ============================================================================
summaryRoutes.use(auth_middleware_js_1.authenticateStaff);
// GET /api/v1/summary/visits/:visitId — Latest version & status
summaryRoutes.get('/visits/:visitId', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.getLatestSummary);
// GET /api/v1/summary/visits/:visitId/versions — All versions
summaryRoutes.get('/visits/:visitId/versions', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.getSummaryVersions);
// GET /api/v1/summary/:summaryId — Single version by immutable ID
summaryRoutes.get('/:summaryId', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        summaryId: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.getSummaryById);
// POST /api/v1/summary/visits/:visitId/regenerate — Regenerate summary draft
summaryRoutes.post('/visits/:visitId/regenerate', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        visitId: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        reason: zod_1.z.string().optional(),
    }).optional(),
}), summary_controller_js_1.SummaryController.regenerateSummary);
// ============================================================================
// KIOSK SUMMARY ROUTER (/api/v1/kiosk/summary)
// ============================================================================
const kioskSummaryRouter = (0, express_1.Router)();
exports.kioskSummaryRouter = kioskSummaryRouter;
kioskSummaryRouter.use(auth_middleware_js_1.authenticateKioskSession);
// GET /api/v1/kiosk/summary/status — Generic status only, zero clinical content
kioskSummaryRouter.get('/status', summary_controller_js_1.SummaryController.getKioskSummaryStatus);
// ============================================================================
// ADMIN SUMMARY PROMPTS ROUTER (/api/v1/admin/summary-prompts)
// ============================================================================
const adminSummaryPromptRouter = (0, express_1.Router)();
exports.adminSummaryPromptRouter = adminSummaryPromptRouter;
adminSummaryPromptRouter.use(auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN));
// GET /api/v1/admin/summary-prompts — List all prompt templates
adminSummaryPromptRouter.get('/', summary_controller_js_1.SummaryController.listPrompts);
// POST /api/v1/admin/summary-prompts — Create new prompt draft
adminSummaryPromptRouter.post('/', (0, validate_middleware_js_1.validateRequest)({
    body: zod_1.z.object({
        version: zod_1.z.string().min(1).max(50),
        systemPrompt: zod_1.z.string().min(20),
        outputSchemaVersion: zod_1.z.string().default('1.0'),
    }),
}), summary_controller_js_1.SummaryController.createPrompt);
// POST /api/v1/admin/summary-prompts/:id/submit-review — Submit for clinical review
adminSummaryPromptRouter.post('/:id/submit-review', (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.submitPromptReview);
// POST /api/v1/admin/summary-prompts/:id/run-evaluation — Run automated adversarial suite
adminSummaryPromptRouter.post('/:id/run-evaluation', (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.runEvaluation);
// POST /api/v1/admin/summary-prompts/:id/activate — Activate prompt (GATED by passing evaluation)
adminSummaryPromptRouter.post('/:id/activate', (0, validate_middleware_js_1.validateRequest)({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
}), summary_controller_js_1.SummaryController.activatePrompt);
