"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV1Router = void 0;
const express_1 = require("express");
const health_routes_js_1 = require("../modules/health/health.routes.js");
const index_js_1 = require("../modules/auth/index.js");
const index_js_2 = require("../modules/patients/index.js");
const index_js_3 = require("../modules/kiosk-session/index.js");
const index_js_4 = require("../modules/interview/index.js");
const index_js_5 = require("../modules/documents/index.js");
const index_js_6 = require("../modules/validation/index.js");
const index_js_7 = require("../modules/summary/index.js");
const index_js_8 = require("../modules/redflags/index.js");
const index_js_9 = require("../modules/doctor-review/index.js");
const index_js_10 = require("../modules/notifications/index.js");
const index_js_11 = require("../modules/admin/index.js");
const apiV1Router = (0, express_1.Router)();
exports.apiV1Router = apiV1Router;
// Module 1 Core Endpoints
apiV1Router.use('/health', health_routes_js_1.healthRoutes);
// Module 2 Endpoints: Identity, Staff Auth, Kiosk Session, Patient Profile & Consent
apiV1Router.use('/auth', index_js_1.authRoutes);
apiV1Router.use('/kiosk/session', index_js_3.kioskSessionRoutes);
apiV1Router.use('/kiosk/profile', index_js_2.kioskProfileRoutes);
apiV1Router.use('/consents', index_js_2.consentsRoutes);
apiV1Router.use('/patients', index_js_2.patientRoutes);
// Module 3 Endpoints: Guided Interview & Kiosk Intake, Admin Template & Question Bank
apiV1Router.use('/kiosk/interview', index_js_4.kioskInterviewRouter);
apiV1Router.use('/interview', index_js_4.kioskInterviewRouter); // alias
apiV1Router.use('/admin/interview-templates', index_js_4.adminTemplateRouter);
apiV1Router.use('/admin/interview-questions', index_js_4.adminQuestionRouter);
// Module 4 Endpoints: OCR, Document Digitization & Deterministic Validation Gate
apiV1Router.use('/kiosk/documents', index_js_5.kioskDocumentsRouter);
apiV1Router.use('/documents', index_js_5.kioskDocumentsRouter); // alias
apiV1Router.use('/admin/formulary', index_js_5.adminFormularyRouter);
// Module 5 Endpoints: AI Clinical Summarization Engine & Prompt Gating
apiV1Router.use('/summary', index_js_7.summaryRoutes);
apiV1Router.use('/kiosk/summary', index_js_7.kioskSummaryRouter);
apiV1Router.use('/admin/summary-prompts', index_js_7.adminSummaryPromptRouter);
// Module 6 Endpoints: Red-Flag Detection & Emergency Triage Alerts
apiV1Router.use('/kiosk', index_js_8.kioskAlertsRouter);
apiV1Router.use('/triage/alerts', index_js_8.triageAlertsRouter);
apiV1Router.use('/redflags', index_js_8.redflagRoutes); // alias
apiV1Router.use('/admin/redflag-rules', index_js_8.adminRedflagRulesRouter);
// Future Module Route Placeholders (Modules 7 - 10)
apiV1Router.use('/validation', index_js_6.validationRoutes);
apiV1Router.use('/doctor-review', index_js_9.doctorReviewRoutes);
apiV1Router.use('/notifications', index_js_10.notificationRoutes);
apiV1Router.use('/admin', index_js_11.adminRoutes);
