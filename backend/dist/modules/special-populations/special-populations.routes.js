"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specialPopulationsRouter = void 0;
const express_1 = require("express");
const special_populations_controller_js_1 = require("./special-populations.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
exports.specialPopulationsRouter = (0, express_1.Router)();
// ==============================================================================
// GUARDIAN & MINOR FLOW
// ==============================================================================
exports.specialPopulationsRouter.post('/guardian', special_populations_controller_js_1.SpecialPopulationsController.registerGuardian);
exports.specialPopulationsRouter.get('/guardian/:visitId', special_populations_controller_js_1.SpecialPopulationsController.getGuardian);
// ==============================================================================
// SURROGATE MODE FLOW
// ==============================================================================
exports.specialPopulationsRouter.post('/surrogate', special_populations_controller_js_1.SpecialPopulationsController.registerSurrogate);
exports.specialPopulationsRouter.get('/surrogate/:visitId', special_populations_controller_js_1.SpecialPopulationsController.getSurrogate);
// ==============================================================================
// KIOSK PRIVACY, GATING & AUDIO ROUTING
// ==============================================================================
exports.specialPopulationsRouter.post('/kiosk-privacy/check-question', special_populations_controller_js_1.SpecialPopulationsController.checkQuestionGating);
exports.specialPopulationsRouter.post('/kiosk-privacy/audio-routing', special_populations_controller_js_1.SpecialPopulationsController.evaluateAudioRouting);
exports.specialPopulationsRouter.post('/kiosk-privacy/headset', special_populations_controller_js_1.SpecialPopulationsController.setHeadsetStatus);
exports.specialPopulationsRouter.post('/kiosk-privacy/defer-to-doctor', special_populations_controller_js_1.SpecialPopulationsController.deferQuestion);
exports.specialPopulationsRouter.get('/kiosk-privacy/deferred/:visitId', special_populations_controller_js_1.SpecialPopulationsController.getDeferredQuestions);
exports.specialPopulationsRouter.post('/kiosk-privacy/request-assistance', special_populations_controller_js_1.SpecialPopulationsController.requestNeutralAssistance);
// ==============================================================================
// DOCTOR-ONLY SCOPING & ROLE-FILTERED REVIEWS
// ==============================================================================
exports.specialPopulationsRouter.get('/visits/:visitId/filtered-answers', auth_middleware_js_1.authenticateStaff, special_populations_controller_js_1.SpecialPopulationsController.getFilteredAnswers);
