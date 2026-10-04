import { Router } from 'express';
import { KioskSessionController } from './kiosk-session.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { startKioskSessionSchema } from './kiosk-session.schemas.js';
import { authenticateKioskSession } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/auth-rate-limit.middleware.js';

const router = Router();

router.post(
  '/start',
  authRateLimiter,
  validateRequest({ body: startKioskSessionSchema }),
  KioskSessionController.start
);

router.get(
  '/me',
  authenticateKioskSession,
  KioskSessionController.me
);

router.post(
  '/end',
  authenticateKioskSession,
  KioskSessionController.end
);

export const kioskSessionRoutes = router;
