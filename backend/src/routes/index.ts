import { Router } from 'express';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/index.js';
import { patientRoutes } from '../modules/patients/index.js';
import { interviewRoutes } from '../modules/interview/index.js';
import { documentRoutes } from '../modules/documents/index.js';
import { validationRoutes } from '../modules/validation/index.js';
import { summaryRoutes } from '../modules/summary/index.js';
import { redflagRoutes } from '../modules/redflags/index.js';
import { doctorReviewRoutes } from '../modules/doctor-review/index.js';
import { notificationRoutes } from '../modules/notifications/index.js';
import { adminRoutes } from '../modules/admin/index.js';

const apiV1Router = Router();

// Module 1 Core Endpoints
apiV1Router.use('/health', healthRoutes);

// Modular Routes for future modules (Modules 2 - 10)
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/patients', patientRoutes);
apiV1Router.use('/interview', interviewRoutes);
apiV1Router.use('/documents', documentRoutes);
apiV1Router.use('/validation', validationRoutes);
apiV1Router.use('/summary', summaryRoutes);
apiV1Router.use('/redflags', redflagRoutes);
apiV1Router.use('/doctor-review', doctorReviewRoutes);
apiV1Router.use('/notifications', notificationRoutes);
apiV1Router.use('/admin', adminRoutes);

export { apiV1Router };
