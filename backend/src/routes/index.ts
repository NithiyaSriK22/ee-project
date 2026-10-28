import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/index.js';
import { patientRoutes, kioskProfileRoutes, consentsRoutes } from '../modules/patients/index.js';
import { kioskSessionRoutes } from '../modules/kiosk-session/index.js';
import { kioskInterviewRouter, adminTemplateRouter, adminQuestionRouter } from '../modules/interview/index.js';
import { kioskDocumentsRouter, adminFormularyRouter } from '../modules/documents/index.js';
import { validationRoutes } from '../modules/validation/index.js';
import { summaryRoutes, kioskSummaryRouter, adminSummaryPromptRouter } from '../modules/summary/index.js';
import {
  triageAlertsRouter,
  kioskAlertsRouter,
  adminRedflagRulesRouter,
  redflagRoutes,
} from '../modules/redflags/index.js';
import { doctorReviewRoutes } from '../modules/doctor-review/index.js';
import { recordOutputRoutes } from '../modules/record-output/index.js';
import { notificationRoutes, notificationPreferencesRoutes } from '../modules/notifications/index.js';
import { kioskContentRouter, adminTranslationRouter, doctorTranslationRouter } from '../modules/language/index.js';
import { adminRoutes } from '../modules/admin/index.js';
import { deploymentRoutes } from '../modules/deployment/index.js';
import {
  kioskVisitsRouter,
  deskVisitsRouter,
  adminMasterDataRouter,
} from '../modules/visit-lifecycle/index.js';
import {
  dictionaryRouter,
  adminDictionaryRouter,
} from '../modules/clinical-dictionary/index.js';
import {
  clinicalTimelineRouter,
  kioskTimelineRouter,
} from '../modules/clinical-timeline/index.js';
import { evaluationRoutes } from '../modules/evaluation/index.js';
import { syntheticDemoRoutes } from '../modules/synthetic-demo/index.js';
import { ResponseUtil } from '../utils/response.util.js';

const apiV1Router = Router();

// MEDBRIEF API Root Discovery & Info Endpoint (GET /api/v1)
apiV1Router.get('/', (_req, res) => {
  ResponseUtil.success(
    res,
    {
      name: 'MEDBRIEF Clinical Assistance API',
      version: '1.0.0',
      platform: 'MEDBRIEF Healthcare Platform',
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
    },
    'MEDBRIEF API v1 root endpoint operational'
  );
});

// Module 1 Core Endpoints
apiV1Router.use('/health', healthRoutes);

// Module 2 Endpoints: Identity, Staff Auth, Kiosk Session, Patient Profile & Consent
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/kiosk/session', kioskSessionRoutes);
apiV1Router.use('/kiosk/profile', kioskProfileRoutes);
apiV1Router.use('/consents', consentsRoutes);
apiV1Router.use('/patients', patientRoutes);

// Module 2A Endpoints: Visit Lifecycle, Patient Identity Safety, Master Data & Events
apiV1Router.use('/kiosk/visits', kioskVisitsRouter);
apiV1Router.use('/desk', deskVisitsRouter);
apiV1Router.use('/admin', adminMasterDataRouter);

// Module 3A Endpoints: Clinical Data Dictionary & Terminology Governance
apiV1Router.use('/dictionary', dictionaryRouter);
apiV1Router.use('/admin/dictionary', adminDictionaryRouter);

// Module 3 Endpoints: Guided Interview & Kiosk Intake, Admin Template & Question Bank
apiV1Router.use('/kiosk/interview', kioskInterviewRouter);
apiV1Router.use('/interview', kioskInterviewRouter); // alias
apiV1Router.use('/admin/interview-templates', adminTemplateRouter);
apiV1Router.use('/admin/interview-questions', adminQuestionRouter);

// Module 4 Endpoints: OCR, Document Digitization & Deterministic Validation Gate
apiV1Router.use('/kiosk/documents', kioskDocumentsRouter);
apiV1Router.use('/documents', kioskDocumentsRouter); // alias
apiV1Router.use('/admin/formulary', adminFormularyRouter);

// Module 4A Endpoints: Clinical Timeline, Lab Reference Ranges & Longitudinal History
apiV1Router.use('/timeline', clinicalTimelineRouter);
apiV1Router.use('/kiosk/timeline', kioskTimelineRouter);


// Module 5 Endpoints: AI Clinical Summarization Engine & Prompt Gating
apiV1Router.use('/summary', summaryRoutes);
apiV1Router.use('/kiosk/summary', kioskSummaryRouter);
apiV1Router.use('/admin/summary-prompts', adminSummaryPromptRouter);

// Module 5A Endpoints: Evaluation, Calibration & Ground-Truth Program
apiV1Router.use('/evaluation', evaluationRoutes);

// Module 6 Endpoints: Red-Flag Detection & Emergency Triage Alerts
apiV1Router.use('/kiosk', kioskAlertsRouter);
apiV1Router.use('/triage/alerts', triageAlertsRouter);
apiV1Router.use('/redflags', redflagRoutes); // alias
apiV1Router.use('/admin/redflag-rules', adminRedflagRulesRouter);

// Module 7 Endpoints: Doctor Review & Summary Dashboard
apiV1Router.use('/doctor', doctorReviewRoutes);
apiV1Router.use('/doctor-review', doctorReviewRoutes); // alias

// Module 7A Endpoints: Record Output, Print/Export & Hospital System Hand-Off
apiV1Router.use('/doctor', recordOutputRoutes);
apiV1Router.use('/admin', recordOutputRoutes);
apiV1Router.use('/', recordOutputRoutes);

// Module 8 Endpoints: Multilingual, Accessibility, Kiosk Content & Operational Notifications
apiV1Router.use('/kiosk', kioskContentRouter);
apiV1Router.use('/admin', adminTranslationRouter);
apiV1Router.use('/doctor', doctorTranslationRouter);
apiV1Router.use('/notifications', notificationRoutes);
apiV1Router.use('/notification-preferences', notificationPreferencesRoutes);

// Module 9 Endpoints: Administration, Analytics, Audit & Monitoring
apiV1Router.use('/validation', validationRoutes);
apiV1Router.use('/admin', adminRoutes);

// Module 10 Endpoints: Production Deployment, Security, Clinical Safety Release & Pilot Readiness
apiV1Router.use('/deployment', deploymentRoutes);

// Module 10A Endpoints: Synthetic Data, Simulation, Demo Mode & Consistency Audit
apiV1Router.use('/demo', syntheticDemoRoutes);

export { apiV1Router };

