import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/index.js';
import { patientRoutes, kioskProfileRoutes, consentsRoutes } from '../modules/patients/index.js';
import { kioskSessionRoutes } from '../modules/kiosk-session/index.js';
import { kioskInterviewRouter, adminTemplateRouter, adminQuestionRouter } from '../modules/interview/index.js';
import { kioskDocumentsRouter, adminFormularyRouter } from '../modules/documents/index.js';
import { validationRoutes } from '../modules/validation/index.js';
import { summaryRoutes } from '../modules/summary/index.js';
import { redflagRoutes } from '../modules/redflags/index.js';
import { doctorReviewRoutes } from '../modules/doctor-review/index.js';
import { notificationRoutes } from '../modules/notifications/index.js';
import { adminRoutes } from '../modules/admin/index.js';

const apiV1Router = Router();

// Module 1 Core Endpoints
apiV1Router.use('/health', healthRoutes);

// Module 2 Endpoints: Identity, Staff Auth, Kiosk Session, Patient Profile & Consent
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/kiosk/session', kioskSessionRoutes);
apiV1Router.use('/kiosk/profile', kioskProfileRoutes);
apiV1Router.use('/consents', consentsRoutes);
apiV1Router.use('/patients', patientRoutes);

// Module 3 Endpoints: Guided Interview & Kiosk Intake, Admin Template & Question Bank
apiV1Router.use('/kiosk/interview', kioskInterviewRouter);
apiV1Router.use('/interview', kioskInterviewRouter); // alias
apiV1Router.use('/admin/interview-templates', adminTemplateRouter);
apiV1Router.use('/admin/interview-questions', adminQuestionRouter);

// Module 4 Endpoints: OCR, Document Digitization & Deterministic Validation Gate
apiV1Router.use('/kiosk/documents', kioskDocumentsRouter);
apiV1Router.use('/documents', kioskDocumentsRouter); // alias
apiV1Router.use('/admin/formulary', adminFormularyRouter);

// Future Module Route Placeholders (Modules 5 - 10)
apiV1Router.use('/validation', validationRoutes);
apiV1Router.use('/summary', summaryRoutes);
apiV1Router.use('/redflags', redflagRoutes);
apiV1Router.use('/doctor-review', doctorReviewRoutes);
apiV1Router.use('/notifications', notificationRoutes);
apiV1Router.use('/admin', adminRoutes);

export { apiV1Router };
