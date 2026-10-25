import { Router } from 'express';
import { HealthController } from './health.controller.js';

const router = Router();

// /api/v1/health
router.get('/', HealthController.getHealth);

// /api/v1/health/live
router.get('/live', HealthController.getLiveness);

// /api/v1/health/ready
router.get('/ready', HealthController.getReadiness);

// /api/v1/health/db
router.get('/db', HealthController.getDatabaseHealth);

export const healthRoutes = router;
