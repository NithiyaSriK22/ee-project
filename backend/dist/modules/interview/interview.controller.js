"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewKioskController = exports.InterviewAdminController = void 0;
const interview_service_js_1 = require("./interview.service.js");
const response_util_js_1 = require("../../utils/response.util.js");
const app_error_js_1 = require("../../errors/app-error.js");
class InterviewAdminController {
    static async listTemplates(_req, res, next) {
        try {
            const templates = await interview_service_js_1.InterviewService.listTemplates();
            response_util_js_1.ResponseUtil.success(res, templates, 'Interview templates retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getTemplateById(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const template = await interview_service_js_1.InterviewService.getTemplateById(id);
            response_util_js_1.ResponseUtil.success(res, template, 'Interview template retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async createTemplate(req, res, next) {
        try {
            const actorId = req.user?.id;
            const template = await interview_service_js_1.InterviewService.createTemplate(req.body, actorId);
            response_util_js_1.ResponseUtil.created(res, template, 'Interview template created successfully (DRAFT)');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const updated = await interview_service_js_1.InterviewService.updateTemplate(id, req.body);
            response_util_js_1.ResponseUtil.success(res, updated, 'Interview template updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async submitForReview(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const updated = await interview_service_js_1.InterviewService.submitForReview(id);
            response_util_js_1.ResponseUtil.success(res, updated, 'Interview template submitted for clinical review');
        }
        catch (error) {
            next(error);
        }
    }
    static async publishTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const actorId = req.user?.id;
            const published = await interview_service_js_1.InterviewService.publishTemplate(id, actorId);
            response_util_js_1.ResponseUtil.success(res, published, 'Interview template validated and published as ACTIVE');
        }
        catch (error) {
            next(error);
        }
    }
    static async retireTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const actorId = req.user?.id;
            const retired = await interview_service_js_1.InterviewService.retireTemplate(id, actorId);
            response_util_js_1.ResponseUtil.success(res, retired, 'Interview template retired from live clinical intake');
        }
        catch (error) {
            next(error);
        }
    }
    static async addQuestion(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Template ID is required');
            }
            const question = await interview_service_js_1.InterviewService.addQuestion(id, req.body);
            response_util_js_1.ResponseUtil.created(res, question, 'Question added to interview template');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateQuestion(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Question ID is required');
            }
            const updated = await interview_service_js_1.InterviewService.updateQuestion(id, req.body);
            response_util_js_1.ResponseUtil.success(res, updated, 'Interview question updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async archiveQuestion(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new app_error_js_1.ValidationError('Question ID is required');
            }
            const result = await interview_service_js_1.InterviewService.archiveQuestion(id);
            response_util_js_1.ResponseUtil.success(res, result, 'Interview question archived successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InterviewAdminController = InterviewAdminController;
class InterviewKioskController {
    static async start(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { visitId, patientId } = req.kioskSession;
            const requestedTemplateId = req.body?.templateId;
            const headsetConnected = req.body?.headsetConnected;
            const result = await interview_service_js_1.InterviewService.startKioskInterview(visitId, patientId, requestedTemplateId, { headsetConnected });
            response_util_js_1.ResponseUtil.success(res, result, 'Clinical interview intake session started');
        }
        catch (error) {
            next(error);
        }
    }
    static async getCurrentQuestion(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.getCurrentQuestion(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, result, 'Current interview state retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async submitAnswer(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { visitId, patientId } = req.kioskSession;
            const result = await interview_service_js_1.InterviewService.submitAnswer(visitId, patientId, req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Answer recorded successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async configureGuardian(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.configureGuardianMode(req.kioskSession.visitId, req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Guardian mode configured successfully for minor intake');
        }
        catch (error) {
            next(error);
        }
    }
    static async configureSurrogate(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.configureSurrogateMode(req.kioskSession.visitId, req.body, req.kioskSession.kioskDeviceId);
            response_util_js_1.ResponseUtil.success(res, result, 'Surrogate mode configured successfully for intake session');
        }
        catch (error) {
            next(error);
        }
    }
    static async updateHeadset(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const connected = Boolean(req.body.connected);
            const result = await interview_service_js_1.InterviewService.updateHeadsetStatus(req.kioskSession.visitId, connected);
            response_util_js_1.ResponseUtil.success(res, { headsetConnected: result }, `Headset status updated to ${result ? 'CONNECTED' : 'DISCONNECTED'}`);
        }
        catch (error) {
            next(error);
        }
    }
    static async deferToDoctor(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { questionId, reason } = req.body;
            const result = await interview_service_js_1.InterviewService.deferQuestionToDoctor(req.kioskSession.visitId, questionId, reason);
            response_util_js_1.ResponseUtil.success(res, result, 'Question deferred for private consultation with doctor');
        }
        catch (error) {
            next(error);
        }
    }
    static async complete(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.completeInterview(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, result, 'Interview completed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async getProgress(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.getCurrentQuestion(req.kioskSession.visitId);
            response_util_js_1.ResponseUtil.success(res, {
                progress: result.progress,
                sessionStatus: result.session.status,
                currentSection: result.currentQuestion?.section || null,
            }, 'Interview progress retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    static async flagPatientUnwell(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const { reason } = req.body || {};
            const result = await interview_service_js_1.InterviewService.flagPatientUnwell(req.kioskSession.visitId, req.kioskSession.kioskDeviceId, reason);
            response_util_js_1.ResponseUtil.success(res, result, 'Patient unwell alert raised, intake halted for staff assistance');
        }
        catch (error) {
            next(error);
        }
    }
    static async sensitiveSectionConsent(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.processSensitiveSectionConsent(req.kioskSession.visitId, req.body);
            response_util_js_1.ResponseUtil.success(res, result, 'Sensitive section consent processed');
        }
        catch (error) {
            next(error);
        }
    }
    static async triggerSensitiveDisclosure(req, res, next) {
        try {
            if (!req.kioskSession) {
                throw new app_error_js_1.AuthenticationError('Active kiosk session required');
            }
            const result = await interview_service_js_1.InterviewService.triggerSensitiveDisclosure(req.kioskSession.visitId, req.kioskSession.kioskDeviceId);
            response_util_js_1.ResponseUtil.success(res, result, 'Sensitive disclosure alert routed with neutral text');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InterviewKioskController = InterviewKioskController;
