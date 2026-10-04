"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminQuestionRouter = exports.adminTemplateRouter = exports.kioskInterviewRouter = void 0;
const express_1 = require("express");
const interview_controller_js_1 = require("./interview.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const interview_schemas_js_1 = require("./interview.schemas.js");
// Router for Patient Kiosk Interview Operations
const kioskInterviewRouter = (0, express_1.Router)();
exports.kioskInterviewRouter = kioskInterviewRouter;
kioskInterviewRouter.use(auth_middleware_js_1.authenticateKioskSession);
kioskInterviewRouter.post('/start', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.startKioskInterviewSchema }), interview_controller_js_1.InterviewKioskController.start);
kioskInterviewRouter.get('/current-question', interview_controller_js_1.InterviewKioskController.getCurrentQuestion);
kioskInterviewRouter.post('/answer', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.submitInterviewAnswerSchema }), interview_controller_js_1.InterviewKioskController.submitAnswer);
kioskInterviewRouter.post('/complete', interview_controller_js_1.InterviewKioskController.complete);
kioskInterviewRouter.get('/progress', interview_controller_js_1.InterviewKioskController.getProgress);
// Router for Admin Template & Question Bank Management
const adminTemplateRouter = (0, express_1.Router)();
exports.adminTemplateRouter = adminTemplateRouter;
adminTemplateRouter.use(auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN));
adminTemplateRouter.get('/', interview_controller_js_1.InterviewAdminController.listTemplates);
adminTemplateRouter.get('/:id', interview_controller_js_1.InterviewAdminController.getTemplateById);
adminTemplateRouter.post('/', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.createInterviewTemplateSchema }), interview_controller_js_1.InterviewAdminController.createTemplate);
adminTemplateRouter.patch('/:id', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.updateInterviewTemplateSchema }), interview_controller_js_1.InterviewAdminController.updateTemplate);
adminTemplateRouter.post('/:id/review', interview_controller_js_1.InterviewAdminController.submitForReview);
adminTemplateRouter.post('/:id/publish', interview_controller_js_1.InterviewAdminController.publishTemplate);
adminTemplateRouter.post('/:id/retire', interview_controller_js_1.InterviewAdminController.retireTemplate);
adminTemplateRouter.post('/:id/questions', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.createInterviewQuestionSchema }), interview_controller_js_1.InterviewAdminController.addQuestion);
// Admin Question router
const adminQuestionRouter = (0, express_1.Router)();
exports.adminQuestionRouter = adminQuestionRouter;
adminQuestionRouter.use(auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN));
adminQuestionRouter.patch('/:id', (0, validate_middleware_js_1.validateRequest)({ body: interview_schemas_js_1.updateInterviewQuestionSchema }), interview_controller_js_1.InterviewAdminController.updateQuestion);
adminQuestionRouter.delete('/:id', interview_controller_js_1.InterviewAdminController.archiveQuestion);
