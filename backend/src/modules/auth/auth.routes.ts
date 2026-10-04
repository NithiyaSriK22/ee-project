import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  registerStaffSchema,
  loginStaffSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from './auth.schemas.js';
import { authenticateStaff } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/auth-rate-limit.middleware.js';

const router = Router();

// Public / Protected Staff Auth Endpoints
router.post(
  '/register',
  validateRequest({ body: registerStaffSchema }),
  AuthController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginStaffSchema }),
  AuthController.login
);

router.post(
  '/logout',
  AuthController.logout
);

router.post(
  '/refresh',
  validateRequest({ body: refreshTokenSchema }),
  AuthController.refresh
);

router.get(
  '/me',
  authenticateStaff,
  AuthController.me
);

router.post(
  '/change-password',
  authenticateStaff,
  validateRequest({ body: changePasswordSchema }),
  AuthController.changePassword
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  AuthController.resetPassword
);

router.post(
  '/verify-email',
  validateRequest({ body: verifyEmailSchema }),
  AuthController.verifyEmail
);

router.post(
  '/resend-verification',
  authRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  AuthController.resendVerification
);

export const authRoutes = router;
