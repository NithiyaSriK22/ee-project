"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kioskTimelineRouter = exports.clinicalTimelineRouter = void 0;
const express_1 = require("express");
const clinical_timeline_controller_js_1 = require("./clinical-timeline.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
// Router for Staff / Doctor Clinical Timeline (/api/v1/timeline)
exports.clinicalTimelineRouter = (0, express_1.Router)();
exports.clinicalTimelineRouter.use(auth_middleware_js_1.authenticateStaff);
exports.clinicalTimelineRouter.get('/patients/:patientId', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), clinical_timeline_controller_js_1.ClinicalTimelineController.getTimeline);
exports.clinicalTimelineRouter.get('/patients/:patientId/trends', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), clinical_timeline_controller_js_1.ClinicalTimelineController.getLabTrends);
exports.clinicalTimelineRouter.get('/patients/:patientId/diff/:visitId', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN), clinical_timeline_controller_js_1.ClinicalTimelineController.getVisitDiff);
exports.clinicalTimelineRouter.post('/evaluate-lab', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.DOCTOR, auth_types_js_1.UserRoles.ADMIN), clinical_timeline_controller_js_1.ClinicalTimelineController.evaluateLabValue);
// Router for Kiosk Returning Patient Carry-Forward (/api/v1/kiosk/timeline)
exports.kioskTimelineRouter = (0, express_1.Router)();
exports.kioskTimelineRouter.use(auth_middleware_js_1.authenticateKioskSession);
exports.kioskTimelineRouter.get('/carry-forward/candidates', clinical_timeline_controller_js_1.ClinicalTimelineController.getCarryForwardCandidates);
exports.kioskTimelineRouter.post('/carry-forward/confirm', clinical_timeline_controller_js_1.ClinicalTimelineController.confirmCarryForward);
