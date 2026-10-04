"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminFormularyRouter = exports.kioskDocumentsRouter = void 0;
const express_1 = require("express");
const documents_controller_js_1 = require("./documents.controller.js");
const formulary_controller_js_1 = require("./formulary/formulary.controller.js");
const auth_middleware_js_1 = require("../../middleware/auth.middleware.js");
const validate_middleware_js_1 = require("../../middleware/validate.middleware.js");
const auth_types_js_1 = require("../../types/auth.types.js");
const documents_schemas_js_1 = require("./documents.schemas.js");
// Kiosk Document Capture & Validation Router
const kioskDocumentsRouter = (0, express_1.Router)();
exports.kioskDocumentsRouter = kioskDocumentsRouter;
kioskDocumentsRouter.use(auth_middleware_js_1.authenticateKioskSession);
kioskDocumentsRouter.post('/upload', documents_controller_js_1.DocumentsController.uploadDocument);
kioskDocumentsRouter.get('/', documents_controller_js_1.DocumentsController.listVisitDocuments);
kioskDocumentsRouter.get('/:id/status', documents_controller_js_1.DocumentsController.getDocumentStatus);
kioskDocumentsRouter.get('/:id/validated-fields', documents_controller_js_1.DocumentsController.getValidatedFields);
kioskDocumentsRouter.post('/:id/revalidate', documents_controller_js_1.DocumentsController.revalidate);
// Admin Formulary Management Router
const adminFormularyRouter = (0, express_1.Router)();
exports.adminFormularyRouter = adminFormularyRouter;
adminFormularyRouter.use(auth_middleware_js_1.authenticateStaff, (0, auth_middleware_js_1.authorizeRoles)(auth_types_js_1.UserRoles.ADMIN, auth_types_js_1.UserRoles.SUPER_ADMIN));
adminFormularyRouter.get('/', formulary_controller_js_1.FormularyAdminController.listVersions);
adminFormularyRouter.get('/:id', formulary_controller_js_1.FormularyAdminController.getVersionById);
adminFormularyRouter.post('/', (0, validate_middleware_js_1.validateRequest)({ body: documents_schemas_js_1.createFormularyVersionSchema }), formulary_controller_js_1.FormularyAdminController.createVersion);
adminFormularyRouter.post('/:id/activate', formulary_controller_js_1.FormularyAdminController.activateVersion);
adminFormularyRouter.post('/:id/drugs', (0, validate_middleware_js_1.validateRequest)({ body: documents_schemas_js_1.addFormularyDrugSchema }), formulary_controller_js_1.FormularyAdminController.addDrug);
adminFormularyRouter.post('/:id/import', (0, validate_middleware_js_1.validateRequest)({ body: documents_schemas_js_1.importFormularyDrugsSchema }), formulary_controller_js_1.FormularyAdminController.importDrugs);
