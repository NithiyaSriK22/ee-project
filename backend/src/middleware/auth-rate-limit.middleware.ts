import rateLimit from 'express-rate-limit';
import { env } from '../config/env.config.js';
import { ResponseUtil } from '../utils/response.util.js';
import { ErrorCode } from '../errors/error-codes.js';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    ResponseUtil.error(
      res,
      429,
      ErrorCode.RATE_LIMITED,
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
});
