"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsController = exports.PatientsRepository = exports.PatientsService = exports.consentsRoutes = exports.kioskProfileRoutes = exports.patientRoutes = void 0;
var patients_routes_js_1 = require("./patients.routes.js");
Object.defineProperty(exports, "patientRoutes", { enumerable: true, get: function () { return patients_routes_js_1.patientRoutes; } });
Object.defineProperty(exports, "kioskProfileRoutes", { enumerable: true, get: function () { return patients_routes_js_1.kioskProfileRoutes; } });
Object.defineProperty(exports, "consentsRoutes", { enumerable: true, get: function () { return patients_routes_js_1.consentsRoutes; } });
var patients_service_js_1 = require("./patients.service.js");
Object.defineProperty(exports, "PatientsService", { enumerable: true, get: function () { return patients_service_js_1.PatientsService; } });
var patients_repository_js_1 = require("./patients.repository.js");
Object.defineProperty(exports, "PatientsRepository", { enumerable: true, get: function () { return patients_repository_js_1.PatientsRepository; } });
var patients_controller_js_1 = require("./patients.controller.js");
Object.defineProperty(exports, "PatientsController", { enumerable: true, get: function () { return patients_controller_js_1.PatientsController; } });
__exportStar(require("./patients.schemas.js"), exports);
