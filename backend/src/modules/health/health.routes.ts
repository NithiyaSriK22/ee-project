import { Router } from 'express';
import { HealthController } from './health.controller.js';

const router = Router();

// /api/v1/health
router.get('/', HealthController.getHealth);

// /api/v1/health/live
router.get('/live', HealthController.getLiveness);

// /api/v1/health/ready
router.get('/ready', HealthController.getReadiness);

export const healthRoutes = router;
