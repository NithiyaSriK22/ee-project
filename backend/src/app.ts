import express, { Express } from 'express';
import {
  helmetMiddleware,
  corsMiddleware,
  rateLimiterMiddleware,
  permissionsPolicyMiddleware,
} from './middleware/security.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiV1Router } from './routes/index.js';
import { DeploymentController } from './modules/deployment/deployment.controller.js';
import { VisitOrchestratorService } from './modules/visit-lifecycle/index.js';

export const createApp = (): Express => {
  // Initialize Module 2A Event Orchestrator
  VisitOrchestratorService.initialize();

  const app = express();

  // 1. Trust proxy in production for hospital proxies/load balancers
  app.set('trust proxy', 1);

  // 2. Request context & Correlation ID
  app.use(requestIdMiddleware);

  // 3. Security headers, Permissions-Policy & CORS
  app.use(helmetMiddleware);
  app.use(permissionsPolicyMiddleware);
  app.use(corsMiddleware);

  // 4. Rate Limiting
  app.use(rateLimiterMiddleware);

  // 5. Body Parsing with safe limit to accommodate base64 uploads up to 15MB
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // 6. Structured Request Logger (Zero PHI)
  app.use(requestLoggerMiddleware);

  // 7. Resilient unauthenticated status board for hospital status panels & downtime checks
  app.get('/status', DeploymentController.getStatusBoard);

  // 8. Mount Versioned API Routes (/api/v1)
  app.use('/api/v1', apiV1Router);


  // 8. 404 Not Found Handler
  app.use(notFoundHandler);

  // 9. Centralized Global Error Handler
  app.use(globalErrorHandler);

  return app;
};
