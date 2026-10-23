"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorTranslationRouter = exports.adminTranslationRouter = exports.kioskContentRouter = exports.optionalKioskAuth = void 0;
const express_1 = require("express");
const language_controller_js_1 = require("./language.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const token_util_js_1 = require("../../utils/token.util.js");
const optionalKioskAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const kioskHeader = req.headers['x-kiosk-session-token'];
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (kioskHeader) {
        token = kioskHeader;
    }
    if (token) {
        try {
            const claims = token_util_js_1.TokenUtil.verifyKioskSessionToken(token);
            req.kioskSession = {
                sessionId: claims.sessionId || 'kiosk-session',
                visitId: claims.visitId,
                patientId: claims.patientId,
                hospitalRegistrationNumber: claims.hospitalRegistrationNumber || 'HRN',
            };
        }
        catch {
            // Ignored for optional auth
        }
    }
    next();
};
exports.optionalKioskAuth = optionalKioskAuth;
exports.kioskContentRouter = (0, express_1.Router)();
// Kiosk session endpoints
exports.kioskContentRouter.get('/languages', language_controller_js_1.LanguageController.getKioskLanguages);
exports.kioskContentRouter.get('/content/bundle', language_controller_js_1.LanguageController.getKioskContentBundle);
exports.kioskContentRouter.post('/voice/transcribe', language_controller_js_1.LanguageController.transcribeVoice);
exports.kioskContentRouter.post('/voice/synthesize', language_controller_js_1.LanguageController.synthesizeVoice);
exports.kioskContentRouter.get('/voice/synthesize', language_controller_js_1.LanguageController.synthesizeVoice);
exports.kioskContentRouter.post('/voice/map-answer', language_controller_js_1.LanguageController.mapVoiceAnswer);
exports.kioskContentRouter.post('/sync/answers', exports.optionalKioskAuth, language_controller_js_1.LanguageController.syncAnswers);
exports.kioskContentRouter.get('/help/question/:questionCode', language_controller_js_1.LanguageController.getQuestionHelp);
exports.kioskContentRouter.get('/help/:topic', language_controller_js_1.LanguageController.getHelpTopic);
exports.kioskContentRouter.post('/assistant/message', exports.optionalKioskAuth, language_controller_js_1.LanguageController.assistantMessage);
const auth_types_js_1 = require("../../types/auth.types.js");
// Admin translation & languages router
exports.adminTranslationRouter = (0, express_1.Router)();
exports.adminTranslationRouter.get('/languages', language_controller_js_1.LanguageController.listAllLanguages);
exports.adminTranslationRouter.patch('/languages/:code', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), language_controller_js_1.LanguageController.updateLanguage);
exports.adminTranslationRouter.get('/translations/coverage', language_controller_js_1.LanguageController.getCoverage);
exports.adminTranslationRouter.post('/translations', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN, auth_types_js_1.UserRoles.DOCTOR), language_controller_js_1.LanguageController.createTranslation);
exports.adminTranslationRouter.post('/translations/submit-review', auth_middleware_js_1.authenticateStaff, language_controller_js_1.LanguageController.submitReview);
exports.adminTranslationRouter.post('/translations/approve', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), language_controller_js_1.LanguageController.approveTranslation);
// Doctor secondary machine translation route
exports.doctorTranslationRouter = (0, express_1.Router)();
exports.doctorTranslationRouter.post('/translate-text', language_controller_js_1.LanguageController.getMachineTranslation);
