"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMasterDataRouter = exports.deskVisitsRouter = exports.kioskVisitsRouter = void 0;
const express_1 = require("express");
const visit_controller_js_1 = require("./visit.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
// 1. Kiosk Visits Router (/api/v1/kiosk/visits)
exports.kioskVisitsRouter = (0, express_1.Router)();
exports.kioskVisitsRouter.post('/start', visit_controller_js_1.VisitController.startKioskVisit);
// 2. Desk Visits & Patient Identity Safety Router (/api/v1/desk)
exports.deskVisitsRouter = (0, express_1.Router)();
exports.deskVisitsRouter.use(auth_middleware_js_1.authenticateStaff);
exports.deskVisitsRouter.post('/visits/check-in', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), visit_controller_js_1.VisitController.checkInDeskVisit);
exports.deskVisitsRouter.get('/visits', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.DOCTOR), visit_controller_js_1.VisitController.getDeskQueue);
exports.deskVisitsRouter.post('/patients/:id/reconcile', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.STAFF_ATTENDANT, auth_types_js_1.UserRoles.ADMIN), visit_controller_js_1.VisitController.reconcilePatient);
exports.deskVisitsRouter.post('/patients/merge', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.STAFF_ATTENDANT), visit_controller_js_1.VisitController.mergePatients);
exports.deskVisitsRouter.post('/patients/reverse-merge/:mergeId', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN), visit_controller_js_1.VisitController.reverseMerge);
exports.deskVisitsRouter.post('/visits/:id/quarantine', (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.STAFF_ATTENDANT), visit_controller_js_1.VisitController.quarantineVisit);
// 3. Admin Master Data Router (/api/v1/admin)
exports.adminMasterDataRouter = (0, express_1.Router)();
const requireMasterDataAdmin = [
    auth_middleware_js_1.authenticateStaff,
    (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN),
];
exports.adminMasterDataRouter.get('/departments', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getDepartments);
exports.adminMasterDataRouter.post('/departments', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.createDepartment);
exports.adminMasterDataRouter.delete('/departments/:id', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.softDeleteDepartment);
exports.adminMasterDataRouter.get('/locations', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getLocations);
exports.adminMasterDataRouter.get('/doctors', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getDoctors);
exports.adminMasterDataRouter.get('/kiosks', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getKiosks);
exports.adminMasterDataRouter.get('/schedules', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getSchedules);
exports.adminMasterDataRouter.get('/events/dead-letter', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.getDeadLetterQueue);
exports.adminMasterDataRouter.post('/events/replay', ...requireMasterDataAdmin, visit_controller_js_1.VisitController.replayDeadLetter);
