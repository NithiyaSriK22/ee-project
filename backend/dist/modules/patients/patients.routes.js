"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientRoutes = exports.consentsRoutes = exports.kioskProfileRoutes = void 0;
const express_1 = require("express");
const patients_controller_js_1 = require("./patients.controller.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const patients_schemas_js_1 = require("./patients.schemas.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
// Kiosk Profile Sub-Router (/api/v1/kiosk/profile)
exports.kioskProfileRoutes = (0, express_1.Router)();
exports.kioskProfileRoutes.use(auth_middleware_js_1.authenticateKioskSession);
exports.kioskProfileRoutes.get('/', patients_controller_js_1.PatientsController.getKioskProfile);
exports.kioskProfileRoutes.put('/', (0, validate_middleware_js_1.validateRequest)({ body: patients_schemas_js_1.updatePatientProfileSchema }), patients_controller_js_1.PatientsController.updateKioskProfile);
exports.kioskProfileRoutes.patch('/', (0, validate_middleware_js_1.validateRequest)({ body: patients_schemas_js_1.updatePatientProfileSchema }), patients_controller_js_1.PatientsController.updateKioskProfile);
exports.kioskProfileRoutes.get('/completion', patients_controller_js_1.PatientsController.getProfileCompletion);
// Consents Sub-Router (/api/v1/consents)
exports.consentsRoutes = (0, express_1.Router)();
exports.consentsRoutes.use(auth_middleware_js_1.authenticateKioskSession);
exports.consentsRoutes.get('/', patients_controller_js_1.PatientsController.getConsents);
exports.consentsRoutes.patch('/:type', (0, validate_middleware_js_1.validateRequest)({ body: patients_schemas_js_1.updateConsentSchema }), patients_controller_js_1.PatientsController.updateConsent);
// Staff Patients Sub-Router (/api/v1/patients)
exports.patientRoutes = (0, express_1.Router)();
exports.patientRoutes.get('/:id', auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)('DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN'), patients_controller_js_1.PatientsController.getPatientForStaff);
