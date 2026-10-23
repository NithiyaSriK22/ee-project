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
const index_js_10 = require("../modules/record-output/index.js");
const index_js_11 = require("../modules/notifications/index.js");
const index_js_12 = require("../modules/language/index.js");
const index_js_13 = require("../modules/admin/index.js");
const index_js_14 = require("../modules/deployment/index.js");
const index_js_15 = require("../modules/visit-lifecycle/index.js");
const index_js_16 = require("../modules/clinical-dictionary/index.js");
const index_js_17 = require("../modules/clinical-timeline/index.js");
const index_js_18 = require("../modules/evaluation/index.js");
const index_js_19 = require("../modules/synthetic-demo/index.js");
const response_util_js_1 = require("../utils/response.util.js");
const apiV1Router = (0, express_1.Router)();
exports.apiV1Router = apiV1Router;
// THUNAI API Root Discovery & Info Endpoint (GET /api/v1)
apiV1Router.get('/', (_req, res) => {
    response_util_js_1.ResponseUtil.success(res, {
        name: 'THUNAI Clinical Assistance API',
        version: '1.0.0',
        platform: 'THUNAI Healthcare Platform',
        status: 'OPERATIONAL',
        service: 'thunai-backend',
        documentation: '/api/v1/health',
        endpoints: {
            health: '/api/v1/health',
            readiness: '/api/v1/health/ready',
            statusBoard: '/status',
            auth: '/api/v1/auth',
            kiosk: {
                session: '/api/v1/kiosk/session',
                profile: '/api/v1/kiosk/profile',
                visits: '/api/v1/kiosk/visits',
                interview: '/api/v1/kiosk/interview',
                documents: '/api/v1/kiosk/documents',
                timeline: '/api/v1/kiosk/timeline',
                summary: '/api/v1/kiosk/summary',
                alerts: '/api/v1/kiosk/alerts',
                content: '/api/v1/kiosk/content',
            },
            doctor: {
                review: '/api/v1/doctor/reviews',
                records: '/api/v1/doctor/records',
                translation: '/api/v1/doctor/translations',
            },
            triage: '/api/v1/triage/alerts',
            deployment: '/api/v1/deployment/status',
            demo: '/api/v1/demo',
        },
    }, 'THUNAI API v1 root endpoint operational');
});
// Module 1 Core Endpoints
apiV1Router.use('/health', health_routes_js_1.healthRoutes);
// Module 2 Endpoints: Identity, Staff Auth, Kiosk Session, Patient Profile & Consent
apiV1Router.use('/auth', index_js_1.authRoutes);
apiV1Router.use('/kiosk/session', index_js_3.kioskSessionRoutes);
apiV1Router.use('/kiosk/profile', index_js_2.kioskProfileRoutes);
apiV1Router.use('/consents', index_js_2.consentsRoutes);
apiV1Router.use('/patients', index_js_2.patientRoutes);
// Module 2A Endpoints: Visit Lifecycle, Patient Identity Safety, Master Data & Events
apiV1Router.use('/kiosk/visits', index_js_15.kioskVisitsRouter);
apiV1Router.use('/desk', index_js_15.deskVisitsRouter);
apiV1Router.use('/admin', index_js_15.adminMasterDataRouter);
// Module 3A Endpoints: Clinical Data Dictionary & Terminology Governance
apiV1Router.use('/dictionary', index_js_16.dictionaryRouter);
apiV1Router.use('/admin/dictionary', index_js_16.adminDictionaryRouter);
// Module 3 Endpoints: Guided Interview & Kiosk Intake, Admin Template & Question Bank
apiV1Router.use('/kiosk/interview', index_js_4.kioskInterviewRouter);
apiV1Router.use('/interview', index_js_4.kioskInterviewRouter); // alias
apiV1Router.use('/admin/interview-templates', index_js_4.adminTemplateRouter);
apiV1Router.use('/admin/interview-questions', index_js_4.adminQuestionRouter);
// Module 4 Endpoints: OCR, Document Digitization & Deterministic Validation Gate
apiV1Router.use('/kiosk/documents', index_js_5.kioskDocumentsRouter);
apiV1Router.use('/documents', index_js_5.kioskDocumentsRouter); // alias
apiV1Router.use('/admin/formulary', index_js_5.adminFormularyRouter);
// Module 4A Endpoints: Clinical Timeline, Lab Reference Ranges & Longitudinal History
apiV1Router.use('/timeline', index_js_17.clinicalTimelineRouter);
apiV1Router.use('/kiosk/timeline', index_js_17.kioskTimelineRouter);
// Module 5 Endpoints: AI Clinical Summarization Engine & Prompt Gating
apiV1Router.use('/summary', index_js_7.summaryRoutes);
apiV1Router.use('/kiosk/summary', index_js_7.kioskSummaryRouter);
apiV1Router.use('/admin/summary-prompts', index_js_7.adminSummaryPromptRouter);
// Module 5A Endpoints: Evaluation, Calibration & Ground-Truth Program
apiV1Router.use('/evaluation', index_js_18.evaluationRoutes);
// Module 6 Endpoints: Red-Flag Detection & Emergency Triage Alerts
apiV1Router.use('/kiosk', index_js_8.kioskAlertsRouter);
apiV1Router.use('/triage/alerts', index_js_8.triageAlertsRouter);
apiV1Router.use('/redflags', index_js_8.redflagRoutes); // alias
apiV1Router.use('/admin/redflag-rules', index_js_8.adminRedflagRulesRouter);
// Module 7 Endpoints: Doctor Review & Summary Dashboard
apiV1Router.use('/doctor', index_js_9.doctorReviewRoutes);
apiV1Router.use('/doctor-review', index_js_9.doctorReviewRoutes); // alias
// Module 7A Endpoints: Record Output, Print/Export & Hospital System Hand-Off
apiV1Router.use('/doctor', index_js_10.recordOutputRoutes);
apiV1Router.use('/admin', index_js_10.recordOutputRoutes);
apiV1Router.use('/', index_js_10.recordOutputRoutes);
// Module 8 Endpoints: Multilingual, Accessibility, Kiosk Content & Operational Notifications
apiV1Router.use('/kiosk', index_js_12.kioskContentRouter);
apiV1Router.use('/admin', index_js_12.adminTranslationRouter);
apiV1Router.use('/doctor', index_js_12.doctorTranslationRouter);
apiV1Router.use('/notifications', index_js_11.notificationRoutes);
apiV1Router.use('/notification-preferences', index_js_11.notificationPreferencesRoutes);
// Module 9 Endpoints: Administration, Analytics, Audit & Monitoring
apiV1Router.use('/validation', index_js_6.validationRoutes);
apiV1Router.use('/admin', index_js_13.adminRoutes);
// Module 10 Endpoints: Production Deployment, Security, Clinical Safety Release & Pilot Readiness
apiV1Router.use('/deployment', index_js_14.deploymentRoutes);
// Module 10A Endpoints: Synthetic Data, Simulation, Demo Mode & Consistency Audit
apiV1Router.use('/demo', index_js_19.syntheticDemoRoutes);
